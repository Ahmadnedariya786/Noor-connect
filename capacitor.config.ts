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
      launchShowDuration: 1200, // Reduced for better LCP
      launchAutoHide: true,
      backgroundColor: "#0D0D0D",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    LocalNotifications: {
      smallIcon: "ic_notification",
      iconColor: "#D4AF37",
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
