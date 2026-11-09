package fr.retrobus.console

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class Activation(
    val vehicleParc: String,
    val vehicleType: String?,
    val vehicleLabel: String?,
    val ucSerial: String,
    val contentRevision: String?,
)

sealed class ActivationResult {
    data class Granted(val activation: Activation) : ActivationResult()
    data class Refused(val message: String) : ActivationResult()
    data class Failed(val message: String) : ActivationResult()
}

object ConsoleApi {
    // Appel bloquant : à exécuter hors du thread principal.
    fun activate(imei: String, deviceId: String, model: String, appVersion: String): ActivationResult {
        val body = JSONObject()
            .put("imei", imei)
            .put("deviceId", deviceId)
            .put("model", model)
            .put("appVersion", appVersion)
            .toString()
            .toByteArray(Charsets.UTF_8)
        val connection = URL(BuildConfig.API_BASE + "/api/ineo-rbe-desktop/console/activate").openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 15_000
            connection.readTimeout = 20_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { it.write(body) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrNull()
            when {
                code == 200 && json?.optBoolean("activated") == true -> {
                    val vehicle = json.getJSONObject("vehicle")
                    ActivationResult.Granted(
                        Activation(
                            vehicleParc = vehicle.getString("parc"),
                            vehicleType = vehicle.optString("type").ifBlank { null },
                            vehicleLabel = vehicle.optString("label").ifBlank { null },
                            ucSerial = json.getString("ucSerial"),
                            contentRevision = json.optString("contentRevision").ifBlank { null },
                        )
                    )
                }
                code == 403 -> ActivationResult.Refused(json?.optString("error").orEmpty().ifBlank { "Console non rattachée à un véhicule." })
                code == 429 -> ActivationResult.Failed("Trop de tentatives, réessayez dans une minute.")
                else -> ActivationResult.Failed(json?.optString("error").orEmpty().ifBlank { "Le serveur a répondu $code." })
            }
        } catch (exception: Exception) {
            ActivationResult.Failed("Serveur injoignable : ${exception.message ?: "erreur réseau"}")
        } finally {
            connection.disconnect()
        }
    }
}
