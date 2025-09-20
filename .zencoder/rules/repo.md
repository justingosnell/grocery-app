# Repository Overview

- **Name**: grocery-list-creator
- **Root**: /Users/macbook/Music/grocery-app-main
- **Primary stack**:
  - Frontend: Vanilla HTML/CSS/JS with Tailwind via CDN
  - Backend: Node.js (Express), Socket.IO, MongoDB (Mongoose)
- **Entry points**:
  - Frontend: index.html -> script.js
  - Backend server: server.js (ESM)
- **PWA**: Disabled. Manifest removed, theme-color removed, and service workers removed. No registrations in HTML/JS.

## Scripts
- **dev**: tailwindcss -i ./src/input.css -o ./dist/output.css --watch
- **build**: tailwindcss -i ./src/input.css -o ./dist/output.css --minify

Note: src/ and dist/ directories are not present in the repo; Tailwind is mainly consumed from CDN in index.html. Secondary styles exist as secondary_final.css, style.css, style_updated.css.

## Backend Server (server.js)
- **Port**: 4000 (default via PORT env)
- **Mongo**: MONGODB_URI env (defaults to mongodb://127.0.0.1:27017/grocery_app)
- **Auth**: JWT (jsonwebtoken) with bcryptjs for passwords
- **APIs**:
  - GET /health
  - POST /api/auth/register
  - POST /api/auth/login
  - GET /api/lists (auth)
  - GET /api/lists/:name (auth)
  - POST /api/lists (auth)
  - PUT /api/lists/:name (auth)
  - DELETE /api/lists/:name (auth)
- **Realtime**: Socket.IO events for list create/update/delete

## Frontend Notes (script.js)
- Uses window.API_BASE set in index.html (http://localhost:4000 on localhost)
- Handles UI, saved lists, auth UI toggles, and Socket.IO client
- No service worker registration present

## Assets / Config
- tailwind.config.js present
- icons/ contains placeholder icons used previously by manifest

## Known Gaps / TODOs
- Tailwind build scripts reference src/dist paths that aren’t in repo

## Recent Changes
- 2025-09-19: Removed service worker files (service-worker.js, sw.js); removed manifest.json and browserconfig.xml; disabled PWA in index.html; added placeholder icons; ensured auth forms are present in modals.