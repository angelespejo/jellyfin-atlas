# JellyFin Atlas 🌍

![license](https://img.shields.io/badge/license-GPL--3.0-blue)
![svelte](https://img.shields.io/badge/Svelte-5-ff3e00)
![jellyfin](https://img.shields.io/badge/Jellyfin-companion-00a4dc)

**Explore your Jellyfin library on an interactive world map.**

![Banner](./.dovenv/media/screenshots-banner.png)

**JellyFin Atlas** is a small companion app for Jellyfin. It reads your library metadata and turns it into visual views: where your movies and series were produced, how the collection grew over time, how countries and titles relate, and a searchable table with exports.
It only reads from Jellyfin, it never changes your library.

- Works with a single Jellyfin server.
- Runs alongside Jellyfin; you don't need Docker, just Node.js.
- Interface available in **English** and **Spanish**, light and dark themes.
- No analytics, no accounts: nothing leaves your network except the public Wikidata/Wikipedia lookups and the OpenStreetMap map tiles the app displays.
- You can try it with **no Jellyfin server at all**: `pnpm dev` starts with a bundled demo library.

## Index

- [What you can do](#what-you-can-do)
- [Screenshots](#screenshots)
- [Quick start](#quick-start)
  - [Requirements](#requirements)
  - [1. Create a Jellyfin API key](#1-create-a-jellyfin-api-key)
  - [2. Configure JellyFin Atlas](#2-configure-jellyfin-atlas)
  - [3. Run it](#3-run-it)
  - [Install with Docker](#install-with-docker)
- [Configuration](#configuration)
- [Using the app](#using-the-app)
  - [Views](#views)
  - [Search and filters](#search-and-filters)
  - [Keyboard shortcuts](#keyboard-shortcuts)
  - [Language and theme](#language-and-theme)
- [Development](#development)
  - [Demo library](#demo-library)
  - [Commands](#commands)
  - [Code guidelines](#code-guidelines)
- [Data sources](#data-sources)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Support the project](#support-the-project)
- [License](#license)

## What you can do

- **Map**: one marker per production country, sized by how many titles it has.
  Current and historical borders, plus filming-city dots when Wikidata knows them. Click a marker to see the country and its titles.
  ![map](./.dovenv/media/screenshots-map.png)

- **Charts**: horizontal bars for every country, and a timeline of production years. Click a bar or a year to filter the whole app.
  ![chart](./.dovenv/media/screenshots-chart.png)
- **Graph**: an interactive network of countries and their titles. Zoom, pan and drag nodes; click a country to open its panel or a dot to open a title.
  ![graph](./.dovenv/media/screenshots-graph.png)
- **Table**: every title with poster, flags, year, rating, runtime and watch state. Sort it, choose the visible columns, scroll to load more, and export exactly what you see to **CSV, JSON or PDF**.
  ![table](./.dovenv/media/screenshots-table.png)
- **Filters**: search plus year range, movie/series type, watched/unwatched, favorites, continue watching, countries and directors. Everything combines, and the current view is saved in the URL, so a filtered view can be shared or bookmarked.
  ![search](./.dovenv/media/screenshots-search.png)
- **Details**: each title opens a dialog with synopsis, cast, directors, genres, ratings and links to Jellyfin, IMDb, TMDB and Wikipedia. People chips open their own dialog with a filmography and a search box.
  ![details](./.dovenv/media/screenshots-view-detail.png)
- **Country panel**: flag, coat of arms and compact facts from Wikidata, with a Wikipedia link and the titles produced there, already narrowed by your active filters. Its title list has its own search box.

## Screenshots

Taken with the bundled demo library, dark theme, Spanish interface.

| Map                                                                                                                                                             | Chart                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <img src="./.dovenv/media/screenshots-map.png" alt="Map view: one marker per production country, sized by how many titles it has" width="100%" />               | <img src="./.dovenv/media/screenshots-chart.png" alt="Chart view: horizontal bars ranking every production country by title count" width="100%" />             |
| **Graph**                                                                                                                                                       | **Table**                                                                                                                                                      |
| <img src="./.dovenv/media/screenshots-graph.png" alt="Graph view: interactive network of countries and their titles, with pan, zoom and legend" width="100%" /> | <img src="./.dovenv/media/screenshots-table.png" alt="Table view: sortable library with posters, countries, ratings, runtime and watch state" width="100%" />  |
| **Search**                                                                                                                                                      | **Title details**                                                                                                                                              |
| <img src="./.dovenv/media/screenshots-search.png" alt="Search sidebar with the results tab and the shared title rows" width="100%" />                           | <img src="./.dovenv/media/screenshots-view-detail.png" alt="Title drawer with synopsis, directors, cast, countries, genres and external links" width="100%" /> |

## Quick start

### Requirements

- A running **Jellyfin** server with your library already scanned.
- **Node.js 22 or newer** and **pnpm** (the version is pinned in `package.json`; `corepack enable` is the easiest way to get it).
- If someone else administers your Jellyfin server, ask them for its URL and for an API key; you don't need their password.

> **Only want to try it?**
> Skip the Jellyfin steps and run `pnpm install` + `pnpm dev`.
> The app starts with a demo library on <http://localhost:5143> and never contacts a real Jellyfin server.

### 1. Create a Jellyfin API key

1. Open Jellyfin and go to **Dashboard → Administration → API Keys**
   (Administration may be under **Advanced** in older versions).
2. Click **+**, name it `JellyFin Atlas` and save.
3. Copy the generated key — you will paste it in the next step.

### 2. Configure JellyFin Atlas

```bash
git clone https://github.com/angelespejo/jellyfin-atlas.git
cd jellyfin-atlas
pnpm install
cp .env.example .env
```

Open `.env` and set at least `JELLYFIN_URL` and `JELLYFIN_API_KEY`. The sample file documents every variable.

### 3. Run it

```bash
pnpm dev-remote
```

Open <http://localhost:5143>. `pnpm dev-remote` uses your real Jellyfin server;
`pnpm dev` uses the demo library. Both use port **5143**.

For a production build:

```bash
pnpm build
pnpm start
```

Open <http://localhost:3000> (change it with `PORT`, for example `PORT=8080 pnpm start`). `pnpm start` runs `node --env-file-if-exists=.env build`, so credentials are read at runtime: you can change the URL or API key and just restart the server.

### Install with Docker

Docker needs no clone and no build tools: the image bundles the app.

**Option A — Docker Compose (recommended)**

```bash
git clone https://github.com/angelespejo/jellyfin-atlas.git
cd jellyfin-atlas
cp .env.example .env     # set JELLYFIN_URL and JELLYFIN_API_KEY
docker compose up -d --build
```

Open <http://localhost:3000>. Compose reads the credentials from `.env` and
passes them to the container at runtime. To update after changing the code:

```bash
docker compose up -d --build
```

**Option B — prebuilt image from GitHub Container Registry**

Images are published on version tags (Linux amd64/arm64):

```bash
docker run -d \
  --name jellyfin-atlas \
  --restart unless-stopped \
  -p 3000:3000 \
  -e JELLYFIN_URL=http://192.168.1.10:8096 \
  -e JELLYFIN_API_KEY=your-api-key \
  ghcr.io/angelespejo/jellyfin-atlas:latest
```

Add `-e JELLYFIN_USER_ID=<id>` to use a specific user's watch state.

**Try the demo in Docker** (no Jellyfin needed):

```bash
docker run -d -p 3000:3000 -e JELLYFIN_MOCK=true ghcr.io/angelespejo/jellyfin-atlas:latest
```

**Container notes**

- `localhost` **inside** the container is not your computer. Use the LAN IP of
  the Jellyfin machine, or `http://host.docker.internal:8096` with
  `--add-host=host.docker.internal:host-gateway` on Linux.
- If Jellyfin runs as another Compose service, put both in the same network and
  use the service name: `JELLYFIN_URL=http://jellyfin:8096`.
- Health: `GET /api/health` reports the app version, whether it runs in demo
  mode and whether Jellyfin is reachable. It is also the Docker healthcheck.
- The container listens on `PORT` (default `3000`); map it with `-p`.

## Configuration

All variables live in `.env` (copy `.env.example` to start). `.env` is
git-ignored. They are read at **runtime**: after changing one, restart the app
(`node build`, `docker compose up -d` or the dev server) — no rebuild required.

| Variable              | Required | Description                                                                                                                     |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `JELLYFIN_URL`        | Yes      | Base URL of your Jellyfin server, with port and **no trailing slash** (`http://192.168.1.10:8096`).                             |
| `JELLYFIN_PUBLIC_URL` | No       | Browser-facing URL for “Watch in Jellyfin” links. Defaults to `JELLYFIN_URL`; set it when the server uses an internal hostname. |
| `JELLYFIN_API_KEY`    | Yes      | API key created in Jellyfin. Grants full access to the server, so keep it secret.                                               |
| `JELLYFIN_USER_ID`    | No       | User whose watched/favorite/continue-watching state is used. If omitted, the first user returned by Jellyfin is used.           |
| `JELLYFIN_MOCK`       | No       | `true` serves the bundled demo library instead of Jellyfin. `pnpm dev` enables it automatically.                                |
| `PORT`                | No       | Port for the production server (`node build` / Docker). Defaults to `3000`. Ignored by the dev server.                          |

The API key is only used by the server. It is never sent to the browser.

## Using the app

### Views

Use the view switcher at the bottom of the left action rail, or the shortcuts
below. The map stays loaded while you switch to another view. Each view has a
picture in [Screenshots](#screenshots).

- **Chart** has two sub-tabs: **Bars** (countries) and **Timeline** (production
  years). Clicking a timeline bar applies that year as a filter.
- **Graph** uses a force layout for small libraries and a radial layout for
  large ones, so it stays readable.
- **Table** keeps the title column always visible; the rest can be toggled from
  the column menu. Exports use the visible columns and the current sort/filter.

### Search and filters

Open the sidebar with the search button (`Ctrl/⌘ + K`) or the filters button.
The **Results** tab searches titles; the **Filters** tab groups year, type,
status, countries and directors. Active filters are listed in the bottom bar,
which also shows how many movies, series and countries match.

The country drawer and the person filmography have their own search boxes that
only filter their lists (title, year and country). They never change the global
filters.

The current view, search, filters, table columns and the chart sub-tab are
written to the URL. That makes any state reloadable and shareable with other
people using the same instance.

### Keyboard shortcuts

On macOS the modifiers are `⌘` and `⌥`; on Windows/Linux they are `Ctrl` and
`Alt`. Shortcuts are ignored while you are typing in a field.

| Action                            | Shortcut                      |
| --------------------------------- | ----------------------------- |
| Search the library                | `Ctrl/⌘ + K`                  |
| Open the filters panel            | `Alt/⌥ + F`                   |
| Map / Chart / Graph / Table views | `Alt/⌥ + M` / `G` / `J` / `T` |
| Show or hide filming cities       | `Alt/⌥ + C`                   |
| Reset filters and search          | `Alt/⌥ + R`                   |
| Clear all filters                 | `Alt/⌥ + Backspace`           |
| Reload library data               | `Alt/⌥ + L`                   |
| Clear the local cache             | `Alt/⌥ + Shift + L`           |
| Close the open dialog or panel    | `Esc`                         |

### Language and theme

Open **Settings** (`Alt/⌥ + 2`) to choose the language (Automatic, English,
Español) and the theme (System, Light, Dark). The app remembers both choices.

When the demo library is active, the **About** dialog shows a _Demo data_
badge, so screenshots are not confused with a real library.

## Development

### Demo library

`pnpm dev` runs Vite in `mock` mode: the app uses a snapshot of a real Jellyfin
library that ships with the repo (`src/routes/api/_shared/mock/library.json`).
No server, API key or internet connection is required. The demo data covers
all views: countries, years, genres, ratings, cast, watch state, continue
watching, posters and person portraits.

- Regenerate the snapshot from **your** server:
  `pnpm mock:build` (reads `.env`, up to 200 movies + 50 series and all their
  people; watch state is synthetic and no server URL is stored).
- Posters/portraits are downloaded to `.dovenv/mock/images/` (git-ignored and
  outside `static/`, so they never enter `pnpm build` or Docker). When they are
  missing — CI, production, a fresh clone — the app draws generated SVG
  artwork instead. Add `--no-images` to skip them, `--movies=100` to shrink the
  snapshot.
- Without a snapshot image the app draws deterministic SVG artwork locally.
- In demo mode the UI never writes the library cache, so switching between
  `pnpm dev` and `pnpm dev-remote` cannot mix real and demo data.

Use `pnpm dev-remote` when you want to work against your real Jellyfin server.

### Commands

```bash
pnpm dev            # demo library, no Jellyfin needed (port 5143)
pnpm dev-remote     # real Jellyfin server from .env (port 5143)
pnpm mock:build     # regenerate the demo snapshot + images from .env
pnpm check          # Svelte/TypeScript diagnostics
pnpm lint           # oxlint
pnpm format         # Prettier (also: pnpm format:check)
pnpm test:e2e       # Playwright smoke tests against the demo library
pnpm build          # production build
pnpm start          # run the production build (loads .env)
pnpm geo:build      # regenerate static/geo/* from the open datasets (needs network)
pnpm countries:build # regenerate the compact client country index
```

Run `pnpm exec prettier --write <path>` on the files you touch. Some pre-existing
lint and formatting warnings may appear in untouched files; make sure your
change does not add new ones.

### Code guidelines

- **TypeScript and Svelte only.** State that uses runes goes in `.svelte.ts`
  files; styles use the CSS custom properties from `src/app.css` (Tailwind is
  not installed).
- Reuse the existing primitives in `src/lib/components/*`, `src/lib/ui/*` before adding new markup or one-off styles Form fields need an `id` or `name`.
- Accessibility is part of done: real buttons/links, keyboard operable dialogs, translated `aria-label`s and `prefers-reduced-motion` for any animation.
- Don't add a dependency for something that can be written by hand in a few lines; install one when it removes real complexity or verbosity, and never bypass the `pnpm audit` gate.
- UI text goes through Paraglide/inlang: add the key to both `src/locales/en.json` and `src/locales/es.json`. Never edit the generated `.dovenv/i18n` folder.
- Never render remote data with `{@html}`.
- More architecture notes live in [`AGENTS.md`](./AGENTS.md).

## Data sources

The map and the extra information come from open datasets. Please keep their
attributions if you reuse or redistribute the assets.

- **OpenStreetMap** — base map tiles ([copyright](https://www.openstreetmap.org/copyright), ODbL).
- **Natural Earth** — current country borders ([public domain](https://www.naturalearthdata.com/about/terms-of-use/)).
- **historical-basemaps** — approximate historical borders
  ([GPL-3.0](https://github.com/aourednik/historical-basemaps)).
- **Wikidata** — filming locations and country facts (CC0).
- **Wikipedia** — country descriptions and links (CC BY-SA).

Your Jellyfin metadata stays on your server. Only country/city names and IDs are
sent to Wikidata/Wikipedia, and no personal data or watch history is sent.

The demo snapshot contains titles/people metadata from a real Jellyfin library,
used only to develop this app. Its watch state is generated.

## Troubleshooting

**"Connection error" when the app loads**

- Running `pnpm dev`? It never contacts Jellyfin. Use `pnpm dev-remote` (or `JELLYFIN_MOCK=false`) to read your server.
- Check that `JELLYFIN_URL` is reachable from the machine running the app (`curl http://your-server:8096/System/Info/Public` should answer).
- Check the API key. After editing `.env`, restart the process (`pnpm start` reads it at boot); the values are read at runtime.
- Check `/api/health`: it tells you whether Jellyfin is configured/reachable.
- If Jellyfin uses HTTPS with a self-signed certificate, the app may reject it until the certificate is trusted by the system.
- In Docker, remember that `localhost` is the container itself.

**The map is empty or countries are missing**

JellyFin Atlas uses the production countries stored in Jellyfin metadata. Make
sure your library has been scanned with a metadata provider that fills them in.

**Watch state looks wrong**

Set `JELLYFIN_USER_ID` in `.env` and restart. Then reload data with
`Alt/⌥ + L` or clear the local cache with `Alt/⌥ + Shift + L`. Demo data uses
synthetic watch state and is never cached.

**Port already in use**

- Development: port 5143 is fixed by the dev server.
- Production: run `PORT=8080 pnpm start` (or change it in `.env` / Compose),
  and map the same port with Docker.

**Cities are missing for some titles**

Filming locations come from Wikidata and coverage is partial. Country markers
are always based on Jellyfin production-country metadata. The demo library uses
a small offline city sample instead of querying Wikidata.

## Contributing

Contributions, bug reports and ideas are welcome. This is a small project, so
please open an issue before starting a large change — it avoids duplicated work
and makes reviews easier.

1. **Report a bug**: include what you did, what you expected, what happened,
   your Jellyfin version, and any relevant browser console or server logs.
2. **Request a feature**: describe the problem you want to solve, not only the
   solution, and add a mock-up if you have one.
3. **Send a pull request**: fork the repository, create a branch, make the
   change focused, and describe it in the PR.

### Development setup

```bash
pnpm install
pnpm dev               # demo library, no Jellyfin needed
# or, to use your own server:
cp .env.example .env   # fill in your Jellyfin URL and API key
pnpm dev-remote
```

Continuous integration runs `pnpm check`, `pnpm build` and the Playwright smoke
tests; the Docker image is published to GHCR on version tags.

## Support the project

If JellyFin Atlas is useful to you, you can support its development on
[GitHub Sponsors](https://github.com/sponsors/angelespejo). Starring the
repository and sharing it with other Jellyfin users also helps.

## License

This project is licensed under the **GNU General Public License v3.0**.

[![Read more](https://img.shields.io/badge/Read-more-green?style=for-the-badge)](LICENSE)

## About us

PigeonPosse is a ✨ code development collective ✨ focused on creating practical and interesting tools that help developers and users enjoy a more agile and comfortable experience. Our projects cover various programming sectors and we do not have a thematic limitation in terms of projects.

### Collaborators

| Name        | Role                         | GitHub                                         |
| ----------- | ---------------------------- | ---------------------------------------------- |
| Angelo      | Author, Design & Development | [@angelespejo](https://github.com/angelespejo) |
| PigeonPosse | Collective                   | [@pigeonposse](https://github.com/pigeonposse) |
