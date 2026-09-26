use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::Manager;
use tokio_util::sync::CancellationToken;

mod llama_process;

use llama_process::{LlamaConfig, LlamaManager, LlamaServerStatus};

/// 全局应用状态：共享 HTTP 客户端 + llama-server 进程托管 + 流式请求取消表。
struct AppState {
    http: reqwest::Client,
    llama: Arc<LlamaManager>,
    cancel_flags: std::sync::Mutex<HashMap<String, CancellationToken>>,
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
    state.llama.ensure_ready(&state.http, &llama, None).await?;
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
#[serde(rename_all = "camelCase")]
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
    /// true = 思考（reasoning）内容，前端以灰色块展示
    pub reasoning: bool,
}

/// 发送 POST 请求并把网络/HTTP 错误转为友好中文提示。
async fn post_json_checked(
    client: &reqwest::Client,
    url: &str,
    body: &serde_json::Value,
    api_key: Option<&String>,
) -> Result<reqwest::Response, String> {
    let mut req = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(body);
    if let Some(key) = api_key {
        if !key.is_empty() {
            req = req.bearer_auth(key);
        }
    }
    let resp = req.send().await.map_err(|e| {
        if e.is_timeout() {
            "AI 响应超时，请稍后重试".to_string()
        } else {
            format!("无法连接到 AI 服务 ({url})：{e}")
        }
    })?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        return Err(format!("AI 服务返回错误 ({status})：{body_text}"));
    }
    Ok(resp)
}

/// llama.cpp 自动拉起：配置存在时确保服务就绪，并刷新空闲计时。
async fn ensure_llama(
    state: &AppState,
    llama: &Option<LlamaConfig>,
    cancel: Option<&CancellationToken>,
) -> Result<(), String> {
    if let Some(config) = llama {
        state
            .llama
            .ensure_ready(&state.http, config, cancel)
            .await
            .map_err(|e| format!("llama-server 未就绪：{e}"))?;
    }
    Ok(())
}

#[tauri::command]
async fn ai_chat(
    state: tauri::State<'_, AppState>,
    backend: String,
    base_url: String,
    model: String,
    api_key: Option<String>,
    messages: Vec<ChatMessage>,
    options: Option<ChatOptions>,
    llama: Option<LlamaConfig>,
) -> Result<String, String> {
    let client = &state.http;
    let opts = options.unwrap_or_default();

    ensure_llama(state.inner(), &llama, None).await?;

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
            let url = format!("{}/api/chat", base_url.trim_end_matches('/'));
            let resp = post_json_checked(client, &url, &body, None).await?;
            let data: serde_json::Value = resp.json().await
                .map_err(|e| format!("解析响应失败: {}", e))?;
            data["message"]["content"].as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "响应格式错误".into())
        }
        _ => {
            let repeat_penalty = opts.repeat_penalty.unwrap_or(1.1);
            let frequency_penalty = (repeat_penalty - 1.0) * 2.0;
            let body = serde_json::json!({
                "model": model,
                "messages": messages,
                "stream": false,
                "temperature": opts.temperature.unwrap_or(0.7),
                "top_p": opts.top_p.unwrap_or(0.9),
                "max_tokens": opts.max_tokens.unwrap_or(2048),
                "frequency_penalty": frequency_penalty
            });
            let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
            let resp = post_json_checked(client, &url, &body, api_key.as_ref()).await?;
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
    state: tauri::State<'_, AppState>,
    backend: String,
    base_url: String,
    model: String,
    api_key: Option<String>,
    messages: Vec<ChatMessage>,
    options: Option<ChatOptions>,
    llama: Option<LlamaConfig>,
    request_id: Option<String>,
    channel: Channel<ChatChunk>,
) -> Result<(), String> {
    let token = CancellationToken::new();
    let key = request_id.filter(|s| !s.is_empty());
    if let Some(k) = &key {
        state
            .cancel_flags
            .lock()
            .unwrap()
            .insert(k.clone(), token.clone());
    }

    let result = chat_stream_inner(
        state.inner(),
        &token,
        backend,
        base_url,
        model,
        api_key,
        messages,
        options,
        llama,
        channel,
    )
    .await;

    if let Some(k) = &key {
        state.cancel_flags.lock().unwrap().remove(k);
    }
    // 被取消的请求视为正常结束（保留已生成的部分内容）
    if token.is_cancelled() {
        return Ok(());
    }
    result
}

/// 取消进行中的流式生成（按 request_id 定位）。
#[tauri::command]
async fn ai_cancel_stream(
    state: tauri::State<'_, AppState>,
    request_id: String,
) -> Result<(), String> {
    if let Some(token) = state.cancel_flags.lock().unwrap().get(&request_id) {
        token.cancel();
    }
    Ok(())
}

async fn chat_stream_inner(
    state: &AppState,
    token: &CancellationToken,
    backend: String,
    base_url: String,
    model: String,
    api_key: Option<String>,
    messages: Vec<ChatMessage>,
    options: Option<ChatOptions>,
    llama: Option<LlamaConfig>,
    channel: Channel<ChatChunk>,
) -> Result<(), String> {
    let client = &state.http;
    let opts = options.unwrap_or_default();

    // 确保 llama-server 就绪（等待模型加载期间可被取消，进程留后台继续加载）
    ensure_llama(state, &llama, Some(token)).await?;
    if token.is_cancelled() {
        return Ok(());
    }

    let base = base_url.trim_end_matches('/').to_string();
    use futures_util::StreamExt;

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
            let url = format!("{base}/api/chat");
            let resp = tokio::select! {
                r = post_json_checked(client, &url, &body, None) => r?,
                _ = token.cancelled() => return Ok(()),
            };

            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            'outer: loop {
                let bytes = tokio::select! {
                    _ = token.cancelled() => break 'outer,
                    next = stream.next() => match next {
                        Some(Ok(b)) => b,
                        Some(Err(e)) => return Err(format!("读取流失败: {}", e)),
                        None => break 'outer,
                    },
                };
                buffer.push_str(&String::from_utf8_lossy(&bytes));
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();
                    if line.is_empty() { continue; }
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&line) {
                        let content = data["message"]["content"].as_str().unwrap_or("");
                        let thinking = data["message"]["thinking"].as_str().unwrap_or("");
                        let done = data["done"].as_bool().unwrap_or(false);
                        // content 与 thinking 可能在同一条消息中同时出现，两路都搬运，不互斥
                        if !thinking.is_empty() {
                            channel.send(ChatChunk { content: thinking.to_string(), done: false, reasoning: true }).ok();
                        }
                        if !content.is_empty() {
                            channel.send(ChatChunk { content: content.to_string(), done: false, reasoning: false }).ok();
                        }
                        if done && content.is_empty() && thinking.is_empty() {
                            channel.send(ChatChunk { content: String::new(), done: true, reasoning: false }).ok();
                        }
                        if done { break 'outer; }
                    }
                }
            }
        }
        _ => {
            let repeat_penalty = opts.repeat_penalty.unwrap_or(1.1);
            let frequency_penalty = (repeat_penalty - 1.0) * 2.0;
            let body = serde_json::json!({
                "model": model,
                "messages": messages,
                "stream": true,
                "temperature": opts.temperature.unwrap_or(0.7),
                "top_p": opts.top_p.unwrap_or(0.9),
                "max_tokens": opts.max_tokens.unwrap_or(2048),
                "frequency_penalty": frequency_penalty,
                // 控制 Qwen3 等思考模型的 thinking 开关（llama-server --jinja 模板参数）
                "chat_template_kwargs": { "enable_thinking": opts.think.unwrap_or(false) }
            });
            let url = format!("{base}/v1/chat/completions");
            let resp = tokio::select! {
                r = post_json_checked(client, &url, &body, api_key.as_ref()) => r?,
                _ = token.cancelled() => return Ok(()),
            };

            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            'outer: loop {
                let bytes = tokio::select! {
                    _ = token.cancelled() => break 'outer,
                    next = stream.next() => match next {
                        Some(Ok(b)) => b,
                        Some(Err(e)) => return Err(format!("读取流失败: {}", e)),
                        None => break 'outer,
                    },
                };
                buffer.push_str(&String::from_utf8_lossy(&bytes));
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();
                    if line.is_empty() { continue; }
                    if line == "data: [DONE]" {
                        channel.send(ChatChunk { content: String::new(), done: true, reasoning: false }).ok();
                        break 'outer;
                    }
                    if let Some(json_str) = line.strip_prefix("data: ") {
                        if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str) {
                            let delta = &data["choices"][0]["delta"];
                            let content = delta["content"].as_str().unwrap_or("");
                            let reasoning = delta["reasoning_content"].as_str().unwrap_or("");
                            // content 与 reasoning_content 可能在同一 delta 中同时出现，两路都搬运，不互斥
                            if !reasoning.is_empty() {
                                // 思考内容单独标记，前端以灰色块展示（Qwen3 等思考模型）
                                channel.send(ChatChunk { content: reasoning.to_string(), done: false, reasoning: true }).ok();
                            }
                            if !content.is_empty() {
                                channel.send(ChatChunk { content: content.to_string(), done: false, reasoning: false }).ok();
                            }
                        }
                    }
                }
            }
        }
    }

    // 刷新 llama-server 空闲计时
    if llama.is_some() {
        state.llama.touch_active().await;
    }
    Ok(())
}

// ── AI 连接检测 / 模型列表（Rust 代理，避免 WebView CORS） ──────────────────

#[tauri::command]
async fn ai_check_connection(
    state: tauri::State<'_, AppState>,
    backend: String,
    base_url: String,
) -> Result<bool, String> {
    let base = base_url.trim_end_matches('/').to_string();
    let url = match backend.as_str() {
        "ollama" => format!("{base}/api/tags"),
        "llamacpp" => format!("{base}/health"),
        _ => format!("{base}/v1/models"),
    };
    let ok = state
        .http
        .get(&url)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map(|resp| resp.status().is_success())
        .unwrap_or(false);
    Ok(ok)
}

#[tauri::command]
async fn ai_list_models(
    state: tauri::State<'_, AppState>,
    backend: String,
    base_url: String,
    api_key: Option<String>,
) -> Result<Vec<String>, String> {
    let base = base_url.trim_end_matches('/').to_string();
    let url = match backend.as_str() {
        "ollama" => format!("{base}/api/tags"),
        _ => format!("{base}/v1/models"),
    };

    let mut req = state
        .http
        .get(&url)
        .timeout(std::time::Duration::from_secs(5));
    if let Some(key) = &api_key {
        if !key.is_empty() {
            req = req.bearer_auth(key);
        }
    }

    let resp = match req.send().await {
        Ok(resp) if resp.status().is_success() => resp,
        _ => return Ok(Vec::new()),
    };
    let data: serde_json::Value = match resp.json().await {
        Ok(d) => d,
        Err(_) => return Ok(Vec::new()),
    };

    let mut names: Vec<String> = if backend.as_str() == "ollama" {
        data["models"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default()
    } else {
        data["data"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| m["id"].as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default()
    };
    names.sort();
    names.dedup();
    Ok(names)
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

/// 默认项目根目录：~/.omni-novel/projects（用户未选择存储路径时使用）
#[tauri::command]
fn default_projects_dir() -> Result<String, String> {
    Ok(global_config_dir()
        .join("projects")
        .to_string_lossy()
        .to_string())
}

/// 从环境变量 PATH 中自动查找 llama-server 可执行文件，找到返回绝对路径
#[tauri::command]
fn find_llama_server_in_path() -> Option<String> {
    let path_var = std::env::var("PATH").ok()?;
    let names: &[&str] = if cfg!(windows) {
        &["llama-server.exe"]
    } else {
        &["llama-server", "llama-server.exe"]
    };
    for dir in std::env::split_paths(&path_var) {
        if dir.as_os_str().is_empty() {
            continue;
        }
        for name in names {
            let candidate = dir.join(name);
            if candidate.is_file() {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
    }
    None
}

/// 枚举系统已安装字体（读 HKLM/HKCU 的 Fonts 注册表键），返回字体名列表
#[tauri::command]
fn list_system_fonts() -> Result<Vec<String>, String> {
    let script = r#"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$keys = @(
  'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts',
  'HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts'
)
$names = foreach ($k in $keys) {
  try {
    (Get-ItemProperty -Path $k -ErrorAction Stop).PSObject.Properties |
      Where-Object { $_.Name -notlike 'PS*' } |
      ForEach-Object { $_.Name }
  } catch {}
}
$names
"#;
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| format!("启动 PowerShell 失败: {e}"))?;
    if !output.status.success() {
        return Err("读取系统字体失败".into());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let mut fonts: Vec<String> = text
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .map(|l| {
            let name = l
                .rsplit_once(" (")
                .filter(|(_, suffix)| {
                    matches!(
                        suffix.trim_end_matches(')'),
                        "TrueType" | "OpenType" | "PostScript"
                    )
                })
                .map(|(n, _)| n.to_string())
                .unwrap_or(l);
            name.trim().to_string()
        })
        .filter(|l| !l.is_empty())
        .collect();
    fonts.sort();
    fonts.dedup();
    Ok(fonts)
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
                cancel_flags: std::sync::Mutex::new(HashMap::new()),
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
            default_projects_dir,
            find_llama_server_in_path,
            list_system_fonts,
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
            ai_cancel_stream,
            ai_check_connection,
            ai_list_models,
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
