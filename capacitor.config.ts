import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.e0a4a83fe595453fb5b913f9602e6b5c",
  appName: "adominus",
  webDir: "dist",
  server: {
    url: "https://e0a4a83f-e595-453f-b5b9-13f9602e6b5c.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    // ScreenTime plugin is registered natively in the Android project.
    // See: android/app/src/main/java/app/lovable/.../ScreenTimePlugin.java
  },
};

export default config;
