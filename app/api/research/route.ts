import { NextRequest, NextResponse } from "next/server"

type RecipeSource = {
    position?: number
    title?: string
    link?: string
    source?: string
    snippet?: string
    tag?: string
}

type NormalizedRecipe = {
    name: string
    author: string
    description: string
    ingredients: string[]
    instructions: string[]
    cookTime: string
    yield: string
    url: string
}

async function extractRecipe(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
            },
        })

        if (!response.ok) {
            return null
        }

        const html = await response.text()

        const recipeScripts = [
            ...html.matchAll(
                /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
            ),
        ]

        for (const match of recipeScripts) {
            try {
                const parsed = JSON.parse(match[1])

                const items = Array.isArray(parsed)
                    ? parsed
                    : parsed["@graph"]
                        ? parsed["@graph"]
                        : [parsed]

                for (const item of items) {
                    if (
                        item?.["@type"] === "Recipe" ||
                        (Array.isArray(item?.["@type"]) &&
                            item["@type"].includes("Recipe"))
                    ) {
                        return item
                    }
                }
            } catch {
                // Ignore invalid JSON-LD blocks
            }
        }

        // Fallback: some food sources do not expose Recipe JSON-LD.
        // Extract readable page text so the AI can still reason over the source.
        const articleMatch =
            html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
            html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
            html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)

        if (articleMatch) {
            const text = articleMatch[1]
                .replace(/<script[\s\S]*?<\/script>/gi, " ")
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/gi, " ")
                .replace(/&amp;/gi, "&")
                .replace(/\s+/g, " ")
                .trim()

            if (text.length > 200) {
                return {
                    name: "",
                    author: "",
                    description: text.slice(0, 12000),
                    recipeIngredient: [],
                    recipeInstructions: [],
                    totalTime: "",
                    recipeYield: "",
                }
            }
        }

        return null
    } catch {
        return null
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const {
            dish,
            context,
            kind,
            extra,
        } = body

        if (!dish?.trim()) {
            return NextResponse.json(
                { error: "A dish is required." },
                { status: 400 }
            )
        }

        const apiKey = process.env.SERPAPI_KEY

        if (!apiKey) {
            return NextResponse.json(
                { error: "SERPAPI_KEY is not configured." },
                { status: 500 }
            )
        }

        const searchQuery = `${dish} ${context}`

        const imagesUrl = new URL("https://serpapi.com/search.json")
        imagesUrl.searchParams.set("engine", "google_images")
        imagesUrl.searchParams.set("q", searchQuery)
        imagesUrl.searchParams.set("api_key", apiKey)

        const webUrl = new URL("https://serpapi.com/search.json")
        webUrl.searchParams.set("engine", "google")
        webUrl.searchParams.set("q", searchQuery)
        webUrl.searchParams.set("api_key", apiKey)

        const [imagesResponse, webResponse] = await Promise.all([
            fetch(imagesUrl.toString()),
            fetch(webUrl.toString()),
        ])

        if (!imagesResponse.ok || !webResponse.ok) {
            return NextResponse.json(
                { error: "SerpApi request failed." },
                { status: 502 }
            )
        }

        const [imagesData, webData] = await Promise.all([
            imagesResponse.json(),
            webResponse.json(),
        ])

        const images = imagesData.images_results ?? []
        const sources: RecipeSource[] = webData.organic_results ?? []

        const recipeCandidates = sources.filter(
            (source) => source.link
        )

        const recipes = await Promise.all(
            recipeCandidates.slice(0, 6).map(async (source) => {
                if (!source.link) return null

                const recipe = await extractRecipe(source.link)

                if (!recipe) return null

                const normalizedRecipe: NormalizedRecipe = {
                    name: recipe.name || source.title || "Untitled recipe",
                    author:
                        typeof recipe.author === "string"
                            ? recipe.author
                            : recipe.author?.name || "Unknown author",
                    description: recipe.description || source.snippet || "",
                    ingredients: Array.isArray(recipe.recipeIngredient)
                        ? recipe.recipeIngredient
                        : [],
                    instructions: Array.isArray(recipe.recipeInstructions)
                        ? recipe.recipeInstructions.map((instruction: any) =>
                            typeof instruction === "string"
                                ? instruction
                                : instruction.text || ""
                        )
                        : [],
                    cookTime: recipe.totalTime || recipe.cookTime || "",
                    yield: recipe.recipeYield || "",
                    url: source.link || "",
                }

                return {
                    source: {
                        position: source.position,
                        title: source.title,
                        link: source.link,
                        source: source.source,
                        snippet: source.snippet,
                    },
                    recipe: normalizedRecipe,
                }
            })
        )

        return NextResponse.json({
            query: {
                dish,
                context,
                kind,
                extra,
            },
            images,
            sources,
            recipes: recipes.filter(Boolean),
        })
    } catch (error) {
        console.error("Research API error:", error)

        return NextResponse.json(
            { error: "Something went wrong while researching." },
            { status: 500 }
        )
    }
}
