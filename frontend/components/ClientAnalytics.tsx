"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

const CONSENT_KEY = "moduvox_cookie_consent";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Loads Google Analytics only after the user has accepted cookie consent.
 * Extracted from layout.tsx so that both Clarity and GA respect the same
 * consent decision, eliminating "cookie" warnings in the Issues panel.
 */
export function ClientAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted") setConsented(true);
  }, []);

  if (!GA_ID || !consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
