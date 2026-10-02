# Simp Music

基于 [网易云音乐API-Enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/tree/0395d087d9e99ceef480c54e7932c2332e5c0c39) 开发的简单听歌软件

## 构建

项目根：`C:\Users\81840\Documents\MyProject\simp-music`

### 环境前提

| 项 | 值 |
|---|---|
| Rust 工具链 | `stable-x86_64-pc-windows-gnu`|
| Android SDK | `ANDROID_HOME=C:\Users\81840\AppData\Local\Android\Sdk`，NDK 27.2.12479018 |
| rustup 安卓目标 | aarch64 / armv7 / i686 / x86_64-linux-android |
| sidecar | `src-tauri\binaries\music-api.exe` + 四个安卓 ABI 占位文件已就位 |
| 打包配置 | `tauri.conf.json`：`targets=["nsis"]`，`externalBin=["binaries/music-api"]`，`beforeBuildCommand="pnpm build"` |

### 一、桌面裸程序（exe）

```bash
pnpm tauri build --no-bundle
```

- 产出：`src-tauri\target\release\simpl-music.exe`（约 5.4 MB）
- `music-api.exe` sidecar 会随构建复制到同目录，运行时自动拉起/退出

### 二、NSIS 安装包（-setup.exe）

```bash
pnpm tauri build
```

- `tauri.conf.json` 已配置 `targets=["nsis"]`，无需改动
- 产出：`src-tauri\target\release\bundle\nsis\SimpMusic_0.1.0_x64-setup.exe`
- Tauri 首次会自动下载 NSIS（`%LOCALAPPDATA%\tauri\NSIS`），需保持网络

### 三、MSI 安装包（-x64.msi）

Tauri 的 MSI 走 WiX Toolset v3，需先装工具链：

1. 安装 WiX v3：
   ```bash
   winget install --id WiXToolset.WiXToolset
   ```
2. 开启 Windows 可选功能 **VBSCRIPT**（设置 → 应用 → 可选功能 → 更多 Windows 功能）。默认多数机器已开启；若构建报错 `failed to run light.exe`，即此项未开。
3. 修改 `src-tauri\tauri.conf.json` 的 `bundle.targets`：
   ```json
   "targets": ["nsis", "msi"]
   ```
   （只出 msi 可写 `["msi"]`，构建完可改回）
4. 重新构建：
   ```bash
   pnpm tauri build
   ```
5. 产出：`src-tauri\target\release\bundle\msi\SimpMusic_0.1.0_x64.msi`

### 四、安卓 APK

```bash
pnpm tauri android build --debug
```

- 产出：`src-tauri\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk`（约 530 MB）
- 可复制到项目根：
  ```bash
  Copy-Item src-tauri\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk SimpMusic-Android-debug.apk
  ```
- Release 版：`pnpm tauri android build`（需先配置签名 keystore，Tauri 会提示生成）
