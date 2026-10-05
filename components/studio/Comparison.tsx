"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  findingId,
  isFindingSaved,
  sourceType,
  type AnalysisData,
  type ResearchPack,
  type ResearchSource,
  type SavedFinding,
} from "@/lib/studio";

type ComparisonProps = {
  analysis: AnalysisData | null;
  sources: ResearchSource[];
  busy: boolean;
  error: string | null;
  pack: ResearchPack;
  onToggleFinding: (finding: SavedFinding) => void;
};

type IngredientRow = {
  name: string;
  recipes: number;
  /** Verbatim measurement lines from the sources, or a "not specified" note. */
  lines: string[];
};

/**
 * Strip the leading quantity off an ingredient line so "1/2 cup palm oil" and
 * "palm oil" group together. The measurement itself is never discarded — it is
 * kept verbatim as the line shown to the creator.
 */
function splitIngredient(line: string): { amount: string; name: string } {
  const match = line.match(
    /^((?:\d[\d\s./¼½¾³²]*|[½¼¾])\s*(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|grams?|kg|g|ml|litres?|liters?|pounds?|lbs?|oz|ounces?|cans?|tins?|cloves?|bunches?|pieces?|slices?|sprigs?)?\s*)(.+)$/i,
  );

  if (match) {
    return { amount: match[1].trim(), name: match[2].trim() };
  }

  // No quantity at the front — still strip units like "cup palm oil".
  const unitFirst = line.match(
    /^(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|grams?|kg|ml|litres?|liters?)\s+(.+)$/i,
  );
  if (unitFirst) return { amount: line.slice(0, line.length - unitFirst[1].length).trim(), name: unitFirst[1].trim() };

  return { amount: "", name: line.trim() };
}

const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type RowAccumulator = IngredientRow & {
  measurements: Map<string, number>;
  recipesSeen: Set<string>;
};

function buildRows(sources: ResearchSource[]): IngredientRow[] {
  const rows = new Map<string, RowAccumulator>();

  for (const source of sources) {
    if (sourceType(source) !== "recipe") continue;

    const sourceKey = source.url || source.title || "";

    for (const raw of source.ingredients ?? []) {
      const { amount, name } = splitIngredient(raw);
      const key = norm(name);
      if (!key) continue;

      const entry: RowAccumulator =
        rows.get(key) ??
        { name, recipes: 0, lines: [], measurements: new Map(), recipesSeen: new Set() };

      // Count each recipe once per ingredient.
      if (!entry.recipesSeen.has(sourceKey)) {
        entry.recipesSeen.add(sourceKey);
        entry.recipes += 1;
      }

      const label = amount || "Measurement not specified by source.";
      const count = entry.measurements.get(label) ?? 0;
      entry.measurements.set(label, count + 1);
      rows.set(key, entry);
    }
  }

  return [...rows.values()]
    .map((entry) => {
      const lines = [...entry.measurements.entries()]
        // "Measurement not specified…" sorts last; real quantities stay verbatim.
        .sort((a, b) => {
          const aMissing = a[0].startsWith("Measurement") ? 1 : 0;
          const bMissing = b[0].startsWith("Measurement") ? 1 : 0;
          if (aMissing !== bMissing) return aMissing - bMissing;
          return b[1] - a[1];
        })
        .map(([label, count]) =>
          label.startsWith("Measurement")
            ? `${count} recipe${count === 1 ? "" : "s"} do${count === 1 ? "es" : ""} not specify`
            : count > 1
              ? `${count} recipes use ${label}`
              : `1 recipe uses ${label}`,
        );

      return { name: entry.name, recipes: entry.recipes, lines };
    })
    .sort((a, b) => b.recipes - a.recipes || a.name.localeCompare(b.name));
}

export function Comparison({
  analysis,
  sources,
  busy,
  error,
  pack,
  onToggleFinding,
}: ComparisonProps) {
  const [details, setDetails] = useState(false);

  const KeepButton = ({ finding }: { finding: SavedFinding }) => {
    const saved = isFindingSaved(pack, finding.id);
    return (
      <button
        className={saved ? "keep keep-on" : "keep"}
        onClick={() => onToggleFinding(finding)}
        aria-pressed={saved}
      >
        {saved ? <Check size={13} /> : <Plus size={13} />}
        {saved ? "Kept" : "Keep"}
      </button>
    );
  };

  const rows = useMemo(() => buildRows(sources), [sources]);

  const differences = analysis?.differences ?? [];
  const techniques = analysis?.techniques ?? [];
  const observations = analysis?.observations ?? [];

  const hasContent = rows.length > 0 || differences.length > 0;

  if (!hasContent && !busy) {
    return (
      <section className="section section-compare" aria-labelledby="compare-heading">
        <div className="section-head">
          <div>
            <span className="eyebrow">Side by side</span>
            <h2 id="compare-heading">What differs across recipes</h2>
          </div>
        </div>
        <p className="empty-state">
          {error ??
            "There is not enough structured recipe data yet to compare. Once a search returns recipes, the differences show up here."}
        </p>
      </section>
    );
  }

  return (
    <section className="section section-compare" aria-labelledby="compare-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">Side by side</span>
          <h2 id="compare-heading">What differs across recipes</h2>
          <p>Only what the sources actually say — measurements shown verbatim.</p>
        </div>
      </div>

      {busy ? (
        <p className="empty-state">
          <span className="spinner spinner-dark" aria-hidden="true" /> Comparing the
          sources…
        </p>
      ) : (
        <>
          <ul className="compare-list">
            {rows.slice(0, details ? rows.length : 6).map((row) => (
              <li key={norm(row.name)} className="compare-row">
                <strong>{row.name}</strong>
                <span className="compare-count">
                  {row.recipes} recipe{row.recipes === 1 ? "" : "s"} use
                  {row.recipes === 1 ? "s" : ""} it
                </span>
                <ul className="compare-lines">
                  {row.lines.map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {!details && (rows.length > 6 || differences.length > 0) && (
            <button className="disclosure details-toggle" onClick={() => setDetails(true)} aria-expanded={false}>
              <ChevronDown size={15} /> Want the details?
            </button>
          )}

          {details && (
            <div className="compare-details">
              {differences.length > 0 && (
                <div className="compare-detail-block">
                  <h3>Where the sources differ</h3>
                  <ul className="finding-list">
                    {differences.map((item, index) => {
                      const finding: SavedFinding = {
                        id: findingId("difference", `${item.topic}-${index}`),
                        text: item.details ? `${item.topic}: ${item.details}` : item.topic,
                        section: "difference",
                        sources: item.sourceTitles,
                      };

                      return (
                        <li key={finding.id} className="finding">
                          <div className="finding-text">
                            <strong>{item.topic}</strong>
                            {item.details && <span>{item.details}</span>}
                            {item.sourceTitles.length > 0 && (
                              <span className="attribution">
                                <span className="attribution-label">From</span>
                                {item.sourceTitles.map((title) => (
                                  <span className="source-chip" key={title}>
                                    {title}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                          <KeepButton finding={finding} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {techniques.length > 0 && (
                <div className="compare-detail-block">
                  <h3>Techniques across sources</h3>
                  <ul className="finding-list">
                    {techniques.map((item) => (
                      <li key={item.technique} className="finding">
                        <div className="finding-text">
                          <strong>{item.technique}</strong>
                          {item.details && <span>{item.details}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {observations.length > 0 && (
                <div className="compare-detail-block">
                  <h3>Worth noting</h3>
                  <ul className="finding-list">
                    {observations.map((item) => (
                      <li key={item.observation} className="finding">
                        <div className="finding-text">
                          <span>{item.observation}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="disclosure details-toggle" onClick={() => setDetails(false)} aria-expanded={true}>
                Show less
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
