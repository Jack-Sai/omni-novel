import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { installGlobalErrorHandlers, useLogStore, log } from "./services/logger";

// 全局错误捕获（window.onerror / unhandledrejection → error 日志）
installGlobalErrorHandlers();

// 启动：恢复历史日志 → 记录启动日志（含启动耗时）
const bootStarted = performance.now();
useLogStore.getState().loadFromDisk().finally(() => {
  log("operation", "info", "应用启动", {
    ms: Math.round(performance.now() - bootStarted),
    ua: navigator.userAgent,
  });
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
