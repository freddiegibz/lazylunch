## LazyLunch Project Context (Living Doc)

This file captures the essential context needed to work on LazyLunch. Update it whenever major changes land (schema, endpoints, auth/Stripe logic, UX patterns).

## Stack & Architecture
- Next.js (Pages Router) + React
- Supabase: Auth, Postgres, RLS
- Stripe: Subscriptions (Checkout + Webhooks)
- OpenAI: Plan generation
- Styling: custom CSS in `src/styles/globals.css` (no Tailwind) [[No Tailwind preference]]

## Environment Variables (required)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET (used in `/api/stripe-webhook`)
- OPENAI_API_KEY (server only)

Never log secrets to console.

## Key App Areas
- Pages
  - `/` Home
  - `/signin`, `/signup`
  - `/dashboard`
  - `/my-meal-plans`
  - `/meal-plan/[id]` (recipe book UI, mobile-optimized single-column)
  - `/generate-meal-plan` (personalization form, presets)
  - `/recipes-tried` (view/update likes/dislikes)
  - `/manage-membership` (in-app buy/cancel/resume)
- Components
  - `src/components/DashboardNavbar.tsx`
  - `src/components/AppFeedbackWidget.tsx`

## API Routes (server)
- `POST /api/generate-meal-plan` — OpenAI-driven plan generation
- `POST /api/recipe-feedback` — like/dislike recipes (1 rating per recipe per user)
- `POST /api/app-feedback` — thumbs up/down + optional message
- `POST /api/create-checkout-session` — Stripe Checkout (subscription)
- `POST /api/subscription/cancel` — set cancel at period end
- `POST /api/subscription/resume` — resume subscription
- `POST /api/stripe-webhook` — sync subscription lifecycle to profiles

## Data Model (Postgres)
- `public.profiles` (one row per user)
  - id uuid (PK, = auth.users.id)
  - membership text: 'free' | 'basic' | 'standard' | 'premium'
  - stripe_customer_id text
  - stripe_subscription_id text
  - cancel_at_period_end boolean default false
  - current_period_end timestamptz (period boundary from Stripe)
- `public.recipe_feedback`
  - id uuid (PK)
  - user_id uuid (FK auth.users.id)
  - recipe_id text (normalized key)
  - feedback text: 'like' | 'dislike'
  - unique (user_id, recipe_id)
- `public.app_feedback`
  - id uuid (PK)
  - user_id uuid nullable (FK auth.users.id)
  - rating text: 'up' | 'down'
  - message text
  - path text
  - user_agent text
  - created_at timestamptz default now()
- `public.meal_plan_presets`
  - id uuid (PK)
  - user_id uuid (FK auth.users.id)
  - name text
  - data jsonb (saved personalization)
  - created_at timestamptz default now()

## RLS (Row-Level Security)
- profiles: enabled; select-own only (auth.uid() = id). Updates by server via service role.
- recipe_feedback: enabled; for all using/with check (auth.uid() = user_id). Unique index on (user_id, recipe_id).
- app_feedback: enabled; insert (auth) with check (auth.uid() = user_id or user_id is null), select own if desired.
- presets: enabled; for all (auth.uid() = user_id).

## Stripe Integration
- Checkout: `/api/create-checkout-session` sets metadata.supabaseUserId
- Webhook: `/api/stripe-webhook`
  - checkout.session.completed: sets `membership` + caches Stripe IDs when available
  - customer.subscription.updated/deleted: updates `membership` to active level or `free`; also syncs `stripe_*` and period fields
- In-app actions: `/api/subscription/cancel` and `/api/subscription/resume` fall back to finding subscription by email and cache IDs to profile.

## Meal Plan Personalization (form + prompt)
- Adults, Kids
- Allowed meal slots: Breakfast, Lunch, Dinner (checkbox)
- Allowed days: Mon–Sun (checkbox)
- Dietary pattern: vegetarian, vegan, pescatarian, halal, kosher, low-carb, high-protein
- Disliked ingredients: free text
- Max cook time per meal: select
- Weekly budget (existing)
- Presets: save/apply via `meal_plan_presets`
- Prompt template: `src/lib/mealplan-chatgpt-prompt.txt` references these fields

## UI/UX Conventions
- Mobile recipe book: single, vertically stacked content; pager-style navigation
- Stats on dashboard: removed "Money Saved" and "Meals This Week" (not tracked)
- "Recipes Tried" → navigates to `/recipes-tried`
- Styling: custom CSS utilities/classes in `globals.css` (no Tailwind)

## Membership (MVP)
- Offer only $5 Basic plan for purchase; Standard/Premium visually present but disabled
- Manage in-app at `/manage-membership` (buy/cancel/resume)

## Operational Notes
- Do not log secrets (Supabase keys, Stripe keys, OpenAI key)
- If dev server acts up, clear `.next/` and restart
- Middleware is minimal; CSP relaxed in dev to allow HMR

## Update Protocol (keep this doc current)
- When you change:
  - Database schema → update Data Model + RLS sections
  - API endpoints → update API Routes + Stripe Integration
  - Membership flows → update Membership + Stripe sections
  - Personalization fields → update Meal Plan Personalization + prompt file
  - Major UI patterns → update UI/UX Conventions

## Open TODOs
- Verify webhook secret in env and Supabase columns exist
- Ensure indexes exist on `stripe_customer_id`, `stripe_subscription_id` 