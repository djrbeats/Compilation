package com.spyradarzones.app

import android.app.Application

import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.rnmaps.maps.MapsPackage
import com.swmansion.gesturehandler.RNGestureHandlerPackage
import com.swmansion.reanimated.ReanimatedPackage
import com.swmansion.rnscreens.RNScreensPackage
import com.th3rdwave.safeareacontext.SafeAreaContextPackage
import org.asyncstorage.AsyncStoragePackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    DefaultReactHost.getDefaultReactHost(
      context = applicationContext,
      packageList =
        listOf(
          AsyncStoragePackage(),
          RNGestureHandlerPackage(),
          MapsPackage(),
          ReanimatedPackage(),
          SafeAreaContextPackage(),
          RNScreensPackage(),
          SpyRadarPackage(),
        )
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
  }
}
