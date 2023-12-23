use std::{collections::BTreeMap, ffi::OsString, sync::Arc};

use tauri::{
    async_runtime::RwLock,
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};
use winptyrs::{AgentConfig, MouseMode, PTYArgs, PTY};

#[derive(Default)]
struct PluginState {
    sessions: RwLock<BTreeMap<PtyHandler, Arc<PTY>>>,
}

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

    state: tauri::State<'_, PluginState>,
    _app_handle: AppHandle<R>,
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
    state.sessions.write().await.insert(pid, pty);

    Ok(pid)
}

#[tauri::command]
async fn write(
    pid: PtyHandler,
    data: String,
    state: tauri::State<'_, PluginState>,
) -> Result<u32, String> {
    let session = state
        .sessions
        .read()
        .await
        .get(&pid)
        .ok_or("Unavaliable pid")?
        .clone();
    let n = session
        .write(OsString::from(data))
        .map_err(|e| format!("Write {pid} error: {e:?}"))?;
    Ok(n)
}

#[tauri::command]
async fn read(pid: PtyHandler, state: tauri::State<'_, PluginState>) -> Result<String, String> {
    let session = state
        .sessions
        .read()
        .await
        .get(&pid)
        .ok_or("Unavaliable pid")?
        .clone();
    let data = session
        .read(1024, true)
        .map_err(|e| format!("Read {pid} error: {e:?}"))?;
    Ok(data.to_string_lossy().to_string())
}

#[tauri::command]
async fn resize(
    pid: PtyHandler,
    cols: i32,
    rows: i32,
    state: tauri::State<'_, PluginState>,
) -> Result<(), String> {
    let session = state
        .sessions
        .read()
        .await
        .get(&pid)
        .ok_or("Unavaliable pid")?
        .clone();
    session
        .set_size(cols, rows)
        .map_err(|e| format!("Resize {pid} error: {e:?}"))?;
    Ok(())
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R>::new("pty")
        .invoke_handler(tauri::generate_handler![spawn, write, read, resize])
        .setup(|app_handle| {
            app_handle.manage(PluginState::default());
            Ok(())
        })
        .build()
}
