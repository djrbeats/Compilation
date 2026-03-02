package com.spyradarzones.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpyRadarLocationModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private val locationManager =
    reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
  private val mainHandler = Handler(Looper.getMainLooper())
  private var watchListener: LocationListener? = null

  override fun getName(): String = "SpyRadarLocation"

  @ReactMethod
  fun getCurrentPosition(promise: Promise) {
    if (!hasLocationPermission()) {
      promise.reject("LOCATION_PERMISSION_DENIED", "Location permission not granted")
      return
    }

    val lastKnownLocation = getBestLastKnownLocation()
    if (lastKnownLocation != null) {
      promise.resolve(locationToMap(lastKnownLocation))
      return
    }

    val provider = resolveProvider()
    if (provider == null) {
      promise.reject("LOCATION_PROVIDER_UNAVAILABLE", "No location provider available")
      return
    }

    var settled = false
    var listener: LocationListener? = null
    val timeout = Runnable {
      if (!settled) {
        settled = true
        listener?.let(locationManager::removeUpdates)
        promise.reject("LOCATION_TIMEOUT", "Timed out waiting for current location")
      }
    }

    listener = object : LocationListener {
      override fun onLocationChanged(location: Location) {
        if (!settled) {
          settled = true
          mainHandler.removeCallbacks(timeout)
          locationManager.removeUpdates(this)
          promise.resolve(locationToMap(location))
        }
      }
    }

    try {
      locationManager.requestLocationUpdates(
        provider,
        0L,
        0f,
        listener,
        Looper.getMainLooper()
      )
      mainHandler.postDelayed(timeout, 10000L)
    } catch (error: SecurityException) {
      promise.reject("LOCATION_PERMISSION_DENIED", error)
    }
  }

  @ReactMethod
  fun startWatching(timeInterval: Double, distanceInterval: Double, promise: Promise) {
    if (!hasLocationPermission()) {
      promise.reject("LOCATION_PERMISSION_DENIED", "Location permission not granted")
      return
    }

    val provider = resolveProvider()
    if (provider == null) {
      promise.reject("LOCATION_PROVIDER_UNAVAILABLE", "No location provider available")
      return
    }

    stopWatching()

    watchListener = object : LocationListener {
      override fun onLocationChanged(location: Location) {
        emitLocation(location)
      }
    }

    try {
      locationManager.requestLocationUpdates(
        provider,
        timeInterval.toLong(),
        distanceInterval.toFloat(),
        watchListener as LocationListener,
        Looper.getMainLooper()
      )
      promise.resolve(null)
    } catch (error: SecurityException) {
      watchListener = null
      promise.reject("LOCATION_PERMISSION_DENIED", error)
    }
  }

  @ReactMethod
  fun stopWatching() {
    watchListener?.let(locationManager::removeUpdates)
    watchListener = null
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  private fun emitLocation(location: Location) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("SpyRadarLocationUpdate", locationToMap(location))
  }

  private fun locationToMap(location: Location): WritableMap {
    val coords = Arguments.createMap().apply {
      putDouble("latitude", location.latitude)
      putDouble("longitude", location.longitude)
      putDouble("accuracy", location.accuracy.toDouble())
      putDouble("altitude", location.altitude)
      putDouble("heading", location.bearing.toDouble())
      putDouble("speed", location.speed.toDouble())
    }

    return Arguments.createMap().apply {
      putMap("coords", coords)
      putDouble("timestamp", location.time.toDouble())
    }
  }

  private fun resolveProvider(): String? {
    return when {
      locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
      locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ->
        LocationManager.NETWORK_PROVIDER
      else -> null
    }
  }

  private fun getBestLastKnownLocation(): Location? {
    val providers = locationManager.getProviders(true)
    return providers
      .mapNotNull(locationManager::getLastKnownLocation)
      .maxByOrNull { it.time }
  }

  private fun hasLocationPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
      reactApplicationContext,
      Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
  }
}
