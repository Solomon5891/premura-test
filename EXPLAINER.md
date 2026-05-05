# Premura Waitlist — A Fifth Grader's Explainer

## What did we build?

Imagine Premura is opening a really cool new clubhouse, but it's not ready yet. Lots of grown-ups (people who work at companies) want to be the first inside. So we built a **sign-up sheet on the internet** — a webpage where they can put their name, work email, and where they work, and we promise to let them know when the clubhouse opens.

But it's not just a normal sign-up sheet. Ours is sneaky-smart:

1. It **remembers where each person came from** — like if they clicked a Google ad, or a tweet, or a friend's link.
2. It **looks up their company for us** so we already know if they work at a big or small place before we even talk to them.
3. It **tells our team on Slack** the second someone signs up, so we can reach out fast.
4. It **counts everyone live** on the page so visitors see "237 teams already on the waitlist" and feel like they should hurry.
5. It **stops robots** from spamming the form with fake names.
6. It **lets our team peek at all the signups** through a private dashboard — but keeps everyone else locked out.

That's the whole project.

---

## The tech stack — what each tool does, in plain English

Think of building a website like building a fancy lemonade stand. Each tool is one piece of the stand.

### 🏗️ Next.js — the lemonade stand itself
This is the **frame** of the website. It's the wood and nails. Next.js gives us pages people can visit (`/`) AND a little kitchen in the back (`/api/waitlist`) where the website can do work that visitors aren't allowed to see — like saving things to a database or talking to other companies' computers.

### 🎨 Tailwind CSS — the paint and decorations
This is what makes the page **look pretty**. Instead of writing long instructions like "make this button blue, make it round, make it big," we just write short tags like `rounded-lg bg-white px-4 py-3`. It's like using stickers instead of drawing everything by hand.

### ✏️ TypeScript — the spell-checker for our code
TypeScript is a **strict teacher** that reads our code while we write it. If we say "give me the user's email" but the user only gave us their name, TypeScript yells at us *before* the website breaks. It catches mistakes when we're still writing, not after a real person hits the form.

### 📚 Supabase — the giant filing cabinet
This is where we **store everything**. When someone signs up, their information gets saved into Supabase. It has two filing drawers we use:
- **`waitlist`** — the actual list of people who want in.
- **`events`** — a diary of every little thing that happens (someone visited the page, someone clicked the form, someone signed up). The marketing team reads this diary to figure out what's working.

Supabase has a security guard called **RLS** (Row-Level Security). The guard's job: anyone with the building key (the "anon key" in our website's code) is allowed to *put* a paper in the `waitlist` drawer, but **not** to read other people's papers. That keeps emails private — even though our key is technically visible to anyone who looks at our website's source code.

### 🕵️ Apollo.io — the company-research helper
When someone types `sarah@acme.com`, Apollo says, **"Oh, Acme! That's a 500-person software company in Texas, here's their LinkedIn."** We save that info next to Sarah's signup so our sales team knows right away whether Sarah works at a tiny startup or a giant corporation. We give Apollo only 3 seconds to answer — if it's slow, we just save the signup without the extra info instead of making the user wait forever.

### 💬 Slack — the team paper-airplane system
The second someone signs up, we throw a **paper airplane into our team's Slack chat** that says: *"🎉 New signup! Sarah from Acme. They came from a Google ad. We think this is a Big company."* The team sees it instantly and can reach out within minutes instead of hours.

### 🛡️ Cloudflare Turnstile — the bouncer at the door
There are robots on the internet that fill in forms 1,000 times a minute with fake names. Turnstile is a **bouncer** that quietly checks "are you a real human?" before letting anyone submit the form. The user usually doesn't even see it — it just works in the background.

### 🚦 Upstash Redis + Ratelimit — the "you've used your turns" counter
Even with a bouncer, sometimes one person tries to sign up too many times. Upstash keeps a tiny counter for every visitor's address. If one address tries more than **10 sign-ups in an hour**, we politely say "slow down, try again later." It's like a board game where you only get so many turns per round.

### 🍪 localStorage — the user's secret notebook
Every visitor's web browser has a tiny notebook called localStorage. We write two things in it:
1. A **random ID** so we can tell "this is the same person who visited yesterday" — without ever asking their name.
2. The **first place they came from** (their first Google search, their first tweet click). Because if they visit 5 times before signing up, we want to know what *originally* brought them, not just the last click.

### 🔐 The admin dashboard — a secret peephole for the team
All these signups are piling up in the filing cabinet. How does the team actually *look* at them?

We built a **secret back-room peephole** at `/admin`. To open the door you have to type a password — the browser shows one of those little pop-ups that asks for a username and password. Once you're in, you see:
- **Big numbers**: total signups, signups in the last 24 hours, signups in the last 7 days.
- **Breakdowns**: which sources brought the most people (Google? Twitter? word of mouth?), which campaigns, which mediums, and what size of company each signup works at.
- **A list** of the most recent 100 signups with everything Apollo told us about each one.

But wait — remember the security guard (RLS) who won't let our front-door key read the filing cabinet? The dashboard needs to read it. So we keep a **special master key** called the *service-role key* tucked away in the back room. The guard respects this master key. We never, ever hand it to a visitor's browser — only the back-room kitchen ever holds it.

A little doorman called **middleware** stands at every URL that starts with `/admin` and checks the password before letting anyone through. If the password is wrong (or missing), the doorman politely says "401 — please show me a password." Wrong password → no peeking. Simple.

---

## What happens when someone signs up — the whole story

Here's the journey from "Sarah lands on our page" to "the team gets a Slack ping," step by step:

1. **Sarah clicks a Google ad** that looks like `premura.com/?utm_source=google&utm_campaign=launch`.
2. The page loads. Our code reads the URL, grabs `utm_source=google`, and writes it in Sarah's browser notebook (localStorage).
3. The page also fires a `page_view` event into our `events` diary so the marketing team knows the ad got a click.
4. Sarah fills in: **"Sarah Chen, sarah@acme.com, Acme."**
5. The bouncer (Turnstile) silently confirms she's a real human.
6. Her browser sends everything to our back-room kitchen at `/api/waitlist`.
7. The kitchen checks: 
   - Is she over the rate limit? (No.) 
   - Did the bouncer approve her? (Yes.) 
   - Is `sarah@acme.com` a real-looking work email and not a `gmail.com`? (Yes.) 
8. We ask Apollo, "Tell me about acme.com." Apollo says, "500 employees, software, Texas."
9. We **make a unique ID** for Sarah's row (this is the bug we fixed — we don't ask Supabase to make it for us, because the security guard won't show it back to us).
10. We save Sarah into the `waitlist` drawer with all her info plus what Apollo told us.
11. We save a `waitlist_signup` event in the `events` diary.
12. We throw a Slack airplane to the team: *"🎉 New signup — Mid-Market lead — Sarah Chen, Acme."*
13. The website tells Sarah's browser: ✅ "You're on the list!"
14. Meanwhile, the live counter on the page ticks up from `236` to `237` for everyone else looking at the page right now (Supabase has a real-time feature that pushes the new number to every open browser).

The whole thing takes about **3 seconds**, mostly waiting on Apollo.

---

## Where each piece lives in the project

| What | Where | What it does |
|---|---|---|
| The landing page | `app/page.tsx` | The thing visitors see |
| The form | `components/WaitlistForm.tsx` | The sign-up form itself |
| The signup back-end | `app/api/waitlist/route.ts` | The kitchen that handles signups |
| Live counter | `components/SignupCounter.tsx` | "237 teams already on the waitlist" |
| Page view tracker | `components/PageViewTracker.tsx` | Logs every visit |
| Bot bouncer | `components/Turnstile.tsx` + `lib/turnstile.ts` | Cloudflare check |
| Filing-cabinet client | `lib/supabase-server.ts` + `lib/supabase-browser.ts` | How we talk to Supabase |
| Browser notebook | `lib/attribution.ts` | localStorage + UTM capture |
| Diary writer | `lib/track.ts` | Sends `events` rows |
| Company researcher | `lib/enrich.ts` | Apollo.io call |
| Lead size labeler | `lib/leadtier.ts` | "Big / Mid / Small company" tags |
| Paper airplane | `lib/slack.ts` | Slack webhook |
| Turn counter | `lib/ratelimit.ts` | Upstash rate limit |
| Database shape | `supabase/schema.sql` + `supabase/migrations/` | The drawer designs |
| Admin dashboard page | `app/admin/page.tsx` | The peephole — KPIs, UTM breakdowns, recent signups |
| Master-key client | `lib/supabase-admin.ts` | Server-only Supabase client (service-role) |
| Doorman | `middleware.ts` | Basic-auth gate on `/admin/*` |

---

## The secret keys (and why we don't put them in the code)

Some keys are public — like the front door key to a public library. Others are private — like the key to the staff room. We keep them in a file called `.env.local` that **never** gets uploaded to GitHub. The `.env.local.example` file shows which keys exist without revealing the real values.

| Key | What it unlocks | Public or Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Address of our filing cabinet | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Front-door key to Supabase | Public (RLS protects the data) |
| `APOLLO_API_KEY` | Lets us ask Apollo about companies | Secret |
| `SLACK_WEBHOOK_URL` | The address to throw paper airplanes at | Secret |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | The turn-counter | Secret |
| `TURNSTILE_SECRET_KEY` | Bouncer's verification key | Secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public side of the bouncer | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Master key — bypasses RLS so the admin dashboard can read everything | **Very Secret** (server-only) |
| `ADMIN_PASSWORD` | Password for the `/admin` peephole | Secret |

---

## The TL;DR for grown-ups

- **Frontend:** Next.js 14 (App Router) + Tailwind + TypeScript
- **Backend:** Next.js API routes + Supabase (Postgres) with RLS
- **Enrichment:** Apollo.io (3s timeout, fail-open)
- **Bot defense:** Cloudflare Turnstile (fail-closed) + Upstash Ratelimit (fail-open)
- **Notifications:** Slack incoming webhook (2s timeout, fail-silent)
- **Attribution:** localStorage anonymous ID + UTM capture (first-touch + last-touch) + page_view events
- **Real-time UI:** Supabase Realtime channel on `waitlist_stats`
- **Admin dashboard:** `/admin` server component, gated by Edge middleware (HTTP basic auth), reads via service-role client to bypass RLS — KPIs, UTM source/medium/campaign breakdowns, lead-tier breakdown, recent signups table

Every external service has a timeout and a "what if it's down?" plan, so a slow Apollo or a broken Slack never breaks signup itself.
