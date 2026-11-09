"use client";
import { useEffect, useState } from "react";
import { dhakaDate } from "@/lib/domain";
export function RevisionDate({
  date,
  topic,
  completed,
  onSave,
}: {
  date: string;
  topic: string;
  completed: boolean;
  onSave: (completed: boolean) => Promise<boolean>;
}) {
  const [checked, setChecked] = useState(completed),
    [busy, setBusy] = useState(false);
  useEffect(() => setChecked(completed), [completed]);
  const day = new Date(date + "T00:00:00");
  return (
    <label
      className={`revision-date ${checked ? "is-complete" : date < dhakaDate() ? "is-overdue" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        aria-label={`Revision ${date} for ${topic}`}
        onChange={async (e) => {
          const next = e.target.checked;
          setChecked(next);
          setBusy(true);
          if (!(await onSave(next))) setChecked(completed);
          setBusy(false);
        }}
      />
      <span>
        <strong>{day.getDate()}</strong>
        <small>{day.toLocaleDateString("en", { month: "short" })}</small>
      </span>
      <small>
        {busy
          ? "Saving…"
          : checked
            ? "Completed"
            : date < dhakaDate()
              ? "Overdue"
              : date === dhakaDate()
                ? "Today"
                : "Scheduled"}
      </small>
    </label>
  );
}
