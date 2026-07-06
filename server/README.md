# Grocery App Server

Deploy this folder as the backend service on Northflank.

## Environment

Set these variables in Northflank:

```bash
DATABASE_URL=postgres://...
CORS_ORIGIN=https://your-frontend.vercel.app
PORT=8080
```

`DATABASE_URL` should point to Neon. `CORS_ORIGIN` can be a comma-separated list during testing.

## Commands

```bash
npm install
npm run migrate
npm start
```

Northflank can deploy this folder with the included `Dockerfile`. The API listens on `process.env.PORT`.

## Routes

- `GET /health`
- `GET /api/lists`
- `POST /api/lists`
- `GET /api/lists/:id`
- `PUT /api/lists/:id`
- `DELETE /api/lists/:id`
- `POST /api/lists/:id/items`
- `PUT /api/items/:id`
- `DELETE /api/items/:id`

