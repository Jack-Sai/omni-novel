import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { saveGlobalConfig, loadGlobalConfig } from "./storage";
import { log } from "./logger";

/**
 * 更新（v1.3.3）：
 * - checkForUpdate：GitHub Releases latest 与当前版本比较
 * - 离线更新包：文件选择 → launch_installer（Rust 拉起安装包并退出应用）
 * - 更新历史：history.json 记录每次安装/回滚，支持选择历史安装包回滚
 */
export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface LatestRelease {
  version: string;
  publishedAt: string;
  htmlUrl: string;
  body: string;
  assets: ReleaseAsset[];
}

export interface InstallRecord {
  version: string;
  installerPath: string;
  installedAt: string;
  source: "online" | "offline" | "rollback";
}

const REPO_RELEASES_LATEST = "https://api.github.com/repos/Jack-Sai/omni-novel/releases/latest";
const REPO_RELEASES_PAGE = "https://github.com/Jack-Sai/omni-novel/releases";

/** 语义化比较：a > b 返回 true（仅数字段，忽略预发布后缀） */
export function isVersionNewer(a: string, b: string): boolean {
  const pa = a.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export async function getAppVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return "0.0.0";
  }
}

/** 检查更新：拉取 GitHub latest release（CORS 友好），返回最新版本信息 */
export async function checkForUpdate(): Promise<LatestRelease> {
  const res = await fetch(REPO_RELEASES_LATEST, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`检查更新失败：HTTP ${res.status}`);
  const data = (await res.json()) as {
    tag_name?: string;
    name?: string;
    published_at?: string;
    html_url?: string;
    body?: string;
    assets?: { name?: string; browser_download_url?: string; size?: number }[];
  };
  const version = (data.tag_name ?? data.name ?? "").trim();
  if (!version) throw new Error("检查更新失败：未获取到版本号");
  const release: LatestRelease = {
    version: version.replace(/^v/, ""),
    publishedAt: data.published_at ?? "",
    htmlUrl: data.html_url ?? REPO_RELEASES_PAGE,
    body: data.body ?? "",
    assets: (data.assets ?? [])
      .filter((a) => a.name && a.browser_download_url)
      .map((a) => ({
        name: a.name!,
        browser_download_url: a.browser_download_url!,
        size: a.size ?? 0,
      })),
  };
  log("operation", "info", `检查更新：最新 ${release.version}`, { current: await getAppVersion() });
  return release;
}

/** 在浏览器打开更新页 / 下载页 */
export async function openReleasePage(url?: string): Promise<void> {
  await openUrl(url ?? REPO_RELEASES_PAGE);
  log("plugin", "info", "打开更新页面", { url: url ?? REPO_RELEASES_PAGE });
}

/** 选择离线更新安装包（setup exe），校验文件名后返回绝对路径 */
export async function selectInstallerFile(): Promise<string | null> {
  const picked = await openFileDialog({
    multiple: false,
    filters: [{ name: "Omni Novel 安装包", extensions: ["exe"] }],
  });
  if (picked == null) return null;
  const path = typeof picked === "string" ? picked : "";
  if (!path) return null;
  const base = path.split(/[\\/]/).pop() ?? "";
  if (!/omni[-_]?novel/i.test(base) || !/setup|win/i.test(base)) {
    throw new Error(`所选文件不是 Omni Novel 安装包：${base}`);
  }
  log("plugin", "info", "选择离线更新包", { path });
  return path;
}

/** 启动安装包（Rust 侧拉起进程，约 1s 后应用自动退出） */
export async function launchInstaller(path: string, source: InstallRecord["source"]): Promise<void> {
  const version = extractVersionFromName(path) ?? "未知版本";
  await invoke("launch_installer", { path });
  // 进程已拉起（成功后应用会退出；此行仅在极短窗口内可达）
  await recordInstall({ version, installerPath: path, installedAt: new Date().toISOString(), source });
}

/** 从安装包文件名提取版本号（OmniNovel-1.3.3-win-x64-setup.exe → 1.3.3） */
export function extractVersionFromName(path: string): string | null {
  const base = path.split(/[\\/]/).pop() ?? "";
  const m = base.match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

/** 记录一次安装（更新 / 回滚） */
export async function recordInstall(record: InstallRecord): Promise<void> {
  const history = await listInstallHistory();
  history.push(record);
  while (history.length > 20) history.shift();
  await saveGlobalConfig("update", "history.json", { history });
  log("operation", "info", `记录安装历史：${record.version}`, { source: record.source });
}

export async function listInstallHistory(): Promise<InstallRecord[]> {
  const data = await loadGlobalConfig<{ history: InstallRecord[] }>("update", "history.json");
  return data?.history ?? [];
}

/** 回滚：重新运行历史安装包 */
export async function rollbackTo(record: InstallRecord): Promise<void> {
  log("operation", "info", `回滚到版本 ${record.version}`, { path: record.installerPath });
  await launchInstaller(record.installerPath, "rollback");
}
