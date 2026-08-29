package com.classquant.hub;

import android.annotation.SuppressLint;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefreshLayout;

    // Remote Hosted URL for Instant OTA Live Updates (or local fallback)
    // Replace with your GitHub Pages URL, Vercel, or NAS Web URL:
    private static final String REMOTE_OTA_URL = "https://albert-classquant.github.io/app/";
    private static final String LOCAL_FALLBACK_URL = "file:///android_asset/www/index.html";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        swipeRefreshLayout = new SwipeRefreshLayout(this);
        swipeRefreshLayout.addView(webView);
        setContentView(swipeRefreshLayout);

        // Configure WebView Settings
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Offline & Cache Optimization for Instant Loading
        if (isNetworkAvailable()) {
            settings.setCacheMode(WebSettings.LOAD_DEFAULT); // Fetch latest when online
        } else {
            settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK); // Use local offline cache
        }

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                swipeRefreshLayout.setRefreshing(false);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false; // Stay inside WebView
            }
        });

        // Swipe-down to refresh for instant OTA updates
        swipeRefreshLayout.setOnRefreshListener(() -> {
            webView.reload();
        });

        // Load entry point
        loadAppEntryPoint();
    }

    private void loadAppEntryPoint() {
        if (isNetworkAvailable()) {
            webView.loadUrl(REMOTE_OTA_URL);
        } else {
            webView.loadUrl(LOCAL_FALLBACK_URL);
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if ((keyCode == KeyEvent.KEYCODE_BACK) && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
