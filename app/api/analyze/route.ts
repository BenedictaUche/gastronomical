import { NextRequest, NextResponse } from "next/server"

const MODELS = [
  "qwen/qwen3.8-27b:free",
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { dish, context, recipes } = body

    if (!dish?.trim()) {
      return NextResponse.json(
        { error: "A dish is required." },
        { status: 400 }
      )
    }

    if (!Array.isArray(recipes) || recipes.length === 0) {
      return NextResponse.json(
        { error: "At least one recipe is required." },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured." },
        { status: 500 }
      )
    }

    const prompt = `
                    You are a food research assistant.

                    The user is researching:

                    Dish: ${dish}
                    Context: ${context || "Not specified"}

                    Below are recipes retrieved from real web sources.

                    Your job is to compare the recipes and produce evidence-based research findings.

                    IMPORTANT:
                    - Use ONLY the information provided in the recipes.
                    - Do not invent ingredients, techniques, cultural facts, or historical claims.
                    - Do not decide that a recipe is "authentic" unless the provided source explicitly supports that claim.
                    - Distinguish between things that appear across multiple recipes and things found in only one recipe.
                    - Keep source attribution attached to every finding.
                    - The user's editorial judgment remains important.

                    Recipes:
                    ${JSON.stringify(recipes, null, 2)}

                    Return JSON with exactly this structure:

                    {
                    "summary": "A short research summary.",
                    "commonIngredients": [
                        {
                        "ingredient": "ingredient name",
                        "recipeCount": 0,
                        "sourceTitles": ["recipe title"]
                        }
                    ],
                    "differences": [
                        {
                        "topic": "what differs",
                        "details": "brief explanation",
                        "sourceTitles": ["recipe title"]
                        }
                    ],
                    "techniques": [
                        {
                        "technique": "technique",
                        "details": "brief explanation",
                        "sourceTitles": ["recipe title"]
                        }
                    ],
                    "observations": [
                        {
                        "observation": "evidence-based observation",
                        "sourceTitles": ["recipe title"]
                        }
                    ]
                    }
                `

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Gastronomical",
        },
        body: JSON.stringify({
          model: MODELS[0],
          models: MODELS,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("OpenRouter error:", data)

      return NextResponse.json(
        {
          error:
            data?.error?.message || "OpenRouter request failed.",
        },
        { status: 502 }
      )
    }

    console.log("OpenRouter raw response:", JSON.stringify(data, null, 2))
    const content = data?.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: "The model returned an empty response." },
        { status: 502 }
      )
    }

    let analysis

    try {
      analysis = JSON.parse(content)
    } catch {
      console.error("Invalid model JSON:", content)

      return NextResponse.json(
        { error: "The model returned invalid JSON." },
        { status: 502 }
      )
    }

    return NextResponse.json({
      model: data.model || MODELS[0],
      analysis,
    })
  } catch (error) {
    console.error("Analysis error:", error)

    return NextResponse.json(
      { error: "Something went wrong while analyzing the recipes." },
      { status: 500 }
    )
  }
}
