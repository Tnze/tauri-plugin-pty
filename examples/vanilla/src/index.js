import { Terminal } from "xterm"
import "xterm/css/xterm.css"
import { spawn } from "../../../dist/index.es";

const term = new Terminal({
    convertEol: true,
    windowsMode: false,
});
term.open(document.getElementById('terminal'));

const pty = spawn("powershell.exe", [], {
    cols: term.cols,
    rows: term.rows,
})
pty.onData(data => term.write(data))
term.onData(data => pty.write(data))