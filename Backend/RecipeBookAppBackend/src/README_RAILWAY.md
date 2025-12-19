Railway deployment steps for RecipeApp (FastAPI + MongoDB)

Prerequisites
- A Railway account: https://railway.app
- Git repository with this project pushed to GitHub (or GitLab)
- Your MongoDB connection string (Atlas or other) — keep credentials secret

Quick options
- Deploy via Railway web UI (recommended for first-time): connect your repo, select the `backend/` folder, and let Railway build using the existing `Dockerfile`.
- Deploy via Railway CLI: use `railway init` and `railway up` (see steps below).

Web UI deploy (recommended)
1. Push your code to GitHub.
2. Login to Railway and click New Project → Deploy from GitHub.
3. Select your repository and the branch to deploy.
4. When Railway asks, set build path to `backend/` (so it uses `backend/Dockerfile`).
5. Add an environment variable/secret named `MONGO_URI` with your Atlas or Mongo connection string.
6. Start deploy. Railway will build the Docker image and give you a public URL.

Railway CLI deploy
1. Install Railway CLI (official installer):
```bash
curl -sSL https://railway.app/install.sh | sh
```
2. Login:
```bash
railway login
```
3. From the project root initialize Railway (this will guide you):
```bash
cd backend
railway init
```
4. Link or create a new project and then set your secret:
```bash
railway variables set MONGO_URI "your-connection-string"
```
5. Deploy (Railway will detect Dockerfile and build):
```bash
railway up --detach
```
6. Railway will print the public URL once the build and deploy finish.

Notes & recommendations
- Ensure you DO NOT commit real credentials. Use `backend/.env.example` as a template and set the actual `MONGO_URI` in Railway's secrets.
- The repo already contains a `backend/Dockerfile`. Railway will use it to build the service.
- I added a `/health` endpoint at `/health` that pings MongoDB; configure Railway health checks to use it if desired.
- If you prefer to use Railway's managed PostgreSQL/Mongo services, you can create them in the Railway project and set the appropriate `MONGO_URI`.

Important change in code: `MONGO_URI` is now required
- The application now requires `MONGO_URI` to be set in the environment. There is no fallback to any hard-coded connection string. This prevents accidental credential leaks and makes deployments safer.
- Before deploying, make sure to add the `MONGO_URI` secret in Railway (or your chosen host).

Railway CLI quick commands (exact)
1. Install Railway CLI:
```bash
curl -sSL https://railway.app/install.sh | sh
```
2. Login interactively:
```bash
railway login
```
3. From the `backend/` directory initialize or link your project:
```bash
cd backend
railway init
```
4. Set the Mongo URI as a secret (replace with your real connection string):
```bash
railway variables set MONGO_URI "your-mongo-connection-string"
```
5. Deploy (builds from `Dockerfile` in `backend/`):
```bash
railway up --detach
```

Notes about running the CLI here
- I cannot run the Railway CLI to perform an authenticated deploy without your Railway credentials (interactive login) or an API token you provide. If you want me to run the deploy from this environment, either:
	- Log in interactively when prompted (I can run the commands for you if you will complete the login step), or
	- Provide a Railway API token and confirm you want me to use it here (only do that if you are comfortable sharing a deploy token).


Troubleshooting
- Build fails: check Dockerfile logs in Railway build output. Fix missing system packages or dependency versions in `backend/requirements.txt`.
- DB connection issues: verify `MONGO_URI` is correct and reachable from Railway (Atlas will usually allow connections from Railway).
