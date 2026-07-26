"use client";

// This file configures the initialization of Sentry on the client side.
// Previously no client config existed, so Sentry used default integrations
// (including BrowserTracing ~108 KiB) and initialized in all environments.
//
// By explicitly configuring here we:
// 1. Skip initialization in dev/preview (eliminates 400 Bad Request tunnel errors)
// 2. Exclude BrowserTracing to reduce client bundle size (~108 KiB saved)
// 3. Only enable error capture, no performance monitoring on the client

import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Minimal traces sample — errors are the priority, not client perf
    tracesSampleRate: 0.1,
    // Exclude BrowserTracing integration — saves ~108 KiB from client bundle.
    // Server-side tracing still works via instrumentation.ts
    integrations: [],
    // Disable Replay to save another ~75 KiB
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
