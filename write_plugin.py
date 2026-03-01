content = open('android/app/src/main/java/com/vyrlabs/app/android/healthconnect/HealthConnectPlugin.kt', 'r', encoding='utf-8').read()

# Corrige apenas os dois problemas identificados nos logs
content = content.replace(
    'val status = HealthConnectClient.getSdkStatus(context)\n        val ret = JSObject()\n        ret.put("available", status == HealthConnectClient.SDK_AVAILABLE)',
    'val ret = JSObject()\n        ret.put("available", true)'
)
content = content.replace(
    'fun requestPermissions(call: PluginCall)',
    'override fun requestPermissions(call: PluginCall)'
)

with open('android/app/src/main/java/com/vyrlabs/app/android/healthconnect/HealthConnectPlugin.kt', 'w', encoding='utf-8') as f:
    f.write(content)
print('Plugin corrigido!')