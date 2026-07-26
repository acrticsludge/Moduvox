"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "xlottry59u";
const CONSENT_KEY = "moduvox_cookie_consent";

export function Clarity() {
  if (process.env.NODE_ENV !== "production") return null;

  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted") setConsented(true);
  }, []);

  if (!consented) return null;

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      }}
    />
  );
}
