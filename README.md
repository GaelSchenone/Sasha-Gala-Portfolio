# Sasha Gala — Portfolio

A full-stack portfolio and content-management application for a graphic designer.
It pairs a React single-page application with a Flask REST API, a relational
database for content, Google-based admin authentication, and Cloudinary for
media storage. Authenticated editors manage projects, an image archive, the
about page, site typography, and the browser tab icon entirely from a built-in
admin panel — no redeploys required to change content.

## Overview

The public site renders published projects with custom, per-project gallery
layouts and an inertia-based auto-scrolling interface. The admin panel (gated by
Google OAuth and a server-issued JWT) exposes CRUD for projects and images, a
drag-and-drop archive, editable site metadata, and live typography/animation
settings persisted as JSON in the database and applied at runtime via CSS
variables.

## Tech stack

**Frontend**
- React 19, Vite 7, React Router 7
- Framer Motion (UI animation)
- `@react-oauth/google` (OAuth client)
- Custom hooks for inertial scrolling and viewport locking
- Client-side image compression (Canvas) before upload
- Served in production by nginx

**Backend**
- Python 3.12, Flask 3
- `mysql-connector-python` with a connection pool
- Gunicorn (WSGI)
- PyJWT (session tokens), `google-auth` (ID-token verification)
- Cloudinary SDK (image upload/transform/delete)
- Flask-CORS

**Data and infrastructure**
- MySQL / MariaDB
- Cloudinary (media CDN and transformations)
- Docker images for both services; Dokploy for deployment

## Architecture

```
Browser ──HTTPS──> nginx (static SPA)            sashagala.com.ar
   │
   └──/api──────> Flask REST API (gunicorn)      sasha-api.aguilucho.ar
                     │
                     ├── MySQL (projects, images, site_config, users)
                     └── Cloudinary (image storage and delivery)
```

- The SPA talks to the API over a versionless `/api` surface. In development a
  Vite dev-server proxy forwards `/api` and `/imgs` to a configurable target
  (`VITE_PROXY_TARGET`), avoiding CORS while iterating.
- Admin auth: the client obtains a Google ID token, the API verifies it
  (`google-auth`), checks the email against an allow-list, and issues a 24h
  HS256 JWT used as a bearer token for write endpoints.
- Media: images are uploaded to Cloudinary server-side; only the resulting
  secure URL and public ID are stored in the database. Removing a project or a
  layout slot deletes the orphaned Cloudinary asset.
- Project layouts are stored as a `layout_json` document (sections → rows →
  slots, each slot carrying `src`, `fit`, `position`, and height), letting the
  editor compose arbitrary multi-column galleries per project.

## Features

- Per-project, JSON-driven gallery layouts (multi-column, configurable fit,
  position, and height) built in a visual editor.
- Inertia scrolling (wheel, drag, touch) with auto-scroll, mouse-vs-trackpad
  handling, and a single reusable hook shared across carousels.
- Elastic project sidebar that sizes to the longest title without layout jitter.
- Admin panel: projects (draft/published/archived), drag-and-drop archive with
  ordering, about-page content, links, and a design panel for typography and
  scroll speed.
- Configurable browser tab icon (favicon) uploaded from the panel and applied
  at runtime.
- Runtime theming: typography and animation settings stored in `site_config`
  and applied through CSS custom properties, with a localStorage cache to avoid
  first-paint flashes and a single deduplicated config request per session.
- Client-side image compression before upload to stay within media limits.

## Project structure

```
.
├── client-react/            React + Vite SPA
│   ├── src/
│   │   ├── pages/           Home, View, Work, Archive, About, Login, Admin, ...
│   │   ├── componentes/     Header, ImageViewer, TypographyProvider, ...
│   │   ├── hooks/           useInertiaScroll, useLockPageScroll, ...
│   │   └── services/        api.js (REST client, auth, upload, caching)
│   ├── nginx.conf           Production static serving
│   └── Dockerfile
├── server-flask/            Flask REST API
│   ├── app/
│   │   ├── routes/          api.py (content), auth.py (Google OAuth + JWT)
│   │   ├── config.py        Env-driven configuration
│   │   └── database.py      MySQL pool and query helpers
│   ├── init_db.sql          Schema and seed
│   ├── requirements.txt
│   └── wsgi.py
├── Dockerfile               Backend image
└── docker-compose.yml
```

## Getting started

### Prerequisites

- Node.js 20+ and a package manager (pnpm recommended)
- Python 3.12
- A MySQL/MariaDB instance
- A Cloudinary account
- A Google OAuth client ID

### Backend

```bash
cd server-flask
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# create the schema
mysql -u <user> -p <database> < init_db.sql

# configure (see Environment variables) and run
python wsgi.py                      # dev
# or: gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 3 --threads 4 --timeout 300
```

### Frontend

```bash
cd client-react
pnpm install
pnpm dev          # http://localhost:5173
```

The Vite dev server proxies `/api` to `VITE_PROXY_TARGET` (default
`http://localhost:5000`). Point it at a remote API for frontend-only work:

```bash
# client-react/.env.local
VITE_API_URL=/api
VITE_PROXY_TARGET=https://your-api.example.com
```

## Environment variables

### Backend (`server-flask/.env`)

| Variable | Description |
| --- | --- |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | MySQL connection |
| `SECRET_KEY` | Flask secret (required in production) |
| `JWT_SECRET` | HMAC key for session tokens (required in production) |
| `GOOGLE_CLIENT_ID` | OAuth client ID used to verify ID tokens |
| `ADMIN_EMAILS` | Comma-separated allow-list of admin emails |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials |
| `DEBUG` | `True`/`False` |

### Frontend (`client-react/.env`)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL (e.g. `/api` with a proxy, or an absolute URL) |
| `VITE_GOOGLE_CLIENT_ID` | OAuth client ID |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `VITE_PROXY_TARGET` | Dev-only proxy target for `/api` and `/imgs` |

## API

All write endpoints require an `Authorization: Bearer <jwt>` header.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/google-login` | Verify a Google ID token, return a session JWT |
| GET | `/api/projects` | List projects (filter by `status`, `type`) |
| GET | `/api/projects/<id>` · `/api/projects/name/<name>` | Single project with images |
| POST | `/api/add-project` | Create a project |
| PUT | `/api/projects/<id>` | Update a project and its layout |
| DELETE | `/api/projects/<id>` | Delete a project and its Cloudinary assets |
| POST | `/api/upload` | Upload a project image to Cloudinary |
| DELETE | `/api/images/<id>` | Delete an image |
| GET · POST | `/api/archive` | List / upload archive images |
| PUT | `/api/archive/reorder` | Persist archive ordering |
| GET · PUT | `/api/site-config` | Read / update site configuration |
| POST | `/api/upload-asset` | Upload a standalone asset (e.g. favicon) |
| GET | `/health` | Liveness and DB status |

## Deployment

Both services build as Docker images and deploy on Dokploy. The frontend image
builds the SPA and serves it with nginx; the backend image runs Gunicorn. Build
arguments and runtime environment variables (API URL, Cloudinary, OAuth, CORS
origins, database) are injected per environment.

## License

See [LICENSE](LICENSE).
