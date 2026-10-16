package com.duoo.capture

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class NotificationCaptureService : NotificationListenerService() {
    private val logTag = "DuooCapture"
    private val apiTimeoutMs = 45_000
    private lateinit var store: SecureStore
    private lateinit var queue: CaptureQueue

    override fun onCreate() {
        super.onCreate()
        store = SecureStore(this)
        queue = CaptureQueue(store)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(logTag, "Notification listener connected")
        Thread { flushQueue() }.start()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (store.get("consent") != "accepted" || store.get("enabled") != "true") {
            Log.d(logTag, "Notification ignored: capture disabled")
            return
        }
        Log.d(logTag, "Notification received from package=${sbn.packageName}")
        val captured = NotificationParser.parse(sbn) ?: run {
            Log.d(logTag, "Notification not recognized by parser")
            return
        }
        val defaultWalletId = store.get("wallet_map_${captured.sourcePackage}")?.toLongOrNull()
            ?: store.get("wallet_id")?.toLongOrNull()
            ?: 0L
        val creditCardId = if (captured.sourceType == "credit_card") {
            store.get("credit_card_map_${captured.sourcePackage}")?.toLongOrNull()
                ?: store.get("credit_card_id")?.toLongOrNull()
                ?: 0L
        } else {
            0L
        }

        var isCreditCard = captured.sourceType == "credit_card"
        var walletId = if (isCreditCard) 0L else defaultWalletId
        var finalTransaction = captured

        if (isCreditCard && creditCardId <= 0L && defaultWalletId > 0L) {
            Log.i(logTag, "Credit card not configured for ${captured.sourcePackage}; falling back to wallet $defaultWalletId")
            walletId = defaultWalletId
            isCreditCard = false
            finalTransaction = captured.copy(sourceType = "wallet")
        }

        if ((!isCreditCard && walletId <= 0L) || (isCreditCard && creditCardId <= 0L)) {
            Log.w(logTag, "Notification recognized but no destination configured (walletId=$walletId, creditCardId=$creditCardId)")
            return
        }
        Log.i(logTag, "Capture queued: type=${finalTransaction.type}, source=${finalTransaction.sourceType}")

        val finalWalletId = walletId
        val finalCreditCardId = if (isCreditCard) creditCardId else 0L

        Thread {
            queue.add(finalTransaction, finalWalletId, finalCreditCardId)
            flushQueue()
        }.start()
    }

    private fun flushQueue() {
        val cookie = store.get("cookie") ?: run {
            Log.w(logTag, "Queue not sent: no login cookie")
            return
        }
        val apiBase = store.get("api_base")?.trimEnd('/') ?: run {
            Log.w(logTag, "Queue not sent: no API URL")
            return
        }
        Log.d(logTag, "Sending queue: items=${queue.all().size}")
        for (payload in queue.all()) {
            if (send(payload, cookie, apiBase)) queue.remove(payload.optString("external_id"))
        }
    }

    private fun send(payload: JSONObject, cookie: String, apiBase: String): Boolean {
        val connection = (URL("$apiBase/api/captured-transactions").openConnection() as HttpURLConnection)
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = apiTimeoutMs
            connection.readTimeout = apiTimeoutMs
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Cookie", cookie)

            connection.outputStream.use { it.write(payload.toString().toByteArray()) }
            val responseCode = connection.responseCode
            val responseStream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
            val responseBody = responseStream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (responseCode in 200..299) {
                Log.i(logTag, "Capture API response: HTTP $responseCode")
            } else {
                Log.w(logTag, "Capture API response: HTTP $responseCode body=${responseBody.take(240)}")
            }
            return responseCode in 200..299
        } finally {
            connection.disconnect()
        }
    }
}
