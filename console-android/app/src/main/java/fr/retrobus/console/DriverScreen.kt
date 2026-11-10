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
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper
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

// Pupitre conducteur : identification agent, prise de service, écran de course et messages flash.
class DriverScreen(private val activity: Activity, private val root: LinearLayout, private val vehicleParc: String) {
    private val carbon = Color.parseColor("#0F172A")
    private val panel = Color.parseColor("#1E293B")
    private val accent = Color.parseColor("#9F0A3C")
    private val handler = Handler(Looper.getMainLooper())
    private val clockFormat = SimpleDateFormat("HH:mm", Locale.FRANCE)

    private var service: Service? = null
    private var lastLocation: Location? = null
    private var courseOn = false
    private var showingFlash: Flash? = null
    private var clockView: TextView? = null
    private var flashBox: LinearLayout? = null
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
        val imei = DeviceIdentity.readImei(activity)
        thread { runCatching { DriverApi.sendPosition(mission.missionId, location.latitude, location.longitude, speed, accuracy, imei) } }
    }

    private val tick = object : Runnable {
        override fun run() {
            if (!courseOn) return
            clockView?.text = clockFormat.format(Date())
            handler.postDelayed(this, 1000)
        }
    }

    private val flashPoll = object : Runnable {
        override fun run() {
            if (!courseOn) return
            val location = lastLocation
            thread {
                val flashes = runCatching { DriverApi.flashes(location?.latitude, location?.longitude) }.getOrDefault(emptyList())
                activity.runOnUiThread { if (courseOn) flashes.firstOrNull()?.let { showFlash(it) } }
            }
            handler.postDelayed(this, 20_000)
        }
    }

    fun show() {
        if (DriverApi.isLoggedIn) loadService() else loginForm()
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
        textSize = size
        setTextColor(color)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, 10, 0, 10)
    }

    private fun button(text: String, primary: Boolean = false, action: () -> Unit) = Button(activity).apply {
        this.text = text
        if (primary) { setBackgroundColor(accent); setTextColor(Color.WHITE) }
        setOnClickListener { action() }
    }

    private fun field(hint: String, password: Boolean = false) = EditText(activity).apply {
        this.hint = hint
        setTextColor(Color.WHITE)
        setHintTextColor(Color.GRAY)
        inputType = if (password) InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD else InputType.TYPE_CLASS_TEXT
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    private fun page(content: LinearLayout.() -> Unit): Unit {
        stopLoops()
        root.removeAllViews()
        root.addView(ScrollView(activity).apply { addView(LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL; content() }) })
    }

    private fun stopLoops() {
        courseOn = false
        handler.removeCallbacksAndMessages(null)
    }

    private fun loginForm(error: String? = null): Unit = page {
        addView(title("Identification agent"))
        addView(label("Véhicule ${vehicleParc}. Saisissez votre matricule (ou e-mail) et votre mot de passe URBEX."))
        val id = field("Matricule ou e-mail")
        val password = field("Mot de passe", true)
        addView(id)
        addView(password)
        if (error != null) addView(label(error, 15f, color = Color.parseColor("#FCA5A5")))
        addView(button("S'identifier", true) {
            val identifier = id.text.toString().trim()
            val secret = password.text.toString()
            if (identifier.isEmpty() || secret.isEmpty()) return@button loginForm("Renseignez les deux champs.")
            message("Identification…")
            thread {
                val result = runCatching { DriverApi.login(identifier, secret) }
                activity.runOnUiThread { result.onSuccess { loadService() }.onFailure { loginForm(it.message) } }
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
                    if (failure is ApiException && failure.code == 401) { DriverApi.logout(); loginForm("Session expirée, identifiez-vous de nouveau.") }
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
        addView(label("Aucun service ne vous est affecté. Contactez la régulation ou créez une mission dans l'URBEX (Inéo)."))
        addView(button("Actualiser", true) { loadService() })
        addView(button("Changer d'agent") { DriverApi.logout(); loginForm() })
    }

    private fun serviceForm(current: Service, error: String? = null): Unit = page {
        addView(title("Prise de service"))
        addView(label("Agent : ${DriverApi.agentName}"))
        addView(label("${current.name} — ${courseTitle(current)}", 20f, true))
        addView(label(listOfNotNull(current.line?.let { "Ligne $it" }, current.origin, current.destination).joinToString(" → ")))
        addView(label("Départ ${current.departure ?: "--:--"} · Arrivée ${current.arrival ?: "--:--"} · ${current.stops.size} arrêt(s)", 15f))
        val code = field("Code service (ex. ${current.serviceReference})")
        addView(code)
        if (error != null) addView(label(error, 15f, color = Color.parseColor("#FCA5A5")))
        addView(button("Prendre le service", true) {
            val typed = code.text.toString().trim()
            if (typed.isEmpty()) return@button serviceForm(current, "Saisissez le code service.")
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
            setPadding(24, 12, 24, 12)
            gravity = Gravity.CENTER_VERTICAL
        }
        top.addView(label("${current.line?.let { "Ligne $it · " } ?: ""}${current.name} · ${courseTitle(current)}", 18f, true).apply { layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f) })
        top.addView(label(DriverApi.agentName, 14f))
        clockView = label(clockFormat.format(Date()), 26f, true).apply { setPadding(24, 0, 0, 0) }
        top.addView(clockView)
        root.addView(top)

        flashBox = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.parseColor("#B45309")) }
        root.addView(flashBox)

        val next = nextStopIndex(current)
        val list = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL; setPadding(24, 12, 24, 12) }
        if (current.stops.isEmpty()) list.addView(label("Aucun arrêt défini pour cette course.", 16f))
        current.stops.forEachIndexed { index, stop ->
            val isNext = index == next
            list.addView(label("${if (isNext) "▶ " else "   "}${stop.time ?: "--:--"}  ${stop.label}", if (isNext) 22f else 17f, isNext, if (index < next) Color.GRAY else Color.WHITE))
        }
        root.addView(ScrollView(activity).apply {
            setBackgroundColor(panel)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
            addView(list)
        })

        infoView = label("Position GPS : en attente…", 14f, color = Color.LTGRAY).apply { setPadding(24, 4, 24, 4) }
        root.addView(infoView)
        val bar = LinearLayout(activity).apply { orientation = LinearLayout.HORIZONTAL; setPadding(24, 8, 24, 8); setBackgroundColor(carbon) }
        if (current.stopByStop) {
            bar.addView(button("Marquer l'arrêt", true) { markStop(current) }.apply { layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f) })
        }
        if (current.courseCount > 0 && current.courseNumber < current.courseCount) {
            bar.addView(button("Course suivante", true) { goNextCourse(current) }.apply { layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f) })
        }
        bar.addView(button("Terminer le service") { confirmEnd(current) }.apply { layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f) })
        root.addView(bar)

        startLocation()
        handler.post(tick)
        handler.post(flashPoll)
    }

    private fun courseTitle(current: Service): String {
        if (current.courseCount == 0) return "course ${current.courseReference}"
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

    // Prochain arrêt : premier arrêt dont l'horaire n'est pas encore passé.
    private fun nextStopIndex(current: Service): Int {
        val now = clockFormat.format(Date())
        val index = current.stops.indexOfFirst { (it.time ?: "99:99") >= now }
        return if (index < 0) maxOf(current.stops.size - 1, 0) else index
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

    private fun markStop(current: Service) {
        infoView?.text = "Marquage de l'arrêt…"
        thread {
            val result = runCatching { DriverApi.markStop(current.missionId) }
            activity.runOnUiThread { infoView?.text = result.fold({ "Arrêt marqué." }, { it.message ?: "Marquage impossible." }) }
        }
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

    private fun showFlash(flash: Flash) {
        if (showingFlash?.id == flash.id) return
        showingFlash = flash
        val box = flashBox ?: return
        box.removeAllViews()
        box.setPadding(24, 12, 24, 12)
        box.addView(label("MESSAGE FLASH", 14f, true))
        box.addView(label(flash.message, 22f, true))
        box.addView(button("Visa") {
            val missionId = service?.missionId
            thread { runCatching { DriverApi.acknowledgeFlash(flash.id, missionId) } }
            box.removeAllViews()
            box.setPadding(0, 0, 0, 0)
            showingFlash = null
        })
        runCatching { ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100).startTone(ToneGenerator.TONE_PROP_BEEP2, 600) }
    }
}
