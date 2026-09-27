package com.duoo.capture

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class NotificationCaptureService : NotificationListenerService() {
    private lateinit var store: SecureStore
    private lateinit var queue: CaptureQueue

    override fun onCreate() {
        super.onCreate()
        store = SecureStore(this)
        queue = CaptureQueue(store)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        flushQueue()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (store.get("consent") != "accepted" || store.get("enabled") != "true") return
        val captured = NotificationParser.parse(sbn) ?: return
        val walletId = store.get("wallet_id")?.toLongOrNull() ?: 0L
        if (walletId <= 0) return

        Thread {
            queue.add(captured, walletId)
            flushQueue()
        }.start()
    }

    private fun flushQueue() {
        val cookie = store.get("cookie") ?: return
        val apiBase = store.get("api_base")?.trimEnd('/') ?: return
        for (payload in queue.all()) {
            if (send(payload, cookie, apiBase)) queue.remove(payload.optString("external_id"))
        }
    }

    private fun send(payload: JSONObject, cookie: String, apiBase: String): Boolean {
        val connection = (URL("$apiBase/api/captured-transactions").openConnection() as HttpURLConnection)
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Cookie", cookie)

            connection.outputStream.use { it.write(payload.toString().toByteArray()) }
            return connection.responseCode in 200..299
        } finally {
            connection.disconnect()
        }
    }
}
