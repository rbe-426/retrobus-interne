package fr.retrobus.console

import android.app.Activity
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

// Identité visuelle des écrans de la console (d'après les maquettes InéoRBE).
object Look {
    val bg = Color.parseColor("#0F172A")
    val red = Color.parseColor("#D10F4A")
    val green = Color.parseColor("#10B981")
    val blue = Color.parseColor("#3B82F6")
    val muted = Color.parseColor("#94A3B8")

    fun text(activity: Activity, value: String, size: Float, color: Int = Color.WHITE, bold: Boolean = true) = TextView(activity).apply {
        text = value
        setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, UiScale.r(size))
        setTextColor(color)
        gravity = Gravity.CENTER
        if (bold) setTypeface(typeface, Typeface.BOLD)
    }

    fun image(activity: Activity, resource: Int, heightPx: Int) = ImageView(activity).apply {
        setImageResource(resource)
        adjustViewBounds = true
        scaleType = ImageView.ScaleType.FIT_CENTER
        layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, heightPx)
    }

    // Écran de pause : logo en haut à gauche, heure en haut à droite, slogan en bas à droite, contenu au centre.
    fun frame(activity: Activity, clock: TextView, content: LinearLayout): FrameLayout = FrameLayout(activity).apply {
        setBackgroundColor(bg)
        addView(content, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT).apply { setMargins(UiScale.ri(30f), UiScale.ri(120f), UiScale.ri(30f), UiScale.ri(120f)) })
        addView(image(activity, R.drawable.logo_header, UiScale.ri(104f)).apply { (layoutParams as FrameLayout.LayoutParams).gravity = Gravity.TOP or Gravity.START; (layoutParams as FrameLayout.LayoutParams).setMargins(UiScale.ri(20f), UiScale.ri(14f), 0, 0) })
        addView(clockBox(activity, clock))
        addView(image(activity, R.drawable.slogan, UiScale.ri(74f)).apply { (layoutParams as FrameLayout.LayoutParams).gravity = Gravity.BOTTOM or Gravity.END; (layoutParams as FrameLayout.LayoutParams).setMargins(0, 0, UiScale.ri(20f), UiScale.ri(14f)) })
    }

    private fun clockBox(activity: Activity, clock: TextView): TextView = clock.apply {
        setBackgroundColor(Color.BLACK)
        setPadding(UiScale.ri(30f), 0, UiScale.ri(30f), UiScale.ri(8f))
        layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.TOP or Gravity.END }
    }
}

// Écran de course : ligne, arrêts à venir, retard et heure, dessinés sur la grille de référence 1665 x 768.
class CourseView(context: Context) : View(context) {
    var lineNumber = ""
    var destination = ""
    var lineColor: Int = Color.parseColor("#7DD3FC")
    var origin = ""
    var departure = ""
    var arrival = ""
    var terminus = ""
    var stops: List<Pair<String, String>> = emptyList()
    var delayMinutes: Int? = null
    var departing = false
    var online = true
    var offRoute = false
    var recaled = false
    var serviceText = ""
    var vehicleText = ""
    var clock = ""

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val white = Color.WHITE
    private val box = Color.BLACK
    private val track = Color.parseColor("#D10F4A")

    private val font: Typeface = resources.getFont(R.font.montserrat_bold)

    private fun text(canvas: Canvas, value: String, x: Float, y: Float, size: Float, color: Int = white, align: Paint.Align = Paint.Align.LEFT, maxWidth: Float = 0f) {
        paint.style = Paint.Style.FILL
        paint.color = color
        paint.typeface = font
        paint.textSize = size
        paint.textAlign = align
        if (maxWidth > 0f) { val measured = paint.measureText(value); if (measured > maxWidth) paint.textSize = size * maxWidth / measured }
        canvas.drawText(value, x, y, paint)
    }

    override fun onDraw(canvas: Canvas) {
        val scale = minOf(width / 1665f, height / 768f)
        val offsetX = (width - 1665f * scale) / 2f
        canvas.drawColor(Look.bg)
        canvas.save()
        canvas.translate(offsetX, 0f)
        canvas.scale(scale, scale)
        drawLeft(canvas)
        drawTimeline(canvas)
        drawRight(canvas)
        canvas.restore()
    }

    private fun drawLeft(canvas: Canvas) {
        paint.style = Paint.Style.FILL
        paint.color = lineColor
        canvas.drawRoundRect(RectF(0f, 0f, 360f, 108f), 0f, 0f, paint)
        text(canvas, lineNumber, 180f, 78f - 22f, fit(lineNumber, 100f, 340f), white, Paint.Align.CENTER)
        text(canvas, destination.uppercase().take(24), 180f, 98f, 28f, white, Paint.Align.CENTER, 340f)

        paint.color = box
        canvas.drawRoundRect(RectF(0f, 112f, 360f, 278f), 0f, 14f, paint)
        text(canvas, origin.uppercase().take(18), 8f, 156f, 32f, white, Paint.Align.LEFT, 344f)
        text(canvas, departure, 8f, 216f, 58f, white, Paint.Align.LEFT, 170f)
        if (arrival.isNotBlank()) text(canvas, arrival, 196f, 216f, 58f, white, Paint.Align.LEFT, 160f)
        text(canvas, terminus.uppercase().take(18), 346f, 258f, 30f, white, Paint.Align.RIGHT, 336f)

        paint.color = box
        canvas.drawRoundRect(RectF(0f, 602f, 360f, 768f), 0f, 0f, paint)
        text(canvas, if (offRoute) "HORS ITINERAIRE" else if (online) "EN LIGNE AVEC L'UC" else "UC HORS LIGNE", 180f, 640f, 29f, if (online && !offRoute) Look.green else Look.red, Paint.Align.CENTER, 348f)
        text(canvas, "SERVICE N° : $serviceText", 6f, 684f, 29f, white, Paint.Align.LEFT, 348f)
        text(canvas, "VEHICULE : $vehicleText", 6f, 724f, 29f, white, Paint.Align.LEFT, 348f)
    }

    private fun drawTimeline(canvas: Canvas) {
        val x = 580f
        paint.color = track
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 14f
        canvas.drawLine(x, 0f, x, 768f, paint)
        // Recalage depuis le Gestionnaire : le tronçon entre l'arrêt recalé et le suivant passe en jaune.
        if (recaled && stops.size >= 2) {
            paint.color = Color.parseColor("#FACC15")
            canvas.drawLine(x, 377f, x, 604f, paint)
        }
        val slots = floatArrayOf(150f, 377f, 604f)
        val shown = stops.take(slots.size).reversed()
        val first = slots.size - shown.size
        shown.forEachIndexed { index, stop ->
            val y = slots[first + index]
            paint.style = Paint.Style.FILL
            paint.color = box
            canvas.drawCircle(x, y, 23f, paint)
            paint.color = white
            canvas.drawCircle(x, y, 17f, paint)
            if (stop.second.isNotBlank()) text(canvas, stop.second, 540f, y + 16f, 40f, white, Paint.Align.RIGHT, 190f)
            text(canvas, stop.first.take(28), 618f, y + 16f, 40f, white, Paint.Align.LEFT, 1030f)
        }
        if (stops.isNotEmpty()) {
            val y = if (offRoute) (slots[1] + slots[2]) / 2f + 20f else slots[slots.size - 1] + if (departing) 0f else 60f
            val ax = if (offRoute) x + 115f else x
            val arrow = Path().apply { moveTo(ax, y - 52f); lineTo(ax + 38f, y + 22f); lineTo(ax, y + 4f); lineTo(ax - 38f, y + 22f); close() }
            paint.color = Color.parseColor("#C4C4C4")
            paint.style = Paint.Style.FILL
            canvas.drawPath(arrow, paint)
        }
    }

    private fun drawRight(canvas: Canvas) {
        val delay = delayMinutes
        // Rien sous 1 minute. Retard : rouge. Avance : vert à 1 minute, rouge dès 2.
        val delayColor = if (delay == null || delay == 0) box else if (delay < 0 && delay > -2) Look.green else Look.red
        paint.style = Paint.Style.FILL
        paint.color = delayColor
        canvas.drawRoundRect(RectF(1207f, 0f, 1445f, 95f), 0f, 14f, paint)
        if (delay != null && delay != 0) {
            text(canvas, if (delay > 0) "Retard" else "Avance", 1326f, 40f, 40f, white, Paint.Align.CENTER, 220f)
            text(canvas, "%02d min".format(Math.abs(delay)), 1326f, 88f, 50f, white, Paint.Align.CENTER, 220f)
        }
        paint.color = box
        canvas.drawRoundRect(RectF(1440f, 0f, 1665f, 95f), 0f, 14f, paint)
        text(canvas, clock, 1553f, 78f, 76f, white, Paint.Align.CENTER)

        if (departing) {
            paint.style = Paint.Style.FILL
            paint.color = Color.parseColor("#128A62")
            canvas.drawRect(1331f, 95f, 1445f, 768f, paint)
            "DEPART".forEachIndexed { index, letter -> text(canvas, letter.toString(), 1388f, 215f + index * 96f, 76f, white, Paint.Align.CENTER) }
        }
    }

    private fun fit(value: String, max: Float, width: Float): Float {
        paint.typeface = font
        paint.textSize = max
        val measured = paint.measureText(value)
        return if (measured > width) max * width / measured else max
    }
}
