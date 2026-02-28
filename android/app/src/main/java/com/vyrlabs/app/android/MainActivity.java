package com.vyrlabs.app.android;
import com.getcapacitor.BridgeActivity;
import com.vyrlabs.app.android.healthconnect.HealthConnectPlugin;
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class);
        super.onCreate(savedInstanceState);
    }
}