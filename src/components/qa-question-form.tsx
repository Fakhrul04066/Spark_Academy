"use client";

import { ImagePlus, Mic, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { readQa } from "@/services/qa-access";
import { VoiceRecorder } from "./voice-recorder";

type Assignment = Awaited<ReturnType<typeof readQa>>["assignments"][number];
export type QaDraft = {
  batchId: string;
  subjectId: string;
  qaChapterId?: string;
  topic: string;
  text: string;
  imageIds: string[];
  audioId?: string;
};

export function QaQuestionForm({ assignments, busy, error, cancel, submit }: {
  assignments: Assignment[];
  busy: boolean;
  error: string;
  cancel: () => void;
  submit: (draft: QaDraft) => Promise<void>;
}) {
  const batches = new Map(assignments.map(({ batchId, batch }) => [batchId, batch]));
  const [batchId, setBatch] = useState(assignments[0]?.batchId ?? "");
  const available = assignments.filter((item) => item.batchId === batchId);
  const [subjectId, setSubject] = useState(available[0]?.subjectId ?? "");
  const chapters = available.find((item) => item.subjectId === subjectId)?.subject.chapters ?? [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [audioId, setAudio] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState("");
  const chooser = useRef<HTMLInputElement>(null);
  const disabled = busy || imageBusy;

  async function upload(files: File[]) {
    setImageError("");
    if (files.length > 4 - images.length) {
      setImageError("You can attach up to four images.");
      return;
    }
    setImageBusy(true);
    try {
      for (const file of files) {
        if (file.size > 2 * 1024 * 1024) throw new Error("Each image must be under 2 MB.");
        const data = new FormData();
        data.append("image", file);
        const response = await fetch("/api/question-images", { method: "POST", body: data });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Image upload failed.");
        setImages((previous) => [...previous, result.data.id]);
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setImageBusy(false);
    }
  }

  function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const form = new FormData(event.currentTarget);
    const chapter = form.get("chapter");
    void submit({
      batchId, subjectId, topic: title, text: description, imageIds: images,
      ...(chapter ? { qaChapterId: String(chapter) } : {}),
      ...(audioId ? { audioId } : {}),
    });
  }

  return <form className="sq-compose" onSubmit={post}>
    <div className="sq-compose-body">
      <fieldset disabled={busy}>
        <legend><span>1</span> Where does it belong?</legend>
        <div className="sq-compose-grid">
          <label>Your class<input value={batches.get(batchId)?.className ?? ""} readOnly /></label>
          <label>Course<select required value={batchId} onChange={(event) => {
            const next = event.target.value;
            setBatch(next);
            setSubject(assignments.find((item) => item.batchId === next)?.subjectId ?? "");
          }}>
            {[...batches].map(([id, batch]) => <option value={id} key={id}>{batch.name}</option>)}
          </select></label>
          <label>Subject<select required value={subjectId} onChange={(event) => setSubject(event.target.value)}>
            {available.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.subject.name}</option>)}
          </select></label>
          <label>Chapter<select key={subjectId} name="chapter" defaultValue={chapters[0]?.id ?? ""}>
            <option value="">General / No chapter</option>
            {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
          </select></label>
        </div>
      </fieldset>
      <fieldset disabled={busy}>
        <legend><span>2</span> Your question</legend>
        <label className="sq-compose-field">
          <span>Question Title <small>{title.length}/120</small></span>
          <input name="title" value={title} onChange={(event) => setTitle(event.target.value)}
            placeholder="প্রশ্নের সংক্ষিপ্ত শিরোনাম" maxLength={120} required />
        </label>
        <label className="sq-compose-field">
          <span>Description <small>{description.length}/2000</small></span>
          <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)}
            placeholder="এখানে লিখো..." maxLength={2000} rows={5} />
        </label>
      </fieldset>
      <fieldset className="sq-compose-media" disabled={busy}>
        <legend><span>3</span> Add a diagram or voice note <small>Optional</small></legend>
        <div className="sq-attachment-buttons">
          <button type="button" disabled={disabled || images.length >= 4} onClick={() => chooser.current?.click()}>
            <ImagePlus size={16} /> {imageBusy ? "Uploading…" : "Upload Image"} <b>{images.length}/4</b>
          </button>
          <button type="button" aria-expanded={voiceOpen} onClick={() => setVoiceOpen(!voiceOpen)}>
            <Mic size={16} /> {audioId ? "Voice attached" : "Record Voice"}
          </button>
        </div>
        <input ref={chooser} type="file" multiple hidden aria-label="Upload images" accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void upload(files);
          }} />
        {imageError && <p role="alert" className="sq-notice">{imageError}</p>}
        {!!images.length && <ul className="sq-attachment-previews">
          {images.map((id, index) => <li key={id}>
            <img src={"/api/question-images/" + id} alt={"Attachment " + (index + 1)} />
            <button type="button" aria-label={"Remove attachment " + (index + 1)} disabled={imageBusy}
              onClick={() => setImages((previous) => previous.filter((value) => value !== id))}><X size={13} /></button>
          </li>)}
        </ul>}
        {voiceOpen && <VoiceRecorder onUploaded={setAudio} />}
      </fieldset>
      {error && <p className="sq-notice" role="alert">{error}</p>}
    </div>
    <div className="sq-compose-footer">
      <button type="button" onClick={cancel} disabled={busy}>Cancel</button>
      <button className="sq-primary" disabled={disabled}>{busy ? "Submitting…" : "Submit Question"}</button>
    </div>
  </form>;
}
