"use client";

import { useEffect } from "react";

export function AppInit() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Init Capacitor native plugins
    import("@/lib/capacitor").then(({ initCapacitor }) => initCapacitor());
  }, []);

  return null;
}
