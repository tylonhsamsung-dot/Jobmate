package com.jobmate.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

class MainActivity : Activity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.webViewClient = WebViewClient()
        webView.addJavascriptInterface(AppBridge(), "Android")

        setContentView(webView)
        webView.loadUrl("file:///android_asset/index.html")
    }

    inner class AppBridge {

        @JavascriptInterface
        fun shareText(text: String) {
            runOnUiThread {
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                startActivity(
                    Intent.createChooser(intent, "Share with")
                )
            }
        }

        @JavascriptInterface
        fun printPdf() {
            runOnUiThread {
                try {
                    val manager = getSystemService(
                        PRINT_SERVICE
                    ) as PrintManager

                    val adapter = webView.createPrintDocumentAdapter(
                        "JobMate-document"
                    )

                    manager.print(
                        "JobMate document",
                        adapter,
                        PrintAttributes.Builder().build()
                    )
                } catch (e: Exception) {
                    Toast.makeText(
                        this@MainActivity,
                        "Could not open printing",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    @Deprecated("Deprecated in Android")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
