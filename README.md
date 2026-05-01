# AI Learning Recommender

AI-powered educational recommendation web app. User writes natural learning request, AI parses intent, fixes noisy phrasing, infers topics/level/goal, then generates structured learning plan with Wikipedia summaries, YouTube recommendations, Open Library book suggestions, GitHub repositories, and practice ideas.

## Project Idea

Many learners know *what* they want to study but struggle with:

- where to start
- what to learn next
- which resources match their level

This project solves that by generating practical learning paths for topics like JavaScript, machine learning, React, databases, and more.

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-style component system (Radix + utility components)
- PostgreSQL
- Prisma ORM
- Next.js API Routes
- OpenAI API
- Wikipedia REST API
- YouTube Data API
- Open Library Search API
- GitHub Search API
- Serper Web Search API (optional for live docs/site search)
- Tavily Search API (optional fallback provider)
- Brave Search API (optional fallback provider)

## How AI Is Used

Backend pipeline:

1. AI intent parser converts raw prompt to structured intent JSON
2. topic summaries from Wikipedia
3. video data from YouTube
4. book suggestions from Open Library
5. open-source repositories from GitHub
6. AI-assisted web docs/site search (Serper + fallback curation)
   - includes GitHub Pages discovery (`*.github.io`) for practical tutorials
7. curated internal links

Then OpenAI generates:

- short topic explanation
- learning path and study order
- key subtopics
- grouped resources (articles/videos/practice)
- estimated timeline

If `OPENAI_API_KEY` is missing or OpenAI call fails, app returns deterministic mock AI response so demo still works.
Default model is `gpt-5-nano` (very low cost). You can override with `OPENAI_MODEL`.

## Main Features

- Home page (`/`) with:
  - AI learning prompt textarea
  - optional difficulty override
  - optional goal override
- Recommendation API:
  - `POST /api/recommendations`
- Results page (`/results/[id]`) with:
  - original vs understood request
  - detected topics, inferred level/goal, confidence
  - clarification suggestions when confidence low
  - overview
  - estimated timeline
  - per-topic tabs
  - Wikipedia summary + link
  - Docs & learning sites from web search
  - Why-picked explainability tags on web resources
  - YouTube cards (thumbnail, title, channel, link)
  - Open Library book suggestions
  - GitHub repository suggestions
  - project/practice ideas
- Saved plans page (`/saved`)
  - lists previous generated plans from PostgreSQL
- Loading, error, and empty states

## Database Model

Prisma model `LearningPlan`:

- `id`
- `skills`
- `difficulty`
- `goal`
- `overview`
- `roadmap` (JSON)
- `resources` (JSON)
- `createdAt`

## Environment Variables

Create `.env` from `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_learning_recommender?schema=public"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-nano"
YOUTUBE_API_KEY=""
GITHUB_TOKEN=""
SERPER_API_KEY=""
TAVILY_API_KEY=""
BRAVE_API_KEY=""
```

## Installation & Run

```bash
npm install
cp .env.example .env
```

Set PostgreSQL connection in `.env`, then:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

Open `http://localhost:3000`.

## API Contract

### `POST /api/recommendations`

Input:

```json
{
  "learningPrompt": "i wanna learn js for websites",
  "difficulty": "Beginner",
  "goal": "Build projects"
}
```

Backward compatible input still supported:

```json
{
  "skills": ["React", "TypeScript"]
}
```

Output:

```json
{
  "id": "plan_id",
  "recommendation": {
    "overview": "...",
    "estimatedTimeline": "...",
    "topicPlans": []
  },
  "createdAt": "..."
}
```

## Project Structure

```text
src/
  app/
    api/recommendations/route.ts
    results/[id]/page.tsx
    saved/page.tsx
    page.tsx
  components/
    learning-plan-form.tsx
    ui/*
  lib/
    prisma.ts
    plan.ts
    types.ts
    validation.ts
  services/
    aiService.ts
    intentService.ts
    githubService.ts
    openLibraryService.ts
    recommendationService.ts
    webResourceService.ts
    wikipediaService.ts
    youtubeService.ts
prisma/
  schema.prisma
```

## Future Improvements

- add auth and user-specific saved plans
- track plan progress (completed subtopics/resources)
- add resource quality scoring and deduplication
- add quizzes and adaptive path updates
- support more sources (Coursera, freeCodeCamp, official docs APIs)
