"use client";

import { useState } from "react";
import { NotebookPen, Plus, X } from "lucide-react";

type NotesBoardProps = {
  notes: string[];
  onAdd: (note: string) => void;
  onRemove: (note: string) => void;
};

const EXAMPLES = [
  "Find a better image of the finished dish",
  "Check this ingredient with a local cook",
  "Consider explaining this technique in the carousel",
  "This visual could work for the opening slide",
];

export function NotesBoard({ notes, onAdd, onRemove }: NotesBoardProps) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft("");
  };

  return (
    <section className="section section-notes" aria-labelledby="notes-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">Your perspective</span>
          <h2 id="notes-heading">Notes to self</h2>
          <p>
            Your own thinking, kept apart from the evidence and from anything the
            model wrote. Notes travel with the session when you save it.
          </p>
        </div>
        <p className="section-tally">{notes.length} saved to pack</p>
      </div>

      <div className="notes-board">
        <div className="notes-input-row">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Add a note for this research…"
            aria-label="New note"
          />
          <button className="button button-primary" onClick={submit} disabled={!draft.trim()}>
            <Plus size={15} /> Add
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="notes-empty">
            <p>Nothing yet. These are the kinds of things worth writing down:</p>
            <ul>
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button className="example-note" onClick={() => onAdd(example)}>
                    <Plus size={12} /> {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="notes-list">
            {notes.map((note, index) => (
              <li key={`${note}-${index}`}>
                <NotebookPen size={14} className="notes-icon" aria-hidden="true" />
                <span>{note}</span>
                <button
                  className="notes-remove"
                  onClick={() => onRemove(note)}
                  aria-label={`Remove note: ${note}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
