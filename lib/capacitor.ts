// Capacitor native plugin initialization
// Only runs on native platforms (Android/iOS)

export async function initCapacitor() {
  try {
    const { Capacitor } = await import("@capacitor/core");

    if (!Capacitor.isNativePlatform()) return;

    // Status bar
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0f172a" });

    // Hide splash screen after app loads
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();

    // Keyboard
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.addListener("keyboardWillShow", () => {
      document.body.classList.add("keyboard-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.classList.remove("keyboard-open");
    });
  } catch {
    // Not running in Capacitor — ignore
  }
}
