package fr.retrobus.console

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import android.text.InputFilter
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.concurrent.thread

// Pupitre conducteur : connexion par matricule + code, prise de service et écran de course. Tout passe par l'UC du véhicule.
class DriverScreen(private val activity: Activity, private val root: LinearLayout, private val vehicleParc: String) {
    private companion object { const val OFF_ROUTE_METERS = 300.0 }
    private val handler = Handler(Looper.getMainLooper())
    private val clockFormat = SimpleDateFormat("HH:mm", Locale.FRANCE)

    private var service: Service? = null
    private var lastLocation: Location? = null
    private var courseOn = false
    private var moved = false
    private var clockView: TextView? = null
    private var courseView: CourseView? = null
    private var infoView: TextView? = null
    private var lastPositionSent = 0L

    private val listener = LocationListener { location ->
        lastLocation = location
        if (location.hasSpeed() && location.speed * 3.6 > 8) moved = true
        val route = service?.stops.orEmpty()
        val off = moved && route.size >= 2 && distanceToRoute(location, route) > OFF_ROUTE_METERS
        courseView?.let { it.departing = !moved; it.offRoute = off; it.invalidate() }
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
            val now = clockFormat.format(Date())
            clockView?.text = now
            courseView?.let { it.clock = now; it.delayMinutes = if (moved) null else delayFor(service); it.invalidate() }
            handler.postDelayed(this, 1000)
        }
    }

    // Distance (m) entre la position et la ligne brisée formée par les arrêts restants.
    private fun distanceToRoute(location: Location, stops: List<Stop>): Double {
        val lat0 = Math.toRadians(location.latitude)
        fun x(lng: Double) = Math.toRadians(lng - location.longitude) * Math.cos(lat0) * 6_371_000.0
        fun y(lat: Double) = Math.toRadians(lat - location.latitude) * 6_371_000.0
        var best = Double.MAX_VALUE
        for (i in 0 until stops.size - 1) {
            val ax = x(stops[i].lng); val ay = y(stops[i].lat); val bx = x(stops[i + 1].lng); val by = y(stops[i + 1].lat)
            val dx = bx - ax; val dy = by - ay
            val len2 = dx * dx + dy * dy
            val t = if (len2 == 0.0) 0.0 else ((-ax * dx - ay * dy) / len2).coerceIn(0.0, 1.0)
            best = minOf(best, Math.hypot(ax + t * dx, ay + t * dy))
        }
        return best
    }

    // Retard : seulement avant le départ de la course, par rapport à l'heure théorique.
    private fun delayFor(current: Service?): Int? {
        val parts = current?.departure?.split(":")?.mapNotNull { it.trim().toIntOrNull() } ?: return null
        if (parts.size < 2) return null
        val now = Calendar.getInstance()
        val minutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE) - (parts[0] * 60 + parts[1])
        return minutes.coerceAtLeast(0)
    }

    fun show() {
        connectThen { if (DriverApi.isLoggedIn) loadService() else loginForm() }
    }

    private fun full(view: View) {
        stopLoops()
        root.removeAllViews()
        root.addView(view, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    }

    private fun splash(text: String) {
        full(FrameLayout(activity).apply {
            setBackgroundColor(Look.bg)
            addView(Look.image(activity, R.drawable.slogan_splash, UiScale.ri(100f)).apply { (layoutParams as FrameLayout.LayoutParams).apply { gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL; topMargin = UiScale.ri(30f) } })
            addView(Look.image(activity, R.drawable.logo_splash, UiScale.ri(380f)).apply { (layoutParams as FrameLayout.LayoutParams).gravity = Gravity.CENTER })
            addView(Look.text(activity, text, 28f, Look.muted, false), FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; bottomMargin = UiScale.ri(100f) })
            addView(Look.text(activity, "Un projet de l'association RétroBus Essonne", 44f), FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; bottomMargin = UiScale.ri(30f) })
        })
    }

    // La connexion n'est proposée qu'une fois l'UC joint ; sinon l'écran de perte de liaison relance la recherche toutes les 5 s.
    private fun connectThen(onConnected: () -> Unit) {
        splash("Recherche de l'UC du véhicule…")
        thread {
            val found = runCatching { DriverApi.connect() }.getOrNull()
            activity.runOnUiThread { if (found != null) onConnected() else connectionLost(onConnected) }
        }
    }

    private fun connectionLost(onConnected: () -> Unit): Unit = page {
        addView(Look.text(activity, "Perte de connexion avec InéoRBE", 64f))
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

    private fun title(text: String) = Look.text(activity, text, 64f).apply { setPadding(0, UiScale.ri(6f), 0, UiScale.ri(24f)) }

    private fun fieldBox(color: Int) = GradientDrawable().apply { setColor(color); cornerRadius = UiScale.r(8f) }

    private fun field(hint: String, color: Int, digits: Int? = null, secret: Boolean = false) = EditText(activity).apply {
        this.hint = hint
        setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, UiScale.r(58f))
        gravity = Gravity.CENTER
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(Color.WHITE)
        setHintTextColor(Color.parseColor("#FFB4C6"))
        background = fieldBox(color)
        inputType = when {
            digits != null && secret -> InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            digits != null -> InputType.TYPE_CLASS_NUMBER
            else -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
        }
        if (digits != null) filters = arrayOf(InputFilter.LengthFilter(digits))
        layoutParams = LinearLayout.LayoutParams(UiScale.ri(340f), ViewGroup.LayoutParams.WRAP_CONTENT).apply { leftMargin = UiScale.ri(24f) }
    }

    private fun row(label: String, input: EditText) = LinearLayout(activity).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
        setPadding(0, UiScale.ri(10f), 0, UiScale.ri(10f))
        addView(Look.text(activity, label, 56f))
        addView(input)
    }

    private fun button(text: String, primary: Boolean = false, action: () -> Unit) = Button(activity).apply {
        this.text = text
        setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, UiScale.r(32f))
        setTextColor(Color.WHITE)
        background = fieldBox(if (primary) Look.red else Color.parseColor("#334155"))
        setOnClickListener { action() }
    }

    // Écran à cadre commun (logo, heure, slogan) ; le contenu est centré.
    private fun page(content: LinearLayout.() -> Unit) {
        val clock = TextView(activity).apply { text = clockFormat.format(Date()); setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, UiScale.r(76f)); setTextColor(Color.WHITE); setTypeface(typeface, Typeface.BOLD) }
        val body = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            content()
        }
        full(Look.frame(activity, clock, body))
        clockView = clock
        courseView = null
        handler.post(tick)
    }

    private fun stopLoops() {
        courseOn = false
        clockView = null
        courseView = null
        handler.removeCallbacksAndMessages(null)
    }

    // Écran de résultat : message coloré affiché quelques secondes, puis suite.
    private fun verdict(heading: String, result: String, color: Int, delayMs: Long, next: () -> Unit) {
        page {
            addView(title(heading))
            addView(Look.text(activity, result, 56f, color))
        }
        handler.postDelayed(next, delayMs)
    }

    private fun loginForm(error: String? = null): Unit = page {
        addView(title("Identification conducteur"))
        val number = field("ID InéoRBE", Look.red, 5)
        val code = field("MDP InéoRBE", Look.red, 8, true)
        addView(row("ID InéoRBE", number))
        addView(row("MDP InéoRBE", code))
        if (error != null) addView(Look.text(activity, error, 28f, Color.parseColor("#FCA5A5"), false))
        addView(button("Se connecter", true) {
            val typedNumber = number.text.toString().trim()
            val typedCode = code.text.toString().trim()
            if (typedNumber.length != 5 || typedCode.isEmpty()) return@button loginForm("Saisissez un matricule à 5 chiffres et votre code.")
            message("Connexion à l'UC…")
            thread {
                val result = runCatching { DriverApi.login(typedNumber, typedCode) }
                activity.runOnUiThread {
                    result.onSuccess { verdict("Identification conducteur", "IDENTIFICATION REUSSIE", Look.green, 1200) { loadService() } }
                        .onFailure {
                            if (it.message?.startsWith("Perte de Connexion") == true) connectionLost { loginForm() }
                            else verdict("Identification conducteur", "IDENTIFICATION ÉCHOUÉE", Look.red, 2200) { loginForm(it.message) }
                        }
                }
            }
        }.apply { layoutParams = LinearLayout.LayoutParams(UiScale.ri(420f), ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = UiScale.ri(16f) } })
    }

    private fun message(text: String): Unit = page { addView(Look.text(activity, text, 52f)) }

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

    // Interroge l'UC toutes les 5 s tant qu'aucun service n'est en cours, sans réafficher l'écran si rien ne change.
    private fun watchService(shownId: String?) {
        handler.postDelayed({
            thread {
                val result = runCatching { DriverApi.currentService() }
                activity.runOnUiThread {
                    val found = result.getOrNull()
                    val failure = result.exceptionOrNull()
                    when {
                        failure != null && failure.message?.startsWith("Session expirée") == true -> { DriverApi.logout(); loginForm("Session expirée, identifiez-vous de nouveau.") }
                        failure != null && failure.message?.startsWith("Perte de Connexion") == true -> connectionLost { loadService() }
                        failure != null -> watchService(shownId)
                        found?.missionId != shownId || found?.active == true -> { service = found; when { found == null -> noService(); found.active -> course(found); else -> serviceForm(found) } }
                        else -> watchService(shownId)
                    }
                }
            }
        }, 5000)
    }

    private fun retry(error: String): Unit = page {
        watchService(null)
        addView(title("Service indisponible"))
        addView(Look.text(activity, error, 32f, Look.muted, false))
        addView(button("Réessayer", true) { loadService() })
        addView(button("Changer d'agent") { DriverApi.logout(); loginForm() })
    }

    private fun noService(): Unit = page {
        watchService(null)
        addView(title("Bonjour ${DriverApi.agentName}"))
        addView(Look.text(activity, "Aucun service ne vous est affecté sur ce véhicule. Contactez la régulation.", 32f, Look.muted, false))
        addView(button("Actualiser", true) { loadService() })
        addView(button("Changer d'agent") { DriverApi.logout(); loginForm() })
    }

    private fun serviceForm(current: Service, error: String? = null): Unit = page {
        watchService(current.missionId)
        addView(title("Identification du service"))
        val code = field("Service", Look.blue, 8)
        addView(row("Service N°", code))
        if (error != null) addView(Look.text(activity, error, 28f, Color.parseColor("#FCA5A5"), false))
        addView(button("Prendre le service", true) {
            val typed = code.text.toString().trim()
            if (typed.isEmpty()) return@button serviceForm(current, "Saisissez le numéro de service.")
            message("Prise de service…")
            thread {
                val result = runCatching { DriverApi.startService(current, typed) }
                activity.runOnUiThread {
                    result.onSuccess { loadService() }.onFailure {
                        val lines = "PRISE DE SERVICE REFUSEE\nVERIFIER LE GESTIONNAIRE OU\nCONTACTER LE CONTROLEUR CENTRAL"
                        verdict("Identification du service", lines, Look.red, 3500) { serviceForm(current, it.message) }
                    }
                }
            }
        }.apply { layoutParams = LinearLayout.LayoutParams(UiScale.ri(420f), ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = UiScale.ri(16f) } })
        addView(button("Changer d'agent") { DriverApi.logout(); loginForm() }.apply { layoutParams = LinearLayout.LayoutParams(UiScale.ri(420f), ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = UiScale.ri(8f) } })
    }

    private fun cityOf(label: String) = label.substringBefore(" – ").trim()
    private fun placeOf(label: String) = label.substringAfter(" – ", label).trim()

    private fun course(current: Service) {
        stopLoops()
        courseOn = true
        moved = false
        val view = CourseView(activity).apply {
            lineNumber = current.line ?: current.name
            destination = current.stops.lastOrNull()?.let { cityOf(it.label) } ?: (current.destination ?: "")
            current.color?.let { runCatching { lineColor = Color.parseColor(it) } }
            origin = current.stops.firstOrNull()?.let { cityOf(it.label) } ?: ""
            departure = current.departure ?: ""
            terminus = current.stops.lastOrNull()?.let { placeOf(it.label) } ?: ""
            stops = current.stops.mapIndexed { index, stop -> placeOf(stop.label) to (stop.time ?: if (index == 0) current.departure ?: "" else "") }
            departing = true
            serviceText = current.serviceReference.ifBlank { current.name }
            vehicleText = vehicleParc
            clock = clockFormat.format(Date())
            delayMinutes = delayFor(current)
        }
        courseView = view
        val screen = FrameLayout(activity)
        screen.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        infoView = Look.text(activity, "", 26f, Color.LTGRAY, false)
        screen.addView(infoView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL; leftMargin = UiScale.ri(380f) })
        val bar = LinearLayout(activity).apply { orientation = LinearLayout.HORIZONTAL }
        if (current.courseCount > 0 && current.courseNumber < current.courseCount) bar.addView(button("Course suivante", true) { goNextCourse(current) })
        bar.addView(button("Terminer le service") { confirmEnd(current) })
        screen.addView(bar, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; leftMargin = UiScale.ri(380f); bottomMargin = UiScale.ri(10f) })
        root.removeAllViews()
        root.addView(screen, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        startLocation()
        handler.post(tick)
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
        }.onFailure { infoView?.text = "GPS indisponible." }
    }

    private fun confirmEnd(current: Service): Unit = page {
        addView(title("Terminer le service ?"))
        addView(Look.text(activity, current.name, 32f, Look.muted, false))
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
