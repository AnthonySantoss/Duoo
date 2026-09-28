package com.duoo.capture

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

private data class WalletOption(val id: Long, val name: String)
private data class CreditCardOption(val id: Long, val name: String)
private data class BankOption(val label: String, val packageName: String)

class MainActivity : AppCompatActivity() {
    private lateinit var apiBase: EditText
    private lateinit var email: EditText
    private lateinit var password: EditText
    private lateinit var defaultWalletSpinner: Spinner
    private lateinit var defaultCreditCardSpinner: Spinner
    private lateinit var walletMappingsContainer: LinearLayout
    private lateinit var creditCardMappingsContainer: LinearLayout
    private lateinit var status: TextView
    private lateinit var statusTitle: TextView
    private lateinit var statusDot: View
    private lateinit var secureStore: SecureStore
    private var wallets: List<WalletOption> = emptyList()
    private var creditCards: List<CreditCardOption> = emptyList()
    private val mappingSpinners = mutableMapOf<String, Spinner>()

    private val green = Color.rgb(10, 143, 99)
    private val ink = Color.rgb(22, 30, 42)
    private val muted = Color.rgb(100, 116, 139)
    private val banks = listOf(
        BankOption("Nubank", "com.nu.production"),
        BankOption("Inter", "com.bancointer"),
        BankOption("Itaú", "com.itau"),
        BankOption("Bradesco", "com.bradesco"),
        BankOption("Santander", "com.santander.app"),
        BankOption("Banco do Brasil", "com.bb"),
        BankOption("Mercado Pago", "com.mercadopago.wallet")
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        secureStore = SecureStore(this)
        setContentView(buildContent())
    }

    override fun onResume() {
        super.onResume()
        if (::statusTitle.isInitialized) refreshCaptureStatus()
    }

    private fun buildContent(): View {
        apiBase = field("URL da API", "https://seu-dominio.com")
        email = field("E-mail", "")
        email.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
        password = field("Senha", "")
        password.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(242, 242, 247))
            setPadding(dp(20), dp(18), dp(20), dp(32))
        }
        root.addView(header())

        val scroll = ScrollView(this).apply { isFillViewport = true }
        val content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(22), 0, 0) }
        content.addView(statusCard())
        content.addView(sectionLabel("Conectar ao Duoo"))
        content.addView(formCard())
        content.addView(sectionLabel("Ativação"))
        content.addView(activationCard())
        content.addView(privacyNote())
        scroll.addView(content)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        refreshCaptureStatus()
        return root
    }

    private fun header(): View = LinearLayout(this).apply {
        gravity = Gravity.CENTER_VERTICAL
        addView(DuooLogoView(this@MainActivity).apply { layoutParams = LinearLayout.LayoutParams(dp(46), dp(46)) })
        addView(LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), 0, 0, 0)
            addView(TextView(this@MainActivity).apply { text = "duoo"; textSize = 25f; typeface = Typeface.DEFAULT_BOLD; setTextColor(ink) })
            addView(TextView(this@MainActivity).apply { text = "captura nativa"; textSize = 12f; setTextColor(muted) })
        })
    }

    private fun statusCard(): View {
        val card = MaterialCardView(this).apply { radius = dp(22).toFloat(); cardElevation = dp(1).toFloat(); setCardBackgroundColor(Color.WHITE); setContentPadding(dp(18), dp(18), dp(18), dp(18)) }
        val layout = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        statusDot = View(this).apply { background = circleDrawable(green) }
        layout.addView(statusDot, LinearLayout.LayoutParams(dp(12), dp(12)))
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), 0, 0, 0) }
        statusTitle = TextView(this).apply { textSize = 16f; typeface = Typeface.DEFAULT_BOLD; setTextColor(ink) }
        status = TextView(this).apply { textSize = 12f; setTextColor(muted); setPadding(0, dp(3), 0, 0) }
        texts.addView(statusTitle); texts.addView(status)
        layout.addView(texts, LinearLayout.LayoutParams(0, -2, 1f))
        layout.addView(TextView(this).apply { text = "›"; textSize = 27f; setTextColor(Color.LTGRAY) })
        card.addView(layout)
        return card
    }

    private fun formCard(): View {
        val card = surfaceCard(); val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        layout.addView(apiBase); layout.addView(email); layout.addView(password); layout.addView(walletConfiguration())
        val login = primaryButton("Entrar no Duoo"); login.setOnClickListener { login() }
        layout.addView(login, marginParams(top = 12))
        card.addView(layout); return card
    }

    private fun walletConfiguration(): View {
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(14), 0, 0) }
        layout.addView(TextView(this).apply { text = "Carteiras de destino"; textSize = 14f; typeface = Typeface.DEFAULT_BOLD; setTextColor(ink) })
        layout.addView(TextView(this).apply { text = "Escolha onde cada banco deve registrar as notificações. Sem regra específica, será usada a carteira padrão."; textSize = 12f; setTextColor(muted); setPadding(0, dp(4), 0, dp(8)) })
        layout.addView(TextView(this).apply { text = "Carteira padrão"; textSize = 13f; setTextColor(muted) })
        defaultWalletSpinner = walletSpinner()
        layout.addView(defaultWalletSpinner, marginParams(top = 4, height = 50))
        layout.addView(TextView(this).apply { text = "Cartão de crédito padrão"; textSize = 13f; setTextColor(muted); setPadding(0, dp(12), 0, 0) })
        defaultCreditCardSpinner = walletSpinner(listOf("Faça login para carregar seus cartões"))
        layout.addView(defaultCreditCardSpinner, marginParams(top = 4, height = 50))
        walletMappingsContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(12), 0, 0) }
        layout.addView(walletMappingsContainer)
        creditCardMappingsContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(12), 0, 0) }
        layout.addView(creditCardMappingsContainer)
        showWallets(emptyList())
        return layout
    }

    private fun walletSpinner(options: List<String> = listOf("Faça login para carregar suas carteiras")) = Spinner(this).apply {
        adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, options)
        background = roundedDrawable(Color.rgb(248, 248, 250), Color.rgb(225, 225, 230), dp(12))
    }

    private fun showWallets(loadedWallets: List<WalletOption>) {
        wallets = loadedWallets
        val labels = if (wallets.isEmpty()) listOf("Faça login para carregar suas carteiras") else wallets.map { it.name }
        defaultWalletSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)
        selectSpinner(defaultWalletSpinner, secureStore.get("wallet_id"))
        defaultWalletSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (wallets.isNotEmpty() && position < wallets.size) secureStore.put("wallet_id", wallets[position].id.toString())
            }
        }
        walletMappingsContainer.removeAllViews()
        mappingSpinners.clear()
        defaultCreditCardSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, if (creditCards.isEmpty()) listOf("Faça login para carregar seus cartões") else creditCards.map { it.name })
        selectCreditCardSpinner(defaultCreditCardSpinner, secureStore.get("credit_card_id"))
        defaultCreditCardSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (creditCards.isNotEmpty() && position < creditCards.size) secureStore.put("credit_card_id", creditCards[position].id.toString())
            }
        }
        creditCardMappingsContainer.removeAllViews()
        if (wallets.isEmpty() && creditCards.isEmpty()) return
        walletMappingsContainer.addView(TextView(this).apply { text = "Carteira por banco"; textSize = 13f; setTextColor(muted) })
        banks.forEach { bank ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(8), 0, 0) }
            row.addView(TextView(this).apply { text = bank.label; textSize = 13f; setTextColor(ink) })
            val spinner = walletSpinner(listOf("Usar carteira padrão") + wallets.map { it.name })
            mappingSpinners[bank.packageName] = spinner
            selectSpinner(spinner, secureStore.get(mappingKey(bank.packageName)), offset = 1)
            spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onNothingSelected(parent: AdapterView<*>?) = Unit
                override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                    if (position <= 0 || position - 1 >= wallets.size) secureStore.remove(mappingKey(bank.packageName))
                    else secureStore.put(mappingKey(bank.packageName), wallets[position - 1].id.toString())
                }
            }
            row.addView(spinner, marginParams(top = 4, height = 50))
            walletMappingsContainer.addView(row)
        }
        if (creditCards.isNotEmpty()) {
            creditCardMappingsContainer.addView(TextView(this).apply { text = "Cartão por banco"; textSize = 13f; setTextColor(muted) })
            banks.forEach { bank ->
                val row = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(8), 0, 0) }
                row.addView(TextView(this).apply { text = bank.label; textSize = 13f; setTextColor(ink) })
                val spinner = walletSpinner(listOf("Usar cartão padrão") + creditCards.map { it.name })
                selectCreditCardSpinner(spinner, secureStore.get("credit_card_map_${bank.packageName}"), offset = 1)
                spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                    override fun onNothingSelected(parent: AdapterView<*>?) = Unit
                    override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                        if (position <= 0 || position - 1 >= creditCards.size) secureStore.remove("credit_card_map_${bank.packageName}")
                        else secureStore.put("credit_card_map_${bank.packageName}", creditCards[position - 1].id.toString())
                    }
                }
                row.addView(spinner, marginParams(top = 4, height = 50))
                creditCardMappingsContainer.addView(row)
            }
        }
    }

    private fun selectSpinner(spinner: Spinner, storedId: String?, offset: Int = 0) {
        val index = wallets.indexOfFirst { it.id.toString() == storedId }
        if (index >= 0) spinner.setSelection(index + offset)
    }

    private fun selectCreditCardSpinner(spinner: Spinner, storedId: String?, offset: Int = 0) {
        val index = creditCards.indexOfFirst { it.id.toString() == storedId }
        if (index >= 0) spinner.setSelection(index + offset)
    }

    private fun mappingKey(packageName: String) = "wallet_map_$packageName"

    private fun fetchWallets(base: String, cookie: String) {
        Thread {
            try {
                val connection = URL("$base/api/wallets?mine=true").openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10_000
                connection.readTimeout = 10_000
                connection.setRequestProperty("Cookie", cookie)
                val code = connection.responseCode
                if (code !in 200..299) throw IllegalStateException("HTTP $code")
                val json = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
                val loaded = (0 until json.length()).mapNotNull { index ->
                    val item = json.optJSONObject(index) ?: return@mapNotNull null
                    val id = item.optLong("id", 0L)
                    if (id <= 0) null else WalletOption(id, item.optString("name", "Carteira $id"))
                }
                runOnUiThread {
                    showWallets(loaded)
                    if (loaded.isEmpty()) updateStatus("Nenhuma carteira encontrada.", false)
                    else { updateStatus("Carteiras carregadas", false); status.text = "Carregando cartões e regras por banco..." }
                    fetchCreditCards(base, cookie)
                }
                connection.disconnect()
            } catch (_: Exception) {
                runOnUiThread { updateStatus("Não foi possível carregar as carteiras.", false); status.text = "Verifique a URL da API e tente entrar novamente." }
            }
        }.start()
    }

    private fun fetchCreditCards(base: String, cookie: String) {
        Thread {
            try {
                val connection = URL("$base/api/credit-cards?viewMode=joint").openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10_000
                connection.readTimeout = 10_000
                connection.setRequestProperty("Cookie", cookie)
                val code = connection.responseCode
                if (code !in 200..299) throw IllegalStateException("HTTP $code")
                val json = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
                creditCards = (0 until json.length()).mapNotNull { index ->
                    val item = json.optJSONObject(index) ?: return@mapNotNull null
                    val id = item.optLong("id", 0L)
                    if (id <= 0) null else CreditCardOption(id, item.optString("name", "Cartão $id"))
                }
                runOnUiThread { showWallets(wallets); status.text = "Configure débito e crédito por banco." }
                connection.disconnect()
            } catch (_: Exception) {
                runOnUiThread { status.text = "Carteiras carregadas; não foi possível carregar os cartões." }
            }
        }.start()
    }

    private fun activationCard(): View {
        val card = surfaceCard(); val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val consent = CheckBox(this).apply {
            text = "Aceito processar notificações financeiras dos bancos selecionados. O texto bruto é processado somente no aparelho."
            textSize = 13f; setTextColor(ink); isChecked = secureStore.get("consent") == "accepted"; buttonTintList = android.content.res.ColorStateList.valueOf(green)
        }
        val activate = primaryButton("Ativar captura no Android"); activate.isEnabled = consent.isChecked
        activate.setOnClickListener {
            if (secureStore.get("cookie") == null) { updateStatus("Faça login para ativar a captura.", false); return@setOnClickListener }
            if (secureStore.get("wallet_id").isNullOrBlank()) { updateStatus("Escolha uma carteira padrão antes de ativar.", false); return@setOnClickListener }
            secureStore.put("consent", "accepted"); secureStore.put("enabled", "true"); startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)); updateStatus("Abra o Duoo Capture nessa tela e permita o acesso às notificações.", true)
        }
        consent.setOnCheckedChangeListener { _, checked -> activate.isEnabled = checked; if (!checked) { secureStore.put("enabled", "false"); secureStore.remove("consent"); updateStatus("A captura está pausada.", false) } }
        val settings = outlineButton("Abrir permissões do Android"); settings.setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
        layout.addView(consent); layout.addView(activate, marginParams(top = 10)); layout.addView(settings, marginParams(top = 8)); card.addView(layout); return card
    }

    private fun privacyNote(): View = TextView(this).apply { text = "O Duoo não acessa sua conta bancária e não usa Open Finance. Ele apenas identifica os avisos que o banco envia ao celular."; textSize = 12f; setTextColor(muted); setPadding(dp(4), dp(18), dp(4), 0) }
    private fun sectionLabel(text: String) = TextView(this).apply { this.text = text; textSize = 13f; typeface = Typeface.DEFAULT_BOLD; setTextColor(muted); setPadding(dp(4), dp(22), 0, dp(9)) }
    private fun surfaceCard() = MaterialCardView(this).apply { radius = dp(18).toFloat(); cardElevation = 0f; strokeWidth = dp(1); strokeColor = Color.rgb(225, 225, 230); setCardBackgroundColor(Color.WHITE); setContentPadding(dp(16), dp(16), dp(16), dp(16)) }
    private fun primaryButton(label: String) = MaterialButton(this).apply { text = label; textSize = 14f; isAllCaps = false; setTextColor(Color.WHITE); backgroundTintList = android.content.res.ColorStateList.valueOf(green); cornerRadius = dp(16) }
    private fun outlineButton(label: String) = MaterialButton(this).apply { text = label; textSize = 13f; isAllCaps = false; setTextColor(green); strokeColor = android.content.res.ColorStateList.valueOf(Color.rgb(190, 230, 215)); strokeWidth = dp(1); backgroundTintList = android.content.res.ColorStateList.valueOf(Color.WHITE); cornerRadius = dp(16) }
    private fun field(hint: String, value: String) = EditText(this).apply { this.hint = hint; setText(value); textSize = 16f; setTextColor(ink); setHintTextColor(muted); setSingleLine(true); background = roundedDrawable(Color.rgb(248, 248, 250), Color.rgb(225, 225, 230), dp(12)); setPadding(dp(14), 0, dp(14), 0); layoutParams = marginParams(top = 8, height = 52) }
    private fun refreshCaptureStatus() { val active = secureStore.get("enabled") == "true"; updateStatus(if (active) "Captura ativa" else "Captura ainda não ativada", active) }
    private fun updateStatus(message: String, active: Boolean) { if (!::statusTitle.isInitialized) return; statusTitle.text = message; status.text = if (active) "O Duoo está pronto para identificar notificações financeiras." else "Faça login e habilite a permissão de notificações."; statusDot.background = circleDrawable(if (active) green else Color.rgb(245, 158, 11)) }
    private fun login() {
        val base = apiBase.text.toString().trimEnd('/')
        val loginEmail = email.text.toString().trim()
        val loginPassword = password.text.toString()
        if (!base.startsWith("https://") && !base.startsWith("http://10.0.2.2")) { updateStatus("Use uma URL HTTPS para a API.", false); return }
        if (loginEmail.isBlank() || loginPassword.isBlank()) { updateStatus("Informe e-mail e senha para continuar.", false); return }
        Thread {
            try {
                val connection = URL("$base/api/auth/login").openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.connectTimeout = 10_000
                connection.readTimeout = 10_000
                connection.setRequestProperty("Content-Type", "application/json")
                val body = JSONObject().apply { put("email", loginEmail); put("password", loginPassword) }.toString()
                connection.outputStream.use { it.write(body.toByteArray()) }
                val code = connection.responseCode
                val cookie = connection.headerFields["Set-Cookie"]?.firstOrNull()?.substringBefore(';')
                if (code in 200..299 && cookie != null) {
                    secureStore.put("api_base", base)
                    secureStore.put("cookie", cookie)
                    runOnUiThread { updateStatus("Login salvo", false); status.text = "Carregando suas carteiras..." }
                    fetchWallets(base, cookie)
                } else runOnUiThread { updateStatus("Não foi possível entrar. Verifique os dados.", false) }
                connection.disconnect()
            } catch (_: Exception) {
                runOnUiThread { updateStatus("Não foi possível conectar à API.", false); status.text = "Verifique a conexão e tente novamente." }
            }
        }.start()
    }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun marginParams(top: Int = 0, height: Int = -2) = LinearLayout.LayoutParams(-1, if (height == -2) -2 else dp(height)).apply { topMargin = dp(top) }
    private fun roundedDrawable(fill: Int, stroke: Int, radius: Int) = android.graphics.drawable.GradientDrawable().apply { setColor(fill); setStroke(dp(1), stroke); cornerRadius = dp(radius).toFloat() }
    private fun circleDrawable(color: Int) = android.graphics.drawable.GradientDrawable().apply { shape = android.graphics.drawable.GradientDrawable.OVAL; setColor(color) }
}
