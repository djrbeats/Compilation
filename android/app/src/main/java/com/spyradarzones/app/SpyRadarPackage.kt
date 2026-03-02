package com.spyradarzones.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SpyRadarPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(
      SpyRadarLocationModule(reactContext),
      SpyRadarNotificationsModule(reactContext),
    )
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}
