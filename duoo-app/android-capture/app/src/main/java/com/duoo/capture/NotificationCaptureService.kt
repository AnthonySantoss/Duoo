package com.duoo.capture

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NotificationCaptureService : NotificationListenerService() {
    private val logTag = "DuooCapture"
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
        CaptureSync.enqueue(this)
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
            if (queue.add(finalTransaction, finalWalletId, finalCreditCardId)) {
                CaptureSync.enqueue(this)
            }
        }.start()
    }
}
