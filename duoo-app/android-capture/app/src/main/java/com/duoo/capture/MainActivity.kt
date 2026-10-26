package com.duoo.capture

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private data class WalletOption(val id: Long, val name: String)
private data class CreditCardOption(val id: Long, val name: String)
private data class BankOption(val label: String, val packages: List<String>, val color: Int)
private enum class AppScreen { HOME, DESTINATIONS, SETTINGS }
private enum class DestinationMode { DEBIT, CREDIT }

class MainActivity : AppCompatActivity() {
    private val productionApi = "https://duoo-api.onrender.com"
    private val apiTimeoutMs = 20_000
    private lateinit var store: SecureStore
    private var wallets: List<WalletOption> = emptyList()
    private var creditCards: List<CreditCardOption> = emptyList()
    private var currentScreen = AppScreen.HOME
    private var destinationMode = DestinationMode.DEBIT

    private val green = Color.rgb(10, 143, 99)
    private val mint = Color.rgb(231, 249, 241)
    private val pageBackground = Color.rgb(247, 248, 245)
    private val ink = Color.rgb(22, 32, 42)
    private val muted = Color.rgb(100, 116, 139)
    private val border = Color.rgb(226, 232, 240)
    private val banks = listOf(
        BankOption("Nubank", listOf("com.nu.production"), Color.rgb(130, 10, 209)),
        BankOption("Inter", listOf("com.bancointer", "br.com.intermedium"), Color.rgb(255, 122, 0)),
        BankOption("Itaú", listOf("com.itau"), Color.rgb(236, 112, 0)),
        BankOption("Bradesco", listOf("com.bradesco"), Color.rgb(204, 9, 47)),
        BankOption("Santander", listOf("com.santander.app"), Color.rgb(236, 0, 0)),
        BankOption("Banco do Brasil", listOf("br.com.bb.android", "com.bb"), Color.rgb(245, 211, 0)),
        BankOption("Caixa", listOf("br.com.gabba.Caixa"), Color.rgb(0, 98, 155)),
        BankOption("C6 Bank", listOf("com.c6bank.app"), Color.rgb(35, 35, 35)),
        BankOption("PicPay", listOf("com.picpay"), Color.rgb(17, 178, 89)),
        BankOption("Mercado Pago", listOf("com.mercadopago.wallet"), Color.rgb(0, 158, 227))
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = SecureStore(this)
        CaptureSync.schedulePeriodic(this)
        if (hasSession()) {
            showScreen(AppScreen.HOME)
            loadAccountData()
            checkForUpdate()
        } else {
            showConnectScreen()
        }
    }

    override fun onResume() {
        super.onResume()
        if (::store.isInitialized && hasSession()) showScreen(currentScreen)
    }

    private fun hasSession() = !store.get("cookie").isNullOrBlank() && !store.get("api_base").isNullOrBlank()

    private fun showScreen(screen: AppScreen) {
        currentScreen = screen
        val content = when (screen) {
            AppScreen.HOME -> homeScreen()
            AppScreen.DESTINATIONS -> destinationsScreen()
            AppScreen.SETTINGS -> settingsScreen()
        }
        setContentView(appShell(content, screen))
    }

    private fun appShell(content: View, selected: AppScreen): View = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(pageBackground)
        addView(ScrollView(this@MainActivity).apply { isFillViewport = true; addView(content) }, LinearLayout.LayoutParams(-1, 0, 1f))
        addView(bottomNavigation(selected), LinearLayout.LayoutParams(-1, dp(74)))
    }

    private fun homeScreen(): View = page("Duoo Capture", "Suas transações, juntos.").apply {
        val permissionGranted = notificationAccessGranted()
        val enabled = store.get("enabled") == "true" && store.get("consent") == "accepted"
        val active = permissionGranted && enabled && hasSession() && store.get("session_expired") != "true"
        addView(statusCard(
            if (active) "Captura ativa" else "Captura pausada",
            when {
                store.get("session_expired") == "true" -> "Entre novamente para continuar"
                !permissionGranted -> "Permita o acesso às notificações"
                !enabled -> "Ative a captura nos ajustes"
                else -> "${banks.size} bancos monitorados"
            }, active
        ), margin(top = 24))

        val lastTitle = store.get("last_capture_title")
        val lastAmount = store.get("last_capture_amount")
        addView(infoCard(
            "Último registro",
            if (lastTitle != null && lastAmount != null) "$lastTitle · R$ $lastAmount" else "Nenhum registro enviado ainda",
            store.get("last_capture_source") ?: "Aguardando uma notificação financeira",
            "▣"
        ), margin(top = 14))

        val queue = CaptureQueue(store)
        val pending = queue.size()
        addView(infoCard(
            if (pending == 0) "Tudo sincronizado" else "$pending ${if (pending == 1) "registro pendente" else "registros pendentes"}",
            if (pending == 0) "Seus registros estão em dia." else "O envio acontecerá quando houver conexão.",
            if (queue.droppedCount() > 0) "${queue.droppedCount()} registros excederam o limite local." else "Fila protegida no aparelho",
            "✓"
        ), margin(top = 14))

        if (store.get("update_available") == "true") addView(updateCard(), margin(top = 14))

        addView(LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(actionCard("Destinos", "Para onde enviar", "□") { showScreen(AppScreen.DESTINATIONS) }, LinearLayout.LayoutParams(0, dp(132), 1f))
            addView(actionCard("Configurações", "App e privacidade", "⚙") { showScreen(AppScreen.SETTINGS) }, LinearLayout.LayoutParams(0, dp(132), 1f).apply { marginStart = dp(10) })
        }, margin(top = 14))
    }

    private fun destinationsScreen(): View = page("Para onde enviar?", "Defina o destino das transações de cada banco.").apply {
        addView(LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.HORIZONTAL
            background = rounded(Color.rgb(238, 241, 243), Color.TRANSPARENT, 16)
            setPadding(dp(4), dp(4), dp(4), dp(4))
            addView(segment("Débito", destinationMode == DestinationMode.DEBIT) { destinationMode = DestinationMode.DEBIT; showScreen(AppScreen.DESTINATIONS) }, LinearLayout.LayoutParams(0, dp(46), 1f))
            addView(segment("Crédito", destinationMode == DestinationMode.CREDIT) { destinationMode = DestinationMode.CREDIT; showScreen(AppScreen.DESTINATIONS) }, LinearLayout.LayoutParams(0, dp(46), 1f))
        }, margin(top = 24))

        val options = if (destinationMode == DestinationMode.DEBIT) wallets.map { it.id to it.name } else creditCards.map { it.id to it.name }
        if (options.isEmpty()) {
            addView(infoCard("Destinos indisponíveis", "Cadastre uma carteira ou cartão no Duoo.", "Toque aqui para recarregar.", "!").apply {
                setOnClickListener { loadAccountData { showScreen(AppScreen.DESTINATIONS) } }
            }, margin(top = 16))
        } else {
            val defaultKey = if (destinationMode == DestinationMode.DEBIT) "wallet_id" else "credit_card_id"
            addView(destinationCard("Destino padrão", options, defaultKey), margin(top = 16))
            addView(label("Bancos", 13f, muted, true), margin(top = 20))
            banks.forEach { bank ->
                val prefix = if (destinationMode == DestinationMode.DEBIT) "wallet_map_" else "credit_card_map_"
                addView(bankDestinationRow(bank, options, prefix), margin(top = 9))
            }
        }
    }

    private fun settingsScreen(): View = page("Ativar captura", "Siga os passos para ler suas notificações bancárias.").apply {
        val connected = hasSession() && store.get("session_expired") != "true"
        val configured = !store.get("wallet_id").isNullOrBlank() || !store.get("credit_card_id").isNullOrBlank()
        val permission = notificationAccessGranted()
        addView(checkStep("Sessão conectada", "Sua conta Duoo está pronta.", connected, 1), margin(top = 24))
        addView(checkStep("Destinos configurados", "Defina para onde enviar as transações.", configured, 2), margin(top = 10))
        addView(checkStep("Acesso às notificações", "Permita ao Duoo identificar avisos financeiros.", permission, 3), margin(top = 10))
        addView(privacyCard(), margin(top = 18))

        val enabled = store.get("enabled") == "true"
        val buttonLabel = when {
            !permission -> "Permitir no Android"
            !enabled -> "Ativar captura"
            else -> "Pausar captura"
        }
        addView(primaryButton(buttonLabel).apply {
            setOnClickListener {
                when {
                    !permission -> {
                        store.put("consent", "accepted")
                        startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                    }
                    !enabled -> {
                        store.put("consent", "accepted"); store.put("enabled", "true")
                        CaptureSync.enqueue(this@MainActivity); showScreen(AppScreen.SETTINGS)
                    }
                    else -> { store.put("enabled", "false"); showScreen(AppScreen.SETTINGS) }
                }
            }
        }, margin(top = 18, height = 54))
        addView(outlineButton("Sair desta conta").apply { setOnClickListener { logout() } }, margin(top = 10, height = 50))
    }

    private fun showConnectScreen() {
        val apiField = input("URL da API", store.get("api_base") ?: productionApi)
        val emailField = input("E-mail", "").apply { inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS }
        val passwordField = input("Senha", "").apply { inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }
        val feedback = label("", 13f, muted)
        val advanced = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE; addView(apiField, margin(top = 8, height = 54)) }
        val content = page("Conecte ao Duoo", "Sua senha é usada apenas para criar uma sessão segura.").apply {
            gravity = Gravity.CENTER_HORIZONTAL
            addView(DuooLogoView(this@MainActivity), LinearLayout.LayoutParams(dp(92), dp(92)).apply { gravity = Gravity.CENTER_HORIZONTAL; topMargin = dp(22) })
            addView(emailField, margin(top = 20, height = 54))
            addView(passwordField, margin(top = 10, height = 54))
            addView(feedback, margin(top = 10))
            addView(primaryButton("Entrar").apply {
                setOnClickListener { login(apiField.text.toString(), emailField.text.toString(), passwordField.text.toString(), feedback, this) }
            }, margin(top = 12, height = 54))
            addView(textButton("⚙  Configuração avançada da API").apply {
                setOnClickListener { advanced.visibility = if (advanced.visibility == View.GONE) View.VISIBLE else View.GONE }
            }, margin(top = 18, height = 46))
            addView(advanced)
            addView(label("O texto bruto das notificações permanece no seu aparelho.", 12f, muted).apply { gravity = Gravity.CENTER }, margin(top = 22))
        }
        setContentView(ScrollView(this).apply { setBackgroundColor(pageBackground); addView(content) })
    }

    private fun login(baseInput: String, email: String, password: String, feedback: TextView, button: View) {
        val base = baseInput.trim().trimEnd('/')
        if ((!base.startsWith("https://") && base != "http://10.0.2.2:5000") || email.isBlank() || password.isBlank()) {
            feedback.text = "Confira o e-mail, a senha e a URL segura da API."
            return
        }
        button.isEnabled = false
        feedback.text = "Conectando com segurança..."
        Thread {
            try {
                val connection = openConnection("$base/api/auth/login", "POST")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(JSONObject().put("email", email.trim()).put("password", password).toString().toByteArray()) }
                val code = connection.responseCode
                val responseText = (if (code in 200..299) connection.inputStream else connection.errorStream)
                    ?.bufferedReader()?.use { it.readText() }.orEmpty()
                val response = runCatching { JSONObject(responseText) }.getOrNull()
                val cookie = extractCookie(connection)
                    ?: response?.optString("token")?.takeIf { it.isNotBlank() }?.let { "duoo_access_token=$it" }
                connection.disconnect()
                if (code in 200..299 && cookie != null) {
                    store.put("api_base", base); store.put("cookie", cookie); store.remove("session_expired")
                    loadAccountData { showScreen(AppScreen.HOME); checkForUpdate() }
                } else runOnUiThread {
                    feedback.text = response?.optString("error")?.takeIf { it.isNotBlank() }
                        ?: "Não foi possível entrar. Verifique os dados."
                    button.isEnabled = true
                }
            } catch (_: Exception) {
                runOnUiThread { feedback.text = "Não foi possível conectar à API."; button.isEnabled = true }
            }
        }.start()
    }

    private fun loadAccountData(onDone: (() -> Unit)? = null) {
        val base = store.get("api_base")?.trimEnd('/') ?: return
        val cookie = store.get("cookie") ?: return
        Thread {
            try {
                val walletJson = getArray("$base/api/wallets?mine=true", cookie)
                val cardJson = getArray("$base/api/credit-cards?viewMode=joint", cookie)
                wallets = (0 until walletJson.length()).mapNotNull { index ->
                    walletJson.optJSONObject(index)?.let { item -> item.optLong("id").takeIf { it > 0 }?.let { WalletOption(it, item.optString("name", "Carteira")) } }
                }
                creditCards = (0 until cardJson.length()).mapNotNull { index ->
                    cardJson.optJSONObject(index)?.let { item -> item.optLong("id").takeIf { it > 0 }?.let { CreditCardOption(it, item.optString("name", "Cartão")) } }
                }
                if (wallets.isNotEmpty() && wallets.none { it.id.toString() == store.get("wallet_id") }) store.put("wallet_id", wallets.first().id.toString())
                if (creditCards.isNotEmpty() && creditCards.none { it.id.toString() == store.get("credit_card_id") }) store.put("credit_card_id", creditCards.first().id.toString())
            } catch (_: Exception) { }
            runOnUiThread { onDone?.invoke() }
        }.start()
    }

    private fun checkForUpdate() {
        val base = store.get("api_base")?.trimEnd('/') ?: productionApi
        Thread {
            try {
                val connection = openConnection("$base/api/app/android/latest?currentVersionCode=${BuildConfig.VERSION_CODE}", "GET")
                if (connection.responseCode in 200..299) {
                    val data = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                    if (data.optBoolean("updateAvailable") && !data.isNull("downloadUrl")) {
                        val downloadUrl = URL(URL("$base/"), data.optString("downloadUrl")).toString()
                        store.put("update_available", "true"); store.put("update_version", data.optString("versionName")); store.put("update_url", downloadUrl)
                        runOnUiThread { if (currentScreen == AppScreen.HOME) showScreen(AppScreen.HOME) }
                    } else store.remove("update_available")
                }
                connection.disconnect()
            } catch (_: Exception) { }
        }.start()
    }

    private fun logout() {
        listOf("cookie", "api_base", "session_expired", "enabled", "consent").forEach(store::remove)
        wallets = emptyList(); creditCards = emptyList(); showConnectScreen()
    }

    private fun notificationAccessGranted() = NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)

    private fun page(title: String, subtitle: String) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(22), dp(20), dp(26)); addView(header(title, subtitle))
    }

    private fun header(title: String, subtitle: String) = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
        addView(DuooLogoView(this@MainActivity), LinearLayout.LayoutParams(dp(48), dp(48)))
        addView(LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), 0, 0, 0); addView(label(title, 24f, ink, true)); addView(label(subtitle, 12f, muted)) }, LinearLayout.LayoutParams(0, -2, 1f))
    }

    private fun statusCard(title: String, subtitle: String, active: Boolean) = card(if (active) mint else Color.WHITE) {
        addView(LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            addView(View(this@MainActivity).apply { background = circle(if (active) green else Color.rgb(245, 158, 11)) }, LinearLayout.LayoutParams(dp(18), dp(18)))
            addView(LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(14), 0, 0, 0); addView(label(title, 18f, ink, true)); addView(label(subtitle, 13f, muted)) }, LinearLayout.LayoutParams(0, -2, 1f))
        })
    }

    private fun infoCard(kicker: String, title: String, subtitle: String, icon: String) = card(Color.WHITE) {
        addView(LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            addView(label(icon, 24f, green, true).apply { gravity = Gravity.CENTER; background = circle(mint) }, LinearLayout.LayoutParams(dp(50), dp(50)))
            addView(LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(14), 0, 0, 0); addView(label(kicker, 11f, muted)); addView(label(title, 15f, ink, true)); addView(label(subtitle, 12f, muted)) }, LinearLayout.LayoutParams(0, -2, 1f))
        })
    }

    private fun actionCard(title: String, subtitle: String, icon: String, action: () -> Unit) = card(Color.WHITE) {
        addView(label(icon, 25f, green, true)); addView(label(title, 15f, ink, true), margin(top = 10)); addView(label(subtitle, 12f, muted)); setOnClickListener { action() }
    }

    private fun updateCard() = card(Color.rgb(235, 246, 255)) {
        addView(label("Nova versão ${store.get("update_version") ?: ""}", 16f, ink, true)); addView(label("Baixe a atualização mais recente do Duoo Capture.", 12f, muted), margin(top = 3))
        addView(primaryButton("Atualizar agora").apply { setOnClickListener { store.get("update_url")?.let { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it))) } } }, margin(top = 12, height = 48))
    }

    private fun destinationCard(title: String, options: List<Pair<Long, String>>, key: String) = card(Color.WHITE) {
        addView(label(title, 12f, muted)); addView(optionSpinner(options, key), margin(top = 8, height = 50))
    }

    private fun bankDestinationRow(bank: BankOption, options: List<Pair<Long, String>>, prefix: String) = card(Color.WHITE, 14) {
        val row = LinearLayout(this@MainActivity).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        row.addView(View(this@MainActivity).apply { background = circle(bank.color) }, LinearLayout.LayoutParams(dp(14), dp(14)))
        row.addView(label(bank.label, 14f, ink, true), LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(10) })
        val spinnerOptions = listOf(0L to "Usar padrão") + options
        val key = prefix + bank.packages.first()
        val spinner = optionSpinner(spinnerOptions, key)
        spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selected = spinnerOptions[position].first
                bank.packages.forEach { packageName -> if (selected == 0L) store.remove(prefix + packageName) else store.put(prefix + packageName, selected.toString()) }
            }
        }
        row.addView(spinner, LinearLayout.LayoutParams(dp(178), dp(50))); addView(row)
    }

    private fun optionSpinner(options: List<Pair<Long, String>>, key: String) = Spinner(this).apply {
        adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, options.map { it.second }); background = rounded(Color.rgb(248, 250, 252), border, 13)
        val index = options.indexOfFirst { it.first == store.get(key)?.toLongOrNull() }; if (index >= 0) setSelection(index)
        onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) { val selected = options[position].first; if (selected == 0L) store.remove(key) else store.put(key, selected.toString()) }
        }
    }

    private fun checkStep(title: String, subtitle: String, complete: Boolean, number: Int) = card(Color.WHITE, 14) {
        addView(LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            addView(label(if (complete) "✓" else number.toString(), 16f, if (complete) Color.WHITE else ink, true).apply { gravity = Gravity.CENTER; background = circle(if (complete) green else Color.rgb(226, 238, 233)) }, LinearLayout.LayoutParams(dp(38), dp(38)))
            addView(LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(13), 0, 0, 0); addView(label(title, 15f, ink, true)); addView(label(subtitle, 12f, muted)) }, LinearLayout.LayoutParams(0, -2, 1f))
        })
    }

    private fun privacyCard() = card(mint) { addView(label("🔒  O texto bruto fica no aparelho", 14f, ink, true)); addView(label("O Duoo envia somente valor, tipo, título normalizado e o destino escolhido.", 12f, muted), margin(top = 7)) }

    private fun bottomNavigation(selected: AppScreen) = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER; setPadding(dp(8), dp(7), dp(8), dp(7)); setBackgroundColor(Color.WHITE)
        listOf(Triple(AppScreen.HOME, "⌂", "Início"), Triple(AppScreen.DESTINATIONS, "□", "Destinos"), Triple(AppScreen.SETTINGS, "⚙", "Ajustes")).forEach { (screen, icon, name) ->
            addView(LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; addView(label(icon, 20f, if (selected == screen) green else muted, true).apply { gravity = Gravity.CENTER }); addView(label(name, 11f, if (selected == screen) green else muted, selected == screen).apply { gravity = Gravity.CENTER }); setOnClickListener { showScreen(screen) } }, LinearLayout.LayoutParams(0, -1, 1f))
        }
    }

    private fun segment(text: String, selected: Boolean, action: () -> Unit) = textButton(text).apply { setTextColor(if (selected) green else muted); typeface = if (selected) Typeface.DEFAULT_BOLD else Typeface.DEFAULT; background = rounded(if (selected) Color.WHITE else Color.TRANSPARENT, if (selected) Color.rgb(180, 225, 207) else Color.TRANSPARENT, 13); setOnClickListener { action() } }

    private fun card(color: Int, radius: Int = 20, content: LinearLayout.() -> Unit): MaterialCardView = MaterialCardView(this).apply {
        setCardBackgroundColor(color); this.radius = dp(radius).toFloat(); cardElevation = 0f; strokeWidth = dp(1); strokeColor = if (color == mint) Color.rgb(210, 239, 225) else border
        addView(LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(16), dp(16), dp(16)); content() })
    }

    private fun input(hint: String, value: String) = EditText(this).apply { this.hint = hint; setText(value); textSize = 15f; setTextColor(ink); setHintTextColor(muted); setSingleLine(true); background = rounded(Color.WHITE, border, 15); setPadding(dp(15), 0, dp(15), 0) }
    private fun primaryButton(text: String) = MaterialButton(this).apply { this.text = text; isAllCaps = false; textSize = 14f; typeface = Typeface.DEFAULT_BOLD; setTextColor(Color.WHITE); backgroundTintList = android.content.res.ColorStateList.valueOf(green); cornerRadius = dp(16) }
    private fun outlineButton(text: String) = MaterialButton(this).apply { this.text = text; isAllCaps = false; textSize = 14f; setTextColor(green); backgroundTintList = android.content.res.ColorStateList.valueOf(Color.WHITE); strokeColor = android.content.res.ColorStateList.valueOf(Color.rgb(190, 230, 215)); strokeWidth = dp(1); cornerRadius = dp(16) }
    private fun textButton(text: String) = MaterialButton(this).apply { this.text = text; isAllCaps = false; textSize = 13f; setTextColor(green); backgroundTintList = android.content.res.ColorStateList.valueOf(Color.TRANSPARENT); elevation = 0f }
    private fun label(text: String, size: Float, color: Int, bold: Boolean = false) = TextView(this).apply { this.text = text; textSize = size; setTextColor(color); if (bold) typeface = Typeface.DEFAULT_BOLD }
    private fun rounded(fill: Int, stroke: Int, radius: Int) = android.graphics.drawable.GradientDrawable().apply { setColor(fill); if (stroke != Color.TRANSPARENT) setStroke(dp(1), stroke); cornerRadius = dp(radius).toFloat() }
    private fun circle(color: Int) = android.graphics.drawable.GradientDrawable().apply { shape = android.graphics.drawable.GradientDrawable.OVAL; setColor(color) }
    private fun margin(top: Int = 0, height: Int = -2) = LinearLayout.LayoutParams(-1, if (height < 0) height else dp(height)).apply { topMargin = dp(top) }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun openConnection(url: String, method: String): HttpURLConnection = (URL(url).openConnection() as HttpURLConnection).apply { requestMethod = method; connectTimeout = apiTimeoutMs; readTimeout = apiTimeoutMs; doOutput = method != "GET" }
    private fun getArray(url: String, cookie: String): JSONArray {
        val connection = openConnection(url, "GET"); connection.setRequestProperty("Cookie", cookie); val code = connection.responseCode
        if (code == 401 || code == 400) store.put("session_expired", "true")
        if (code !in 200..299) { connection.disconnect(); throw IllegalStateException("HTTP $code") }
        val result = JSONArray(connection.inputStream.bufferedReader().use { it.readText() }); connection.disconnect(); return result
    }
    private fun extractCookie(connection: HttpURLConnection): String? {
        val cookies = connection.headerFields.entries
            .firstOrNull { it.key?.equals("Set-Cookie", ignoreCase = true) == true }
            ?.value ?: return null
        return cookies.firstOrNull { it.startsWith("duoo_access_token=") }?.substringBefore(';')
    }
}
