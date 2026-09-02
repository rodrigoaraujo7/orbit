# projects-manager

SaaS for freelance developers: clients, projects, kanban, invoices, and paid-tool credentials — isolated per user.

Monorepo: **web** (Vite, `http://localhost:5173`) talks to **api** (Hono, `http://localhost:3100`) through the Vite proxy (`/trpc`, `/api`).

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

| Variable                  | Required           | What it is                                                                                                        |
| ------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | yes                | Postgres URL. Hostless `postgres:///projects_manager` uses `/var/run/postgresql`. Do not use `usuario@localhost`. |
| `MASTER_KEY`              | for stored secrets | 32 bytes: **64 hex chars** or base64. `openssl rand -hex 32`. Do not rotate without a re-encrypt path.            |
| `BETTER_AUTH_URL`         | no                 | Auth base URL. Default `WEB_ORIGIN`.                                                                              |
| `WEB_ORIGIN`              | no                 | Frontend origin (CORS + cookies). Default `http://localhost:5173`.                                                |
| `PORT`                    | yes for Vite       | Must be **3100** so the web proxy hits the API. Code default is `3000` if unset.                                  |
| `BETTER_AUTH_API_KEY`     | no                 | Better Auth dashboard only. Empty is fine; the API warns and still starts.                                        |
| `RESEND_API_KEY`          | for email          | Resend API key. Leave empty until you send mail.                                                                  |
| `EMAIL_FROM`              | for email          | From header, e.g. `Projects Manager <noreply@example.com>`.                                                       |
| `RESEND_TEMPLATE_CONFIRM` | for email          | Resend template id for confirmation mail.                                                                         |
| `RESEND_TEMPLATE_LOGIN`   | for email          | Resend template id for login mail.                                                                                |

`BETTER_AUTH_SECRET` is not in `.env.example`. In development the API uses a built-in secret; set a 32-byte hex value (`openssl rand -hex 32`) before production.

Web has no `.env`. It proxies to `localhost:3100`.

## 4. Run

```bash
pnpm dev
```

- App: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3100](http://localhost:3100)

Sign up with email and password on first visit.

Separate processes: `pnpm dev:web` and `pnpm dev:api`.

## 5. GitHub Actions

Each user connects one **personal access token** under Settings → GitHub. The token is sealed with the same envelope crypto as tool secrets (`MASTER_KEY` is required). Create a classic token with `repo` for private repositories, or `public_repo` for public ones — both include reading Actions.

Projects already store `owner/repo`. Once a token is connected, the project page shows a GitHub tab with the Actions runs of a selectable branch (the default branch is preselected). The list badge uses the latest default-branch run.

Runs update in real time:

- Open the project page: the API keeps an SSE stream and polls GitHub for that branch while the tab is open.
- Optional webhook: copy the payload URL and secret from Settings and add a repository webhook with the `workflow_run` event. Deliveries update the badge and the table instantly. For a local install, set `PUBLIC_API_URL` to a public tunnel of the API.

## 6. Checks (optional)

```bash
pnpm --filter api test
pnpm --filter web test
pnpm --filter web check:i18n
```
