package com.duoo.capture

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.net.HttpURLConnection
import java.net.URL

class CaptureFlushWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val store = SecureStore(applicationContext)
        val queue = CaptureQueue(store)
        val cookie = store.get("cookie") ?: return Result.failure()
        val apiBase = store.get("api_base")?.trimEnd('/') ?: return Result.failure()

        for (payload in queue.all()) {
            when (send(apiBase, cookie, payload.toString())) {
                SendResult.SUCCESS -> {
                    queue.remove(payload.optString("external_id"))
                    store.put("last_capture_title", payload.optString("title", "Transação"))
                    store.put("last_capture_amount", String.format(java.util.Locale("pt", "BR"), "%.2f", payload.optDouble("amount", 0.0)))
                    store.put("last_capture_source", payload.optString("source_package", "Banco"))
                }
                SendResult.SESSION_EXPIRED -> {
                    store.put("session_expired", "true")
                    return Result.failure()
                }
                SendResult.RETRY -> return Result.retry()
                SendResult.REJECTED -> {
                    queue.remove(payload.optString("external_id"))
                    val rejected = store.get("rejected_capture_count")?.toIntOrNull() ?: 0
                    store.put("rejected_capture_count", (rejected + 1).toString())
                }
            }
        }
        store.remove("last_sync_error")
        store.put("last_sync_at", System.currentTimeMillis().toString())
        return Result.success()
    }

    private fun send(apiBase: String, cookie: String, body: String): SendResult {
        val connection = try {
            URL("$apiBase/api/captured-transactions").openConnection() as HttpURLConnection
        } catch (_: Exception) {
            return SendResult.RETRY
        }
        return try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 20_000
            connection.readTimeout = 20_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Cookie", cookie)
            connection.outputStream.use { it.write(body.toByteArray()) }
            when (val code = connection.responseCode) {
                in 200..299 -> SendResult.SUCCESS
                400, 401 -> if (code == 401 || responseIndicatesInvalidToken(connection)) SendResult.SESSION_EXPIRED else SendResult.REJECTED
                408, 425, 429, in 500..599 -> SendResult.RETRY
                else -> SendResult.REJECTED
            }
        } catch (_: Exception) {
            storeSyncError()
            SendResult.RETRY
        } finally {
            connection.disconnect()
        }
    }

    private fun responseIndicatesInvalidToken(connection: HttpURLConnection): Boolean = try {
        connection.errorStream?.bufferedReader()?.use { it.readText() }
            ?.contains("Invalid token", ignoreCase = true) == true
    } catch (_: Exception) {
        false
    }

    private fun storeSyncError() {
        SecureStore(applicationContext).put("last_sync_error", System.currentTimeMillis().toString())
    }

    private enum class SendResult { SUCCESS, SESSION_EXPIRED, RETRY, REJECTED }
}
