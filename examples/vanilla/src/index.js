import { Terminal } from "xterm"
import { FitAddon } from 'xterm-addon-fit';
import "xterm/css/xterm.css"
import { spawn } from "../../../dist/index.es";

const term = new Terminal({
    convertEol: true,
    windowsMode: false,
});
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal'));
fitAddon.fit();
addEventListener('resize', () => fitAddon.fit());

const pty = spawn("powershell.exe", [], {
    cols: term.cols,
    rows: term.rows,
});
pty.onData(data => term.write(data));
term.onData(data => pty.write(data));
term.onResize(e => pty.resize(e.cols, e.rows));
