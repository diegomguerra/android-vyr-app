package com.vyrlabs.app.android.healthconnect;

import android.util.Log;
import android.content.pm.PackageManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {

    private static final String TAG = "HealthConnectPlugin";

    private static final String[] HEALTH_PERMISSIONS = {
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.READ_RESTING_HEART_RATE",
        "android.permission.health.READ_HEART_RATE_VARIABILITY",
        "android.permission.health.READ_OXYGEN_SATURATION",
        "android.permission.health.READ_RESPIRATORY_RATE",
        "android.permission.health.READ_SLEEP"
    };

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            boolean available = ContextCompat.checkSelfPermission(
                getContext(),
                "android.permission.health.READ_STEPS"
            ) != PackageManager.PERMISSION_DENIED || android.os.Build.VERSION.SDK_INT >= 26;
            JSObject ret = new JSObject();
            ret.put("available", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "isAvailable error", e);
            JSObject ret = new JSObject();
            ret.put("available", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        try {
            getActivity().requestPermissions(HEALTH_PERMISSIONS, 1001);
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "requestPermissions error", e);
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void readSteps(PluginCall call) {
        readHealthData("steps", call);
    }

    @PluginMethod
    public void readHeartRate(PluginCall call) {
        readHealthData("heartRate", call);
    }

    @PluginMethod
    public void readRestingHeartRate(PluginCall call) {
        readHealthData("restingHeartRate", call);
    }

    @PluginMethod
    public void readHRV(PluginCall call) {
        readHealthData("hrv", call);
    }

    @PluginMethod
    public void readSpO2(PluginCall call) {
        readHealthData("spo2", call);
    }

    @PluginMethod
    public void readSleep(PluginCall call) {
        readHealthData("sleep", call);
    }

    private void readHealthData(String type, PluginCall call) {
        try {
            JSArray samples = new JSArray();
            JSObject ret = new JSObject();
            ret.put("samples", samples);
            ret.put("type", type);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "readHealthData error for " + type, e);
            call.reject(e.getMessage());
        }
    }
}