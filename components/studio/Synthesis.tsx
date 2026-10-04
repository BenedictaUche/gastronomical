"use client";

import { Check, Plus, RefreshCw, Sparkles } from "lucide-react";
import {
  findingId,
  isFindingSaved,
  modelLabel,
  type AnalysisData,
  type FindingSection,
  type ResearchPack,
  type SavedFinding,
} from "@/lib/studio";

type SynthesisProps = {
  analysis: AnalysisData | null;
  model: string;
  busy: boolean;
  error: string | null;
  reanalyzing: boolean;
  pack: ResearchPack;
  onReanalyze: () => void;
  onToggleFinding: (finding: SavedFinding) => void;
};

function Attribution({ sources }: { sources: string[] }) {
  if (sources.length === 0) {
    return <span className="attribution attribution-none">No source named by the model</span>;
  }

  return (
    <span className="attribution">
      <span className="attribution-label">From</span>
      {sources.map((source) => (
        <span className="source-chip" key={source}>
          {source}
        </span>
      ))}
    </span>
  );
}

export function Synthesis({
  analysis,
  model,
  busy,
  error,
  reanalyzing,
  pack,
  onReanalyze,
  onToggleFinding,
}: SynthesisProps) {
  const hasAnything =
    !!analysis &&
    (analysis.commonIngredients.length > 0 ||
      analysis.techniques.length > 0 ||
      analysis.differences.length > 0 ||
      analysis.observations.length > 0 ||
      !!analysis.summary);

  const maxAgreement = Math.max(
    1,
    ...(analysis?.commonIngredients ?? []).map((item) => item.sourceCount),
  );

  return (
    <section className="section section-synthesis" aria-labelledby="synthesis-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">Synthesis</span>
          <h2 id="synthesis-heading">What the sources say, and where they disagree</h2>
          {/* <p>
            Written by {modelLabel(model)} from the sources above — nothing else.
            Every line keeps the sources it came from, so you can check it
            yourself.
          </p> */}
        </div>
        <button
          className="button button-quiet"
          onClick={onReanalyze}
          disabled={reanalyzing}
        >
          {reanalyzing ? (
            <span className="spinner spinner-dark" aria-hidden="true" />
          ) : (
            <RefreshCw size={14} />
          )}
          Re-analyse
        </button>
      </div>

      {busy && (
        <p className="empty-state">
          <span className="spinner spinner-dark" aria-hidden="true" /> Reading the collected
          sources. This usually takes a little while.
        </p>
      )}

      {!busy && !hasAnything && (
        <p className="empty-state">
          {error ??
            "There is not enough source material to synthesise yet. Add more sources, or re-analyse once a search has landed."}
        </p>
      )}

      {!busy && analysis && (
        <div className="synthesis">
          <div className="synthesis-summary">
            <span className="eyebrow">Research summary</span>
            {analysis.summary ? (
              <p>{analysis.summary}</p>
            ) : (
              <p className="muted">
                The model returned no summary for these sources. The findings
                below are still grounded in the pages that were read.
              </p>
            )}
            {/* <span className="synthesis-badge">
              <Sparkles size={12} /> AI synthesis — check the sources before you publish
            </span> */}
          </div>

          <div className="synthesis-column">
            <div className="synthesis-block">
              <h3>What appears across sources</h3>
              <p className="synthesis-hint">
                Ingredients and techniques the model found repeated.
              </p>

              {analysis.commonIngredients.length > 0 ? (
                <ul className="agreement-list">
                  {analysis.commonIngredients.map((item) => (
                    <li key={item.ingredient}>
                      <span className="agreement-name">{item.ingredient}</span>
                      <span className="agreement-bar" aria-hidden="true">
                        <i style={{ width: `${Math.max(10, (item.sourceCount / maxAgreement) * 100)}%` }} />
                      </span>
                      <span className="agreement-count">
                        {item.sourceCount} {item.sourceCount === 1 ? "source" : "sources"}
                      </span>
                      <Attribution sources={item.sourceTitles} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-block">
                  No ingredient was repeated often enough across the sources to
                  call it a pattern.
                </p>
              )}

              {analysis.techniques.length > 0 ? (
                <ul className="finding-list">
                  {analysis.techniques.map((item, index) => {
                    const finding: SavedFinding = {
                      id: findingId("technique", `${item.technique}-${index}`),
                      text: item.details ? `${item.technique} — ${item.details}` : item.technique,
                      section: "technique" as FindingSection,
                      sources: item.sourceTitles,
                    };
                    const saved = isFindingSaved(pack, finding.id);

                    return (
                      <li key={finding.id} className="finding">
                        <div className="finding-text">
                          <strong>{item.technique}</strong>
                          {item.details && <span>{item.details}</span>}
                          <Attribution sources={item.sourceTitles} />
                        </div>
                        <button
                          className={saved ? "keep keep-on" : "keep"}
                          onClick={() => onToggleFinding(finding)}
                          aria-pressed={saved}
                        >
                          {saved ? <Check size={13} /> : <Plus size={13} />}
                          {saved ? "Kept" : "Keep"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted-block">
                  No technique was described the same way in more than one source.
                </p>
              )}
            </div>

            <div className="synthesis-block">
              <h3>Where sources differ</h3>
              <p className="synthesis-hint">
                Variations the model could actually document.
              </p>

              {analysis.differences.length > 0 ? (
                <ul className="finding-list">
                  {analysis.differences.map((item, index) => {
                    const finding: SavedFinding = {
                      id: findingId("difference", `${item.topic}-${index}`),
                      text: item.details ? `${item.topic}: ${item.details}` : item.topic,
                      section: "difference" as FindingSection,
                      sources: item.sourceTitles,
                    };
                    const saved = isFindingSaved(pack, finding.id);

                    return (
                      <li key={finding.id} className="finding">
                        <div className="finding-text">
                          <strong>{item.topic}</strong>
                          {item.details && <span>{item.details}</span>}
                          <Attribution sources={item.sourceTitles} />
                        </div>
                        <button
                          className={saved ? "keep keep-on" : "keep"}
                          onClick={() => onToggleFinding(finding)}
                          aria-pressed={saved}
                        >
                          {saved ? <Check size={13} /> : <Plus size={13} />}
                          {saved ? "Kept" : "Keep"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted-block">
                  The sources did not document enough of a difference to be worth
                  showing — they may simply be describing the same dish.
                </p>
              )}
            </div>

            <div className="synthesis-block">
              <h3>Interesting observations</h3>
              <p className="synthesis-hint">
                Details from the evidence that might open up a content angle.
              </p>

              {analysis.observations.length > 0 ? (
                <ul className="finding-list">
                  {analysis.observations.map((item, index) => {
                    const finding: SavedFinding = {
                      id: findingId("observation", `${item.observation}-${index}`),
                      text: item.observation,
                      section: "observation" as FindingSection,
                      sources: item.sourceTitles,
                    };
                    const saved = isFindingSaved(pack, finding.id);

                    return (
                      <li key={finding.id} className="finding">
                        <div className="finding-text">
                          <span>{item.observation}</span>
                          <Attribution sources={item.sourceTitles} />
                        </div>
                        <button
                          className={saved ? "keep keep-on" : "keep"}
                          onClick={() => onToggleFinding(finding)}
                          aria-pressed={saved}
                        >
                          {saved ? <Check size={13} /> : <Plus size={13} />}
                          {saved ? "Kept" : "Keep"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted-block">
                  Nothing stood out. With a wider or more specific search there
                  is usually more here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
