use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

/// llama-server 托管配置（由前端传入，Rust 端记住以供空闲看门狗使用）。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlamaConfig {
    /// llama-server.exe 可执行文件路径
    pub llama_server_path: String,
    /// GGUF 模型文件路径
    pub llama_model_path: String,
    /// llama-server 额外启动参数（不含 -m / --host / --port）
    pub llama_extra_args: String,
    /// 服务地址，如 http://127.0.0.1:8080
    pub base_url: String,
    /// 空闲多少分钟后自动卸载（0 = 不卸载）
    pub idle_unload_minutes: u64,
}

/// 从 base_url 解析端口，失败返回 8080。
fn parse_port(base_url: &str) -> u16 {
    if let Ok(url) = reqwest::Url::parse(base_url.trim()) {
        if let Some(port) = url.port() {
            return port;
        }
        match url.scheme() {
            "https" => return 443,
            "http" => return 80,
            _ => {}
        }
    }
    8080
}

/// 拆分参数字符串，支持双引号包裹含空格的路径。
fn split_args(input: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in input.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            c if c.is_whitespace() && !in_quotes => {
                if !current.is_empty() {
                    args.push(std::mem::take(&mut current));
                }
            }
            c => current.push(c),
        }
    }
    if !current.is_empty() {
        args.push(current);
    }
    args
}

#[cfg(windows)]
fn apply_no_window(cmd: &mut std::process::Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn apply_no_window(_cmd: &mut std::process::Command) {}

fn spawn_hidden(
    program: &std::path::Path,
    args: &[String],
    cwd: &std::path::Path,
) -> std::io::Result<std::process::Child> {
    let mut cmd = std::process::Command::new(program);
    cmd.args(args)
        .current_dir(cwd)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());
    apply_no_window(&mut cmd);
    cmd.spawn()
}

fn kill_pid(pid: u32) {
    #[cfg(windows)]
    {
        let mut cmd = std::process::Command::new("taskkill");
        cmd.args(["/PID", &pid.to_string(), "/T", "/F"]);
        apply_no_window(&mut cmd);
        let _ = cmd
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .and_then(|mut c| c.wait());
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
    }
}

fn pid_alive(pid: u32) -> bool {
    #[cfg(windows)]
    {
        let mut cmd = std::process::Command::new("tasklist");
        cmd.args(["/FI", &format!("PID eq {pid}"), "/NH"]);
        apply_no_window(&mut cmd);
        match cmd.output() {
            Ok(out) => {
                let s = String::from_utf8_lossy(&out.stdout);
                s.contains(&pid.to_string()) && !s.to_lowercase().contains("no tasks")
            }
            Err(_) => false,
        }
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
        true
    }
}

/// llama-server 进程托管状态。
pub struct LlamaManager {
    /// 我们启动的进程 PID（外部启动的不记录，也不负责停止）
    owned_pid: Mutex<Option<u32>>,
    /// 防止并发重复启动
    start_lock: Mutex<()>,
    /// 最近一次对话活跃时间（空闲卸载用）
    last_active: Mutex<Option<Instant>>,
    /// 当前是否处于启动加载中
    starting: Mutex<bool>,
    /// 最近一次 ensure 传入的配置（看门狗用）
    config: Mutex<Option<LlamaConfig>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LlamaServerStatus {
    /// /health 是否就绪
    pub running: bool,
    /// 是否正在加载模型
    pub loading: bool,
    /// 我们托管的 PID（无则为 null）
    pub pid: Option<u32>,
    /// 距上次对话的分钟数（0 = 未记录）
    pub idle_minutes: u64,
}

impl LlamaManager {
    pub fn new() -> Self {
        Self {
            owned_pid: Mutex::new(None),
            start_lock: Mutex::new(()),
            last_active: Mutex::new(None),
            starting: Mutex::new(false),
            config: Mutex::new(None),
        }
    }

    pub async fn touch_active(&self) {
        *self.last_active.lock().await = Some(Instant::now());
    }

    async fn health_ok(client: &reqwest::Client, base_url: &str) -> bool {
        let url = format!("{}/health", base_url.trim_end_matches('/'));
        matches!(
            client
                .get(&url)
                .timeout(Duration::from_secs(3))
                .send()
                .await,
            Ok(resp) if resp.status().is_success()
        )
    }

    pub async fn is_starting(&self) -> bool {
        *self.starting.lock().await
    }

    /// 查询托管状态。`base_url` 为空时回退到最近一次 ensure 的配置。
    pub async fn status(&self, client: &reqwest::Client, base_url: &str) -> LlamaServerStatus {
        let fallback = self.config.lock().await;
        let url = if base_url.trim().is_empty() {
            fallback
                .as_ref()
                .map(|c| c.base_url.clone())
                .unwrap_or_default()
        } else {
            base_url.trim().to_string()
        };
        let running = if url.is_empty() {
            false
        } else {
            Self::health_ok(client, &url).await
        };
        let loading = self.is_starting().await;
        let pid = *self.owned_pid.lock().await;
        let idle_minutes = match *self.last_active.lock().await {
            Some(t) => t.elapsed().as_secs() / 60,
            None => 0,
        };
        LlamaServerStatus {
            running,
            loading,
            pid,
            idle_minutes,
        }
    }

    /// 确保 llama-server 就绪：未运行则启动并等待 /health。
    /// `cancel` 存在时，等待加载过程中可被取消（进程留在后台继续加载）。
    pub async fn ensure_ready(
        &self,
        client: &reqwest::Client,
        config: &LlamaConfig,
        cancel: Option<&CancellationToken>,
    ) -> Result<(), String> {
        *self.config.lock().await = Some(config.clone());

        if Self::health_ok(client, &config.base_url).await {
            self.touch_active().await;
            return Ok(());
        }

        let _guard = self.start_lock.lock().await;

        // 拿锁后再查一次（可能其它任务已启动）
        if Self::health_ok(client, &config.base_url).await {
            self.touch_active().await;
            return Ok(());
        }

        if cancel.map(|t| t.is_cancelled()).unwrap_or(false) {
            return Ok(());
        }

        // 清理可能残留的 owned 进程
        if let Some(pid) = self.owned_pid.lock().await.take() {
            kill_pid(pid);
            tokio::time::sleep(Duration::from_millis(500)).await;
        }

        self.spawn_and_wait(client, config, cancel).await?;
        if cancel.map(|t| t.is_cancelled()).unwrap_or(false) {
            return Ok(());
        }
        self.touch_active().await;
        Ok(())
    }

    async fn spawn_and_wait(
        &self,
        client: &reqwest::Client,
        config: &LlamaConfig,
        cancel: Option<&CancellationToken>,
    ) -> Result<(), String> {
        if config.llama_server_path.trim().is_empty() {
            return Err("未配置 llama-server.exe 路径，请在设置中填写".to_string());
        }
        let server_path = std::path::PathBuf::from(config.llama_server_path.trim());
        if !server_path.exists() {
            return Err(format!("找不到 llama-server：{}", server_path.display()));
        }

        let model_path = config.llama_model_path.trim();
        if model_path.is_empty() {
            return Err("未配置 GGUF 模型路径，请在设置中填写".to_string());
        }
        if !std::path::Path::new(model_path).exists() {
            return Err(format!("找不到模型文件：{model_path}"));
        }

        if cancel.map(|t| t.is_cancelled()).unwrap_or(false) {
            return Ok(());
        }

        let port = parse_port(&config.base_url);
        let mut args: Vec<String> = split_args(&config.llama_extra_args);
        args.push("-m".to_string());
        args.push(model_path.to_string());
        args.push("--host".to_string());
        args.push("127.0.0.1".to_string());
        args.push("--port".to_string());
        args.push(port.to_string());

        let cwd = server_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| std::path::PathBuf::from("."));

        log::info!("starting llama-server: {:?} args={:?}", server_path, args);

        *self.starting.lock().await = true;
        let child = match spawn_hidden(&server_path, &args, &cwd) {
            Ok(c) => c,
            Err(err) => {
                *self.starting.lock().await = false;
                return Err(format!("启动 llama-server 失败：{err}"));
            }
        };

        let pid = child.id();
        // Windows 无僵尸进程，释放句柄即可
        drop(child);
        *self.owned_pid.lock().await = Some(pid);

        // 轮询 /health，大模型加载最长约 3 分钟；期间可被取消（进程留后台继续加载）
        let deadline = Instant::now() + Duration::from_secs(180);
        while Instant::now() < deadline {
            if Self::health_ok(client, &config.base_url).await {
                *self.starting.lock().await = false;
                log::info!("llama-server ready (pid={pid})");
                return Ok(());
            }
            if !pid_alive(pid) {
                *self.owned_pid.lock().await = None;
                *self.starting.lock().await = false;
                return Err(
                    "llama-server 进程已退出，请检查启动参数、端口占用或显存是否充足"
                        .to_string(),
                );
            }
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_millis(800)) => {}
                _ = async {
                    match cancel {
                        Some(token) => token.cancelled().await,
                        None => std::future::pending::<()>().await,
                    }
                } => {
                    *self.starting.lock().await = false;
                    log::info!("wait for llama-server cancelled (pid={pid}, loading continues)");
                    return Ok(());
                }
            }
        }

        *self.starting.lock().await = false;
        Err("llama-server 启动超时（>180s），请检查模型路径与显存".to_string())
    }

    /// 停止我们托管的 llama-server（释放显存）。
    pub async fn stop_owned(&self) {
        *self.starting.lock().await = false;
        if let Some(pid) = self.owned_pid.lock().await.take() {
            log::info!("stopping llama-server pid={pid}");
            kill_pid(pid);
        }
        *self.last_active.lock().await = None;
    }

    /// 空闲检查：超过 idle_unload_minutes 分钟则卸载。0 = 不卸载。
    /// 仅管理本应用启动的进程；外部启动的不动。
    pub async fn check_idle_unload(&self) {
        let config = self.config.lock().await;
        let Some(config) = config.as_ref() else {
            return;
        };
        let minutes = config.idle_unload_minutes;
        if minutes == 0 {
            return;
        }

        let owned = *self.owned_pid.lock().await;
        if owned.is_none() || self.is_starting().await {
            return;
        }

        // 启动后从未对话过：以启动时刻为 last_active 兜底
        let last = self
            .last_active
            .lock()
            .await
            .unwrap_or_else(Instant::now);

        if last.elapsed().as_secs() >= minutes * 60 {
            log::info!("llama-server idle for {minutes} min, unloading to free VRAM");
            self.stop_owned().await;
        }
    }
}
