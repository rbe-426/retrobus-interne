package fr.retrobus.console

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.telephony.TelephonyManager

// Sur Android 10+, seule une application privilégiée (propriétaire d'appareil / MDM) peut lire l'IMEI :
// à défaut, l'IMEI saisi à l'activation (*#06#) est mémorisé et vérifié par le serveur.
object DeviceIdentity {
    private const val PREFS = "console"
    private const val KEY_IMEI = "imei"

    @SuppressLint("HardwareIds", "MissingPermission")
    fun readImei(context: Context): String? {
        val telephony = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        val direct = try {
            telephony?.imei
        } catch (_: SecurityException) {
            null
        }
        if (!direct.isNullOrBlank()) return direct
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_IMEI, null)
    }

    fun saveImei(context: Context, imei: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_IMEI, imei).apply()
    }

    fun clearImei(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_IMEI).apply()
    }

    @SuppressLint("HardwareIds")
    fun deviceId(context: Context): String =
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID).orEmpty()

    fun model(): String = "${Build.MANUFACTURER} ${Build.MODEL}"
}
