# THEWHY CONSULTING (why.ng)

Website and admin console for **THEWHY Consulting**, an affiliate of **Wale Kehinde & Co. (Chartered Accountants)**, Lagos.

- **Backend**: Node.js + Express (`server/`)
- **Frontend**: static HTML/CSS/vanilla JS in `public/`, served by Express with clean URLs
- **Data**: MySQL (recommended) with an automatic JSON-file fallback
- **Email**: optional notifications via the Brevo transactional API (or any SMTP server)

---

## Quick start

```bash
npm install
cp .env.example .env        # then edit: at least ADMIN_PASSCODE and ADMIN_SESSION_SECRET
npm run dev                 # or: npm start
```

- Website: http://localhost:3000
- Admin console: http://localhost:3000/admin

Node.js 21 or newer is required (the test script relies on Node's built-in glob support).

---

## Environment variables

All variables are documented in [`.env.example`](.env.example). Summary:

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no (3000) | HTTP port |
| `NODE_ENV` | no | `production` enables strict checks, `Secure` cookies, HSTS |
| `SITE_URL` | no (`https://why.ng`) | Base URL for sitemap, canonical/OG tags, email links |
| `CORS_ORIGINS` | no (`https://why.ng,https://www.why.ng`) | Comma-separated CORS allowlist (localhost added in development) |
| `TRUST_PROXY` | no (1) | Number of reverse proxies in front of the app |
| `ADMIN_PASSCODE` | **yes in production** | Admin console passcode (at least 12 characters, not a published default) |
| `ADMIN_SESSION_SECRET` | **yes in production** | HMAC key for admin session cookies (at least 32 characters) |
| `ADMIN_LOGIN_MAX_ATTEMPTS` | no (10) | Failed logins allowed per IP per 15 minutes |
| `FORM_RATE_LIMIT` / `API_RATE_LIMIT` | no (30 / 600) | Requests per IP per 15 minutes for public form POSTs / all `/api` |
| `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | recommended | MySQL connection |
| `DB_CONNECTION_LIMIT`, `DB_CONNECT_TIMEOUT` | no | MySQL pool tuning |
| `DB_MODE` | no | `json` forces the JSON store (dev/tests) |
| `DB_JSON_PATH` | no | JSON store location (default `server/data/runtime-db.json`) |
| `BREVO_API_KEY` | no | Brevo API key (`xkeysib-...`); preferred email transport |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | no | SMTP fallback, used only when `BREVO_API_KEY` is empty |
| `MAIL_FROM` | no | Sender address |
| `NOTIFY_TO` | no (`info@thewhy.ng`) | Where internal notifications are sent |

---

## Admin authentication

- The passcode is read **only** from `ADMIN_PASSCODE`. It is never stored in the database or returned by any API.
- In production the server **refuses to start** if `ADMIN_PASSCODE` is unset, shorter than 12 characters or a published default, or if `ADMIN_SESSION_SECRET` is missing or shorter than 32 characters.
- In development, if `ADMIN_PASSCODE` is unset a temporary random passcode is generated and printed to the console at startup.
- `POST /api/admin/verify` checks the passcode (constant-time comparison, rate limited to 10 failed attempts per 15 minutes per IP) and sets an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production). The cookie holds an HMAC-SHA256-signed token that expires after 8 hours. Changing `ADMIN_PASSCODE` or `ADMIN_SESSION_SECRET` signs out all sessions.
- `GET /api/admin/session` returns 200 when signed in and 401 otherwise. `POST /api/admin/logout` clears the cookie.
- The admin console (`public/admin.html`, `public/js/admin.js`) checks the session on load and shows the sign-in screen on any 401.

### Admin console tabs

Blog & Insights (create, edit, publish or unpublish, delete, including drafts), Bookings (search, status filter, status change, delete, CSV export), Inquiries & Applications, Contact Messages (mark responded, delete), Newsletter subscribers, Product Launch page text, Website text & banner, and the Media library.

### Admin stylesheet

`public/css/admin.css` is a prebuilt Tailwind CSS v3 stylesheet (no CDN at runtime). After adding new Tailwind classes to `admin.html` or `admin.js`, regenerate it with a one-off CLI run (no build dependency is installed) using this theme:

```bash
# tailwind.config.js: content = ['public/admin.html', 'public/js/admin.js'],
# theme.extend.colors brandOrange #EF4C20, brandOrangeDark #D83D16, brandGold #F8C638,
# brandBlue #356FB7, brandDark #0F172A, brandNavy #16202D, brandSlate #334155, brandLight #F8FAFC;
# fontFamily sans ['DM Sans', ...], heading ['Manrope', 'DM Sans', ...]
npx tailwindcss@3 -c tailwind.config.js -i input.css -o public/css/admin.css --minify
```

Then bump the `?v=` query on the `admin.css` / `admin.js` links in `admin.html` (static assets are cached for 7 days).

---

## Persistence

`server/db/db.js` picks one storage mode at startup:

- **MySQL** when reachable. All reads and writes (bookings, contact messages, inquiries, insights, newsletter subscribers, site settings, launch campaign) go to MySQL. Tables and missing columns are created automatically; `npm run migrate` does the same and exits non-zero if MySQL is unreachable.
- **JSON fallback** when MySQL is unreachable or `DB_MODE=json`. Data is written atomically (temp file + rename) to `server/data/runtime-db.json`, which is gitignored and seeded from `server/db/seedData.js` on first run. In production this mode logs a warning, because hosts with ephemeral disks lose the file on redeploy.

Static marketing content (services, industries, team, testimonials, case studies, FAQs) is read-only and lives in `server/db/seedData.js`.

Records use `crypto.randomUUID()` ids. Bookings, contact messages and inquiries also get a human-friendly reference such as `WHY-2026-7KQ4XM2PZD` (10 random characters).

---

## Email notifications

When email is configured (`BREVO_API_KEY`, or SMTP as a fallback), each new booking, contact message, inquiry or launch/bootcamp application sends:

1. an internal notification to `NOTIFY_TO`, and
2. a short branded confirmation to the client (including the booking reference).

Emails are sent in the background; a mail failure is logged and never fails the HTTP request. All user-supplied values are HTML-escaped. If neither `BREVO_API_KEY` nor `SMTP_HOST` is set, the server logs `[MAIL] Email not configured, skipping` once and sends nothing.

---

## Security and SEO

- Helmet with a CSP allowlist (self, cdnjs, Google Fonts, OpenStreetMap/Google frames; `'unsafe-inline'` scripts are still allowed because pages use inline scripts), CORS allowlist, gzip compression, JSON/form bodies limited to 20 KB (article bodies up to 300 KB for admins).
- Server-side validation for every public form (field allowlist, email/phone formats, max lengths, trimming); unknown or oversized input gets a 400 JSON error. Status values are whitelisted.
- CSV export neutralises spreadsheet formulas.
- `X-Robots-Tag: noindex, nofollow` on `/admin` and `/api/*`; `public/robots.txt` disallows them.
- `/sitemap.xml` is generated from the clean routes plus published insight articles (`public/sitemap.xml` is a static fallback copy).
- `/*.html` URLs with a clean route, `/our-team`, `/who-we-serve`, `/product-launch` and `/article?slug=` 301-redirect to their canonical URLs.
- `/insights/:slug` is served with article-specific `<title>`, description, canonical, Open Graph, Twitter and JSON-LD `Article` tags; unknown or unpublished slugs return 404.
- Static cache: 7 days for `/assets`, `/css`, `/js` (not immutable); HTML is `no-cache`.

---

## API overview

| Method | Endpoint | Access |
|---|---|---|
| `GET` | `/api/health` | public |
| `GET` | `/api/services`, `/api/industries`, `/api/team`, `/api/testimonials`, `/api/case-studies`, `/api/faqs`, `/api/launch` | public |
| `GET` | `/api/settings` | public (allowlisted fields only) |
| `POST` | `/api/bookings` | public (validated, rate limited) |
| `GET` | `/api/bookings/:id/calendar.ics` | public (`:id` is the booking UUID or reference) |
| `GET` / `PATCH` / `DELETE` | `/api/bookings`, `/api/bookings/:id` | admin |
| `POST` | `/api/contact` | public |
| `GET` / `PATCH` / `DELETE` | `/api/contact`, `/api/contact/:id` | admin |
| `POST` | `/api/inquiries` | public |
| `GET` / `PATCH` / `DELETE` | `/api/inquiries`, `/api/inquiries/:id[/status]` | admin |
| `POST` | `/api/newsletter` (alias `/api/stats/newsletter`) | public |
| `GET` | `/api/insights`, `/api/insights/:slug` | public (published only) |
| `POST` / `PUT` / `DELETE` | `/api/insights`, `/api/insights/:slug` | admin |
| `POST` | `/api/admin/verify`, `/api/admin/logout`; `GET /api/admin/session` | public |
| `GET` / `PUT` / `DELETE` | other `/api/admin/*` (content, settings, launch, media, insights, newsletter) | admin |
| `GET` | `/api/stats`, `/api/stats/export/bookings.csv` | admin |

---

## Tests

```bash
npm test
```

Uses Node's built-in test runner (`node:test`) with `supertest`. Tests load the Express app without listening, force `DB_MODE=json` with a throwaway store in the OS temp directory, and never touch MySQL, Brevo/SMTP or the real data file. They cover auth (cookie flags, tampering, logout, production start-up refusal), protected routes, validation, CSV escaping, XSS-safe meta rendering, drafts, newsletter deduplication, robots/sitemap, redirects and cache headers.
