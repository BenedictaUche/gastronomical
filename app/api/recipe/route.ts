import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: "A recipe URL is required." },
        { status: 400 }
      )
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not fetch the recipe page." },
        { status: 502 }
      )
    }

    const html = await response.text()

    const recipeScripts = [
      ...html.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      ),
    ]

    const recipes: unknown[] = []

    for (const match of recipeScripts) {
      try {
        const parsed = JSON.parse(match[1])

        const items = Array.isArray(parsed)
          ? parsed
          : parsed["@graph"]
            ? parsed["@graph"]
            : [parsed]

        for (const item of items) {
          if (item?.["@type"] === "Recipe") {
            recipes.push(item)
          }

          if (
            Array.isArray(item?.["@type"]) &&
            item["@type"].includes("Recipe")
          ) {
            recipes.push(item)
          }
        }
      } catch {
        // Ignore invalid JSON-LD blocks
      }
    }

    if (recipes.length === 0) {
      return NextResponse.json({
        url,
        found: false,
        recipe: null,
      })
    }

    return NextResponse.json({
      url,
      found: true,
      recipe: recipes[0],
    })
  } catch (error) {
    console.error("Recipe extraction error:", error)

    return NextResponse.json(
      { error: "Something went wrong while extracting the recipe." },
      { status: 500 }
    )
  }
}
