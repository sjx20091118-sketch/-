# 音乐播放全网秒级直播容灾与安卓三键导航栏防遮挡落地方案

本文档针对用户反馈的「全网搜出的音乐无法起奏播放」以及「安卓传统三键导航栏遮挡底部全局导航条」两大核心问题，制定具体的落地方案。

---

## 一、 用户确认与核心决策

> [!IMPORTANT]
> 经与用户确认，已明确以下两项关键设计与技术规范：

1. **音乐起奏容灾策略**：采用 **智能免鉴权直链 + 双引擎秒级竞速容灾**。解决前端 `fetch` 遇到第三方 CORS 阻断的根本问题，直接为 HTML5 `<audio>` 注入直通免鉴权音频流或服务端加速代理，支持搜出即播、失败秒级自动换源起奏。
2. **底部导航防遮挡策略**：采用 **智能安全区自适应悬浮抬升**（`bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]` 与移动端专属避让），无论在全屏手势导航还是传统实体/虚拟三键导航下，底栏均优雅悬浮、零遮挡。

---

## 二、 根因分析与技术实现方案

### 1. 音乐搜索可搜但无法起奏的根因与修复

#### 根因定位：
1. **浏览器/WebView 的 CORS 阻断**：此前在 `fetchSongPlayUrl` 中对第三方音源（如 `https://antiserver.kuwo.cn/...` 或 `https://m.kugou.com/...`）使用了前端 `fetch()` 发起异步请求。第三方服务器未下发 `Access-Control-Allow-Origin: *`，导致浏览器及 Android WebView 直接拦截并报错 `CORS policy blocked`，使得 `targetUrl` 返回空，无法给 `<audio>` 设置有效音源；
2. **HTML5 `<audio>` 标签直通优势**：HTML5 原生 `<audio src="...">` 播放并不受普通 `fetch()` 的 CORS 限制，只要提供支持 302 重定向的直链（如酷我直链 `https://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${id}&format=mp3&response=url` 或网易云官方 CDN 直链 `https://music.163.com/song/media/outer/url?id=${id}.mp3`），原生播放器即可直接解码流式播放；
3. **缺少自动竞速换源容灾**：当主音源遭遇版权阻断或短暂失效时，缺乏备用音源（网易云/酷我/酷狗/后端代理）的自动无感切换。

#### 修复措施：
- **直通直链生成**：对于纯数字 ID（网易云/酷我）及酷狗 Hash，直接构造免鉴权高保真直链，无需前端预发 `fetch`，直接赋值给 `<audio>` 元素起奏；
- **后端加速与流式代理容灾**：当直接直链因网络问题触发 `audio.onerror` 时，自动触发双引擎容灾机制，通过 `/api/music/play-url` 和 `/api/music/stream` 自动抓取并重试备用可用流；
- **全网搜索结果音源规范化**：确保每个搜索结果在生成时即包含有效 ID、真彩封面和直接可播的音频解析映射。

---

### 2. 安卓三键导航栏遮挡底部导航条的修复

#### 根因定位：
- `src/App.tsx` 中的底部导航栏此前使用了 `absolute bottom-3 sm:bottom-4`，在安卓开启三键导航（返回、Home、任务键）的设备上，系统导航栏会占据屏幕底部约 48px~56px 的空间；
- 若 WebView 未正确展开或者 `env(safe-area-inset-bottom)` 计算有偏差，固定定位的悬浮胶囊会被系统的三按键直接覆盖在上方，导致用户误触或无法点击标签。

#### 修复措施：
- 将底部导航栏容器样式升级为：
  `absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-3 right-3 sm:left-4 sm:right-4 z-30 pointer-events-none select-none pb-[env(safe-area-inset-bottom,0px)]`；
- 为内容主滚动区提供足够的底部安全留白（`pb-28 sm:pb-24`），确保所有页面滚动到最底部时内容完全露出；
- 同步调整右下角悬浮黑胶唱片胶囊的避让间距：
  `fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 sm:bottom-6 sm:right-6 z-40`，使其永远优雅悬浮于底部导航栏斜上方，杜绝重叠与遮挡。
