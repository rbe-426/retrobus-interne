package fr.retrobus.console

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.net.URL
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.Callable
import java.util.concurrent.Executors

class ApiException(message: String, val code: Int = 0) : Exception(message)

data class Stop(val label: String, val time: String?, val lat: Double, val lng: Double)

data class Service(
    val missionId: String,
    val name: String,
    val serviceReference: String,
    val active: Boolean,
    val line: String?,
    val routeName: String?,
    val origin: String?,
    val destination: String?,
    val departure: String?,
    val stops: List<Stop>,
    val courseNumber: Int = 0,
    val courseCount: Int = 0,
    val direction: String? = null,
    val color: String? = null,
    val stopIndex: Int = 0,
    val courseIndex: Int = 0,
    val path: List<Stop> = emptyList(),
)

// La console ne parle qu'à l'UC du véhicule (HTTP sur le réseau local). Les appels sont bloquants : hors du thread principal.
object DriverApi {
    private const val PORT = 47801
    private const val PREFS = "uc_link"
    private const val HOST_KEY = "host"
    private const val MANUAL_KEY = "manual_host"

    private var token: String? = null
    private var host: String? = null
    private var manualHost: String? = null
    private var addressRefresh: (() -> List<String>)? = null
    private var expectedSerial: String = ""
    private var serverAddresses: List<String> = emptyList()
    private var appContext: Context? = null

    var agentName: String = ""
        private set
    var vehicleName: String = ""
        private set

    val isLoggedIn get() = token != null

    fun init(context: Context) {
        appContext = context.applicationContext
        val prefs = appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        host = prefs?.getString(HOST_KEY, null)
        manualHost = prefs?.getString(MANUAL_KEY, null)
    }

    // Numéro de série de l'UC du véhicule et adresses que l'UC a déclarées au serveur (reçus à l'activation).
    // `refresh` redemande ces adresses au serveur, car l'IP de l'UC peut changer.
    fun configure(serial: String, addresses: List<String>, refresh: (() -> List<String>)? = null) {
        expectedSerial = serial
        serverAddresses = addresses
        addressRefresh = refresh
    }

    fun logout() {
        val current = token
        token = null
        agentName = ""
        if (current != null) runCatching { call("/console/logout", JSONObject().put("token", current)) }
    }

    fun login(number: String, code: String) {
        val response = call("/console/login", JSONObject().put("number", number).put("code", code))
        token = response.optString("token").ifBlank { null } ?: throw ApiException("Identification impossible.")
        agentName = response.optString("driverIdentifier").ifBlank { number }
        vehicleName = response.optString("vehicle")
    }

    @Volatile var simulation: Triple<Double, Double, Double>? = null

    fun currentService(): Service? {
        val response = call("/console/current", JSONObject().put("token", token))
        // Mode simulation : l'UC relaie la position fictive du Gestionnaire.
        simulation = response.optJSONObject("simulation")?.takeIf { it.optBoolean("active") }?.let { Triple(it.optDouble("latitude"), it.optDouble("longitude"), it.optDouble("speedKmh", 20.0)) }
        return parse(response.optJSONObject("service"))
    }

    fun startService(service: Service, serviceCode: String) {
        call("/console/start", JSONObject().put("token", token).put("missionId", service.missionId).put("serviceReference", serviceCode.trim().uppercase()))
    }

    fun nextCourse(missionId: String) {
        call("/console/next", JSONObject().put("token", token).put("missionId", missionId))
    }

    fun sendPosition(missionId: String, latitude: Double, longitude: Double, speedKmh: Double?, accuracy: Double?) {
        val body = JSONObject().put("token", token).put("missionId", missionId).put("latitude", latitude).put("longitude", longitude)
        if (speedKmh != null) body.put("speedKmh", speedKmh)
        if (accuracy != null) body.put("accuracy", accuracy)
        call("/console/position", body, strict = false)
    }

    fun complete(missionId: String) {
        call("/console/complete", JSONObject().put("token", token).put("missionId", missionId))
    }

    fun abort(missionId: String) {
        call("/console/abort", JSONObject().put("token", token).put("missionId", missionId))
    }

    private fun parse(service: JSONObject?): Service? {
        service ?: return null
        val routes = service.optJSONArray("routes") ?: JSONArray()
        val index = service.optInt("courseIndex").coerceIn(0, maxOf(routes.length() - 1, 0))
        val route = routes.optJSONObject(index)
        val stopStart = service.optInt("stopIndex").coerceAtLeast(0)
        val stops = route?.optJSONArray("stops")?.let { array ->
            (stopStart.coerceAtMost(maxOf(array.length() - 1, 0)) until array.length()).mapNotNull { position ->
                val item = array.optJSONObject(position) ?: return@mapNotNull null
                Stop(item.optString("label"), item.optString("scheduledTime").ifBlank { null }, item.optDouble("lat"), item.optDouble("lng"))
            }
        } ?: emptyList()
        return Service(
            missionId = service.getString("id"),
            name = service.optString("serviceName"),
            serviceReference = service.optString("serviceReference"),
            active = service.optString("status") == "ACTIVE",
            line = route?.optString("lineName")?.ifBlank { null },
            routeName = route?.optString("routeName")?.ifBlank { null },
            origin = stops.firstOrNull()?.label,
            destination = stops.lastOrNull()?.label,
            departure = route?.optString("scheduledDeparture")?.ifBlank { null } ?: clockOf(service.optString("scheduledDeparture")),
            stops = stops,
            courseNumber = if (routes.length() > 0) index + 1 else 0,
            courseCount = routes.length(),
            direction = route?.optString("direction")?.ifBlank { null },
            color = route?.optString("color")?.ifBlank { null },
            stopIndex = stopStart,
            courseIndex = index,
            path = route?.optJSONArray("path")?.let { array -> (0 until array.length()).mapNotNull { i -> array.optJSONArray(i)?.let { p -> Stop("", null, p.optDouble(0), p.optDouble(1)) } } } ?: emptyList(),
        )
    }

    private fun clockOf(iso: String): String? =
        runCatching { DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Europe/Paris")).format(Instant.parse(iso)) }.getOrNull()

    // strict = false : liaison locale avec l'UC seulement (les positions doivent lui parvenir même sans Internet).
    private fun call(path: String, body: JSONObject, strict: Boolean = true): JSONObject {
        if (strict && !deviceOnline()) throw ApiException("Perte de Connexion avec InéoRBE")
        val known = host
        if (known != null) {
            try { return if (strict) checked(send(known, path, body)) else send(known, path, body) } catch (error: ApiException) { if (error.code != 0) throw error }
        }
        val found = connect() ?: throw ApiException("Perte de Connexion avec InéoRBE")
        return if (strict) checked(send(found, path, body)) else send(found, path, body)
    }

    // L'UC signale lui-même qu'il n'a plus Internet : même écran que si la console ne le joignait plus.
    @Volatile private var ucOnline = true

    private fun checked(reply: JSONObject): JSONObject {
        if (!ucOnline) throw ApiException("Perte de Connexion avec InéoRBE")
        return reply
    }

    private fun deviceOnline(): Boolean {
        val manager = appContext?.getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager ?: return true
        val capabilities = manager.getNetworkCapabilities(manager.activeNetwork) ?: return false
        return capabilities.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    // Liaison complète : Internet côté console, UC joignable et Internet côté UC.
    fun link(): String? {
        if (!deviceOnline()) return null
        val found = connect() ?: return null
        return if (ucOnline) found else null
    }

    // Retrouve l'UC : 1) balayage du réseau local, retenu seulement si le numéro de série correspond ; 2) adresse IP de l'UC remontée au serveur.
    fun connect(): String? {
        val found = listOfNotNull(host).firstOrNull { matches(it) }
            ?: emulatorHost()
            ?: discover()
            ?: fromServer()
        host = found
        if (found != null) appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)?.edit()?.putString(HOST_KEY, found)?.apply()
        return found
    }

    // Émulateur Android : le PC hôte (où tourne l'UC de test) est vu en 10.0.2.2, quel que soit son numéro de série.
    private fun emulatorHost(): String? {
        val emulator = android.os.Build.HARDWARE.let { it == "ranchu" || it == "goldfish" } || android.os.Build.FINGERPRINT.startsWith("generic")
        return if (emulator && pingSerial("10.0.2.2") != null) "10.0.2.2" else null
    }

    private var lastRefresh = 0L

    private fun fromServer(): String? {
        // Le serveur limite les activations : une demande toutes les 20 s au plus.
        val now = System.currentTimeMillis()
        if (now - lastRefresh > 20_000) {
            lastRefresh = now
            runCatching { addressRefresh?.invoke() }.getOrNull()?.takeIf { it.isNotEmpty() }?.let { serverAddresses = it }
        }
        return serverAddresses.firstOrNull { matches(it) }
    }

    private fun matches(ip: String): Boolean {
        val serial = pingSerial(ip) ?: return false
        // Un UC plus ancien ne renvoie pas son numéro de série : il est accepté faute de mieux.
        return expectedSerial.isBlank() || serial.isBlank() || serial.equals(expectedSerial, ignoreCase = true)
    }

    private fun pingSerial(ip: String): String? = try {
        Socket().use { it.connect(InetSocketAddress(ip, PORT), 600) }
        send(ip, "/console/ping", JSONObject()).optString("serial")
    } catch (_: Exception) {
        null
    }

    private fun discover(): String? {
        val candidates = NetworkInterface.getNetworkInterfaces().toList()
            .filter { it.isUp && !it.isLoopback }
            .flatMap { it.interfaceAddresses }
            .mapNotNull { address -> (address.address as? Inet4Address)?.takeIf { it.isSiteLocalAddress }?.hostAddress }
            .flatMap { local ->
                val prefix = local.substringBeforeLast('.')
                (1..254).map { "$prefix.$it" }.filter { it != local }
            }
            .distinct()
        if (candidates.isEmpty()) return null
        val pool = Executors.newFixedThreadPool(64)
        return try {
            pool.invokeAll(candidates.map { ip -> Callable { if (matches(ip)) ip else null } }).mapNotNull { runCatching { it.get() }.getOrNull() }.firstOrNull()
        } finally {
            pool.shutdownNow()
        }
    }

    private fun send(address: String, path: String, body: JSONObject): JSONObject {
        val connection = URL("http://$address:$PORT$path").openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 3_000
            connection.readTimeout = 10_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrNull() ?: JSONObject()
            if (json.has("online")) ucOnline = json.optBoolean("online", true)
            if (code !in 200..299 || !json.optBoolean("ok", false)) {
                throw ApiException(json.optString("error").ifBlank { "L'UC a répondu $code." }, if (code in 200..299) 409 else code)
            }
            if (path == "/console/ping") vehicleName = json.optString("vehicle")
            json
        } catch (error: ApiException) {
            throw error
        } catch (error: Exception) {
            throw ApiException("UC injoignable : ${error.message ?: "erreur réseau"}")
        } finally {
            connection.disconnect()
        }
    }
}
