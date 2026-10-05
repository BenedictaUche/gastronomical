"use client";

import { ArrowRight, Bookmark, Trash2 } from "lucide-react";
import { sourceType, type SavedSession } from "@/lib/studio";

const recipeCount = (session: SavedSession) =>
  (session.sources ?? []).filter((source) => sourceType(source) === "recipe").length;

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
        <span className="eyebrow">Recent content</span>
        <h1>Your projects</h1>
        <p>
          Everything you saved, ready to reopen — recipes, images, sources and
          any carousel you built.
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="empty-state empty-state-large">
          <Bookmark size={26} />
          <p>
            No projects yet. Search a dish, then press &ldquo;Save
            project&rdquo; when you have something worth keeping.
          </p>
          <button className="button button-primary" onClick={onGoStart}>
            Start with a dish
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
                    <span className="eyebrow">
                      {session.pack?.carousel ? "Carousel saved" : session.kind || "Recipe"}
                    </span>
                    <strong>{session.dish}</strong>
                    <small>{session.context || "No context given"}</small>
                    <small className="session-stats">
                      {recipeCount(session)} recipe{recipeCount(session) === 1 ? "" : "s"} ·{" "}
                      {session.images?.length ?? 0} images
                      {session.savedAt
                        ? ` · Created ${new Date(session.savedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}`
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