const ws = new WebSocket("ws://" + location.host + "/ws");
ws.onerror = (event) => console.log("WebSocket ERROR", event);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.action) {
    case "program-output":
      output.innerHTML += msg.output;
      output.scrollTo(0, output.scrollHeight)
      break;
    case "program-exit-code":
      output.innerHTML += `\nExit code: ${msg.code}`;
      output.scrollTo(0, output.scrollHeight)
      break;
  }
};

const code = document.getElementById("code");
const stdin = document.getElementById("stdin");
const output = document.getElementById("output");

document.getElementById("button-form").addEventListener("submit", (event) => {
  event.preventDefault();
  switch (event.submitter.name) {
    case "compile-and-run":
      ws.send(JSON.stringify({action: "compile-and-run", code: code.value}));
      output.innerHTML = "";
      break;
    case "write-to-stdin":
      ws.send(JSON.stringify({action: "write-to-stdin", stdin: stdin.value + "\r\n"}));
      stdin.value = "";
      output.innerHTML += stdin.value + "\r\n";
      output.scrollTo(0, output.scrollHeight);
      break;
    case "kill-process":
      ws.send(JSON.stringify({action: "kill-process"}));
      break;
  }
});
