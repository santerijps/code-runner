package main

import (
	"io"
	"log"
	"os/exec"
	"strconv"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Client struct {
	c           *websocket.Conn
	id          string
	cmd         *exec.Cmd
	stdinWriter io.WriteCloser
}

func main() {
	app := fiber.New()
	app.Static("/", "./public")
	app.Get("/ws", websocket.New(handleWebSocketConnection))
	app.Listen(":3000")
}

func handleWebSocketConnection(c *websocket.Conn) {
	client := Client{c: c, id: getRandomUUID(), cmd: nil, stdinWriter: nil}
	for {
		var msg map[string]string
		if err := c.ReadJSON(&msg); err != nil {
			log.Println("Error:", err.Error())
			break
		}
		action, ok := msg["action"]
		if !ok {
			log.Println("Error: Missing 'action' key in message JSON")
			break
		}
		switch action {
		case "compile-and-run":
			if client.cmd != nil {
				client.cmd.Process.Kill()
				client.cmd.Process.Release()
			}
			go compileAndRun(&client, msg["code"])
		case "write-to-stdin":
			if client.cmd != nil {
				go writeToStdin(&client, msg["stdin"])
			}
		case "kill-process":
			if client.cmd != nil {
				client.cmd.Process.Kill()
			}
		}
	}
	c.Close()
}

func getRandomUUID() string {
	uuid, _ := uuid.NewRandom()
	return uuid.String()
}

func compileAndRun(client *Client, code string) {
	client.cmd = exec.Command("python", "-u", "-c", code)
	stdinPipe, _ := client.cmd.StdinPipe()
	client.stdinWriter = stdinPipe
	stdoutPipe, _ := client.cmd.StdoutPipe()
	stderrPipe, _ := client.cmd.StderrPipe()
	mr := io.MultiReader(stdoutPipe, stderrPipe)
	client.cmd.Start()
	for {
		buffer := make([]byte, 1024)
		n, err := mr.Read(buffer)
		if err != nil {
			break
		}
		response := map[string]string{
			"action": "program-output",
			"output": string(buffer[:n]),
		}
		client.c.WriteJSON(response)
	}
	client.cmd.Wait()
	response := map[string]string{
		"action": "program-exit-code",
		"code":   strconv.Itoa(client.cmd.ProcessState.ExitCode()),
	}
	client.c.WriteJSON(response)
}

func writeToStdin(client *Client, text string) {
	_, err := client.stdinWriter.Write([]byte(text))
	if err != nil {
		log.Println("Error:", err.Error())
	}
}
