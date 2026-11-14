package fr.retrobus.console

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import android.text.InputFilter
import android.text.InputType
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.concurrent.thread

// Pupitre conducteur : connexion par matricule + code, prise de service et écran de course. Tout passe par l'UC du véhicule.
class DriverScreen(private val activity: Activity, private val root: LinearLayout, private val vehicleParc: String) {
    private val carbon = Color.parseColor("#0F172A")
    private val panel = Color.parseColor("#1E293B")
    private val accent = Color.parseColor("#9F0A3C")
    private val handler = Handler(Looper.getMainLooper())
    private val clockFormat = SimpleDateFormat("HH:mm", Locale.FRANCE)

    private var service: Service? = null
    private var lastLocation: Location? = null
    private var courseOn = false
    private var clockView: TextView? = null
    private var infoView: TextView? = null
    private var lastPositionSent = 0L

    private val listener = LocationListener { location ->
        lastLocation = location
        val now = System.currentTimeMillis()
        val mission = service?.takeIf { it.active } ?: return@LocationListener
        if (now - lastPositionSent < 10_000) return@LocationListener
        lastPositionSent = now
        val speed = if (location.hasSpeed()) location.speed * 3.6 else null
        val accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null
        thread { runCatching { DriverApi.sendPosition(mission.missionId, location.latitude, location.longitude, speed, accuracy) } }
    }

    private val tick = object : Runnable {
        override fun run() {
            if (!courseOn) return
            clockView?.text = clockFormat.format(Date())
            handler.postDelayed(this, 1000)
        }
    }

    fun show() {
        connectThen { if (DriverApi.isLoggedIn) loadService() else loginForm() }
    }

    private fun splash(text: String): Unit = page {
        gravity = Gravity.CENTER
        addView(label("Console RétroBus", 32f, true).apply { gravity = Gravity.CENTER })
        addView(label(text, 16f, color = Color.parseColor("#94A3B8")).apply { gravity = Gravity.CENTER })
    }

    // La connexion n'est proposée qu'une fois l'UC joint ; sinon l'écran de perte de liaison relance la recherche toutes les 5 s.
    private fun connectThen(onConnected: () -> Unit) {
        splash("Démarrage… recherche de l'UC du véhicule")
        thread {
            val found = runCatching { DriverApi.connect() }.getOrNull()
            activity.runOnUiThread { if (found != null) onConnected() else connectionLost(onConnected) }
        }
    }

    private fun connectionLost(onConnected: () -> Unit): Unit = page {
        gravity = Gravity.CENTER
        addView(label("Perte de Connexion avec InéoRBE", 28f, true).apply { gravity = Gravity.CENTER })
        addView(label("Nouvelle recherche en cours…", 14f, color = Color.parseColor("#94A3B8")).apply { gravity = Gravity.CENTER })
        this@DriverScreen.handler.postDelayed({
            thread {
                val found = runCatching { DriverApi.connect() }.getOrNull()
                activity.runOnUiThread { if (found != null) onConnected() else connectionLost(onConnected) }
            }
        }, 5000)
    }

    fun onPermissionResult() {
        if (courseOn) startLocation()
    }

    fun stop() {
        courseOn = false
        handler.removeCallbacksAndMessages(null)
        (activity.getSystemService(Context.LOCATION_SERVICE) as LocationManager).removeUpdates(listener)
    }

    private fun title(text: String) = label(text, 28f, true)

    private fun label(text: String, size: Float = 18f, bold: Boolean = false, color: Int = Color.WHITE) = TextView(activity).apply {
        this.text = text
        textSize = UiScale.sp(size)
        setTextColor(color)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, UiScale.px(5), 0, UiScale.px(5))
    }

    private fun button(text: String, primary: Boolean = false, action: () -> Unit) = Button(activity).apply {
        this.text = text
        textSize = UiScale.sp(16f)
        if (primary) { setBackgroundColor(accent); setTextColor(Color.WHITE) }
        setOnClickListener { action() }
    }

    private fun field(hint: String, digits: Int? = null, secret: Boolean = false) = EditText(activity).apply {
        this.hint = hint
        textSize = UiScale.sp(22f)
        setTextColor(Color.WHITE)
        setHintTextColor(Color.GRAY)
        inputType = when {
            digits != null && secret -> InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            digits != null -> InputType.TYPE_CLASS_NUMBER
            else -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
        }
        if (digits != null) filters = arrayOf(InputFilter.LengthFilter(digits))
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    private fun page(content: LinearLayout.() -> Unit) {
        stopLoops()
        root.removeAllViews()
        root.addView(ScrollView(activity).apply {
            isFillViewport = true
            addView(LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(UiScale.px(24), UiScale.px(16), UiScale.px(24), UiScale.px(16))
                content()
            })
        })
    }

    private fun stopLoops() {
        courseOn = false
        handler.removeCallbacksAndMessages(null)
    }

    private fun loginForm(error: String? = null): Unit = page {
        addView(title("Identification conducteur"))
        addView(label("Véhicule $vehicleParc. Saisissez votre matricule (5 chiffres) et votre code."))
        val number = field("Matricule (5 chiffres)", 5)
        val code = field("Code", 8, true)
        addView(number)
        addView(code)
        if (error != null) addView(label(error, 15f, color = Color.parseColor("#FCA5A5")))
        addView(button("Se connecter", true) {
            val typedNumber = number.text.toString().trim()
            val typedCode = code.text.toString().trim()
            if (typedNumber.length != 5 || typedCode.isEmpty()) return@button loginForm("Saisissez un matricule à 5 chiffres et votre code.")
            message("Connexion à l'UC…")
            thread {
                val result = runCatching { DriverApi.login(typedNumber, typedCode) }
                activity.runOnUiThread { result.onSuccess { loadService() }.onFailure { if (it.message?.startsWith("Perte de Connexion") == true) connectionLost { loginForm() } else loginForm(it.message) } }
            }
        })
    }

    private fun message(text: String): Unit = page { addView(title("Console RétroBus")); addView(label(text)) }

    private fun loadService() {
        message("Recherche de votre service…")
        thread {
            val result = runCatching { DriverApi.currentService() }
            activity.runOnUiThread {
                result.onSuccess { found ->
                    service = found
                    when {
                        found == null -> noService()
                        found.active -> course(found)
                        else -> serviceForm(found)
                    }
                }.onFailure { failure ->
                    if (failure.message?.startsWith("Session expirée") == true) { DriverApi.logout(); loginForm("Session expirée, identifiez-vous de nouveau.") }
                    else if (failure.message?.startsWith("Perte de Connexion") == true) connectionLost { loadService() }
                    else retry(failure.message ?: "Erreur inconnue.")
                }
            }
        }
    }

    private fun retry(error: String): Unit = page {
        addView(title("Service indisponible"))
        addView(label(error))
        addView(button("Réessayer", true) { loadService() })
        addView(button("Changer d'agent") { DriverApi.logout(); loginForm() })
    }

    private fun noService(): Unit = page {
        addView(title("Bonjour ${DriverApi.agentName}"))
        addView(label("Aucun service ne vous est affecté sur ce véhicule. Contactez la régulation."))
        addView(button("Actualiser", true) { loadService() })
        addView(button("Changer d'agent") { DriverApi.logout(); loginForm() })
    }

    private fun serviceForm(current: Service, error: String? = null): Unit = page {
        addView(title("Prise de service"))
        addView(label("Agent : ${DriverApi.agentName}"))
        addView(label("${current.name} — ${courseTitle(current)}", 20f, true))
        addView(label(listOfNotNull(current.line?.let { "Ligne $it" }, current.origin, current.destination).joinToString(" → ")))
        addView(label("Départ ${current.departure ?: "--:--"} · ${current.stops.size} arrêt(s)", 15f))
        val code = field("Numéro de service")
        addView(code)
        if (error != null) addView(label(error, 15f, color = Color.parseColor("#FCA5A5")))
        addView(button("Prendre le service", true) {
            val typed = code.text.toString().trim()
            if (typed.isEmpty()) return@button serviceForm(current, "Saisissez le numéro de service.")
            message("Prise de service…")
            thread {
                val result = runCatching { DriverApi.startService(current, typed) }
                activity.runOnUiThread { result.onSuccess { loadService() }.onFailure { serviceForm(current, it.message) } }
            }
        })
        addView(button("Changer d'agent") { DriverApi.logout(); loginForm() })
    }

    private fun course(current: Service) {
        stopLoops()
        courseOn = true
        root.removeAllViews()
        val top = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(accent)
            setPadding(UiScale.px(16), UiScale.px(8), UiScale.px(16), UiScale.px(8))
            gravity = Gravity.CENTER_VERTICAL
        }
        top.addView(label("${current.line?.let { "Ligne $it · " } ?: ""}${current.name} · ${courseTitle(current)}", 18f, true).apply { layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f) })
        top.addView(label(DriverApi.agentName, 14f))
        clockView = label(clockFormat.format(Date()), 26f, true).apply { setPadding(UiScale.px(16), 0, 0, 0) }
        top.addView(clockView)
        root.addView(top)

        val list = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL; setPadding(UiScale.px(16), UiScale.px(8), UiScale.px(16), UiScale.px(8)) }
        if (current.stops.isEmpty()) list.addView(label("Aucun arrêt défini pour cette course.", 16f))
        current.stops.forEach { stop -> list.addView(label(stop.label, 18f)) }
        root.addView(ScrollView(activity).apply {
            setBackgroundColor(panel)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
            addView(list)
        })

        infoView = label("Position GPS : en attente…", 14f, color = Color.LTGRAY).apply { setPadding(UiScale.px(16), UiScale.px(2), UiScale.px(16), UiScale.px(2)) }
        root.addView(infoView)
        val bar = LinearLayout(activity).apply { orientation = LinearLayout.HORIZONTAL; setPadding(UiScale.px(16), UiScale.px(6), UiScale.px(16), UiScale.px(6)); setBackgroundColor(carbon) }
        if (current.courseCount > 0 && current.courseNumber < current.courseCount) {
            bar.addView(button("Course suivante", true) { goNextCourse(current) }.apply { layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f) })
        }
        bar.addView(button("Terminer le service") { confirmEnd(current) }.apply { layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f) })
        root.addView(bar)

        startLocation()
        handler.post(tick)
    }

    private fun courseTitle(current: Service): String {
        if (current.courseCount == 0) return "service"
        val sens = when (current.direction) { "ALLER" -> "aller"; "RETOUR" -> "retour"; "HLP" -> "HLP"; else -> "" }
        return "course ${current.courseNumber}/${current.courseCount} $sens".trim()
    }

    private fun goNextCourse(current: Service) {
        infoView?.text = "Passage à la course suivante…"
        thread {
            val result = runCatching { DriverApi.nextCourse(current.missionId) }
            activity.runOnUiThread { result.onSuccess { loadService() }.onFailure { infoView?.text = it.message ?: "Changement impossible." } }
        }
    }

    private fun startLocation() {
        if (activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 42)
            infoView?.text = "Autorisez la localisation pour transmettre la position du véhicule."
            return
        }
        val manager = activity.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        runCatching {
            manager.removeUpdates(listener)
            manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5_000L, 0f, listener, Looper.getMainLooper())
            infoView?.text = "Position GPS active."
        }.onFailure { infoView?.text = "GPS indisponible." }
    }

    private fun confirmEnd(current: Service): Unit = page {
        addView(title("Terminer le service ?"))
        addView(label("${current.name} — ${courseTitle(current)}"))
        addView(button("Oui, terminer", true) {
            message("Fin de service…")
            thread {
                val result = runCatching { DriverApi.complete(current.missionId) }
                activity.runOnUiThread {
                    result.onSuccess { stop(); loadService() }.onFailure { course(current); infoView?.text = it.message }
                }
            }
        })
        addView(button("Revenir à la course") { course(current) })
    }
}
