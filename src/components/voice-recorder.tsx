"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Upload } from "lucide-react";
export function VoiceRecorder({
  onUploaded,
}: {
  onUploaded: (id: string) => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    chunks = useRef<Blob[]>([]),
    timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [active, setActive] = useState(false),
    [seconds, setSeconds] = useState(0),
    [blob, setBlob] = useState<Blob | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploaded, setUploaded] = useState(false);
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  async function start() {
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Recording is unavailable in this browser. You can still send a text question.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mime = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      recorder.current = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      chunks.current = [];
      recorder.current.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      recorder.current.onstop = () => {
        setBlob(
          new Blob(chunks.current, {
            type: recorder.current?.mimeType || "audio/webm",
          }),
        );
        stream.current?.getTracks().forEach((t) => t.stop());
        setActive(false);
        if (timer.current) clearInterval(timer.current);
      };
      setBlob(null);
      setUploaded(false);
      onUploaded("");
      setSeconds(0);
      recorder.current.start();
      setActive(true);
      let n = 0;
      timer.current = setInterval(() => {
        n++;
        setSeconds(n);
        if (n >= 120) recorder.current?.stop();
      }, 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Microphone permission was denied. Use text instead.",
      );
    }
  }
  async function upload() {
    if (!blob) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio", blob, "recording");
      const res = await fetch("/api/audio", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUploaded(data.data.id);
      setUploaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="audio-box stack">
      <div className="row">
        <strong className="text-xs">Record a voice message</strong>
        <span className="footnote">{seconds}s / 120s · max 3 MB</span>
      </div>
      <p className="footnote">
        Profiles are hidden in Q&A. A natural voice may reveal identity; avoid
        sharing personal details.
      </p>
      <div className="flex">
        {active ? (
          <button
            type="button"
            className="btn danger small"
            onClick={() => recorder.current?.stop()}
          >
            <Square size={14} />
            Stop recording
          </button>
        ) : (
          <button type="button" className="btn secondary small" onClick={start}>
            <Mic size={14} />
            {blob ? "Rerecord" : "Start recording"}
          </button>
        )}
        {blob && !active && (
          <>
            <audio controls src={url} />
            <button
              type="button"
              className="btn small"
              disabled={busy || uploaded}
              onClick={upload}
            >
              <Upload size={14} />
              {uploaded
                ? "Recording attached"
                : busy
                  ? "Uploading…"
                  : "Attach recording"}
            </button>
            <button
              aria-label="Delete recording"
              type="button"
              className="btn secondary small"
              onClick={() => {
                setBlob(null);
                setUploaded(false);
                onUploaded("");
              }}
            >
              <RotateCcw size={14} />
            </button>
          </>
        )}
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
    </div>
  );
}
export function PrivateAudio({ id }: { id: string }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  return (
    <div>
      {url ? (
        <audio
          controls
          src={url}
          onError={() => {
            setUrl("");
            setError("Playback link expired. Load a new link.");
          }}
        />
      ) : (
        <button
          className="btn secondary small"
          onClick={async () => {
            try {
              const r = await fetch("/api/audio/" + id);
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              setUrl(d.data.url);
              setError("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Playback unavailable");
            }
          }}
        >
          Play private recording
        </button>
      )}
      {error && (
        <p role="alert" className="text-red-700 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
