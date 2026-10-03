# 《拾年》最新全套安卓原生打包与功能落地实施指南（2026 最终版）

本文档为《拾年》移动端终极落地方案，融合了：
1. **全景软键盘原生防抖适配**（避免页面 body 抖动重排，彻底解决焦点切换文字丢失与按键延迟）
2. **原生文本选择器无白块透明贴合**（消除图标白色方块底衬，与东方水墨绿主题自然契合）
3. **90Hz / 120Hz 极限屏幕刷新率强制解锁**（满帧丝滑，告别动画卡顿）
4. **GPU 硬件加速与复合图层隔离**（消除动态毛玻璃导致的显存瓦片崩溃、瞬间空白方块与渐变色块撕裂）
5. **本地离线档案优先 + 云端统一鉴权中枢**（日程、相册、故事、信物本地秒开；账号登录、授权、网关走云端）
6. **相册直存（Pictures/拾年回忆） + ZIP 压缩包公共下载分类直存通道**

---

## 第一阶段：VS Code（前端产物构建与 Capacitor 原生工程初始化）

### 步骤 1：终端定位到项目根目录
在 VS Code 中打开项目根目录，按快捷键 `Ctrl + ~` 唤起内置终端。确保当前路径下直接可以看到 `package.json`、`index.html` 和 `src` 文件夹。
```bash
# 若存在嵌套路径，先进入对应子目录
ls -la
```

### 步骤 2：安装最新完整依赖并编译 Web 静态产物
```bash
# 1. 安装基础项目依赖
npm install

# 2. 安装 Capacitor 核心、Android 平台、返回键插件、键盘插件及原生语音插件
npm install @capacitor/core @capacitor/android @capacitor/app @capacitor/keyboard @capacitor-community/text-to-speech
npm install -D @capacitor/cli

# 3. 编译打包生成 dist 静态产物目录
npm run build
```

### 步骤 3：初始化 Capacitor 并生成 Android 原生工程
```bash
# 1. 容错清理旧配置
rm -f capacitor.config.ts

# 2. 初始化应用基础信息并创建 android 原生工程
npx cap init 拾年 com.shinian.app --web-dir dist
npx cap add android
```

### 步骤 4：配置 `capacitor.config.ts` 并执行原生同步
在 VS Code 左侧打开 `capacitor.config.ts`，全选替换为以下最新配置并保存（`Ctrl + S`）：

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
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      // 采用原生 WindowInsets 适配模式，避免触发布局全屏重排与软键盘删除键延迟
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

打开 Android Studio，点击菜单 **File ➔ Open...**，选中刚生成的 `android` 文件夹打开。

### 步骤 5：处理 JDK 兼容性（若提示 Incompatible Gradle JVM）
若右下角弹出 `Incompatible Gradle JVM version` 报错：
- 直接点击蓝色的 **Apply compatible Gradle JDK configuration and sync**；
- 或在 **Settings ➔ Build, Execution, Deployment ➔ Build Tools ➔ Gradle** 中，将 **Gradle JDK** 切换为 **Embedded JDK (17 或 21)**，等待右下角 Gradle Sync 完成。

### 步骤 6：配置沉浸式主题与文本选择器透明样式 `styles.xml`
在左侧目录树展开：`app ➔ res ➔ values ➔ styles.xml`（或 `themes.xml`），全选替换为以下代码：

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

        <!-- 启动底色与全局米色背景保持一致，杜绝冷白闪屏 -->
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

    <!-- 【核心修复 3】消除后台切回时再次冒出的蓝标：绝不引用 @drawable/splash，直接锁定为米色背景 -->
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">#FAF8F5</item>
        <item name="android:windowBackground">#FAF8F5</item>
    </style>
</resources>
```

### 步骤 7：配置清单文件 `AndroidManifest.xml`（权限、硬件加速与大内存）
在左侧展开：`app ➔ manifests ➔ AndroidManifest.xml`，全选替换为以下代码：

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

    <!-- 网络请求、音频播放、相册与文件下载存取权限 -->
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
在左侧展开：`app ➔ java ➔ com.shinian.app ➔ MainActivity.java`，全选替换为以下最新融合代码：

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
        // 1. 卡片工坊：相片直存至系统相册
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

        // 2. 状态栏与导航栏图标深色化，适配东方米色背景
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }

        // 3. Android 10+ 禁用系统强制追加的半透明遮罩
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // 4. 【核心性能突破】强制解锁 90Hz / 120Hz 极限屏幕刷新率
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
                    "document.documentElement.style.setProperty('--safe-area-bottom', '%dpx');", topDp, bottomDp
                );
                webView.post(() -> webView.evaluateJavascript(js, null));
            }

            return windowInsets;
        });

        // 6. 【WebView 渲染加速引擎与原生 JSBridge 挂载】
        WebView bridgeWebView = getBridge().getWebView();
        if (bridgeWebView != null) {
            // 启用硬件加速与透明背景
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

## 第三阶段：真机编译运行与导出 APK

### 步骤 9：生成全套高清分辨率图标
1. 在 Android Studio 左侧目录树右键点击 `app ➔ res` 文件夹；
2. 选择 **New ➔ Image Asset**；
3. 在 **Foreground Layer** 选中图标素材，调整 Resize 滑块至 75% 左右，使主体落在安全虚线圆圈内；
4. 在 **Background Layer** 选中 Color，填入东方米色 `#FAF8F5`；
5. 点击 **Next ➔ Finish**，自动生成全套自适应图标。

### 步骤 10：构建缓存清理与真机安装 / 导出 APK
1. 点击 Android Studio 顶部菜单：**Build ➔ Clean Project**；
2. 点击 **Build ➔ Rebuild Project**；
3. 用 USB 数据线将开启了「开发者选项 & USB 调试」的安卓手机连接电脑；
4. 在顶部设备下拉框选中手机，点击绿色运行按钮 **Run 'app'**（快捷键 `Shift + F10`）直接推送到手机安装；
5. 若需导出离线 APK 安装包，点击顶部菜单 **Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)** 即可获取 `.apk` 文件。

---

## 第四阶段：真机全景核心功能验收清单

1. **90Hz / 120Hz 高刷新率极致丝滑**：页面滚动、大图抽屉进出与黑胶唱片旋转保持满帧，绝不出现空白方块或渐变撕裂色块。
2. **输入框焦点与删除健秒级响应**：在添加人物、登录注册等所有输入框输入文字，切换到其他输入框文字稳定保留；点击软键盘删除键立刻响应无延迟。
3. **原生文本选择器无白块贴合**：选中文本长按时，系统原生浮动菜单图标下底色完全透明，不产生突兀的白色矩形方块，与水墨绿高亮自然统一。
4. **关系输入框纯净极简**：添加与编辑人物界面中无任何“知己、密友”等多余胶囊标签，纯净单行输入。
5. **ZIP 压缩包公共直存**：在「离线档案备份」中点击「全量打包导出 ZIP」，手机「文件管理 ➔ 压缩包」或「下载」分类中可直接看到 `.zip` 备份包。
6. **回忆卡片工坊相册直存**：点击「保存卡片到手机相册」，直接无缝写入手机自带相册的「拾年回忆」相簿。
7. **安卓三键导航栏防遮挡**：无论开启全屏手势还是传统三键导航，底部导航栏与黑胶唱片胶囊均自适应抬升避让。
8. **23 级物理返回键层级退回**：大图灯箱、相册多选、修改口令、旧物编辑等所有弹窗均可通过手机物理返回键优雅逐层关闭。
