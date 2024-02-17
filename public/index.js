const ws = new WebSocket("ws://" + location.host + "/ws");

const terminal = new Terminal({
  cursorBlink: false,
  cursorInactiveStyle: "none",
  fontFamily: "'Fira Code', monospace",
  rows: 100,
  cols: 30,
});

let allowWritingToStdin = false;
let stdinLine = "";

ws.onopen = () => console.log("WebSocket OPEN");
ws.onclose = (event) => console.log("WebSocket CLOSE", event.code, event.reason);
ws.onerror = (event) => console.log("WebSocket ERROR", event);
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.action) {
    case "program-output":
      terminal.write(msg.output.replace(/\n/g, "\r\n"));
      break;
    case "program-exit-code":
      terminal.write(`\r\nExit code: ${msg.code}\r\n`);
      allowWritingToStdin = false;
      break;
  }
};

// code.addEventListener('keydown', ({ctrlKey, key}) => {
//   if (ctrlKey && key === "Enter") {
//     compileAndRun();
//   }
// });

terminal.open(document.getElementById("terminal"));
terminal.onKey(({domEvent}) => {
  switch (domEvent.keyCode) {
    case 13:
      if (allowWritingToStdin) {
        terminal.write("\r\n");
        writeToStdin();
      }
      break;
    case 8:
      terminal.write("\b \b");
      stdinLine = stdinLine.substring(0, stdinLine.length - 1);
      break;
    default:
      if (domEvent.key.length === 1 && allowWritingToStdin) {
        terminal.write(domEvent.key);
        stdinLine += domEvent.key;
      }
  }
});

function compileAndRun() {
  ws.send(JSON.stringify({action: "compile-and-run", code: editor.getValue()}));
  terminal.clear();
  allowWritingToStdin = true;
}

function writeToStdin() {
  ws.send(JSON.stringify({action: "write-to-stdin", stdin: stdinLine + "\r\n"}));
  stdinLine = "";
}

function killProcess() {
  ws.send(JSON.stringify({action: "kill-process"}));
  allowWritingToStdin = false;
}
