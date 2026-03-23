# SecretaryOS — MVP

AI-powered compliance document platform for Indian Company Secretaries.

---

## What this is

A full Next.js web app that lets CS professionals:
- Store client company profiles (CIN, directors, DINs) once
- Generate Companies Act 2013 compliant board minutes, AGM notices, and ROC filing documents in under 60 seconds using Claude AI
- Save and view all generated documents per client
- Download documents as text files

---

## Tech stack

- **Frontend + Backend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Anthropic Claude Sonnet API
- **Hosting**: Vercel (free tier)
- **Styling**: Tailwind CSS

---

## Setup — step by step

### 1. Clone and install

```bash
cd secretaryos
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to India — Singapore or Mumbai)
3. Go to **Settings → API** and copy:
   - Project URL
   - Anon public key
   - Service role key (keep this secret)
4. Go to **SQL Editor** and paste the entire contents of `lib/schema.sql` — click Run
5. Go to **Authentication → Settings** → enable Email auth

### 3. Set up Anthropic

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add some credits (even $5 is enough for hundreds of documents)

### 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-your-key
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add all 4 environment variables in Vercel project settings
4. Click Deploy

That is it — live URL in under 2 minutes.

---

## How to use

1. **Sign up** at your deployed URL
2. **Add a client** — go to Clients → Add client → fill in company name, CIN, registered office, and directors with DINs
3. **Generate a document** — go to Generate → select client → pick document type → fill meeting details → click Generate
4. **Save and download** — save to your document history or download as a text file

---

## Folder structure

```
secretaryos/
├── app/
│   ├── api/generate/        ← Anthropic API call (server-side)
│   ├── auth/                ← Login and signup page
│   ├── dashboard/           ← Home after login
│   ├── clients/             ← Client list, add client, client detail
│   ├── documents/           ← Document list and document viewer
│   ├── generate/            ← Core document generation page
│   └── globals.css          ← Global styles including doc preview
├── components/
│   └── Navbar.tsx           ← Top navigation
├── lib/
│   ├── supabase.ts          ← Browser Supabase client
│   ├── supabase-server.ts   ← Server Supabase client
│   └── schema.sql           ← Run this in Supabase SQL editor
├── types/
│   └── index.ts             ← TypeScript types
└── .env.example             ← Copy to .env.local and fill in
```

---

## Running costs

| Service       | Free tier                          | When you need to pay       |
|---------------|------------------------------------|-----------------------------|
| Vercel        | Unlimited for personal projects    | Never for this scale        |
| Supabase      | 500MB DB, 50k MAU                  | After 50+ active users      |
| Anthropic API | Pay per use                        | ~₹120 per customer/month    |

**Break-even: 4 paying customers at ₹3,999/month covers all costs.**

---

## Sending to Suhas for feedback

Once deployed, send him this message:

> "Suhas, I have a very early version ready — would you be willing to spend 10 minutes trying it out and sharing your thoughts? Here is the link: [your-vercel-url]"

Create him a test account manually in Supabase Auth → Users → Invite user.

---

## What to build next (after first feedback)

- [ ] WhatsApp compliance reminders (Twilio or WhatsApp Business API)
- [ ] AGM notice and ROC filing document types (prompts already built)
- [ ] Compliance calendar per client
- [ ] Export as proper .docx file (docx library already in package.json)
- [ ] AI copilot panel — chat interface over all documents
