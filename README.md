# Gastronomical

### From food idea to ready-to-create content.

Gastronomical is an AI-powered research and content creation assistant built for food creators.

It helps turn a food idea into reliable recipe research, useful comparisons, relevant images, and ready-made carousel content, so creators can spend less time searching and more time creating.

## Why I Built This

I built Gastronomical for my sister, who creates food content through recipe and food-discovery carousels.

Her biggest problem wasn't coming up with ideas. It was everything that came after:

- Finding recipes she could actually trust
- Comparing different versions of the same dish
- Finding the right images
- Checking measurements and serving sizes
- Turning all that research into content

She doesn't have a social media or content manager, so the research itself was becoming part of the job.

My first version of Gastronomical actually made the problem worse. It gave her a lot of research to read through. Her response was essentially: "I'm not going to read all that."

So I changed the product.

Instead of giving a food creator more research to do, Gastronomical does the repetitive research for them and turns it into something they can actually use.

## What It Does

Enter a food topic and Gastronomical can:

1. Find relevant recipes and food sources
2. Extract recipe details such as ingredients, measurements, instructions, and servings
3. Compare information across multiple sources
4. Find relevant food images
5. Generate grounded content from the research
6. Turn the research into a ready-made carousel
7. Let the creator edit, rearrange, copy, and export the carousel

### The basic flow

**Food idea → Recipes → Research → Carousel → Done**

## Key Features

### 🔎 Recipe Research

Search for a dish or food topic and retrieve relevant web sources and images.

Recipe information is extracted when available, including:

- Ingredients
- Measurements
- Instructions
- Prep and cooking time
- Serving size / yield
- Recipe source
- Author

If information isn't available in the source, Gastronomical does not invent it.

### AI-Powered Analysis

Gastronomical uses an open-weight AI model to analyze retrieved research.

The model is instructed to work from the retrieved evidence rather than inventing ingredients, techniques, cultural information, or other unsupported facts.

### Image Discovery

Food creators can browse relevant images alongside their research and use them when creating their carousel.

### Carousel Generator

Gastronomical turns researched information into ready-to-use social media carousel content.

The carousel uses full-bleed food imagery with text layered over the image, designed specifically for food content rather than looking like a generic dashboard.

Creators can:

- Edit slides
- Regenerate content
- Rearrange slides
- Delete slides
- Copy the carousel text
- Export the carousel

## How It Works

Gastronomical follows a retrieval-first approach:

```text
User
  ↓
Food topic
  ↓
SerpApi
  ↓
Web + Image Search
  ↓
Recipe / source extraction
  ↓
Structured research
  ↓
Open-weight AI analysis
  ↓
Grounded content
  ↓
Carousel generation
  ↓
Creator
```

## Tech Stack
- Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
### AI
- OpenRouter
- Qwen open-weight model
- Search & Research
- SerpApi
- Google Search
- Google Images
- Recipe structured data / JSON-LD extraction
### Carousel Generation
- React
- HTML/CSS
- html-to-image
- Deployment
- Render

## Project Structure
app/
├── api/
│   ├── research/
│   └── analyze/
├── components/
├── ...
└── page.tsx


The research API handles retrieval and source extraction, while the analysis API sends the retrieved evidence to the AI model. The frontend is responsible for presenting the research and controlling the carousel design. AI generates the content. React controls the design.

```
Running Locally
1. Clone the repository
git clone <YOUR_REPOSITORY_URL>
cd gastronomical
2. Install dependencies
npm install
3. Add environment variables

Create a .env.local file:

SERPAPI_API_KEY=your_serpapi_key
OPENROUTER_API_KEY=your_openrouter_key

Never commit your API keys to the repository.

4. Start the development server
npm run dev

Open:

http://localhost:3000
Example
Try searching for:

Ekpang Nkukwo
Mofongo
Tonkotsu Ramen
Chili recipes
Desserts without added sugar

```

The application will retrieve relevant research and use it to create structured content for the creator.

### Design Philosophy

Gastronomical is intentionally not designed as a traditional AI dashboard. The goal is to remove work from the creator, not give them another interface to manage.

That means:
- Recipes before analysis
- Useful answers before research summaries
- Images alongside information
- Ready-made content instead of more instructions
- Minimal interface
- Human-editable output

The creator should be able to go from an idea to something they can actually post with as little friction as possible.

### Built for Hacktoberfest 2026

Gastronomical was built for the DEV Weekend Challenge: Build for a Friend. The project is based on a real problem experienced by someone close to me rather than a hypothetical user persona.

## Future Improvements

More carousel templates
Better image relevance and cultural context detection
More food-specific research sources
Improved recipe normalization
More export formats
Creator-specific preferences and saved styles
Additional open models
Better evaluation of AI-generated content against source recipes


License

This project is open source. See the repository for license details
