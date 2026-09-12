# 应用图标替换说明

## 当前图标位置
应用图标位于 `src-tauri/icons/` 目录下。

## 需要替换的文件
- `icon.png` - 主图标（建议 512x512 或 1024x1024）
- `icon.ico` - Windows 图标
- `icon.icns` - macOS 图标
- 其他尺寸的 PNG 文件

## 推荐尺寸
- 32x32
- 128x128
- 128x128@2x (256x256)
- 512x512 (推荐)

## 替换步骤

### 方法一：使用在线工具
1. 准备一张 512x512 或 1024x1024 的 PNG 图标
2. 访问 https://www.convertico.com/ 或类似网站
3. 上传 PNG 图标
4. 下载 ICO 和 ICNS 格式
5. 替换 `src-tauri/icons/` 目录下的对应文件

### 方法二：使用 Tauri 官方工具
```bash
# 安装 tauri-icon 工具
npm install -g @tauri-apps/tauri-icon

# 生成所有尺寸的图标
tauri-icon src-tauri/icons/icon.png
```

## 注意事项
- 图标应为正方形
- 建议使用透明背景的 PNG
- 文件名必须与 tauri.conf.json 中配置的一致
