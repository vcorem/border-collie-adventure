package com.bordercollie.adventure;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable audio playback without user gesture requirement
        WebSettings webSettings = getBridge().getWebView().getSettings();
        webSettings.setMediaPlaybackRequiresUserGesture(false);
    }
}
