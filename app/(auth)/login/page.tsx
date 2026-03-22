"use client";

import { useEffect } from "react";

export default function LoginPage() {
  // DEV MODE: Skip login, redirect to events
  useEffect(() => {
    window.location.href = "/events";
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-900 px-4">
      <p className="text-white">Redirecting...</p>
    </div>
  );
}
