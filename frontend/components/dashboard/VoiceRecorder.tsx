"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Play, RotateCcw, Loader2, AlertCircle } from "lucide-react";

const MAX_DURATION_SEC = 30;
const EXAMPLE_TEXT =
  "Moduvox turns slides into narrated presentations using your own voice. Upload a PowerPoint and a short voice sample, and our AI generates slide-by-slide narration. Share a link and track who watched and for how long. It's that simple.";

type RecordingState = "idle" | "requesting" | "recording" | "done";

export function VoiceRecorder({
  onRecordingComplete,
}: {
  onRecordingComplete: (file: File) => void;
}) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  async function handleStartRecording() {
    setError(null);
    setPermissionDenied(false);
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setDuration(0);
        setState("done");

        // Create a File that can be fed into the upload flow
        const file = new File([blob], "voice-recording.webm", {
          type: mimeType,
        });
        onRecordingComplete(file);
      };

      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        setState("idle");
      };

      recorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setState("recording");
      setDuration(0);

      // Timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current) / 1000,
        );
        setDuration(elapsed);

        if (elapsed >= MAX_DURATION_SEC) {
          stopRecording();
        }
      }, 200);
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setPermissionDenied(true);
        setError(
          "Microphone access denied. Please allow microphone access in your browser settings and try again.",
        );
      } else if (
        err instanceof DOMException &&
        err.name === "NotFoundError"
      ) {
        setError("No microphone found. Check your device and try again.");
      } else {
        setError("Could not start recording. Please try again.");
      }
      setState("idle");
    }
  }

  function handleReset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
    setPermissionDenied(false);
    setState("idle");
    chunksRef.current = [];
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      {/* Tips section */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Tips for best results
        </p>
        <ul className="space-y-1 text-xs leading-relaxed text-zinc-500">
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
            Record in a <strong className="text-zinc-600">quiet room</strong>{" "}
            with minimal background noise
          </li>
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
            Place your microphone <strong className="text-zinc-600">
              6-12 inches
            </strong>{" "}
            from your mouth
          </li>
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
            Speak <strong className="text-zinc-600">clearly and naturally</strong>{" "}
            at a consistent pace
          </li>
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
            Avoid rooms with <strong className="text-zinc-600">echo</strong>{" "}
            (carpeted rooms are best)
          </li>
        </ul>
      </div>

      {/* Example text */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Script
        </p>
        <p className="text-xs leading-relaxed text-zinc-500">{EXAMPLE_TEXT}</p>
      </div>

      {/* Recording UI */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-5">
        {state === "idle" && (
          <button
            type="button"
            onClick={handleStartRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700"
          >
            <Mic className="h-4 w-4" />
            Start Recording
          </button>
        )}

        {state === "requesting" && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            <p className="text-xs text-zinc-500">Requesting microphone access...</p>
          </div>
        )}

        {state === "recording" && (
          <div className="flex flex-col items-center gap-3">
            {/* Timer + recording indicator */}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-xl font-mono font-semibold tabular-nums text-red-600">
                {formatTime(duration)}
                <span className="text-sm text-zinc-400"> / {formatTime(MAX_DURATION_SEC)}</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-200"
                style={{ width: `${(duration / MAX_DURATION_SEC) * 100}%` }}
              />
            </div>

            {/* Stop button */}
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800"
            >
              <Square className="h-4 w-4 fill-current" />
              Stop Recording
            </button>
          </div>
        )}

        {state === "done" && audioUrl && (
          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Recording saved
            </div>
            <audio
              controls
              src={audioUrl}
              className="w-full max-w-[280px] rounded-lg"
              style={{ height: 36 }}
            >
              Your browser does not support the audio element.
            </audio>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600"
            >
              <RotateCcw className="h-3 w-3" />
              Re-record
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Permission denied extra guidance */}
      {permissionDenied && (
        <p className="text-xs text-zinc-400">
          Can&apos;t grant access? Try uploading a file instead using the tab above.
        </p>
      )}
    </div>
  );
}
