"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function AppInit() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Init Capacitor native plugins
    import("@/lib/capacitor").then(({ initCapacitor }) => initCapacitor());

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 2500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-md">
          <WifiOff className="h-3.5 w-3.5 animate-pulse" />
          <span>Offline mode — Working with cached data</span>
        </div>
      )}
      {showReconnected && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-emerald-600 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-md animate-in fade-in duration-200">
          <Wifi className="h-3.5 w-3.5" />
          <span>Back online — Connected</span>
        </div>
      )}
    </>
  );
}
