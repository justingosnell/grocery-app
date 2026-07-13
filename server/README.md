# Grocery App Server

Deploy this folder as the backend service on Northflank.

## Environment

Set these variables in Northflank:

```bash
DATABASE_URL=postgres://...
CORS_ORIGIN=https://your-frontend.vercel.app
CLERK_SECRET_KEY=sk_test_...
CLERK_AUTHORIZED_PARTIES=https://your-frontend.vercel.app
SPOONACULAR_API_KEY=...
PORT=8080
```

`DATABASE_URL` should point to Neon. `CORS_ORIGIN` can be a comma-separated list during testing. `CLERK_AUTHORIZED_PARTIES` is optional but recommended; use your Vercel frontend origin. `SPOONACULAR_API_KEY` is optional, but enables the higher-quality automatic image lookup. Results are cached in Postgres to reduce API usage.

## Commands

```bash
npm install
npm run migrate
npm start
```

Northflank can deploy this folder with the included `Dockerfile`. The API listens on `process.env.PORT`.

## Routes

- `GET /health`
- `GET /api/images/resolve?name=milk&category=Dairy`
- `POST /api/images/resolve`
- `GET /api/lists`
- `POST /api/lists`
- `GET /api/lists/:id`
- `PUT /api/lists/:id`
- `DELETE /api/lists/:id`
- `POST /api/lists/:id/items`
- `PUT /api/items/:id`
- `DELETE /api/items/:id`
