use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::Manager;

mod llama_process;

use llama_process::{LlamaConfig, LlamaManager, LlamaServerStatus};

/// 全局应用状态：共享 HTTP 客户端 + llama-server 进程托管。
struct AppState {
    http: reqwest::Client,
    llama: Arc<LlamaManager>,
}

// ── File System Commands ─────────────────────────────────────────────────────

#[tauri::command]
fn create_project_dir(base_path: String, project_title: String, metadata_json: String) -> Result<String, String> {
    let project_dir = PathBuf::from(&base_path).join(&project_title);
    fs::create_dir_all(&project_dir).map_err(|e| format!("创建项目目录失败: {}", e))?;

    let novel_dir = project_dir.join(".novel");
    let subdirs = [
        "settings", "worldview", "outline", "memory", "prompts",
        "workflows", "versions", "logs", "cache", "plugins", "assets",
    ];
    for dir in &subdirs {
        fs::create_dir_all(novel_dir.join(dir)).map_err(|e| format!("创建子目录失败: {}", e))?;
    }

    fs::create_dir_all(project_dir.join("manuscript")).map_err(|e| format!("创建manuscript目录失败: {}", e))?;
    fs::create_dir_all(project_dir.join("drafts")).map_err(|e| format!("创建drafts目录失败: {}", e))?;
    fs::create_dir_all(project_dir.join("exports")).map_err(|e| format!("创建exports目录失败: {}", e))?;

    let meta_str = if metadata_json.is_empty() {
        let now = now_iso();
        let meta = serde_json::json!({
            "id": uuid_v4(),
            "title": project_title,
            "author": "",
            "createdAt": now,
            "updatedAt": now,
            "projectVersion": "1.0"
        });
        serde_json::to_string_pretty(&meta).unwrap()
    } else {
        metadata_json
    };

    fs::write(novel_dir.join("project.json"), meta_str)
        .map_err(|e| format!("写入project.json失败: {}", e))?;

    Ok(project_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_chapter(project_dir: String, filename: String, content: String, volume: Option<String>) -> Result<(), String> {
    let vol = volume.unwrap_or_else(|| "volume-01".into());
    let dir = PathBuf::from(&project_dir).join("manuscript").join(&vol);
    fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;
    fs::write(dir.join(&filename), content).map_err(|e| format!("保存章节失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_chapter(project_dir: String, filename: String, volume: Option<String>) -> Result<String, String> {
    let vol = volume.unwrap_or_else(|| "volume-01".into());
    let path = PathBuf::from(&project_dir).join("manuscript").join(&vol).join(&filename);
    fs::read_to_string(&path).map_err(|e| format!("读取章节失败: {}", e))
}

#[tauri::command]
fn save_novel_json(project_dir: String, sub_dir: String, filename: String, data_json: String) -> Result<(), String> {
    let dir = PathBuf::from(&project_dir).join(".novel").join(&sub_dir);
    fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;
    fs::write(dir.join(&filename), data_json).map_err(|e| format!("保存JSON失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_novel_json(project_dir: String, sub_dir: String, filename: String) -> Result<String, String> {
    let path = PathBuf::from(&project_dir).join(".novel").join(&sub_dir).join(&filename);
    fs::read_to_string(&path).map_err(|e| format!("读取JSON失败: {}", e))
}

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub is_dir: bool,
}

#[tauri::command]
fn list_dir(dir_path: String, filter: Option<String>) -> Result<Vec<DirEntry>, String> {
    let path = PathBuf::from(&dir_path);
    if !path.exists() {
        return Ok(vec![]);
    }
    let entries = fs::read_dir(&path).map_err(|e| format!("读取目录失败: {}", e))?;
    let mut result = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some(ref f) = filter {
            if !name.contains(f.as_str()) { continue; }
        }
        let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
        result.push(DirEntry { name, is_dir });
    }
    Ok(result)
}

#[tauri::command]
fn save_global_json(sub_path: String, filename: String, data_json: String) -> Result<(), String> {
    let base = global_config_dir();
    let dir = base.join(&sub_path);
    fs::create_dir_all(&dir).map_err(|e| format!("创建配置目录失败: {}", e))?;
    fs::write(dir.join(&filename), data_json).map_err(|e| format!("保存配置失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_global_json(sub_path: String, filename: String) -> Result<String, String> {
    let base = global_config_dir();
    let path = base.join(&sub_path).join(&filename);
    fs::read_to_string(&path).map_err(|e| format!("读取配置失败: {}", e))
}

// ── llama-server 托管 Commands ──────────────────────────────────────────────

/// 确保 llama-server 就绪（未启动则自动拉起并等待模型加载完成）。
#[tauri::command]
async fn ensure_llama_ready(
    state: tauri::State<'_, AppState>,
    llama: LlamaConfig,
) -> Result<LlamaServerStatus, String> {
    state.llama.ensure_ready(&state.http, &llama).await?;
    Ok(state.llama.status(&state.http, &llama.base_url).await)
}

/// 停止本应用托管的 llama-server，释放显存。
#[tauri::command]
async fn stop_llama_server(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.llama.stop_owned().await;
    Ok(())
}

/// 查询 llama-server 托管状态（base_url 为空时回退到最近一次配置）。
#[tauri::command]
async fn get_llama_server_status(
    state: tauri::State<'_, AppState>,
    base_url: Option<String>,
) -> Result<LlamaServerStatus, String> {
    Ok(state
        .llama
        .status(&state.http, base_url.as_deref().unwrap_or(""))
        .await)
}

// ── AI Chat Commands ─────────────────────────────────────────────────────────

#[derive(Deserialize, Serialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize, Default)]
pub struct ChatOptions {
    pub temperature: Option<f64>,
    pub top_p: Option<f64>,
    pub top_k: Option<u32>,
    pub repeat_penalty: Option<f64>,
    pub max_tokens: Option<u32>,
    pub think: Option<bool>,
}

#[derive(Serialize)]
pub struct ChatChunk {
    pub content: String,
    pub done: bool,
}

#[tauri::command]
async fn ai_chat(
    backend: String,
    base_url: String,
    model: String,
    api_key: Option<String>,
    messages: Vec<ChatMessage>,
    options: Option<ChatOptions>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let opts = options.unwrap_or_default();

    match backend.as_str() {
        "ollama" => {
            let body = serde_json::json!({
                "model": model,
                "messages": messages,
                "stream": false,
                "think": opts.think.unwrap_or(false),
                "options": {
                    "temperature": opts.temperature.unwrap_or(0.7),
                    "top_p": opts.top_p.unwrap_or(0.9),
                    "top_k": opts.top_k.unwrap_or(40),
                    "repeat_penalty": opts.repeat_penalty.unwrap_or(1.1),
                    "num_predict": opts.max_tokens.unwrap_or(2048)
                }
            });
            let resp = client.post(format!("{}/api/chat", base_url))
                .json(&body).send().await
                .map_err(|e| format!("请求AI服务失败: {}", e))?;
            let data: serde_json::Value = resp.json().await
                .map_err(|e| format!("解析响应失败: {}", e))?;
            data["message"]["content"].as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "响应格式错误".into())
        }
        _ => {
            let repeat_penalty = opts.repeat_penalty.unwrap_or(1.1);
            let frequency_penalty = (repeat_penalty - 1.0) * 2.0;
            let mut req = client.post(format!("{}/v1/chat/completions", base_url))
                .json(&serde_json::json!({
                    "model": model,
                    "messages": messages,
                    "stream": false,
                    "temperature": opts.temperature.unwrap_or(0.7),
                    "top_p": opts.top_p.unwrap_or(0.9),
                    "max_tokens": opts.max_tokens.unwrap_or(2048),
                    "frequency_penalty": frequency_penalty
                }));
            if let Some(key) = &api_key {
                if !key.is_empty() { req = req.bearer_auth(key); }
            }
            let resp = req.send().await
                .map_err(|e| format!("请求AI服务失败: {}", e))?;
            let data: serde_json::Value = resp.json().await
                .map_err(|e| format!("解析响应失败: {}", e))?;
            data["choices"][0]["message"]["content"].as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "响应格式错误".into())
        }
    }
}

#[tauri::command]
async fn ai_chat_stream(
    backend: String,
    base_url: String,
    model: String,
    api_key: Option<String>,
    messages: Vec<ChatMessage>,
    options: Option<ChatOptions>,
    channel: Channel<ChatChunk>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let opts = options.unwrap_or_default();

    match backend.as_str() {
        "ollama" => {
            let body = serde_json::json!({
                "model": model,
                "messages": messages,
                "stream": true,
                "think": opts.think.unwrap_or(false),
                "options": {
                    "temperature": opts.temperature.unwrap_or(0.7),
                    "top_p": opts.top_p.unwrap_or(0.9),
                    "top_k": opts.top_k.unwrap_or(40),
                    "repeat_penalty": opts.repeat_penalty.unwrap_or(1.1),
                    "num_predict": opts.max_tokens.unwrap_or(2048)
                }
            });
            let resp = client.post(format!("{}/api/chat", base_url))
                .json(&body).send().await
                .map_err(|e| format!("请求AI服务失败: {}", e))?;

            use futures_util::StreamExt;
            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                let bytes = chunk.map_err(|e| format!("读取流失败: {}", e))?;
                buffer.push_str(&String::from_utf8_lossy(&bytes));
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();
                    if line.is_empty() { continue; }
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&line) {
                        let content = data["message"]["content"].as_str().unwrap_or("").to_string();
                        let done = data["done"].as_bool().unwrap_or(false);
                        channel.send(ChatChunk { content, done }).ok();
                        if done { break; }
                    }
                }
            }
        }
        _ => {
            let repeat_penalty = opts.repeat_penalty.unwrap_or(1.1);
            let frequency_penalty = (repeat_penalty - 1.0) * 2.0;
            let mut req = client.post(format!("{}/v1/chat/completions", base_url))
                .json(&serde_json::json!({
                    "model": model,
                    "messages": messages,
                    "stream": true,
                    "temperature": opts.temperature.unwrap_or(0.7),
                    "top_p": opts.top_p.unwrap_or(0.9),
                    "max_tokens": opts.max_tokens.unwrap_or(2048),
                    "frequency_penalty": frequency_penalty
                }));
            if let Some(key) = &api_key {
                if !key.is_empty() { req = req.bearer_auth(key); }
            }
            let resp = req.send().await
                .map_err(|e| format!("请求AI服务失败: {}", e))?;

            use futures_util::StreamExt;
            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                let bytes = chunk.map_err(|e| format!("读取流失败: {}", e))?;
                buffer.push_str(&String::from_utf8_lossy(&bytes));
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();
                    if line.is_empty() { continue; }
                    if line == "data: [DONE]" {
                        channel.send(ChatChunk { content: String::new(), done: true }).ok();
                        return Ok(());
                    }
                    if let Some(json_str) = line.strip_prefix("data: ") {
                        if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str) {
                            let content = data["choices"][0]["delta"]["content"]
                                .as_str().unwrap_or("").to_string();
                            if !content.is_empty() {
                                channel.send(ChatChunk { content, done: false }).ok();
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    format!("{:x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        t.as_secs(), t.subsec_millis(),
        (t.subsec_nanos() & 0xffff) as u16,
        ((t.subsec_nanos() >> 16) & 0x0fff) as u16 | 0x8000,
        t.as_nanos() as u64 & 0xffffffffffff
    )
}

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let days = secs / 86400;
    let tod = secs % 86400;
    let h = tod / 3600; let m = (tod % 3600) / 60; let s = tod % 60;
    let mut y = 1970u64; let mut rem = days;
    loop { let diy = if is_leap(y) { 366 } else { 365 }; if rem < diy { break; } rem -= diy; y += 1; }
    let months = [31,28,31,30,31,30,31,31,30,31,30,31];
    let mut mo = 1u64;
    for (i, &dim) in months.iter().enumerate() {
        let d = if i == 1 && is_leap(y) { 29 } else { dim as u64 };
        if rem < d { break; } rem -= d; mo += 1;
    }
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.000Z", y, mo, rem + 1, h, m, s)
}

fn is_leap(y: u64) -> bool { (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 }

fn global_config_dir() -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".omni-novel")
}

// ── App Entry ────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            app.manage(AppState {
                http: reqwest::Client::new(),
                llama: Arc::new(LlamaManager::new()),
            });

            // 空闲卸载看门狗：约每 30s 检查一次
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(Duration::from_secs(30)).await;
                    let state = app_handle.state::<AppState>();
                    state.llama.check_idle_unload().await;
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project_dir,
            save_chapter,
            load_chapter,
            save_novel_json,
            load_novel_json,
            list_dir,
            save_global_json,
            load_global_json,
            ensure_llama_ready,
            stop_llama_server,
            get_llama_server_status,
            ai_chat,
            ai_chat_stream,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
                let state = app.state::<AppState>();
                tauri::async_runtime::block_on(state.llama.stop_owned());
            }
        });
}
