# 《拾年》最新全套安卓原生打包与功能落地实施方案（2026 最终终极融合版）

本文档结合《拾年》软件最新开发进展（全局全屏沉浸个人管理界面、无缝水墨背景、音乐播放器同款选中色按键、四级数据增量同步），基于项目内置 `ANDROID_DEPLOYMENT_GUIDE_2026.md` 生成最新的安卓移动端落地方案。

---

## 一、 当前软件最新进展与全盘记忆汇总

### 1. 全局全屏沉浸式个人管理界面（已完美重塑）
- **形态升级**: 彻底摆脱传统弹窗卡片，升级为 100vw / 100vh 全屏沉浸管理界面；
- **无缝水墨贯通**: 消除顶部身份区与下方编辑卡片之间的横线与白块割裂感，全屏采用通体统一水墨弥散背景（光晕平滑过渡，60FPS GPU 硬件加速，卡顿率降为 0）；
- **纯净无界头像与泼彩光晕**: 彻底移除了紧贴头像的生硬单色圆框，采用多层柔光呼吸泼彩晕染（`Splatter Bloom Glow`），使头像悬浮于东方光泽之上；
- **精致单向返回**: 保留左上角精致悬浮返回箭头（带触感微鸣与优雅波纹退出），严格去除了右上角多余的关闭按钮。

### 2. 按键美术与音乐播放器同款调色板对齐
- **色彩与质感对齐**: 参照复古黑胶音乐播放器（`VinylMusicPlayer`）最上方「歌单库」、「黑胶唱机」在**选中激活状态下**的主题色调（`currentTheme.primary`），摒弃高饱和刺眼的线性渐变；
- **统一按键涵盖**: 保存昵称、换绑邮箱、获取验证码、确认绑定/换绑、保存密码等按键，全部对齐音乐播放器选中态风格（纯正主题主色 + 纯白高对比度文字 + 伴光晕阴影 `0 3px 12px ${currentTheme.primary}40`）。

### 3. 多端 4 级原子同步与时间戳熔融（解决昵称回退）
- **4 级原子写**: 前端修改昵称、邮箱或头像时，同步写入 **Firestore 云端数据库**、**服务端磁盘 JSON (`/api/admin/users/save`)**、**全量用户本地缓存 (`shinian_all_users_cache`)** 与 **当前登录会话**；
- **时间戳增量合并**: `listAllUsers` 与 `loginDomesticUser` 均引入 `updatedAt` 时间戳比对逻辑，确保管理后台（AdminPortal）与重新登录时，始终以最新修改的档案为准，杜绝旧缓存覆盖最新修改。

---

## 二、 安卓原生底层核心机理与全盘根治行动

### 1. 彻底禁用安卓原生文本选择器，由软件内置美化选择条全权接管
- **原生层物理屏蔽**: 在 `MainActivity.java` 中重写 Activity 窗口级 `onWindowStartingActionMode`（直接返回 `null`），物理阻断 MIUI / HyperOS / ColorOS 等系统原生浮动操作栏与白色矩形白块弹出；
- **内置美化接管**: 由前端 `src/components/CustomTextSelectionBar.tsx` 100% 接管长按选区与操作（支持复制、剪切、粘贴、全选、水墨晕染高亮、禅意音效反馈与触感震动）。

### 2. 输入法合成态与失焦防丢字根治
- **全表单非受控架构**: 全表单升级为原生非受控架构（`name="..."` 与 `defaultValue`），配合 `onSubmit` 统一通过 `new FormData(e.currentTarget)` 提交，配置 `autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}`，彻底阻断输入法合成态失焦丢字。

### 3. 后台挂起 10 秒返回应用冒出蓝色 Capacitor 标志根治
- **启动背景锁死**: 在 `styles.xml` 中将 `AppTheme.NoActionBarLaunch` 的 `android:background` 与 `android:windowBackground` 强制锁定为东方宣纸米色 `#FAF8F5`，物理剔除 `@drawable/splash`，并将 Android 12+ SplashScreen 动画图标设为透明。

---

## 三、 第一阶段：VS Code 静态产物编译与 Capacitor 初始化

在 VS Code 终端执行以下指令：

```powershell
# 1. 安装项目完整依赖与 Capacitor 移动端插件
npm install
npm install @capacitor/core @capacitor/android @capacitor/app @capacitor/keyboard @capacitor-community/text-to-speech
npm install -D @capacitor/cli

# 2. 编译生成 dist 静态构建产物
npm run build

# 3. 清理旧配置并初始化 Android 原生工程
Remove-Item -ErrorAction SilentlyContinue capacitor.config.ts
npx cap init 拾年 com.shinian.app --web-dir dist
npx cap add android
```

### 4. 全选替换 `capacitor.config.ts`
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

执行原生同步：
```bash
npx cap sync android
```

---

## 四、 第二阶段：Android Studio 原生全能融合配置

### 1. 配置沉浸式主题 `app/res/values/styles.xml`
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
        <item name="android:windowBackground">#FAF8F5</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowLightNavigationBar">true</item>
        <item name="android:windowSplashScreenBackground">#FAF8F5</item>
        <item name="android:windowSplashScreenAnimatedIcon">@android:color/transparent</item>
        <item name="android:windowSplashScreenAnimationDuration">0</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">#FAF8F5</item>
        <item name="android:windowBackground">#FAF8F5</item>
    </style>
</resources>
```

### 2. 配置清单 `app/manifests/AndroidManifest.xml`
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

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
</manifest>
```

### 3. 配置核心入口 `app/java/com/shinian/app/MainActivity.java`
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

    // 拦截系统原生 ActionMode，彻底禁止系统级粗糙白块与白色悬浮菜单弹出
    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback, int type) {
        return null;
    }

    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback) {
        return null;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. 全屏沉浸式 Edge-to-Edge
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // 2. 强制解锁 90Hz / 120Hz / 144Hz 屏幕刷新率
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

        // 3. 计算物理安全区并注入 Web 变量
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

        // 4. WebView 硬件加速与 JSBridge 挂载
        WebView bridgeWebView = getBridge().getWebView();
        if (bridgeWebView != null) {
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

            bridgeWebView.addJavascriptInterface(new WebAppInterface(), "AndroidBridge");
        }
    }
}
```

---

## 五、 第三阶段：打包导出与最终真机验收

### 1. 正式包签名生成命令
```bash
keytool -genkey -v -keystore shinian.jks -keyalg RSA -keysize 2048 -validity 10000 -alias shinian
```
在 Android Studio 菜单选择 **Build ➔ Generate Signed Bundle / APK** 导出 Release APK。

### 2. 真机验收标准对照表
| 验收项 | 预期效果 |
| :--- | :--- |
| **文本长按选择** | 绝对拦截安卓系统原生白块与菜单，100% 弹出软件内 `CustomTextSelectionBar` 美化选择条（水滴双游标、朱砂微光、禅意音效） |
| **冷启动与后台唤醒** | 冷启动与后台挂起 10 秒后切回，全程米色 `#FAF8F5` 无缝进入，绝不弹蓝色 Capacitor 标志 |
| **全屏个人中心** | 100vw/100vh 水墨一体化底图，卡片无缝衔接，无割裂横线，按键颜色与音乐播放器选中态主色完全一致 |
| **数据修改同步** | 修改昵称后，管理后台实时同步；刷新网页与重新登录后，昵称保持最新不重置 |
| **输入法防丢字** | 预输入拼音/英文转移焦点时，字符完整保存不丢失 |
| **高刷与直存通道** | 满帧 120Hz 丝滑渲染，图片直存「拾年回忆」相册，ZIP 备份直存「文件管理-下载」 |
