"use client";

import { ArrowRight, Bookmark, Trash2 } from "lucide-react";
import type { SavedSession } from "@/lib/studio";

type SavedSessionsViewProps = {
  sessions: SavedSession[];
  onOpen: (session: SavedSession) => void;
  onDelete: (id: string) => void;
  onGoStart: () => void;
};

export function SavedSessionsView({
  sessions,
  onOpen,
  onDelete,
  onGoStart,
}: SavedSessionsViewProps) {
  return (
    <main className="saved-page">
      <header className="saved-head">
        <span className="eyebrow">Your workspace</span>
        <h1>Saved research</h1>
        <p>
          Every session you kept, with its pack intact — images, sources,
          findings and notes. Opening one puts you straight back into that
          workspace.
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="empty-state empty-state-large">
          <Bookmark size={26} />
          <p>
            No saved sessions yet. Run a search and press &ldquo;Save
            session&rdquo; once you have something worth keeping.
          </p>
          <button className="button button-primary" onClick={onGoStart}>
            Start research
          </button>
        </div>
      ) : (
        <ul className="session-grid">
          {sessions.map((session) => (
            <li key={session.id}>
              <article className="session-card">
                <button className="session-open" onClick={() => onOpen(session)}>
                  {session.images?.[0]?.thumbnail || session.images?.[0]?.original ? (
                    <img src={session.images[0].thumbnail || session.images[0].original} alt="" />
                  ) : (
                    <span className="session-blank" aria-hidden="true" />
                  )}
                  <span className="session-body">
                    <span className="eyebrow">{session.kind || "Research"}</span>
                    <strong>{session.dish}</strong>
                    <small>{session.context || "No context given"}</small>
                    <small className="session-stats">
                      {session.pack?.visuals.length ?? 0} images ·{" "}
                      {session.pack?.sources.length ?? 0} sources ·{" "}
                      {session.pack?.findings.length ?? 0} findings
                      {session.savedAt
                        ? ` · ${new Date(session.savedAt).toLocaleDateString()}`
                        : ""}
                    </small>
                  </span>
                </button>
                <div className="session-actions">
                  <button className="button button-quiet" onClick={() => onOpen(session)}>
                    Open <ArrowRight size={14} />
                  </button>
                  <button
                    className="button button-quiet button-quiet-danger"
                    onClick={() => onDelete(session.id)}
                    aria-label={`Delete saved session ${session.dish}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}