package com.hassanme2050.quranaq;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends Activity {
    private static final String HOME="https://appassets.androidplatform.net/assets/www/index.html";
    private static final int SAVE_DOCUMENT=10,OPEN_DOCUMENT=20;
    private static final Set<String> HOSTS=new HashSet<>(Arrays.asList("raw.githubusercontent.com","api.github.com","fonts.googleapis.com","fonts.gstatic.com","api.alquran.cloud","alquran.api.islamic.network"));
    private WebView webView;
    private byte[] pendingFile;
    private ValueCallback<Uri[]> pendingChooser;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(7,54,54));
        if(Build.VERSION.SDK_INT>=30){
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view,insets)->{
                android.graphics.Insets safe=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout());
                view.setPadding(safe.left,safe.top,safe.right,safe.bottom);return insets;
            });
        }
        webView=new WebView(this);webView.setBackgroundColor(Color.rgb(7,54,54));
        root.addView(webView,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        WebSettings settings=webView.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri url=request.getUrl();
                if("https".equals(url.getScheme())&&"appassets.androidplatform.net".equals(url.getHost())){
                    WebResourceResponse local=loader.shouldInterceptRequest(url);if(local!=null)return local;
                }else if("https".equals(url.getScheme())&&HOSTS.contains(url.getHost()))return null;
                return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri url=request.getUrl();if("https".equals(url.getScheme())&&"appassets.androidplatform.net".equals(url.getHost()))return false;
                if(request.isForMainFrame()&&"https".equals(url.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,url));}catch(Exception ignored){}
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(pendingChooser!=null)pendingChooser.onReceiveValue(null);pendingChooser=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");
                try{startActivityForResult(intent,OPEN_DOCUMENT);}catch(Exception error){pendingChooser=null;callback.onReceiveValue(null);toast("No file picker is available.");}return true;
            }
        });
        webView.addJavascriptInterface(new DownloadBridge(),"Android");webView.loadUrl(HOME);
    }
    private final class DownloadBridge {
        @JavascriptInterface public void saveScorecard(String dataUrl){saveFile(dataUrl,"QuranAQ_Scorecard.png","image/png");}
        @JavascriptInterface public void saveFile(String dataUrl,String filename,String mime){
            if(dataUrl==null||dataUrl.length()>12000000||(!"image/png".equals(mime)&&!"application/json".equals(mime))||!dataUrl.startsWith("data:"+mime+";base64,"))return;
            try{
                byte[] bytes=Base64.decode(dataUrl.substring(dataUrl.indexOf(',')+1),Base64.DEFAULT);
                if("image/png".equals(mime)&&(bytes.length<8||bytes[0]!=(byte)137||bytes[1]!=80||bytes[2]!=78||bytes[3]!=71))return;
                String title=filename==null?"QuranAQ_Download":filename.replaceAll("[^A-Za-z0-9._-]","_");
                runOnUiThread(()->{
                    if(pendingFile!=null)return;pendingFile=bytes;
                    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(mime);intent.putExtra(Intent.EXTRA_TITLE,title);
                    try{startActivityForResult(intent,SAVE_DOCUMENT);}catch(Exception error){pendingFile=null;toast("No file-saving app is available.");}
                });
            }catch(IllegalArgumentException ignored){}
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==OPEN_DOCUMENT){ValueCallback<Uri[]> callback=pendingChooser;pendingChooser=null;if(callback!=null)callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));return;}
        if(request!=SAVE_DOCUMENT)return;byte[] bytes=pendingFile;pendingFile=null;
        if(result!=RESULT_OK||data==null||data.getData()==null||bytes==null)return;
        try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){if(stream==null)throw new java.io.IOException("No output");stream.write(bytes);toast("File saved.");}catch(Exception error){toast("Could not save the file.");}
    }
    @Override public void onBackPressed(){
        webView.evaluateJavascript("(function(){var overlay=document.getElementById('verse-details-view');if(overlay&&!overlay.classList.contains('hidden')){document.getElementById('verse-back-btn').click();return true;}var home=document.getElementById('menu-view');if(home&&home.classList.contains('hidden')){var exit=document.querySelector('[data-action=exitToHome]');if(exit){exit.click();return true;}}return false;})()",handled->{if(!"true".equals(handled))finish();});
    }
    private void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    @Override protected void onDestroy(){if(pendingChooser!=null)pendingChooser.onReceiveValue(null);webView.removeJavascriptInterface("Android");webView.destroy();pendingFile=null;super.onDestroy();}
}
