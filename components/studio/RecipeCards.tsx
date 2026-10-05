"use client";

import { ExternalLink } from "lucide-react";
import { hostOf, sourceType, type ResearchSource } from "@/lib/studio";

type RecipeCardsProps = {
  dish: string;
  sources: ResearchSource[];
};

const MEASUREMENT_RE = /\d|cup|tbsp|tsp|tablespoon|teaspoon|gram|kg|g\b|ml|litre|liter|pinch|clove|bunch|slice|can\b|tin\b/i;

const hasMeasurement = (line: string) => MEASUREMENT_RE.test(line);

/**
 * A source only becomes a recipe card when it actually carries recipe data.
 * Nothing is padded, guessed or completed — whatever the page did not say is
 * shown as "not specified by source".
 */
function toRecipeCard(source: ResearchSource) {
  const ingredients = (source.ingredients ?? []).filter(Boolean);
  const instructions = (source.instructions ?? []).filter(Boolean);
  const isRecipe = sourceType(source) === "recipe" || ingredients.length > 0;

  if (!isRecipe) return null;

  const unmeasured = ingredients.filter((line) => !hasMeasurement(line));

  return {
    source,
    ingredients,
    instructions,
    unmeasuredCount: unmeasured.length,
    allUnmeasured: ingredients.length > 0 && unmeasured.length === ingredients.length,
  };
}

export function RecipeCards({ dish, sources }: RecipeCardsProps) {
  const recipes = sources.map(toRecipeCard).filter((card): card is NonNullable<ReturnType<typeof toRecipeCard>> => card !== null);

  if (recipes.length === 0) {
    return (
      <section className="section section-recipes" aria-labelledby="recipes-heading">
        <div className="section-head">
          <div>
            <span className="eyebrow">The recipes</span>
            <h2 id="recipes-heading">Recipes we found</h2>
          </div>
        </div>
        <p className="empty-state">
          No structured recipe came back for this search. Try adding a regional
          context (for example “{dish} recipe”), or open the sources below — some
          of them still describe how the dish is made.
        </p>
      </section>
    );
  }

  return (
    <section className="section section-recipes" aria-labelledby="recipes-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">The recipes</span>
          <h2 id="recipes-heading">Recipes we found</h2>
          <p>
            Exactly what each source published — measurements, yield and times
            included when they gave them, and marked when they did not.
          </p>
        </div>
        <p className="section-tally">
          {recipes.length} recipe{recipes.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="recipe-grid">
        {recipes.map(({ source, ingredients, instructions, unmeasuredCount, allUnmeasured }) => {
          const key = source.url || source.title || "";
          const host = hostOf(source.url) || source.source || "Web";
          const hasNumbers = Boolean(source.prepTime || source.cookTime || source.yield);

          return (
            <li key={key} className="recipe-card">
              {source.image ? (
                <img className="recipe-image" src={source.image} alt="" loading="lazy" />
              ) : null}

              <div className="recipe-card-body">
                <div className="recipe-card-head">
                  <h3>{source.title || dish}</h3>
                  <p className="recipe-from">
                    From <strong>{host}</strong>
                    {source.author ? <> · {source.author}</> : null}
                  </p>
                </div>

                <dl className="recipe-facts">
                  <div>
                    <dt>Yield</dt>
                    <dd className={source.yield ? "" : "fact-missing"}>
                      {source.yield || "Yield not specified by source."}
                    </dd>
                  </div>
                  <div>
                    <dt>Prep</dt>
                    <dd className={source.prepTime ? "" : "fact-missing"}>
                      {source.prepTime || "Not specified by source."}
                    </dd>
                  </div>
                  <div>
                    <dt>Cook</dt>
                    <dd className={source.cookTime ? "" : "fact-missing"}>
                      {source.cookTime || "Not specified by source."}
                    </dd>
                  </div>
                </dl>

                {ingredients.length > 0 ? (
                  <div className="recipe-block">
                    <h4>Ingredients</h4>
                    <ul className="recipe-ingredients">
                      {ingredients.map((line, index) => (
                        <li key={`${line}-${index}`}>
                          {line}
                          {!hasMeasurement(line) && (
                            <span className="spec-note">measurement not specified</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {allUnmeasured && (
                      <p className="recipe-flag">
                        Measurement not specified by source for these ingredients.
                      </p>
                    )}
                    {!allUnmeasured && unmeasuredCount > 0 && (
                      <p className="recipe-flag">
                        {unmeasuredCount} ingredient
                        {unmeasuredCount === 1 ? "" : "s"} without a measurement in
                        the source.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="recipe-flag">Ingredients not listed by this source.</p>
                )}

                {instructions.length > 0 && (
                  <div className="recipe-block">
                    <h4>Method</h4>
                    <ol className="recipe-method">
                      {instructions.map((step, index) => (
                        <li key={`${step}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="recipe-card-foot">
                  {source.url && (
                    <a
                      className="text-action"
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={13} /> View original recipe
                    </a>
                  )}
                  {!hasNumbers && ingredients.length === 0 && (
                    <span className="spec-note">snippet only — the page could not be read</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
