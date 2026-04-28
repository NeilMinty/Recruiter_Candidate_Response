# Closure

Closure is a lightweight tool that helps recruiters send specific, evidenced rejection emails to candidates they have already interviewed. The recruiter uploads the CV, transcript, and notes; an AI agent evaluates the candidate against the role and produces a draft rejection with a statement of evidence; the recruiter approves before anything sends.

**What this does not solve:** post-client-meeting ghosting, where the hold-up is the client not the recruiter. That is a different and harder problem that this tool does not attempt to address.

---

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server components for data fetching, API routes for back-end logic, single deploy unit |
| Database | Supabase (Postgres) | Managed Postgres with storage and EU region support. Schema is plain SQL — portable to any Postgres DB |
| AI | Anthropic Claude (claude-sonnet-4-5) | Structured JSON output, strong instruction following, DPA in place |
| Email | Resend | Simple API, reliable deliverability, easy to swap |
| File storage | Supabase Storage | Co-located with DB, avoids a third service |
| Auth | Single ADMIN_SECRET header | Sufficient for single-user MVP. See below for upgrade path |

### Swapping parts

**Email:** Replace `lib/email.ts`. The `sendEmail({ to, subject, text })` interface is the only surface area. Drop in any provider (SendGrid, Postmark, nodemailer) without touching routes or UI.

**Database:** The schema in `supabase/schema.sql` is standard Postgres. Point `NEXT_PUBLIC_SUPABASE_URL` at any Postgres-compatible host and update the client in `lib/supabase.ts`.

**Auth:** Replace the `requireAdmin` check in `lib/auth.ts` with Supabase Auth or NextAuth. No UI changes required beyond adding a login page.

---

## Setup

### 1. Supabase project

Create a Supabase project in an **EU region** (required for GDPR).

Run `supabase/schema.sql` in the Supabase SQL editor.

Create a storage bucket named `candidate-files` (private, not public) via the Supabase dashboard or:
```sql
insert into storage.buckets (id, name, public) values ('candidate-files', 'candidate-files', false);
```

### 2. Environment variables

Copy `.env.local` and fill in the values:

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server only)
ANTHROPIC_API_KEY=               # Anthropic API key
RESEND_API_KEY=                  # Resend API key
RESEND_FROM_EMAIL=               # Verified sender address in Resend
ADMIN_SECRET=                    # Any strong random string — sent as x-admin-secret header
CRON_SECRET=                     # Any strong random string — used to authenticate the purge cron
```

### 3. Run locally

```bash
npm install
npm run dev
```

The app opens at `http://localhost:3000`. All API calls require the `x-admin-secret` header. The UI reads this from `localStorage` under the key `admin_secret` — set it once in the browser console:

```js
localStorage.setItem('admin_secret', 'your-admin-secret-value')
```

### 4. Deploy to Vercel

```bash
npx vercel
```

Set all environment variables in the Vercel project settings. Add `CRON_SECRET` as well.

The `vercel.json` configures a daily cron at 03:00 UTC that hard-deletes candidates older than 90 days.

---

## GDPR

**Data stored:** candidate name, email, CV text path, transcript text path, recruiter notes, AI-generated evaluation, draft and final rejection message, audit events.

**Retention:** candidates and all associated data are hard-deleted after 90 days via the `/api/cron/purge` endpoint, triggered daily by Vercel Cron.

**Third parties:**
- **Anthropic** — candidate CV text, transcript text, recruiter notes, and job description are sent to the Anthropic API to generate the evaluation. This is covered by Anthropic's Data Processing Addendum (DPA). No data is used for model training under the DPA.
- **Resend** — candidate email address and the final rejection message text are sent to Resend for delivery.
- **Supabase** — all structured data and file storage. Use an EU region to keep data in the EU.

**No candidate personal data is logged to the console or external services** beyond Supabase and Resend.

---

## Licence

MIT
