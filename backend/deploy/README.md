# Deploy CEMTN

- Frontend: Vercel, root directory `frontend`, framework Vite, output `dist`.
- Frontend environment: `VITE_API_URL` must contain the Render HTTPS API URL before building.
- Backend: Render blueprint at the repository root, free Node service in Ohio.
- Database: dedicated Supabase CEMTN project `bfcksfgespvtuostxbrb` (Ohio).

`bootstrap.sql` initializes an empty database once. It has already been applied to the CEMTN Supabase project. Do not run it on an existing database. RLS is enabled and the Supabase anonymous/authenticated API roles cannot access school data. Access is through the backend's authenticated and authorized endpoints.

Configure `DATABASE_URL` using the project's **Connect > Session pooler** connection string (IPv4, port 5432), with TLS enabled and a backend-only credential. Copy the actual pooler hostname from the dashboard; do not derive it from the region. Never commit the credential. Configure `CORS_ORIGINS` with the exact Vercel HTTPS origin.

The backend must return `{ "status": "ok", "database": "up" }` from `/health` before considering the deployment complete. Verify protected endpoints reject unauthenticated requests and student registration remains pending director approval.

Create the first director using `npm run admin:create` from the backend with the database environment configured. Use the actual intended director's CPF; do not seed a publicly known admin password. No school accounts or existing local data have been migrated by the bootstrap.
