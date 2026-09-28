package com.duoo.capture

import android.service.notification.StatusBarNotification
import java.security.MessageDigest
import java.util.Locale

object NotificationParser {
    private val supportedPackages = setOf(
        "com.nu.production", // Nubank
        "com.itau",           // Itaú (package may vary by app version)
        "com.bradesco",       // Bradesco (package may vary by app version)
        "com.bancointer",     // Inter
        "com.santander.app",  // Santander (package may vary by app version)
        "com.bb",             // Banco do Brasil (package may vary by app version)
        "com.mercadopago.wallet"
    )

    private val amountPattern = Regex("(?:r\\$\\s*)?([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}|[0-9]+(?:[.,][0-9]{2}))", RegexOption.IGNORE_CASE)

    fun parse(notification: StatusBarNotification): CapturedTransaction? {
        if (notification.packageName !in supportedPackages) return null

        val extras = notification.notification.extras
        val title = extras.getCharSequence("android.title")?.toString().orEmpty()
        val text = extras.getCharSequence("android.text")?.toString().orEmpty()
        val body = "$title $text".trim()
        if (body.isBlank()) return null

        val match = amountPattern.find(body) ?: return null
        val amount = match.groupValues[1]
            .replace(".", "")
            .replace(',', '.')
            .toDoubleOrNull() ?: return null

        val normalized = body.lowercase(Locale.ROOT)
        val income = listOf("recebeu", "recebido", "pix recebido", "depósito", "deposito", "creditado")
            .any(normalized::contains)
        val expense = listOf("compra", "pagamento", "pix enviado", "transferência enviada", "transferencia enviada", "saída", "saida")
            .any(normalized::contains)
        if (!income && !expense) return null

        val type = if (income) "income" else "expense"
        val invoicePayment = listOf("pagamento de fatura", "pagamento da fatura", "fatura paga").any(normalized::contains)
        val creditCardPurchase = expense && !invoicePayment && listOf(
            "cartão de crédito", "cartao de credito", "compra no crédito", "compra no credito",
            "compra aprovada no cartão", "compra aprovada no cartao", "fatura"
        ).any(normalized::contains)
        val sourceType = if (creditCardPurchase) "credit_card" else "wallet"
        val idInput = "${notification.packageName}|${notification.postTime / 60_000}|$body"
        val externalId = sha256(idInput).take(64)
        val cleanTitle = title.ifBlank { text }.take(160)
        val confidence = if (income || expense) 0.85 else 0.55

        return CapturedTransaction(externalId, cleanTitle, amount, type, notification.packageName, confidence, sourceType)
    }

    private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray())
        .joinToString("") { "%02x".format(it) }
}
