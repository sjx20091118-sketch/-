# 《拾年》最新全套安卓原生打包与功能落地实施指南（2026 最终终极融合版）

本文档为《拾年》移动端落地的最终权威方案，深度融合了全套最新架构进展、个人中心沉浸式管理、无缝水墨背景、音乐播放器同款调色板按键、多端 4 级数据原子增量同步、Windows PowerShell 容错规范、彻底禁用安卓原生选择器浮层并由软件内置东方美化选择条（CustomTextSelectionBar）全权接管、前端原生桥接通道（相册直存与 ZIP 分类直存）、失焦防丢字、90Hz/120Hz 高刷解锁以及后台防蓝标等全项优化。

---

## 核心机理剖析与全盘根治行动

### 1. 全局沉浸个人管理中心与无缝水墨背景（最新架构）
- **全屏通体形态**: 彻底摆脱传统弹窗卡片，升级为 100vw / 100vh 全屏沉浸管理界面；
- **无缝水墨贯通**: 消除顶部身份区与下方编辑卡片之间的横线与白块割裂感，全屏采用通体统一水墨弥散背景（光晕平滑过渡，60FPS GPU 硬件加速）；
- **纯净无界头像与泼彩光晕**: 彻底移除了紧贴头像的生硬单色圆框，采用多层柔光呼吸泼彩晕染（`Splatter Bloom Glow`），使头像悬浮于东方光泽之上；
- **精致单向返回**: 保留左上角精致悬浮返回箭头（带触感微鸣与优雅波纹退出），严格去除了右上角多余的关闭按钮。

### 2. 按键美术与音乐播放器同款调色板对齐（最新架构）
- **色彩与质感对齐**: 参照复古黑胶音乐播放器（`VinylMusicPlayer`）最上方「歌单库」、「黑胶唱机」在**选中激活状态下**的主题色调（`currentTheme.primary`），摒弃高饱和刺眼的线性渐变；
- **统一按键涵盖**: 保存昵称、换绑邮箱、获取验证码、确认绑定/换绑、保存密码等按键，全部对齐音乐播放器选中态风格（纯正主题主色 + 纯白高对比度文字 + 伴光晕阴影 `0 3px 12px ${currentTheme.primary}40`）。

### 3. 多端 4 级原子同步与时间戳熔融（根治昵称回退）
- **4 级原子写**: 前端修改昵称、邮箱或头像时，同步写入 **Firestore 云端数据库**、**服务端磁盘 JSON (`/api/admin/users/save`)**、**全量用户本地缓存 (`shinian_all_users_cache`)** 与 **当前登录会话**；
- **时间戳增量合并**: `listAllUsers` 与 `loginDomesticUser` 均引入 `updatedAt` 时间戳比对逻辑，确保管理后台（AdminPortal）与重新登录时，始终以最新修改的档案为准，杜绝旧缓存覆盖最新修改。

### 4. 彻底禁用安卓原生选择器，由软件内置美化选择条全权接管
- **原生层物理屏蔽**: 在 `MainActivity.java` 中重写 Activity 窗口级 `onWindowStartingActionMode`（直接返回 `null`），物理阻断系统原生浮动操作栏与白块弹出；
- **软件内置美化接管**: 由前端 `src/components/CustomTextSelectionBar.tsx` 100% 接管长按选区与操作（支持复制、剪切、粘贴、全选、水墨晕染高亮、禅意音效反馈与触感震动）。

### 5. 输入法合成态与失焦防丢字根治
- **全表单非受控架构**: 前端全表单全面升级为原生非受控架构（`name="..."` 与 `defaultValue`），配合 `onSubmit` 统一通过 `new FormData(e.currentTarget)` 提交，配置 `autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}`，彻底阻断输入法合成态失焦丢字。

### 6. 后台挂起 10 秒返回应用冒出蓝色 Capacitor 标志根治
- **启动背景锁死**: 在 `styles.xml` 中将 `AppTheme.NoActionBarLaunch` 的 `android:background` 与 `android:windowBackground` 强制锁定为东方宣纸米色 `#FAF8F5`，物理剔除 `@drawable/splash`，并将 Android 12+ SplashScreen 动画图标设为透明。

---

## 第一阶段：VS Code（前端产物构建与 Capacitor 初始化）

### 步骤 1：定位项目根目录
在 VS Code 中打开项目根目录，按快捷键 `Ctrl + ~` 唤起终端。

### 步骤 2：安装最新完整依赖并编译 Web 静态产物
```bash
# 1. 安装基础项目依赖
npm install

# 2. 安装 Capacitor 核心、Android 平台、返回键插件、键盘插件及原生级联语音插件
npm install @capacitor/core @capacitor/android @capacitor/app @capacitor/keyboard @capacitor-community/text-to-speech
npm install -D @capacitor/cli

# 3. 编译打包生成 dist 静态产物目录
npm run build
```

### 步骤 3：初始化 Capacitor 并生成 Android 原生工程
```powershell
# 1. 容错清理可能存在的旧配置文件（PowerShell 命令）
Remove-Item -ErrorAction SilentlyContinue capacitor.config.ts

# 2. 初始化应用基础信息并创建 android 原生工程
npx cap init 拾年 com.shinian.app --web-dir dist
npx cap add android
```

### 步骤 4：配置 capacitor.config.ts 并执行原生同步
在 VS Code 左侧打开 `capacitor.config.ts`，全选替换为以下最新配置：
```typescript
import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.shinian.app',
  appName: '拾年',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#FAF8F5',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      // 采用原生 WindowInsets 模式，杜绝 body 尺寸抖动与软键盘连续删除延迟
      resize: KeyboardResize.Native,
      style: KeyboardStyle.Light,
      resizeOnFullScreen: true,
    },
    App: {},
  },
  android: {
    backgroundColor: '#FAF8F5',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
```

保存后，在终端执行原生同步命令：
```bash
npx cap sync android
```

---

## 第二阶段：Android Studio（原生全能融合配置）

打开 Android Studio，点击菜单 **File ➔ Open...**，选中生成的 `android` 目录打开。

### 步骤 5：处理 JDK 兼容性（若提示 Incompatible Gradle JVM）
若右下角弹出 *Incompatible Gradle JVM version* 报错：
1. 点击蓝色的 **Apply compatible Gradle JDK configuration and sync**；
2. 或在 **Settings ➔ Build, Execution, Deployment ➔ Build Tools ➔ Gradle** 中，将 Gradle JDK 切换为 **Embedded JDK (17 或 21)**。

### 步骤 6：配置沉浸式主题 styles.xml（消除冷启动蓝标与透明无缝背景）
展开目录：`app ➔ res ➔ values ➔ styles.xml`，全选替换为以下代码：

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>

        <!-- 启动底色统一为东方米色，杜绝冷白闪屏 -->
        <item name="android:windowBackground">#FAF8F5</item>

        <!-- 开启真正的全沉浸透明状态栏与导航栏绘制 -->
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>

        <!-- 图标颜色深色化，完美适配东方米色背景 -->
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowLightNavigationBar">true</item>

        <!-- 彻底消除冷启动及 Android 12+ 强制居中出现的蓝色 Capacitor 图标 -->
        <item name="android:windowSplashScreenBackground">#FAF8F5</item>
        <item name="android:windowSplashScreenAnimatedIcon">@android:color/transparent</item>
        <item name="android:windowSplashScreenAnimationDuration">0</item>
    </style>

    <!-- 消除后台挂起 10 秒切回再次冒出蓝标：绝不引用 @drawable/splash，直接锁定为米色背景 -->
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">#FAF8F5</item>
        <item name="android:windowBackground">#FAF8F5</item>
    </style>
</resources>
```

### 步骤 7：配置清单文件 AndroidManifest.xml
在左侧展开：`app ➔ manifests ➔ AndroidManifest.xml`，全选替换为以下完整代码：

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="拾年"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true"
        android:largeHeap="true"
        android:enableOnBackInvokedCallback="false">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="拾年"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true"
            android:windowSoftInputMode="adjustResize|stateAlwaysHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>

    <!-- 网络请求、音频播放、相册与文件下载存取完整权限（兼容 Android 10 至 Android 15） -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
</manifest>
```

### 步骤 8：配置核心入口 MainActivity.java（彻底禁用原生选择器 + 高刷解锁 + 相册/ZIP分类直存）
在左侧展开：`app ➔ java ➔ com.shinian.app ➔ MainActivity.java`，全选替换为以下终极融合代码：

```java
package com.shinian.app;

import android.content.ContentValues;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.ActionMode;
import android.view.Display;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    public class WebAppInterface {
        // 1. 卡片工坊：相片直存至系统相册（Pictures/拾年回忆）
        @JavascriptInterface
        public void saveImageToGallery(String base64Data, String filename) {
            try {
                String cleanBase64 = base64Data.contains(",") ? base64Data.split(",")[1] : base64Data;
                byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/拾年回忆");
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);
                }

                Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                        out.write(imageBytes);
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        values.clear();
                        values.put(MediaStore.Images.Media.IS_PENDING, 0);
                        getContentResolver().update(uri, values, null, null);
                    }
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "卡片已保存至系统相册「拾年回忆」", Toast.LENGTH_SHORT).show());
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // 2. 全量备份：ZIP 压缩包直接存入公共「下载」与「压缩包」分类目录（绝非内部沙盒缓存）
        @JavascriptInterface
        public void saveZipToDownloads(String base64Data, String filename) {
            try {
                String cleanBase64 = base64Data.contains(",") ? base64Data.split(",")[1] : base64Data;
                byte[] zipBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                    values.put(MediaStore.Downloads.MIME_TYPE, "application/zip");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/拾年备份");
                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                            out.write(zipBytes);
                        }
                        values.clear();
                        values.put(MediaStore.Downloads.IS_PENDING, 0);
                        getContentResolver().update(uri, values, null, null);
                        runOnUiThread(() -> Toast.makeText(MainActivity.this, "全量备份包已保存至手机「文件管理 - 下载」", Toast.LENGTH_LONG).show());
                    }
                } else {
                    File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File zipFile = new File(downloadDir, filename);
                    try (FileOutputStream fos = new FileOutputStream(zipFile)) {
                        fos.write(zipBytes);
                    }
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "全量备份包已保存至手机「下载」目录", Toast.LENGTH_LONG).show());
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    // 彻底禁用原生 Android 系统的文本选择 ActionMode（拦截系统白色浮动菜单与白块）
    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback, int type) {
        return null; // 拦截系统 ActionMode 弹窗，由前端 CustomTextSelectionBar 全权接管
    }

    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback) {
        return null; // 拦截传统 ActionMode
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. 全屏沉浸式 Edge-to-Edge
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // 2. 状态栏与导航栏图标深色化，完美适配东方米色背景
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }

        // 3. Android 10+ 禁用系统强制追加的半透明蒙层
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // 4. 强制解锁 90Hz / 120Hz / 144Hz 极限屏幕刷新率
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                WindowManager.LayoutParams params = window.getAttributes();
                Display display = getWindowManager().getDefaultDisplay();
                Display.Mode[] modes = display.getSupportedModes();
                Display.Mode maxMode = null;
                float maxRefreshRate = 60.0f;
                for (Display.Mode mode : modes) {
                    if (mode.getRefreshRate() > maxRefreshRate) {
                        maxRefreshRate = mode.getRefreshRate();
                        maxMode = mode;
                    }
                }
                if (maxMode != null) {
                    params.preferredDisplayModeId = maxMode.getModeId();
                    window.setAttributes(params);
                }
            } catch (Exception ignored) {}
        }

        // 5. 实时计算物理高度并向 Web 注入 CSS 安全区变量
        View decorView = window.getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );

            float density = getResources().getDisplayMetrics().density;
            int topDp = (int) (insets.top / density);
            int bottomDp = (int) (insets.bottom / density);

            WebView webView = getBridge().getWebView();
            if (webView != null) {
                String js = String.format(
                    "document.documentElement.style.setProperty('--safe-area-top', '%dpx');" +
                    "document.documentElement.style.setProperty('--safe-area-bottom', '%dpx');",
                    topDp, bottomDp
                );
                webView.post(() -> webView.evaluateJavascript(js, null));
            }

            return windowInsets;
        });

        // 6. WebView 渲染加速引擎与原生 JSBridge 挂载
        WebView bridgeWebView = getBridge().getWebView();
        if (bridgeWebView != null) {
            // 启用硬件加速绘制层与透明背景
            bridgeWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            bridgeWebView.setBackgroundColor(Color.TRANSPARENT);

            WebSettings settings = bridgeWebView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setUserAgentString(settings.getUserAgentString().replace("; wv", ""));
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            // 挂载原生相册与文件桥接通道 (由 MainActivity 的 onWindowStartingActionMode 全局拦截原生选择器，由前端 CustomTextSelectionBar 美化接管)
            bridgeWebView.addJavascriptInterface(new WebAppInterface(), "AndroidBridge");
        }
    }
}
```

---

## 第三阶段：真机编译运行与双模打包

### 步骤 9：生成自适应图标
在 Android Studio 中右键 `app ➔ res`，选择 **New ➔ Image Asset**，Foreground 缩放至 75%，Background 设为 `#FAF8F5`，生成全套图标。

### 步骤 10：Debug 联调与 Release 正式签名双模式打包
- **模式 A（Debug 联调）**：连接手机开启 USB 调试，点击 **Run 'app'** 直接安装。
- **模式 B（Release 正式签名）**：
  ```bash
  keytool -genkey -v -keystore shinian.jks -keyalg RSA -keysize 2048 -validity 10000 -alias shinian
  ```
  在 Android Studio 中点击 **Build ➔ Generate Signed Bundle / APK**，导入 `shinian.jks`，勾选 V1+V2 签名导出正式 APK。

---

## 第四阶段：真机最终验收清单

| 验收场景 | 预期完美表现 |
| :--- | :--- |
| **文本选择与浮动操作栏** | 长按选中文本，安卓系统原生粗糙白块与白色操作菜单完全被拦截屏蔽，仅呈现软件内置东方琉璃美化选择条（水滴双游标、水墨朱砂双层微光、复制/剪切/粘贴/全选） |
| **全屏沉浸个人管理** | 100vw/100vh 水墨一体化底图，卡片无缝衔接，无割裂横线；保存昵称等按键色彩与音乐播放器选中态完全一致 |
| **多端数据与昵称同步** | 修改昵称后，管理后台实时同步；刷新网页与重新登录后，昵称保持最新不重置（4 级原子同步 + 时间戳熔融） |
| **冷启动与后台切回** | 启动与后台挂起 10 秒后切回，全程米色 `#FAF8F5` 无缝进入页面，绝不出现蓝色 Capacitor 标志 |
| **输入英文字母转移焦点** | 账号或密码输入框输入英文后直接点其他输入框，英文字符完全保留，绝不被清空或只剩数字 |
| **高刷与动画流畅度** | 模态框与卡片滑动展开保持 90Hz / 120Hz / 144Hz 满帧，无任何白色或渐变撕裂色块 |
| **公共直存通道** | 卡片直达系统相册「拾年回忆」，全量备份 ZIP 直达系统「下载」与「压缩包」分类目录 |
