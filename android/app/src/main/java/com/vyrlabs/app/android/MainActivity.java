package com.vyrlabs.app.android;

import android.os.Bundle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.health.connect.client.PermissionController;
import com.getcapacitor.BridgeActivity;
import com.vyrlabs.app.android.healthconnect.HealthConnectPlugin;
import com.vyrlabs.app.android.qring.QRingPlugin;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    public static ActivityResultLauncher<Set<String>> permissionLauncher;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(QRingPlugin.class);
        super.onCreate(savedInstanceState);
        permissionLauncher = registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
            grantedPermissions -> {
                HealthConnectPlugin.onPermissionsResult(grantedPermissions);
            }
        );
    }
}
