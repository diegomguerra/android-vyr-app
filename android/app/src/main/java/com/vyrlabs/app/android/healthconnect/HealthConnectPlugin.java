package com.vyrlabs.app.android.healthconnect;

import android.app.Activity;
import android.util.Log;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.records.*;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.time.TimeRangeFilter;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {

    private static final String TAG = "HealthConnectPlugin";
    private HealthConnectClient client;

    private HealthConnectClient getClient() {
        if (client == null) {
            client = HealthConnectClient.getOrCreate(getContext());
        }
        return client;
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            int status = HealthConnectClient.getSdkStatus(getContext());
            JSObject ret = new JSObject();
            ret.put("available", status == HealthConnectClient.SDK_AVAILABLE);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "isAvailable error", e);
            JSObject ret = new JSObject();
            ret.put("available", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        try {
            Set<String> permissions = new HashSet<>();
            permissions.add(HealthPermission.getReadPermission(StepsRecord.class));
            permissions.add(HealthPermission.getReadPermission(HeartRateRecord.class));
            permissions.add(HealthPermission.getReadPermission(RestingHeartRateRecord.class));
            permissions.add(HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord.class));
            permissions.add(HealthPermission.getReadPermission(OxygenSaturationRecord.class));
            permissions.add(HealthPermission.getReadPermission(RespiratoryRateRecord.class));
            permissions.add(HealthPermission.getReadPermission(SleepSessionRecord.class));

            Intent intent = getClient().getPermissionController()
                .createRequestPermissionResultContract()
                .createIntent(getActivity(), permissions);

            startActivityForResult(call, intent, "handlePermissionResult");
        } catch (Exception e) {
            Log.e(TAG, "requestPermissions error", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void readSteps(PluginCall call) {
        try {
            String startDate = call.getString("startDate");
            String endDate = call.getString("endDate");
            TimeRangeFilter filter = TimeRangeFilter.between(
                Instant.parse(startDate), Instant.parse(endDate));
            getClient().readRecords(
                new ReadRecordsRequest.Builder<>(StepsRecord.class, filter).build(),
                (response, error) -> {
                    if (error != null) { call.reject(error.getMessage()); return; }
                    JSArray samples = new JSArray();
                    for (StepsRecord r : response.getRecords()) {
                        JSObject s = new JSObject();
                        s.put("value", r.getCount());
                        s.put("startDate", r.getStartTime().toString());
                        s.put("endDate", r.getEndTime().toString());
                        samples.put(s);
                    }
                    JSObject ret = new JSObject();
                    ret.put("samples", samples);
                    call.resolve(ret);
                });
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void readHeartRate(PluginCall call) {
        try {
            String startDate = call.getString("startDate");
            String endDate = call.getString("endDate");
            TimeRangeFilter filter = TimeRangeFilter.between(
                Instant.parse(startDate), Instant.parse(endDate));
            getClient().readRecords(
                new ReadRecordsRequest.Builder<>(HeartRateRecord.class, filter).build(),
                (response, error) -> {
                    if (error != null) { call.reject(error.getMessage()); return; }
                    JSArray samples = new JSArray();
                    for (HeartRateRecord r : response.getRecords()) {
                        for (HeartRateRecord.Sample s2 : r.getSamples()) {
                            JSObject s = new JSObject();
                            s.put("value", s2.getBeatsPerMinute());
                            s.put("startDate", s2.getTime().toString());
                            s.put("endDate", s2.getTime().toString());
                            samples.put(s);
                        }
                    }
                    JSObject ret = new JSObject();
                    ret.put("samples", samples);
                    call.resolve(ret);
                });
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void readRestingHeartRate(PluginCall call) {
        try {
            String startDate = call.getString("startDate");
            String endDate = call.getString("endDate");
            TimeRangeFilter filter = TimeRangeFilter.between(
                Instant.parse(startDate), Instant.parse(endDate));
            getClient().readRecords(
                new ReadRecordsRequest.Builder<>(RestingHeartRateRecord.class, filter).build(),
                (response, error) -> {
                    if (error != null) { call.reject(error.getMessage()); return; }
                    JSArray samples = new JSArray();
                    for (RestingHeartRateRecord r : response.getRecords()) {
                        JSObject s = new JSObject();
                        s.put("value", r.getBeatsPerMinute());
                        s.put("startDate", r.getTime().toString());
                        s.put("endDate", r.getTime().toString());
                        samples.put(s);
                    }
                    JSObject ret = new JSObject();
                    ret.put("samples", samples);
                    call.resolve(ret);
                });
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void readHRV(PluginCall call) {
        try {
            String startDate = call.getString("startDate");
            String endDate = call.getString("endDate");
            TimeRangeFilter filter = TimeRangeFilter.between(
                Instant.parse(startDate), Instant.parse(endDate));
            getClient().readRecords(
                new ReadRecordsRequest.Builder<>(HeartRateVariabilityRmssdRecord.class, filter).build(),
                (response, error) -> {
                    if (error != null) { call.reject(error.getMessage()); return; }
                    JSArray samples = new JSArray();
                    for (HeartRateVariabilityRmssdRecord r : response.getRecords()) {
                        JSObject s = new JSObject();
                        s.put("value", r.getHeartRateVariabilityMillis());
                        s.put("startDate", r.getTime().toString());
                        s.put("endDate", r.getTime().toString());
                        samples.put(s);
                    }
                    JSObject ret = new JSObject();
                    ret.put("samples", samples);
                    call.resolve(ret);
                });
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void readSpO2(PluginCall call) {
        try {
            String startDate = call.getString("startDate");
            String endDate = call.getString("endDate");
            TimeRangeFilter filter = TimeRangeFilter.between(
                Instant.parse(startDate), Instant.parse(endDate));
            getClient().readRecords(
                new ReadRecordsRequest.Builder<>(OxygenSaturationRecord.class, filter).build(),
                (response, error) -> {
                    if (error != null) { call.reject(error.getMessage()); return; }
                    JSArray samples = new JSArray();
                    for (OxygenSaturationRecord r : response.getRecords()) {
                        JSObject s = new JSObject();
                        s.put("value", r.getPercentage().getValue());
                        s.put("startDate", r.getTime().toString());
                        s.put("endDate", r.getTime().toString());
                        samples.put(s);
                    }
                    JSObject ret = new JSObject();
                    ret.put("samples", samples);
                    call.resolve(ret);
                });
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void readSleep(PluginCall call) {
        try {
            String startDate = call.getString("startDate");
            String endDate = call.getString("endDate");
            TimeRangeFilter filter = TimeRangeFilter.between(
                Instant.parse(startDate), Instant.parse(endDate));
            getClient().readRecords(
                new ReadRecordsRequest.Builder<>(SleepSessionRecord.class, filter).build(),
                (response, error) -> {
                    if (error != null) { call.reject(error.getMessage()); return; }
                    JSArray samples = new JSArray();
                    for (SleepSessionRecord r : response.getRecords()) {
                        JSObject s = new JSObject();
                        s.put("startDate", r.getStartTime().toString());
                        s.put("endDate", r.getEndTime().toString());
                        s.put("value", 0);
                        samples.put(s);
                    }
                    JSObject ret = new JSObject();
                    ret.put("samples", samples);
                    call.resolve(ret);
                });
        } catch (Exception e) { call.reject(e.getMessage()); }
    }
}
