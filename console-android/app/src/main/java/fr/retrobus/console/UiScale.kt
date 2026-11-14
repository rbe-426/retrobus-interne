package fr.retrobus.console

import android.app.Activity
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import kotlin.math.max
import kotlin.math.min

// Échelle d'interface déduite de l'écran du téléphone : 1.0 pour un plus petit côté de 360 dp, bornée pour rester lisible.
object UiScale {
    var factor = 1f
        private set
    private var density = 1f

    fun init(activity: Activity) {
        val metrics: DisplayMetrics = activity.resources.displayMetrics
        density = metrics.density
        val smallestDp = min(metrics.widthPixels, metrics.heightPixels) / metrics.density
        factor = (smallestDp / 360f).coerceIn(0.85f, 1.6f)
    }

    fun sp(size: Float) = size * factor
    fun px(value: Int) = max(1, (value * density * factor).toInt())
}

// Verrouille la disposition : barres d'état et de navigation masquées, et masquées de nouveau si un balayage les fait apparaître.
object Kiosk {
    private val handler = Handler(Looper.getMainLooper())

    fun apply(activity: Activity) {
        val window = activity.window
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.attributes = window.attributes.also { it.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES }
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let {
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                it.hide(WindowInsets.Type.systemBars())
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }
    }

    fun keepHidden(activity: Activity) {
        val decor = activity.window.decorView
        if (Build.VERSION.SDK_INT >= 30) {
            decor.setOnApplyWindowInsetsListener { view, insets ->
                if (insets.isVisible(WindowInsets.Type.systemBars())) handler.postDelayed({ apply(activity) }, 1500)
                view.onApplyWindowInsets(insets)
            }
        }
        apply(activity)
    }
}
