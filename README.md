================================================================
PESAFLOW — PRODUCT OVERVIEW
Smart money management for every Kenyan
================================================================

Tagline: "Track your money. Grow your wealth. Sleep better."
(Formerly branded "FinWise".)

----------------------------------------------------------------
WHAT IS PESAFLOW?
----------------------------------------------------------------
PesaFlow is a personal-finance web app (installable as a PWA /
Android app) built specifically for Kenyans — including people who
earn a DAILY income, not just a monthly salary. It brings spending,
bills, savings goals, investments, net worth, an emergency fund,
alerts and an AI money advisor into one calm dashboard.

- KES-first, M-Pesa-friendly, built around Kenyan money habits.
- Data is cached on-device (works offline) and syncs to the cloud
  so it follows you across devices.
- Sign in with a phone number (07x or 01x, e.g. 0110…) + a 4-digit
  PIN. No bank login required.

----------------------------------------------------------------
PRICING MODEL (CURRENT)
----------------------------------------------------------------
Paid subscriptions are currently switched OFF while the user base
grows. The model is:

FREE — everything, for everyone, KES 0
Expense tracking & categorisation, Financial Advisor view,
Dashboard & monthly summary, Bills & recurring payments,
Savings goals with deadlines, Emergency fund tracker,
Net Worth calculator.

GOLD — "Coming soon" (not yet purchasable)
Advanced intelligence, launching later: Investment portfolio
tracking, Spending insights & analytics, AI Chat advisor,
Alerts & SOS system, Priority support, CSV data exports.
(Standard price when it launches: KES 599/mo.)

Only the four "Gold" tools (Investments, Insights, AI Chat, Alerts)
are gated behind a "Coming soon" wall. Everything else is free.
Silver & Platinum are legacy tiers (kept only for old accounts).

----------------------------------------------------------------
INCOME MODES (Advisor)
----------------------------------------------------------------
Users choose how they earn, and the whole plan adapts:

- Single Income   — one monthly take-home figure.
- Multiple Streams — salary + freelance + business + rent, etc.
- Daily Income    — for hustlers/daily earners: enter a daily
  amount + days worked per week. Monthly income is estimated
  as (daily × days/week × 4.33).

For DAILY earners the whole allocation view switches to a
PER-DAY breakdown ("split each day's pay"): Living, Emergency,
Savings and Investments are shown as amounts to set aside from
every working day's pay, with daily-earner tips & habits.

----------------------------------------------------------------
CORE FEATURES
----------------------------------------------------------------
- Expenses: add/EDIT/remove, categorised, with a One-off / Daily /
  Monthly frequency (daily items roll up into the monthly total by
  working days). Add form opens in a modal.
- Bills: recurring bills with Daily / Weekly / Monthly / Quarterly /
  Annually frequency, due dates, paid/overdue status. Modal add.
- Savings goals with deadlines, contributions and progress.
- Emergency fund tracker (target months, deposits/withdrawals,
  months-covered; per-day set-aside for daily earners).
- Net Worth calculator (assets vs liabilities) with inline editing.
- Investments / Savings vehicles (see next section).
- Spending insights & analytics; Dashboard with a financial-health
  score; Financial Advisor with personalised tips.
- AI Chat financial advisor (context-aware, powered by Claude).
- Alerts & SOS: trusted-contact emergency notifications + AI plans.
- Spending-habits tracker; CSV exports.
- All icons are lucide (SVG) — no emoji.

----------------------------------------------------------------
INVESTMENTS & SAVINGS VEHICLES (the "Investments" tab)
----------------------------------------------------------------
The Goals/Investments area captures how Kenyans actually save.
Add entries via a popup and pick a type:

- Money Market Fund (MMF): provider, interest rate (% p.a.),
  "locked-in vs flexible", and a COMPOUND GROWTH PROJECTION to
  the deadline (future value + interest earned).
- SACCO: which SACCO, held as Dividends or Shares, dividend rate,
  lock-in, and the same growth projection.
- Chama (merry-go-round): number of members, your payout
  position, contribution frequency (daily/weekly/monthly) and
  per-member amount. Computes the POT (per-member × members) and
  estimates the date your turn comes around.
- Insurance cover, plus standard goals (emergency, vacation,
  education, property, car, business, retirement, wedding, other).

Everything persists to the cloud and syncs across devices.

----------------------------------------------------------------
NEWSLETTER & EMAIL
----------------------------------------------------------------
- Landing-page footer captures subscriber emails into a Firestore
  "subscribers" collection (public can subscribe; list is private).
- Admins send updates from the Admin → Newsletter section, backed
  by Cloud Functions (getSubscribers / sendNewsletter) using SMTP
  (Brevo). Gated by the admin's Firebase "admin" claim — no shared
  key is entered; being signed in to the admin panel is enough.

----------------------------------------------------------------
EMAIL DELIVERABILITY & VERIFICATION — REMAINING SETUP
----------------------------------------------------------------
STATUS: Email verification is currently DISABLED. New email + PIN
sign-ups get instant access and NO confirmation link is sent. This
is a temporary measure until a real (owned) sending domain exists.

WHY: Firebase's default sender (noreply@<project>.firebaseapp.com)
and the interim Brevo "from" address (a gmail.com address) are not
domain-authenticated, so verification/reset emails land in spam.
Mailbox providers require the sending domain to publish aligned
SPF, DKIM and DMARC — which needs a domain you own (a Vercel-
provided domain is not enough).

TO FINISH (once a custom domain is purchased):
1. Authenticate the domain in Brevo (Settings -> Senders, domains,
   IPs -> Domains -> Add a domain). Add the DKIM (CNAME) and
   SPF/brevo-code (TXT) records Brevo shows into the domain's DNS.
2. Add a DMARC record at the domain's DNS (start relaxed):
   TXT  _dmarc  ->  v=DMARC1; p=none; rua=mailto:you@yourdomain
   Tighten to p=quarantine, then p=reject, once mail looks clean.
3. Point the sender at the domain: set SMTP_FROM in functions/.env
   to e.g.  PesaFlow <noreply@yourdomain>  then redeploy functions
   (env is read at deploy time):  firebase deploy --only functions
4. Re-enable verification in src/hooks/useAuth.ts:
   - resolveStatus(): uncomment the emailVerified gate (a commented
     one-liner is already there for this).
   - signUpWithEmail(): call sendVerification(cred.user) again and
     set status 'unverified' instead of 'ready'.
   The sender is already built: Cloud Function sendVerificationEmail
   generates the link (Admin SDK) and mails it via Brevo; useAuth
   already falls back to it. The "Verify your email" screen plus the
   resend/refresh flows are still present in the UI.
5. Route the other emails through the same domain too: move the
   PIN-reset email (currently Firebase's default
   sendPasswordResetEmail) to a Brevo Cloud Function the same way,
   and update the newsletter's SMTP_FROM to the authenticated
   domain.

----------------------------------------------------------------
ADMIN PANEL
----------------------------------------------------------------
A separate, hidden admin interface (route: /admin or /?__admin),
fully responsive (desktop sidebar; mobile shows the main tabs plus
a "More" sheet).

Roles: super_admin, support, finance.

Sections: Overview, Users, Payments, Subscriptions, Support Chats,
Support Cases, Reports, Newsletter, Chat Health, Audit Logs,
App Config, Settings.

Tier displays are synced to the current model: Free + Gold
("coming soon"); Silver/Platinum shown only if legacy users exist.

Admin sign-in is server-verified (Cloud Function) and mints a
Firebase token with an "admin" claim; passwords are hashed with
scrypt (migrated automatically from the old scheme on first login).

----------------------------------------------------------------
TECHNOLOGY
----------------------------------------------------------------
- Frontend: React + TypeScript + Vite. Capacitor for Android/iOS.
  Hosted on Vercel (and Firebase Hosting).
- Backend: Firebase — Cloud Firestore (data), Cloud Functions
  (Node 20, Blaze plan) for auth, payments, AI chat and email.
- AI: Anthropic Claude (AI advisor chat).
- Payments: M-Pesa (Safaricom Daraja STK Push) — wired but
  currently deferred while subscriptions are off.

----------------------------------------------------------------
AUTHENTICATION & SECURITY
----------------------------------------------------------------
- Phone (07x / 01x) + 4-digit PIN sign-in and signup.
- Server-verified auth via a Cloud Function (authWithPin) that
  mints a Firebase custom token, so Firestore rules can scope every
  user's data to only themselves (request.auth.uid). Admins get an
  "admin" claim.
- PINs hashed with salted SHA-256; admin passwords with scrypt.
  Legacy weak hashes are migrated automatically on next login.
- "Reset PIN": set a new PIN (verified by the account name) without
  wiping data. "Reset everything" remains as a last resort.
- Tightened Firestore rules (scoped per-user + admin-only sections)
  are staged in firestore.rules.locked, deployed as the final step
  after enabling Firebase Auth + granting the functions service
  account the "Service Account Token Creator" role.
- Newsletter list, audit logs and app config are server/admin-only.

----------------------------------------------------------------
TRUST & SECURITY (as messaged to users)
----------------------------------------------------------------
- PIN-protected access, KES currency support, no bank login.
- Bank-level encryption; data private by design.
- M-Pesa payments secured via the Safaricom Daraja API.

----------------------------------------------------------------
QUICK STATS (shown on landing page)
----------------------------------------------------------------
- 12,000+ active users
- KES 2.4B+ tracked across users
- 98% goal achievement rate
- 4.9 / 5 average user rating

================================================================
