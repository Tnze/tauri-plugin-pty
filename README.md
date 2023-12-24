# Tauri Plugin Pseudo Terminal

Developing! Wellcome to contribute!

## Example

Full example at: <https://github.com/Tnze/tauri-plugin-pty/tree/main/examples/vanilla>

```sh
# Install this plugin in your Cargo.toml
cargo add tauri-plugin-pty
# Install the api package
npm install tauri-pty
```

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_pty::init()) // add this
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
...
```

```typescript
import { Terminal } from "xterm"
import { spawn } from "tauri-pty";

// init xterm.js
const term = new Terminal();
term.open(/* DOM Elem */);
// spawn shell
const pty = spawn("powershell.exe", [/* args */], {
    cols: term.cols,
    rows: term.rows,
})
// transport data
pty.onData(data => term.write(data))
term.onData(data => pty.write(data))
```
