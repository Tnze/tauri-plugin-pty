use std::{collections::BTreeMap, ffi::OsString, sync::Arc};

use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};
use winptyrs::{AgentConfig, MouseMode, PTYArgs, PTY};

type PtyHandler = u32;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct Payload {
    message: String,
}

#[tauri::command]
async fn spawn<R: Runtime>(
    file: String,
    args: Vec<String>,
    term_name: Option<String>,
    cols: i32,
    rows: i32,
    cwd: Option<String>,
    env: BTreeMap<String, String>,
    encoding: Option<String>,
    handle_flow_control: Option<bool>,
    flow_control_pause: Option<String>,
    flow_control_resume: Option<String>,

    app_handle: AppHandle<R>,
) -> Result<PtyHandler, String> {
    // TODO: Support these parameters
    let _ = term_name;
    let _ = encoding;
    let _ = handle_flow_control;
    let _ = flow_control_pause;
    let _ = flow_control_resume;

    let pty_args = PTYArgs {
        cols,
        rows,
        mouse_mode: MouseMode::WINPTY_MOUSE_MODE_AUTO,
        timeout: 10000,
        agent_config: AgentConfig::WINPTY_FLAG_COLOR_ESCAPES,
    };
    let mut pty = PTY::new(&pty_args).map_err(|e| e.to_string_lossy().to_string())?;
    let env_str = if !env.is_empty() {
        let mut env_str = OsString::new();
        for (k, v) in env.iter() {
            env_str.push(&k);
            env_str.push("=");
            env_str.push(&v);
            env_str.push("\0");
        }
        Some(env_str)
    } else {
        None
    };
    let args_str = if !args.is_empty() {
        Some(args.join(" ").into())
    } else {
        None
    };
    pty.spawn(file.into(), args_str, cwd.map(|x| x.into()), env_str)
        .map_err(|x| x.to_string_lossy().to_string())?;

    let pid = pty.get_pid();
    let pty = Arc::new(pty);

    let pty2 = pty.clone();
    let event_name = format!("onDataDown{pid}");
    let listen_handler = app_handle.listen_global(event_name, move |e| {
        let payload: Payload = serde_json::from_str(e.payload().unwrap()).unwrap();
        pty2.write(OsString::from(payload.message)).unwrap();
    });

    let app_handle2 = app_handle.clone();
    let pty2 = pty.clone();
    tauri::async_runtime::spawn(async move {
        let event_name = format!("onDataUp{pid}");
        loop {
            let Ok(data) = pty2.read(1024, true) else {
                break;
            };
            let payload = Payload {
                message: data.to_string_lossy().to_string(),
            };
            if let Err(_e) = app_handle2.emit_all(&event_name, payload) {
                break;
            }
        }
        app_handle2.unlisten(listen_handler);
    });
    Ok(pid)
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R>::new("pty")
        .invoke_handler(tauri::generate_handler![spawn])
        .build()
}
