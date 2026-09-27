package com.duoo.capture

import org.json.JSONArray
import org.json.JSONObject

class CaptureQueue(private val store: SecureStore) {
    @Synchronized
    fun add(transaction: CapturedTransaction, walletId: Long) {
        val queue = read()
        if (queue.any { it.optString("external_id") == transaction.externalId }) return
        queue.put(toJson(transaction, walletId))
        while (queue.length() > MAX_ITEMS) queue.remove(0)
        store.put(KEY, queue.toString())
    }

    @Synchronized
    fun all(): List<JSONObject> = (0 until read().length()).map { read().getJSONObject(it) }

    @Synchronized
    fun remove(externalId: String) {
        val queue = read()
        for (index in queue.length() - 1 downTo 0) {
            if (queue.getJSONObject(index).optString("external_id") == externalId) queue.remove(index)
        }
        store.put(KEY, queue.toString())
    }

    private fun read(): JSONArray = try {
        JSONArray(store.get(KEY) ?: "[]")
    } catch (_: Exception) {
        JSONArray()
    }

    private fun toJson(transaction: CapturedTransaction, walletId: Long) = JSONObject().apply {
        put("external_id", transaction.externalId)
        put("title", transaction.title)
        put("amount", transaction.amount)
        put("type", transaction.type)
        put("wallet_id", walletId)
        put("source_package", transaction.sourcePackage)
        put("confidence", transaction.confidence)
    }

    companion object {
        private const val KEY = "pending_transactions"
        private const val MAX_ITEMS = 100
    }
}
