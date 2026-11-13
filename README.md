# DHANU MOVIE ADDA

A premium, mobile-first movie and series discovery platform built with React, Vite, Express and TMDB. It is a discovery product: it does not host or distribute copyrighted video files. Trailer links point to YouTube and streaming links are shown only when Watchmode returns a provider URL.

## Features
- Responsive cinematic homepage with trending, popular, now-playing, upcoming and Indian-language collections.
- Live multi-search for movies and series.
- Dedicated movie/series detail pages with synopsis, ratings, genres, cast, director, trailer and similar titles.
- Browse filters for language, genre, year, rating, type and popularity.
- Local watchlist and recently viewed titles; random discovery.
- Optional Watchmode streaming availability for India.
- Server-side TMDB proxy, short-lived cache, API rate limiting and graceful errors.
- Password-protected admin dashboard for announcements and featured movie IDs.
- SEO metadata, Open Graph tags, lazy-loaded posters and client-side routes.

## Requirements
Node.js 20+ and npm.

## Local setup
1. Clone this repository and run `npm install`.
2. Copy `.env.example` to `.env`.
3. Add your TMDB API Read Access Token as `TMDB_ACCESS_TOKEN` (server-side only).
4. Optionally add `WATCHMODE_API_KEY` for provider availability in India.
5. Set a strong `ADMIN_PASSWORD` and long random `ADMIN_SESSION_SECRET`.
6. Run `npm run dev` and open the Vite URL (normally `http://localhost:5173`). Express API runs on port 8787.

## Production build
Run `npm run build`, then `npm start`. Set `NODE_ENV=production`, `PORT`, `APP_ORIGIN`, and all secrets in your hosting dashboard.

## Render deployment
Create a Node Web Service connected to this repository. Build command: `npm install && npm run build`. Start command: `npm start`. Add all required environment variables from `.env.example` in Render's Environment tab. Add a persistent disk if admin settings must survive deploys/restarts; the default configuration is stored in `data/site-config.json`.

## Vercel
This app currently uses a persistent Express server. Deploy to Render, Railway or another Node host. Vercel requires adapting Express endpoints to Vercel Functions and adding SPA rewrites; a standard static deployment will not run the API.

## Admin
Visit `/admin`. Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` before production. API secrets remain on the server. The dashboard can update the homepage announcement and featured TMDB movie IDs.

## API routes
`GET /api/health`, `/api/home`, `/api/search?q=...`, `/api/movie/:id`, `/api/tv/:id`, `/api/discover`, `/api/genres`; admin routes: `POST /api/admin/login`, `POST /api/admin/logout`, `GET/PUT /api/admin/config`.

## Attribution
This product uses the TMDB API but is not endorsed or certified by TMDB. Movie metadata and images are provided by TMDB. Watchmode is optional; streaming links are displayed only when its provider data includes a destination URL.
