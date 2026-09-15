package com.cartracker

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = RapidConfigModule.NAME)
class RapidConfigModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  override fun getConstants(): Map<String, Any> =
      mapOf(
          "apiBaseUrl" to BuildConfig.RAPID_API_BASE_URL,
          "deviceId" to BuildConfig.RAPID_DEVICE_ID,
      )

  @ReactMethod
  override fun invalidate() {
    super.invalidate()
  }

  companion object {
    const val NAME = "RapidConfig"
  }
}

class RapidConfigPackage : com.facebook.react.ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      listOf(RapidConfigModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<com.facebook.react.uimanager.ViewManager<*, *>> = emptyList()
}
