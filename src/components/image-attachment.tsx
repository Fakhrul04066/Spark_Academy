"use client";
import { useState } from "react";
export function ImageAttachment({
  onUploaded,
  onBusyChange,
}: {
  onUploaded: (id: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="audio-box stack">
      <label className="label">
        Attach an image (optional)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError("");
            if (file.size > 2 * 1024 * 1024) {
              setError("Image must be under 2 MB");
              return;
            }
            setBusy(true);
            onBusyChange?.(true);
            try {
              const form = new FormData();
              form.append("image", file);
              const response = await fetch("/api/question-images", {
                method: "POST",
                body: form,
              });
              const body = await response.json();
              if (!response.ok) throw new Error(body.error);
              setId(body.data.id);
              onUploaded(body.data.id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Upload failed");
            } finally {
              setBusy(false);
              onBusyChange?.(false);
            }
          }}
        />
      </label>
      <p className="footnote">
        PNG, JPEG or WebP · max 2 MB · Avoid names or personal details in the
        image.
      </p>
      {busy && <p role="status">Uploading image…</p>}
      {id && (
        <>
          <img
            className="doubt-image"
            src={"/api/question-images/" + id}
            alt="Image attachment preview"
          />
          <button
            type="button"
            className="btn secondary small"
            onClick={() => {
              setId("");
              onUploaded("");
            }}
          >
            Remove image
          </button>
          <p role="status">Image attached</p>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
