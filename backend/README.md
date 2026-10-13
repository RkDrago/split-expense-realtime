# Backend

The API and Socket.IO server require MongoDB.

```bash
cp .env.example .env
npm install
npm start
```

Required environment variables:

- `MONGODB_URI`: MongoDB connection string.
- `PORT`: HTTP port, default `3001`.
- `FRONTEND_URL` or comma-separated `FRONTEND_URLS`: allowed browser origins.

Health endpoints:

- `GET /api/health`: liveness and current database state.
- `GET /api/ready`: returns `503` until MongoDB is connected.

Socket clients join a group with `join(groupId)`. The server verifies that the
group exists before placing the client in its room. Expense and settlement
changes emit both a resource-specific event and `group:{id}:updated`.
