package com.duoo.capture

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View

class DuooLogoView(context: Context) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 3.2f; color = Color.rgb(10, 143, 99) }
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val scale = width / 24f
        canvas.save(); canvas.scale(scale, scale)
        canvas.drawCircle(9f, 12f, 6f, paint); canvas.drawCircle(15f, 12f, 6f, paint)
        canvas.restore()
    }
}
