package fr.retrobus.console

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

data class UpdateInfo(val version: String, val url: String, val sha256: String, val notes: String)

// Les appels réseau sont bloquants : à exécuter hors du thread principal.
object UpdateManager {
    private const val APK_MIME = "application/vnd.android.package-archive"

    fun check(currentVersion: String): UpdateInfo? {
        val connection = URL("${BuildConfig.API_BASE}/api/ineo-rbe-desktop/update?product=CONSOLE&version=$currentVersion").openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 10_000
            connection.readTimeout = 15_000
            if (connection.responseCode != 200) return null
            val json = JSONObject(connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() })
            if (!json.optBoolean("updateAvailable")) return null
            UpdateInfo(json.getString("version"), json.getString("installerUrl"), json.getString("sha256").lowercase(), json.optString("releaseNotes"))
        } catch (_: Exception) {
            null
        } finally {
            connection.disconnect()
        }
    }

    // Télécharge l'APK et vérifie son empreinte SHA-256 ; lève une exception si le fichier est incomplet ou altéré.
    fun download(activity: Activity, info: UpdateInfo): File {
        val directory = File(activity.cacheDir, "updates").apply { mkdirs() }
        val target = File(directory, "console-${info.version}.apk")
        val digest = MessageDigest.getInstance("SHA-256")
        val connection = URL(info.url).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = 15_000
            connection.readTimeout = 60_000
            if (connection.responseCode != 200) throw IllegalStateException("Le serveur a répondu ${connection.responseCode}.")
            connection.inputStream.use { input ->
                target.outputStream().use { output ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        val read = input.read(buffer)
                        if (read < 0) break
                        digest.update(buffer, 0, read)
                        output.write(buffer, 0, read)
                    }
                }
            }
        } finally {
            connection.disconnect()
        }
        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        if (actual != info.sha256) {
            target.delete()
            throw IllegalStateException("Fichier corrompu (empreinte différente). Réessayez.")
        }
        return target
    }

    // Retourne false si l'utilisateur doit d'abord autoriser l'installation depuis cette application.
    fun install(activity: Activity, apk: File): Boolean {
        if (!activity.packageManager.canRequestPackageInstalls()) {
            activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}")))
            return false
        }
        val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", apk)
        activity.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, APK_MIME)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        return true
    }
}
