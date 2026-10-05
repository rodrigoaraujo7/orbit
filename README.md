# projects-manager

SaaS for freelance developers: clients, projects, kanban, invoices, and paid-tool credentials — isolated per user.

Monorepo: **web** (Vite, `http://localhost:5173`) talks to **api** (Hono, `http://localhost:3100`) through the Vite proxy (`/trpc`, `/api`). **marketing** (Next.js, `http://localhost:3000`) is the public site and does not call the API.

## Prerequisites

- Node.js **22+**
- [pnpm](https://pnpm.io/installation)
- PostgreSQL (local install or Docker)

## 1. Install

```bash
pnpm install
```

## 2. Create the database

`createdb` connects as your OS username. On Debian/Ubuntu that role usually does not exist yet (`FATAL: role "…" does not exist`). Create it once, then the database:

```bash
sudo -u postgres createuser -s "$USER"
sudo -u postgres createdb -O "$USER" projects_manager
```

If the role already exists:

```bash
createdb projects_manager
```

Tables are created automatically when the API starts (`schema.sql`). No migrate command.

Docker instead of a system Postgres:

```bash
docker run --name projects-manager-pg -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=projects_manager -p 5432:5432 -d postgres:16
```

## 3. Configure env

Copy the example, then edit `apps/api/.env` (do not commit it):

```bash
cp apps/api/.env.example apps/api/.env
openssl rand -hex 32   # MASTER_KEY
```

Local Postgres: replace the `usuario@localhost` example with a **hostless** URL:

```
DATABASE_URL=postgres:///projects_manager
```

The API uses the Unix socket `/var/run/postgresql` (peer auth). `postgres.js` would otherwise connect to TCP `localhost` and fail with `password authentication failed`.

Docker Postgres:

```
DATABASE_URL=postgres://postgres@localhost:5432/projects_manager
```

| Variable              | Required           | What it is                                                                                                                                                     |
| --------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | yes                | Postgres URL. Hostless `postgres:///projects_manager` uses `/var/run/postgresql`. Do not use `usuario@localhost`.                                              |
| `BETTER_AUTH_SECRET`  | yes                | Better Auth signing secret. `openssl rand -hex 32`. Missing or the known insecure default refuses boot.                                                        |
| `MASTER_KEY`          | for stored secrets | 32 bytes: **64 hex chars** or base64. `openssl rand -hex 32`. Do not rotate without a re-encrypt path.                                                         |
| `BETTER_AUTH_URL`     | no                 | Auth base URL. Default `WEB_ORIGIN`.                                                                                                                           |
| `AUTH_TRUSTED_ORIGIN` | no                 | Extra Better Auth CSRF origin. One `http(s)` URL. Wildcards and lists are rejected.                                                                            |
| `WEB_ORIGIN`          | no                 | Frontend origin (CORS + cookies). Default `http://localhost:5173`.                                                                                             |
| `PORT`                | yes for Vite       | Must be **3100** so the web proxy hits the API. Code default is `3000` if unset.                                                                               |
| `BETTER_AUTH_API_KEY` | no                 | Better Auth dashboard only. Empty is fine; the API warns, leaves `/api/auth/dash/*` unmounted, and still starts.                                               |
| `RESEND_API_KEY`      | yes                | Resend API key. Missing or blank refuses boot and mail send with `missing env RESEND_API_KEY`.                                                                 |
| `EMAIL_FROM`          | for email          | From header. Default `Projects Manager <noreply@projectsmanager.rodrigoleite.dev>`. An unverified domain fails the send; there is no onboarding-address retry. |
| `RESEND_TEMPLATE_*`   | no                 | Template alias overrides, one per mail. See the table below.                                                                                                   |

### Email

Sign-in needs a confirmed address and a six-digit code emailed on every login; there is no authenticator app. The API sends four transactional mails through Resend, each from a hosted template published in both locales. The sender picks the template by appending the recipient's locale to the alias, so `pm-login-otp` becomes `pm-login-otp-en-us` or `pm-login-otp-pt-br`, and the locale comes from the `locale` column on `user` (set at sign-up, changed in the account menu).

| Mail                 | Alias variable                    | Default alias        | Variables                             |
| -------------------- | --------------------------------- | -------------------- | ------------------------------------- |
| Sign-in code         | `RESEND_TEMPLATE_LOGIN_OTP`       | `pm-login-otp`       | `NAME`, `CODE`, `MINUTES`             |
| Account confirmation | `RESEND_TEMPLATE_CONFIRM_ACCOUNT` | `pm-confirm-account` | `NAME`, `URL`                         |
| Password reset       | `RESEND_TEMPLATE_RESET_PASSWORD`  | `pm-reset-password`  | `NAME`, `URL`                         |
| New sign-in alert    | `RESEND_TEMPLATE_NEW_LOGIN`       | `pm-new-login`       | `NAME`, `BROWSER`, `OS`, `IP`, `WHEN` |

If `RESEND_API_KEY` is missing or blank, boot and mail send throw `missing env RESEND_API_KEY`. There is no console fallback.

If `BETTER_AUTH_SECRET` is missing or blank, boot and `/api/auth/*` return an error. There is no fallback secret.

If `AUTH_TRUSTED_ORIGIN` is set, it must be a single `http(s)` origin. Wildcards and comma-separated lists are rejected at boot.

Session cookies use the `Secure` flag when the auth origin (`BETTER_AUTH_URL`, otherwise `WEB_ORIGIN`) is HTTPS.

The hosted Better Auth dashboard (`/api/auth/dash/*`: user management, impersonation, password reset, 2FA backup codes) is admin over every tenant and this product has no RBAC, so the plugin is registered only when `BETTER_AUTH_API_KEY` holds at least 32 characters with 12 or more distinct ones. Below that the routes never exist and `https://dash.better-auth.com` is not a trusted origin. When they do exist, CORS accepts that origin on the dashboard routes only.

Web has no `.env`. It proxies to `localhost:3100`.

## 4. Run

```bash
pnpm dev
```

- App: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3100](http://localhost:3100)

Sign up with email and password on first visit, then open the confirmation link and the sign-in code from Resend.

Separate processes: `pnpm dev:web`, `pnpm dev:api`, and `pnpm dev:marketing`.

## Marketing site

`apps/marketing` is the public site for `projectsmanager.rodrigoleite.dev`. The signed-in app stays on `app.projectsmanager.rodrigoleite.dev`.

```bash
pnpm dev:marketing
```

- Site: [http://localhost:3000](http://localhost:3000) (redirects `/` to `/en` or `/pt-BR`)

`NEXT_PUBLIC_APP_URL` is where "Sign in" and "Get started" point. It defaults to `https://app.projectsmanager.rodrigoleite.dev`. "Get started" opens `/login?mode=signup`. Copy `apps/marketing/.env.example` if you need a different app origin.

On Vercel, create a project with root directory `apps/marketing`, attach `projectsmanager.rodrigoleite.dev`, and set `NEXT_PUBLIC_APP_URL` to the app origin. The app project stays a separate Vercel project rooted at `apps/web`.

## 5. GitHub Actions

Each user connects one **personal access token** under Settings → GitHub. The token is sealed with the same envelope crypto as tool secrets (`MASTER_KEY` is required). Create a classic token with `repo` for private repositories, or `public_repo` for public ones — both include reading Actions.

Projects already store `owner/repo`. Once a token is connected, the project page shows a GitHub tab with the Actions runs of a selectable branch (the default branch is preselected). Opening the page loads the latest runs once; refresh the page to load them again. The list badge uses the latest default-branch run.

## 6. Checks (optional)

```bash
pnpm --filter api test
pnpm --filter web test
pnpm --filter web check:i18n
```
