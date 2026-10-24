package com.hassanme2050.quranaq;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.view.WindowInsets;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.util.Collections;

public class MainActivity extends Activity {
    private static final String HOME = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int SAVE_SCORECARD = 10;
    private WebView webView;
    private byte[] pendingScorecard;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(7, 54, 54));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                android.graphics.Insets safe = windowInsets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return windowInsets;
            });
        }
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 54, 54));
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equals(url.getScheme()) && "appassets.androidplatform.net".equals(url.getHost())) {
                    WebResourceResponse resource = loader.shouldInterceptRequest(url);
                    if (resource != null) return resource;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equals(url.getScheme()) && "appassets.androidplatform.net".equals(url.getHost())) return false;
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new ScorecardBridge(), "Android");
        webView.loadUrl(HOME);
    }

    private final class ScorecardBridge {
        @JavascriptInterface public void saveScorecard(String dataUrl) {
            if (dataUrl == null || !dataUrl.startsWith("data:image/png;base64,") || dataUrl.length() > 12000000) return;
            try {
                byte[] png = Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), Base64.DEFAULT);
                if (png.length < 8 || png[0] != (byte)137 || png[1] != 80 || png[2] != 78 || png[3] != 71) return;
                runOnUiThread(() -> {
                    if (pendingScorecard != null) return;
                    pendingScorecard = png;
                    Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    save.addCategory(Intent.CATEGORY_OPENABLE);
                    save.setType("image/png");
                    save.putExtra(Intent.EXTRA_TITLE, "QuranAQ_Scorecard.png");
                    try { startActivityForResult(save, SAVE_SCORECARD); }
                    catch (Exception error) { pendingScorecard = null; toast("No file-saving app is available."); }
                });
            } catch (IllegalArgumentException ignored) { }
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != SAVE_SCORECARD) return;
        byte[] png = pendingScorecard;
        pendingScorecard = null;
        if (result != RESULT_OK || data == null || data.getData() == null || png == null) return;
        try (OutputStream output = getContentResolver().openOutputStream(data.getData())) {
            if (output == null) throw new java.io.IOException("No output stream");
            output.write(png);
            toast("Scorecard saved.");
        } catch (Exception error) { toast("Could not save the scorecard."); }
    }

    @Override public void onBackPressed() {
        webView.evaluateJavascript("(function(){var home=document.getElementById('menu-view');if(home&&home.classList.contains('hidden')){var exit=document.querySelector('[data-action=exitToHome]');if(exit){exit.click();return true;}}return false;})()", handled -> {
            if (!"true".equals(handled)) finish();
        });
    }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    @Override protected void onDestroy() {
        webView.removeJavascriptInterface("Android");
        webView.destroy();
        pendingScorecard = null;
        super.onDestroy();
    }
}
