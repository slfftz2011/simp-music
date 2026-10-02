use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// 保存 api-enhanced sidecar 子进程，窗口销毁时一并退出
struct MusicApiChild(Mutex<Option<CommandChild>>);

/// 启动 api-enhanced 后端服务（sidecar 单文件，内置 Node 运行时）。
/// 服务默认监听 http://localhost:3000，前端通过 VITE_MUSIC_API_BASE 指向它。
fn spawn_music_api(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar = app.shell().sidecar("music-api")?;
    let (mut rx, child) = sidecar.env("PORT", "3000").spawn()?;

    app.manage(MusicApiChild(Mutex::new(Some(child))));

    // 后台消费子进程输出，避免管道阻塞；日志转发到 stdout 便于排查
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) | CommandEvent::Stderr(line) => {
                    println!("[music-api] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(payload) => {
                    println!("[music-api] terminated, code={:?}", payload.code);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

fn kill_music_api(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<MusicApiChild>() {
        if let Some(child) = state.0.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // sidecar 在移动端尚未内置，仅桌面端拉起本地 API 服务
            #[cfg(not(mobile))]
            {
                if let Err(e) = spawn_music_api(app.handle()) {
                    eprintln!("[music-api] failed to start: {e}");
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let app = window.app_handle();
                kill_music_api(app);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
