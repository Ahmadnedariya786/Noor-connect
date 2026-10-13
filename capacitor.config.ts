import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noorconnect.app',
  appName: 'Noor Connect',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0E0B1E",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    LocalNotifications: {
      smallIcon: "ic_notification",
      iconColor: "#F5C542",
      sound: "beep.wav"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Geolocation: {
      requestPermissions: true
    }
  }
};

export default config;
