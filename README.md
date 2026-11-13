# DHANU STREAM

A premium OTT discovery and account platform built with Next.js, MongoDB, server-side TMDB metadata, and administrator-approved HTML5 playback.

## Setup

1. Install Node.js 20.9+ and MongoDB (Atlas is supported).
2. Run npm install.
3. Copy .env.example to .env.local.
4. Configure TMDB_ACCESS_TOKEN (recommended) or TMDB_API_KEY.
5. Configure MONGODB_URI.
6. Set SESSION_SECRET to a private random value with at least 32 characters.
7. Set ADMIN_EMAILS to comma-separated trusted admin email addresses.
8. Run npm run dev and open http://localhost:3000.

## Features

- Responsive cinematic homepage, movie and series discovery, search, title details, and related titles.
- Server-side TMDB requests with caching and explicit missing-credential errors.
- MongoDB-backed accounts, secure signed HTTP-only sessions, watchlists, watch history, and managed titles.
- Admin-only title management. Video sources require HTTPS, explicit authorization confirmation, and publication before playback.
- Search, watchlist, profile, admin, sports and Live TV interfaces.
- HTML5 player with keyboard shortcuts, fullscreen and playback speed.
- No simulated broadcast or unauthorized stream URLs.

## Admin

Configure ADMIN_EMAILS before registering your administrator account. Matching email addresses receive the admin role. Never list an address you do not control.

The admin form accepts an optional HTTPS media URL. Only add media that you own or are licensed to distribute, and confirm territorial rights and provider requirements. The playback endpoint checks both the authenticated session and the title's published/authorized flags before returning its source URL.

## Vercel

Import this repository, add all .env.example variables in Vercel Project Settings, set NEXT_PUBLIC_SITE_URL to your deployed HTTPS URL, select the Next.js framework preset, and deploy with Node.js 20 or newer. Provision MongoDB Atlas and allow Vercel to connect.

## Routes

/, /movies, /tv, /search, /title/[id], /watch/[id], /watchlist, /profile, /login, /register, /sports, /live, /admin.

## API

GET /api/catalog?mode=home|search|details  
GET|POST /api/auth (POST action=register|login|logout)  
GET|POST|DELETE /api/watchlist  
GET|POST /api/history  
GET|POST|PATCH|DELETE /api/admin  
GET /api/playback/[id]

## Rights and attribution

TMDB provides metadata and images, not video files or distribution rights. This product uses the TMDB API but is not endorsed or certified by TMDB. Sports feeds, live TV providers, DRM, subscriptions, subtitles and alternate audio tracks require separate legitimate provider integrations and credentials. Do not use the application to distribute unauthorized copies or bypass access controls.
