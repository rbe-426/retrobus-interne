package fr.retrobus.console

import android.app.Activity
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
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(carbon)
            setPadding(48, 48, 48, 48)
            gravity = Gravity.CENTER_HORIZONTAL
        }
        setContentView(root)
        activate(DeviceIdentity.readImei(this))
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

    private fun showHome(activation: Activation) {
        root.removeAllViews()
        root.addView(label("Console RétroBus", 28f, true))
        root.addView(label("Véhicule : ${activation.vehicleParc}${activation.vehicleLabel?.let { " — $it" } ?: ""}"))
        root.addView(label("UC associé : ${activation.ucSerial}"))
        root.addView(label("Révision de contenu : ${activation.contentRevision ?: "aucune"}"))
    }
}
