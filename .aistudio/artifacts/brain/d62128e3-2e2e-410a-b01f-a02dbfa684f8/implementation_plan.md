# 《拾年》最新全套安卓原生打包与功能落地实施指南（2026 最终终极融合版）

本文档为《拾年》移动端落地的最终权威落地方案，深度融合了历次方案的全部优点、Windows PowerShell 容错命令规范、以及针对真机实拍缺陷的彻底根治方案：
1. **采用经典步骤一与 PowerShell 容错清理命令**：完美支持包含 `--main` 嵌套路径与 Windows PowerShell 的 `Remove-Item -ErrorAction SilentlyContinue`；
2. **彻底根治后台挂起 10 秒返回应用时再次冒出蓝色 Capacitor 标志的问题**；
3. **彻底根治输入框输入英文后转移到其他输入框时英文被清空、仅保留数字的问题**（失焦事件 DOM 强制提权同步与 IME 合成态保护）；
4. **彻底消除文本选择水滴光标后方的巨大白色矩形方块与浮动操作栏白边割裂**；
5. **全景 GPU 硬件加速与纯合成层渲染**：模态框与卡片全面基于 `scale` 与 `opacity` 变换，按需挂载 `will-change: transform, opacity`，保持现有东方美术设计与色彩质感零降级，彻底杜绝动态高斯模糊导致的瓦片显存击穿与白块/渐变撕裂；
6. **软键盘原生防抖与输入法秒级响应**：`KeyboardResize.Native` 配合原生 `adjustResize`，软键盘弹起时不强制拉伸 `body`；
7. **人物关系输入框纯净化**：彻底移除“知己、密友、同窗、自由、通畅”等所有快捷胶囊标签，仅保留纯净单行输入框；
8. **90Hz / 120Hz / 144Hz 极限屏幕刷新率强制解锁**；
9. **本地离线档案优先 + 云端统一中枢**；
10. **相册直存（Pictures/拾年回忆） + ZIP 压缩包公共下载分类直存通道**；
11. **Debug 快速联调与 Release 正式签名打包双模式实操**。

---

## 核心机理剖析与全盘优化策略

### 1. 为什么转移到其他输入框时英文会被清空、只保留数字？
- **根因深度透析**：
  在 Android 系统上，用户使用输入法输入数字时，键盘直接向输入框提交已确认文本（Committed Text）；但当输入英文字母或拼音时，输入法处于“预输入合成态”（IME Composition）。
  如果用户在未按空格/回车确认的情况下，直接点击另一个输入框（触发原输入框的 `blur` 失焦）：
  1. Chromium/Blink 内核的原生机制在失去焦点时会尝试调用 `ImeCancelComposition()` 取消未完成的合成，导致输入框 DOM 中的英文临时字符被清空；
  2. 若输入框的 React `value` 绑定未在 `blur` 瞬间读取 DOM 当前即时值（Raw Input Value），React 会用之前仅包含数字的 `state` 重新覆盖输入框，导致英文全部丢失！
- **全盘根治行动**：
  在所有输入框（登录注册、人物关系、昵称等）的 `onBlur` 事件中，强制直接捕获当前 DOM 节点的真实值 `e.currentTarget.value` 并立即同步至状态；同时增加 `autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}`，彻底阻断 Android IME 丢词与光标全选误杀。

### 2. 为什么后台挂起 10 秒返回后会再次冒出蓝标？
- **根因透析**：
  原生工程的 `AppTheme.NoActionBarLaunch` 引用了 `<item name="android:background">@drawable/splash</item>`，而 Capacitor 默认创建的 `@drawable/splash` 就是蓝色的交叉图标。当应用后台挂起 10 秒后，Android 系统进入省电管理，切回时系统重新拉起了该启动主题背景，导致蓝标重现！
- **全盘根治行动**：
  在 `styles.xml` 中将 `AppTheme.NoActionBarLaunch` 的 `android:background` 与 `android:windowBackground` 强制统一设为米色 `#FAF8F5`，彻底删除对 `@drawable/splash` 蓝标的引用，并配置 Android 12+ 系统 `SplashScreen` 的动画图标为透明，从底层物理消除蓝标。

---

## 第一阶段：VS Code（前端产物构建与 Capacitor 原生工程初始化）

### 步骤 1：终端定位到项目根目录
在 VS Code 中打开项目根目录，按快捷键 `Ctrl + ~` 唤起内置终端。确保当前路径下直接可以看到 `package.json`、`index.html` 和 `src` 文件夹。
```bash
# 若存在嵌套路径（如末尾为 --main），先进入对应子目录：
cd --main
```

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
```bash
# 1. 容错清理可能存在的旧配置文件（PowerShell 命令）
Remove-Item -ErrorAction SilentlyContinue capacitor.config.ts

# 2. 初始化应用基础信息并创建 android 原生工程
npx cap init 拾年 com.shinian.app --web-dir dist
npx cap add android
```

### 步骤 4：配置 `capacitor.config.ts` 并执行原生同步
在 VS Code 左侧打开 `capacitor.config.ts`，全选替换为以下最新融合配置并保存（`Ctrl + S`）：

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
      // 关键：采用原生 WindowInsets 适配模式，杜绝 body 尺寸抖动与软键盘连续删除延迟
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

打开 Android Studio，点击菜单 **File ➔ Open...**，选中刚才生成的 `android` 文件夹打开。

### 步骤 5：处理 JDK 兼容性（若提示 Incompatible Gradle JVM）
若右下角弹出 `Incompatible Gradle JVM version` 报错：
- 直接点击蓝色的 **Apply compatible Gradle JDK configuration and sync**；
- 或在 **Settings ➔ Build, Execution, Deployment ➔ Build Tools ➔ Gradle** 中，将 **Gradle JDK** 切换为 **Embedded JDK (17 或 21)**，等待右下角 Gradle Sync 完成。

### 步骤 6：配置沉浸式主题与原生选择器无白块透明样式 `styles.xml`
展开目录：`app ➔ res ➔ values ➔ styles.xml`（以及若存在 `values-night/styles.xml`、`values-v31/styles.xml`），全选替换为以下深度优化代码：

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

        <!-- 【核心修复 1】彻底消除冷启动及 Android 12+ 强制居中出现的蓝色 Capacitor 图标 -->
        <item name="android:windowSplashScreenBackground">#FAF8F5</item>
        <item name="android:windowSplashScreenAnimatedIcon">@android:color/transparent</item>
        <item name="android:windowSplashScreenAnimationDuration">0</item>

        <!-- 【核心修复 2】彻底消除图 2 文本选择水滴光标后方巨大白块与浮动操作栏白底 -->
        <item name="android:popupBackground">@android:color/transparent</item>
        <item name="android:windowActionModeOverlay">true</item>
        <item name="actionModeBackground">@android:color/transparent</item>
        <item name="actionModeSplitBackground">@android:color/transparent</item>
        <item name="android:actionModeBackground">@android:color/transparent</item>
        <item name="android:itemBackground">@android:color/transparent</item>
        <item name="android:selectableItemBackground">?android:attr/selectableItemBackgroundBorderless</item>
    </style>

    <!-- 【核心修复 3】消除后台挂起 10 秒切回再次冒出蓝标：绝不引用 @drawable/splash，直接锁定为米色背景 -->
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">#FAF8F5</item>
        <item name="android:windowBackground">#FAF8F5</item>
    </style>
</resources>
```

### 步骤 7：配置清单文件 `AndroidManifest.xml`（权限、硬件加速与全版本权限）
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

### 步骤 8：配置核心入口 `MainActivity.java`（90Hz/120Hz 高刷解锁 + 相册直存 + ZIP 压缩包公共直存）
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

        // 4. 【核心性能突破】强制解锁 90Hz / 120Hz / 144Hz 极限屏幕刷新率
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

        // 6. 【WebView 渲染加速引擎与原生 JSBridge 挂载】
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

            // 挂载原生相册与文件桥接通道
            bridgeWebView.addJavascriptInterface(new WebAppInterface(), "AndroidBridge");
        }
    }
}
```

---

## 第三阶段：前端全盘代码与输入防删优化实施动作

### 步骤 9：前端所有输入框失焦保护与防清空处理
在 `src/components/AuthPortalModal.tsx` 及 `src/components/PersonForms.tsx` 等全盘输入组件中：
1. **防止转移输入框时英文丢失**：
   在所有 `input` 的 `onBlur` 回调中，严格使用 `e.currentTarget.value` 强制确认当前真实 DOM 内容，确保任何输入法未按空格确认的英文字符在失焦瞬间直接固化保存到 React 状态中，绝不丢失：
   ```tsx
   onBlur={(e) => {
     const rawVal = e.currentTarget.value.trim();
     setAccount(rawVal);
   }}
   ```
2. **防止英文被系统自动全选与删除**：
   - 增加输入框 `autoComplete="off"`、`autoCorrect="off"`、`autoCapitalize="none"`、`spellCheck={false}`；
   - 点击输入框时使用 `selectionStart = selectionEnd = value.length` 定位光标至末尾，绝不自动触发 `select()`。
3. **优化全局 `useKeyboardStatus` 触发频次**：
   - 为 `visualViewport.resize` 增加防抖判定，打字输入期间不反复触发布局重刷。

---

## 第四阶段：真机编译运行与双模打包

### 步骤 10：生成自适应图标
在 Android Studio 中右键 `app ➔ res`，选择 **New ➔ Image Asset**，Foreground 缩放至 75%，Background 设为 `#FAF8F5`，生成全套图标。

### 步骤 11：Debug 联调与 Release 正式签名双模式打包
- **模式 A（Debug 联调）**：连接手机开启 USB 调试，点击 **Run 'app'** 直接安装；
- **模式 B（Release 正式签名）**：
  ```bash
  keytool -genkey -v -keystore shinian.jks -keyalg RSA -keysize 2048 -validity 10000 -alias shinian
  ```
  在 Android Studio 中点击 **Build ➔ Generate Signed Bundle / APK**，导入 `shinian.jks`，勾选 V1+V2 签名导出正式 APK。

---

## 第五阶段：真机最终验收清单

| 验收场景 | 预期完美表现 |
| :--- | :--- |
| **冷启动与后台切回** | 启动与后台挂起 10 秒后切回，**全程米色无缝进入页面，绝不出现蓝色 Capacitor 标志** |
| **输入英文字母转移焦点** | 账号或密码输入框输入英文后直接点其他输入框，**英文字符完全保留，绝不被清空或只剩数字** |
| **选区水滴光标** | 长按选中文本，**光标下方完全透明贴合，绝无白色矩形方块，浮动菜单无白边** |
| **高刷与动画流畅度** | 模态框与卡片滑动展开保持 **90Hz / 120Hz 满帧**，无任何白色或渐变撕裂色块 |
| **公共直存通道** | 卡片直达系统相册「拾年回忆」，全量备份 ZIP 直达系统「下载」与「压缩包」分类目录 |
