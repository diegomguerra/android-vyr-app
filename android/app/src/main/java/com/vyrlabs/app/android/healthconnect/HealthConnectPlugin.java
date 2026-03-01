package com.vyrlabs.app.android.healthconnect;

import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.util.Log;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;

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
        JSObject ret = new JSObject();
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        try {
            getActivity().requestPermissions(HEALTH_PERMISSIONS, 1001);
        } catch (Exception e) {
            Log.e(TAG, "requestPermissions error", e);
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void readSteps(PluginCall call) {
        String startDate = call.getString("startDate");
        String endDate = call.getString("endDate");
        JSArray samples = queryHealthConnect(
            "androidx.health.platform.client.provider.HealthDataProvider/steps",
            startDate, endDate, "count"
        );
        JSObject ret = new JSObject();
        ret.put("samples", samples);
        call.resolve(ret);
    }

    @PluginMethod
    public void readHeartRate(PluginCall call) {
        String startDate = call.getString("startDate");
        String endDate = call.getString("endDate");
        JSArray samples = queryHealthConnect(
            "androidx.health.platform.client.provider.HealthDataProvider/heart_rate",
            startDate, endDate, "samples"
        );
        JSObject ret = new JSObject();
        ret.put("samples", samples);
        call.resolve(ret);
    }

    @PluginMethod
    public void readRestingHeartRate(PluginCall call) {
        String startDate = call.getString("startDate");
        String endDate = call.getString("endDate");
        JSArray samples = queryHealthConnect(
            "androidx.health.platform.client.provider.HealthDataProvider/resting_heart_rate",
            startDate, endDate, "bpm"
        );
        JSObject ret = new JSObject();
        ret.put("samples", samples);
        call.resolve(ret);
    }

    @PluginMethod
    public void readHRV(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("samples", new JSArray());
        call.resolve(ret);
    }

    @PluginMethod
    public void readSpO2(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("samples", new JSArray());
        call.resolve(ret);
    }

    @PluginMethod
    public void readSleep(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("samples", new JSArray());
        call.resolve(ret);
    }

    private JSArray queryHealthConnect(String uriPath, String startDate, String endDate, String valueColumn) {
        JSArray samples = new JSArray();
        try {
            Context ctx = getContext();
            Uri uri = Uri.parse("content://" + uriPath);
            long startMs = Instant.parse(startDate).toEpochMilli();
            long endMs = Instant.parse(endDate).toEpochMilli();

            String selection = "start_time >= ? AND start_time <= ?";
            String[] selectionArgs = { String.valueOf(startMs), String.valueOf(endMs) };

            Cursor cursor = ctx.getContentResolver().query(uri, null, selection, selectionArgs, "start_time DESC");
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    try {
                        JSObject s = new JSObject();
                        int valueIdx = cursor.getColumnIndex(valueColumn);
                        int startIdx = cursor.getColumnIndex("start_time");
                        int endIdx = cursor.getColumnIndex("end_time");
                        if (valueIdx >= 0) s.put("value", cursor.getDouble(valueIdx));
                        if (startIdx >= 0) s.put("startDate", Instant.ofEpochMilli(cursor.getLong(startIdx)).toString());
                        if (endIdx >= 0) s.put("endDate", Instant.ofEpochMilli(cursor.getLong(endIdx)).toString());
                        samples.put(s);
                    } catch (Exception e) {
                        Log.w(TAG, "row error", e);
                    }
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "queryHealthConnect error for " + uriPath, e);
        }
        return samples;
    }
}