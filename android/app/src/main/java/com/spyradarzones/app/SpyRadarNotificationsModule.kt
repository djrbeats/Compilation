package com.spyradarzones.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import kotlin.math.roundToInt

class SpyRadarNotificationsModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SpyRadarNotifications"

  @ReactMethod
  fun setNotificationChannel(
    channelId: String,
    name: String,
    importance: Double,
    lightColor: String,
    vibrationPattern: ReadableArray,
    promise: Promise
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(channelId, name, importance.roundToInt()).apply {
        enableLights(true)
        enableVibration(vibrationPattern.size() > 0)
        this.lightColor = Color.parseColor(lightColor)
        if (vibrationPattern.size() > 0) {
          val pattern = LongArray(vibrationPattern.size()) { index ->
            vibrationPattern.getDouble(index).toLong()
          }
          this.vibrationPattern = pattern
        }
      }

      val manager = reactApplicationContext.getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }

    promise.resolve(null)
  }

  @ReactMethod
  fun presentNotification(channelId: String, title: String, body: String, promise: Promise) {
    val context = reactApplicationContext
    val launchIntent = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      context,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(R.drawable.notification_icon)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setAutoCancel(true)
      .setContentIntent(pendingIntent)
      .build()

    NotificationManagerCompat.from(context).notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    promise.resolve(null)
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit
}
