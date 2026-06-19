import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.eventkhata.app",
  appName: "EventKhata",
  webDir: "out",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://eventkhata.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#0f172a",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0f172a",
  },
};

export default config;
