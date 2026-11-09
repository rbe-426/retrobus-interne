package fr.retrobus.console

import android.app.Activity
import android.app.ActivityManager
import android.content.pm.ApplicationInfo
import android.view.WindowManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.concurrent.thread

// Écran unique pour l'instant : activation par IMEI, puis accueil de la console (véhicule, UC, contenu).
// Les zones du pupitre conducteur sont décrites dans Interne/docs/CONSOLE_MOBILE_REFERENCE.md.
class MainActivity : Activity() {
    private val carbon = Color.parseColor("#0F172A")
    private val accent = Color.parseColor("#9F0A3C")

    private lateinit var root: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        stopOtherApps()
        root =  LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(carbon)
            setPadding(48, 48, 48, 48)
            gravity = Gravity.CENTER_HORIZONTAL
        }
        setContentView(root)
        showMessage("Console RétroBus", "Recherche de mise à jour…", null, false)
        thread {
            val update = UpdateManager.check(BuildConfig.VERSION_NAME)
            runOnUiThread {
                if (update != null) offerUpdate(update) else activate(DeviceIdentity.readImei(this))
            }
        }
    }

    // La mise à jour est proposée à chaque ouverture tant qu'elle n'est pas installée.
    private fun offerUpdate(update: UpdateInfo, error: String? = null) {
        root.removeAllViews()
        root.addView(label("Mise à jour disponible", 28f, true))
        root.addView(label("Version ${update.version} (installée : ${BuildConfig.VERSION_NAME})."))
        if (update.notes.isNotBlank()) root.addView(label(update.notes, 15f))
        if (error != null) root.addView(label(error, 15f).apply { setTextColor(Color.parseColor("#FCA5A5")) })
        root.addView(Button(this).apply {
            text = "Mettre à jour maintenant"
            setBackgroundColor(accent)
            setTextColor(Color.WHITE)
            setOnClickListener { downloadAndInstall(update) }
        })
        root.addView(Button(this).apply { text = "Plus tard"; setOnClickListener { activate(DeviceIdentity.readImei(this@MainActivity)) } })
    }

    private fun downloadAndInstall(update: UpdateInfo) {
        showMessage("Mise à jour", "Téléchargement de la version ${update.version}…", null, false)
        thread {
            val outcome = runCatching { UpdateManager.download(this, update) }
            runOnUiThread {
                outcome.onSuccess { apk ->
                    if (UpdateManager.install(this, apk)) {
                        offerUpdate(update, "Installation lancée. Si rien ne s'affiche, appuyez de nouveau sur « Mettre à jour ».")
                    } else {
                        offerUpdate(update, "Autorisez l'installation depuis cette application dans les réglages, puis revenez et appuyez de nouveau.")
                    }
                }.onFailure { offerUpdate(update, it.message ?: "Téléchargement impossible.") }
            }
        }
    }

    private fun label(text: String, size: Float = 18f, bold: Boolean = false) = TextView(this).apply {
        this.text = text
        textSize = size
        setTextColor(Color.WHITE)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, 12, 0, 12)
    }

    private fun showMessage(title: String, message: String, onRetry: (() -> Unit)?, onChangeImei: Boolean) {
        root.removeAllViews()
        root.addView(label(title, 28f, true))
        root.addView(label(message))
        if (onRetry != null) root.addView(Button(this).apply { text = "Réessayer"; setOnClickListener { onRetry() } })
        if (onChangeImei) root.addView(Button(this).apply { text = "Saisir l'IMEI"; setOnClickListener { askImei() } })
    }

    private fun askImei() {
        root.removeAllViews()
        root.addView(label("Activation de la console", 28f, true))
        root.addView(label("Saisissez l'IMEI de cette console (composez *#06# pour l'afficher). Il doit être rattaché à un véhicule dans l'URBEX."))
        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER
            hint = "IMEI (15 chiffres)"
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
        root.addView(input)
        root.addView(Button(this).apply {
            text = "Activer"
            setBackgroundColor(accent)
            setTextColor(Color.WHITE)
            setOnClickListener { activate(input.text.toString().filter { it.isDigit() }) }
        })
    }

    private fun activate(imei: String?) {
        if (imei.isNullOrBlank()) { askImei(); return }
        showMessage("Activation…", "Vérification auprès du serveur RétroBus.", null, false)
        thread {
            val result = ConsoleApi.activate(imei, DeviceIdentity.deviceId(this), DeviceIdentity.model(), BuildConfig.VERSION_NAME)
            runOnUiThread {
                when (result) {
                    is ActivationResult.Granted -> {
                        DeviceIdentity.saveImei(this, imei)
                        showHome(result.activation)
                    }
                    is ActivationResult.Refused -> {
                        DeviceIdentity.clearImei(this)
                        showMessage("Console non autorisée", result.message, null, true)
                    }
                    is ActivationResult.Failed -> showMessage("Activation impossible", result.message, { activate(imei) }, true)
                }
            }
        }
    }

    private var driver: DriverScreen? = null

    // Android ne permet de stopper que les processus d'arrière-plan des autres applications.
    private fun stopOtherApps() {
        val manager = getSystemService(ACTIVITY_SERVICE) as ActivityManager
        packageManager.getInstalledApplications(0)
            .filter { it.packageName != packageName && (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
            .forEach { runCatching { manager.killBackgroundProcesses(it.packageName) } }
    }

    override fun onResume() {
        super.onResume()
        stopOtherApps()
    }

    private fun showHome(activation: Activation) {
        root.setPadding(0, 0, 0, 0)
        driver?.stop()
        driver = DriverScreen(this, root, activation.vehicleParc).also { it.show() }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        driver?.onPermissionResult()
    }

    override fun onDestroy() {
        driver?.stop()
        super.onDestroy()
    }
}
