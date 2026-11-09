package fr.retrobus.console

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class ApiException(message: String, val code: Int = 0) : Exception(message)

data class Stop(val label: String, val time: String?, val lat: Double, val lng: Double)

data class Service(
    val missionId: String,
    val name: String,
    val serviceReference: String,
    val courseReference: String,
    val vehicleParc: String,
    val active: Boolean,
    val line: String?,
    val routeName: String?,
    val origin: String?,
    val destination: String?,
    val departure: String?,
    val arrival: String?,
    val stops: List<Stop>,
    val stopByStop: Boolean,
)

data class Flash(val id: String, val message: String)

// Les appels sont bloquants : à exécuter hors du thread principal. Les routes sont celles de l'écran conducteur de l'URBEX.
object DriverApi {
    private var access: String? = null
    private var refresh: String? = null
    private var csrf: String? = null

    var agentName: String = ""
        private set

    val isLoggedIn get() = access != null

    fun logout() {
        access = null
        refresh = null
        csrf = null
        agentName = ""
    }

    fun login(identifier: String, password: String) {
        val response = request("POST", "/api/auth/member-login", JSONObject().put("identifier", identifier).put("password", password), authenticated = false)
        access = response.optString("accessToken").ifBlank { response.optString("token") }
        refresh = response.optString("refreshToken").ifBlank { null }
        if (access.isNullOrBlank()) throw ApiException("Identification impossible.")
        val user = response.optJSONObject("user")
        agentName = listOf(user?.optString("firstName"), user?.optString("lastName")).filter { !it.isNullOrBlank() }.joinToString(" ").ifBlank { identifier }
    }

    fun currentService(): Service? {
        val response = request("GET", "/api/ineo/driver/current")
        val mission = response.optJSONObject("mission") ?: return null
        val route = response.optJSONObject("route")
        val stops = route?.optJSONArray("stops")?.let { array ->
            (0 until array.length()).mapNotNull { index ->
                val item = array.optJSONObject(index) ?: return@mapNotNull null
                Stop(item.optString("label"), item.optString("scheduledTime").ifBlank { null }, item.optDouble("lat"), item.optDouble("lng"))
            }
        } ?: emptyList()
        return Service(
            missionId = mission.getString("id"),
            name = mission.optString("serviceName"),
            serviceReference = mission.optString("serviceReference"),
            courseReference = mission.optString("courseReference"),
            vehicleParc = mission.optString("vehicleParc"),
            active = mission.optString("status") == "ACTIVE",
            line = route?.optString("lineName")?.ifBlank { null },
            routeName = route?.optString("routeName")?.ifBlank { null },
            origin = route?.optString("origin")?.ifBlank { null },
            destination = route?.optString("destination")?.ifBlank { null },
            departure = clockOf(mission.optString("scheduledDeparture")) ?: route?.optString("scheduledDeparture")?.ifBlank { null },
            arrival = clockOf(mission.optString("scheduledArrival")) ?: route?.optString("scheduledArrival")?.ifBlank { null },
            stops = stops,
            stopByStop = response.optJSONObject("freeTracking")?.optBoolean("stopByStop") == true,
        )
    }

    // La prise de service est confirmée par le code service ; le code course est celui de l'affectation.
    fun startService(service: Service, serviceCode: String) {
        request(
            "POST", "/api/ineo/missions/${service.missionId}/start",
            JSONObject().put("serviceReference", serviceCode.trim().uppercase()).put("courseReference", service.courseReference.trim().uppercase()),
        )
    }

    fun sendPosition(missionId: String, latitude: Double, longitude: Double, speedKmh: Double?, accuracy: Double?, imei: String? = null) {
        val body = JSONObject().put("latitude", latitude).put("longitude", longitude)
        if (imei != null) body.put("imei", imei)
        if (speedKmh != null) body.put("speedKmh", speedKmh)
        if (accuracy != null) body.put("accuracy", accuracy)
        request("POST", "/api/ineo/missions/$missionId/position", body)
    }

    fun markStop(missionId: String) {
        request("POST", "/api/ineo/missions/$missionId/stops", JSONObject())
    }

    fun complete(missionId: String) {
        request("POST", "/api/ineo/missions/$missionId/complete", JSONObject())
    }

    fun flashes(latitude: Double?, longitude: Double?): List<Flash> {
        val query = if (latitude != null && longitude != null) "?lat=$latitude&lng=$longitude" else ""
        val array: JSONArray = request("GET", "/api/ineo/driver/flashes$query").optJSONArray("flashes") ?: return emptyList()
        return (0 until array.length()).mapNotNull { index ->
            val item = array.optJSONObject(index) ?: return@mapNotNull null
            Flash(item.getString("id"), item.optString("message"))
        }
    }

    fun acknowledgeFlash(flashId: String, missionId: String?) {
        request("POST", "/api/ineo/driver/flashes/$flashId/ack", JSONObject().put("missionId", missionId ?: JSONObject.NULL))
    }

    private fun clockOf(iso: String): String? =
        runCatching { DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Europe/Paris")).format(Instant.parse(iso)) }.getOrNull()

    private fun ensureCsrf() {
        if (csrf != null) return
        csrf = send("GET", "/api/csrf-token", null, authenticated = false, csrfToken = null).optString("csrfToken").ifBlank { null }
    }

    private fun refreshTokens(): Boolean {
        val token = refresh ?: return false
        return try {
            val response = send("POST", "/api/auth/refresh-token", JSONObject().put("refreshToken", token), authenticated = false, csrfToken = null)
            access = response.optString("accessToken").ifBlank { null }
            refresh = response.optString("refreshToken").ifBlank { null }
            access != null
        } catch (_: ApiException) {
            false
        }
    }

    private fun request(method: String, path: String, body: JSONObject? = null, authenticated: Boolean = true): JSONObject {
        if (method != "GET" && authenticated) ensureCsrf()
        return try {
            send(method, path, body, authenticated, csrf)
        } catch (error: ApiException) {
            when {
                authenticated && error.code == 401 && refreshTokens() -> send(method, path, body, true, csrf)
                authenticated && error.code == 403 && method != "GET" && error.message?.contains("CSRF") == true -> {
                    csrf = null
                    ensureCsrf()
                    send(method, path, body, true, csrf)
                }
                else -> throw error
            }
        }
    }

    private fun send(method: String, path: String, body: JSONObject?, authenticated: Boolean, csrfToken: String?): JSONObject {
        val connection = URL(BuildConfig.API_BASE + path).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = method
            connection.connectTimeout = 15_000
            connection.readTimeout = 20_000
            connection.setRequestProperty("Accept", "application/json")
            if (authenticated) access?.let { connection.setRequestProperty("Authorization", "Bearer $it") }
            if (csrfToken != null && method != "GET") connection.setRequestProperty("X-CSRF-Token", csrfToken)
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrNull() ?: JSONObject()
            if (code !in 200..299) {
                val message = json.optString("error").ifBlank { "Le serveur a répondu $code." }
                throw ApiException(if (json.has("code")) "${json.optString("code")} $message" else message, code)
            }
            json
        } catch (error: ApiException) {
            throw error
        } catch (error: Exception) {
            throw ApiException("Serveur injoignable : ${error.message ?: "erreur réseau"}")
        } finally {
            connection.disconnect()
        }
    }
}
