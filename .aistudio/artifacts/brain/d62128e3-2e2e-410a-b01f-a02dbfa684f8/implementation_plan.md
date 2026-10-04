# 《拾年》全套安卓原生打包与功能落地实施指南（2026 最终终极融合版）及云端连接优化实施计划

根据您的最新指示，本方案深度融合了《拾年》全套最新架构进展、Windows PowerShell 容错规范、彻底禁用安卓原生选择器浮层并由内置东方美化选择条（CustomTextSelectionBar）全权接管、前端原生桥接通道（相册直存与 ZIP 分类直存）、失焦防丢字、90Hz/120Hz 高刷解锁以及后台防蓝标等全套规范，同时全面检查与加固前后端与云端连接链路。

---

## 阶段一：更新安卓原生打包与部署实施指南（2026 最终终极融合版）

### 1. 目标与更新范围
- 全量更新工程根目录文档 `ANDROID_DEPLOYMENT_GUIDE_2026.md` 为 2026 最终终极融合版；
- 包含 VS Code 前端产物构建、Capacitor 4 步初始化与同步指令（PowerShell 容错规范）；
- Android Studio 沉浸式主题 `styles.xml`（消除冷启动蓝标与 10 秒后台挂起切回蓝标）、`AndroidManifest.xml` 完整权限与硬件加速配置、`MainActivity.java` 核心代码（彻底拦截系统选择器 + 90Hz/120Hz/144Hz 高刷解锁 + 相册与 ZIP 分类直存桥接通道）。

### 2. 核心机理与实现规范
- **原生层物理拦截系统 ActionMode**：
  - 重写 `onWindowStartingActionMode`（返回 `null`）；
  - `bridgeWebView.setCustomSelectionActionModeCallback` 阻断原生菜单，实现 100% 由前端 `CustomTextSelectionBar` 接管。
- **冷启动与后台挂起防蓝标**：
  - `AppTheme.NoActionBarLaunch` 强制锁定米色 `#FAF8F5`，物理剔除 `@drawable/splash`。
- **公共存储分类直存通道**：
  - `WebAppInterface` 挂载 `saveImageToGallery`（`Pictures/拾年回忆`）与 `saveZipToDownloads`（`Downloads/拾年备份`）。

---

## 阶段二：文本输入框非受控防丢字与水滴选择器全权接管巩固

### 1. 输入法合成态与失焦防丢字
- 确保所有模态框、卡片编辑、设置及文书编辑框采用原生非受控架构（`name` 与 `defaultValue` 配合 `FormData` 提交）；
- 统一配置 `autoComplete="off"`、`autoCorrect="off"`、`autoCapitalize="none"`、`spellCheck={false}`，彻底杜绝 IME 输入法未上屏直接失焦导致的字符丢失与系统误纠错。

### 2. 东方水滴选择器（CustomTextSelectionBar）多端适配
- 维持双端专属东方水墨朱砂微光游标（Start Handle / End Handle）与浮动操作栏；
- 支持 **复制、剪切、粘贴、全选** 四合一完整操作；
- 维持水墨晕染动画、禅意音效与震动反馈。

---

## 阶段三：前后端与云端全链路连接与双模容灾加固

### 1. 连接状态与网关通道检查
- **同源云端 API 网关**：`/api/sync/users`、`/api/sync/license-codes`、`/api/admin/*` 免代理国内秒级直连通道；
- **Firebase Firestore 实时通道**：国际网络与 Firebase 官方直连；
- **双模自动融合**：
  - 当国内直连网络通畅时，优先通过中枢网关秒级双向同步；
  - 当完全无网络时，自动切换为本地 IndexedDB/LocalStorage 安全沙盒持久化；
  - 恢复网络后自动触发增量上传与拉取合并。

### 2. 账号唯一性与多端资产数据一致性
- 严格保证账号唯一性（注册重名实时拦截并提示）；
- 确保手机端与电脑端的数据无缝互通与实时汇报。

---

## 阶段四：验证与构建确认
- 运行 `compile_applet` 确保 TypeScript 与 Vite 编译 100% 成功；
- 运行 `lint_applet` 确保 0 错误、0 警告。
