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
        textSize = UiScale.sp(size)
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
        addView(content, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT).apply { setMargins(UiScale.px(24), UiScale.px(90), UiScale.px(24), UiScale.px(90)) })
        addView(image(activity, R.drawable.logo_header, UiScale.px(70)).apply { (layoutParams as FrameLayout.LayoutParams).gravity = Gravity.TOP or Gravity.START; (layoutParams as FrameLayout.LayoutParams).setMargins(UiScale.px(12), UiScale.px(10), 0, 0) })
        addView(clockBox(activity, clock))
        addView(image(activity, R.drawable.slogan, UiScale.px(52)).apply { (layoutParams as FrameLayout.LayoutParams).gravity = Gravity.BOTTOM or Gravity.END; (layoutParams as FrameLayout.LayoutParams).setMargins(0, 0, UiScale.px(12), UiScale.px(10)) })
    }

    private fun clockBox(activity: Activity, clock: TextView): TextView = clock.apply {
        setBackgroundColor(Color.BLACK)
        setPadding(UiScale.px(24), UiScale.px(4), UiScale.px(24), UiScale.px(8))
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
    var serviceText = ""
    var vehicleText = ""
    var clock = ""

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val white = Color.WHITE
    private val box = Color.BLACK
    private val track = Color.parseColor("#D10F4A")

    private fun text(canvas: Canvas, value: String, x: Float, y: Float, size: Float, color: Int = white, align: Paint.Align = Paint.Align.LEFT) {
        paint.style = Paint.Style.FILL
        paint.color = color
        paint.typeface = Typeface.DEFAULT_BOLD
        paint.textSize = size
        paint.textAlign = align
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
        text(canvas, destination.uppercase().take(24), 180f, 98f, 28f, white, Paint.Align.CENTER)

        paint.color = box
        canvas.drawRoundRect(RectF(0f, 112f, 360f, 278f), 0f, 14f, paint)
        text(canvas, origin.uppercase().take(18), 8f, 156f, 32f)
        text(canvas, departure, 8f, 216f, 58f)
        if (arrival.isNotBlank()) text(canvas, arrival, 196f, 216f, 58f)
        text(canvas, terminus.uppercase().take(18), 346f, 258f, 30f, white, Paint.Align.RIGHT)

        paint.color = box
        canvas.drawRoundRect(RectF(0f, 602f, 360f, 768f), 0f, 0f, paint)
        text(canvas, if (online) "EN LIGNE AVEC L'UC" else "UC HORS LIGNE", 180f, 640f, 29f, if (online) Look.green else Look.red, Paint.Align.CENTER)
        text(canvas, "SERVICE N° : $serviceText", 6f, 684f, 29f)
        text(canvas, "VEHICULE : $vehicleText", 6f, 724f, 29f)
    }

    private fun drawTimeline(canvas: Canvas) {
        val x = 580f
        paint.color = track
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 14f
        canvas.drawLine(x, 0f, x, 768f, paint)
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
            if (stop.second.isNotBlank()) text(canvas, stop.second, 540f, y + 16f, 40f, white, Paint.Align.RIGHT)
            text(canvas, stop.first.take(28), 618f, y + 16f, 40f)
        }
        if (stops.isNotEmpty()) {
            val y = slots[slots.size - 1] + if (departing) 0f else 60f
            val arrow = Path().apply { moveTo(x, y - 52f); lineTo(x + 38f, y + 22f); lineTo(x, y + 4f); lineTo(x - 38f, y + 22f); close() }
            paint.color = Color.parseColor("#C4C4C4")
            paint.style = Paint.Style.FILL
            canvas.drawPath(arrow, paint)
        }
    }

    private fun drawRight(canvas: Canvas) {
        val delay = delayMinutes
        val delayColor = when { delay == null || delay <= 5 -> Look.green; delay <= 10 -> Color.parseColor("#F59E0B"); else -> Look.red }
        paint.style = Paint.Style.FILL
        paint.color = delayColor
        canvas.drawRoundRect(RectF(1207f, 0f, 1445f, 95f), 0f, 14f, paint)
        if (delay != null && delay > 0) {
            text(canvas, "Retard", 1320f, 40f, 48f, white, Paint.Align.CENTER)
            text(canvas, "%02d min".format(delay), 1320f, 88f, 56f, white, Paint.Align.CENTER)
        } else {
            text(canvas, "À l'heure", 1326f, 66f, 44f, white, Paint.Align.CENTER)
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
        paint.typeface = Typeface.DEFAULT_BOLD
        paint.textSize = max
        val measured = paint.measureText(value)
        return if (measured > width) max * width / measured else max
    }
}
