# Railway Deployment Guide

Your backend is now configured to deploy to Railway with MongoDB Atlas. Follow these steps:

## Prerequisites
- Railway account at https://railway.app
- MongoDB Atlas connection string (already configured)

## Step-by-Step Deployment

### 1. Connect Your Repository to Railway

1. Go to https://railway.app/dashboard
2. Click "Create New Project" → "Deploy from GitHub"
3. Connect your GitHub account and select this repository: `RecipeBookApp`
4. Railway will automatically detect the project (root `railway.json` points to `Backend/RecipeBookAppBackend/src` and its Dockerfile)

### 2. Configure Environment Variable

1. In Railway dashboard, go to your project
2. Click on the `api` service (or create one if it doesn't exist)
3. Click "Variables" tab
4. Add the MongoDB connection:
   - **Key:** `MONGO_URI`
   - **Value:** `mongodb+srv://<USERNAME>:<PASSWORD>@recipeapp.nsmbuj7.mongodb.net/`
   - Replace `<USERNAME>` and `<PASSWORD>` with your MongoDB Atlas credentials
5. Click "Save"

### 3. Deploy

Railway will automatically build and deploy when you push to GitHub (it will use the root `railway.json` so you do not need to set a custom path). You can also trigger a manual deployment in the Railway dashboard.

### 4. Get Your App URL

Once deployed:
1. Go to your Railway project dashboard
2. Click on the `api` service
3. Look for "Domains" or "URL Preview"
4. Copy the URL (looks like `https://recipeapp-xxxx.up.railway.app`)

### 5. Update Mobile App

Update the `.env` file in `/frontend/recipeApp-mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://your-railway-url-here.up.railway.app
```

Then run:
```bash
npm install
npm start
```

## Verification

Test your deployment with:
```bash
curl https://your-railway-url-here.up.railway.app/health
```

You should get:
```json
{"status":"ok"}
```

## Troubleshooting

### MongoDB Connection Failed
- Verify your MongoDB Atlas password is correct in the `MONGO_URI` environment variable
- Check MongoDB Atlas Network Access allows Railway's IP
- In MongoDB Atlas: Go to Network Access → Add IP → allow all `0.0.0.0/0` (or specific Railway IPs)

### API Not Responding
- Check Railway logs: Project → `api` → "Logs" tab
- Verify `MONGO_URI` variable is set
- Check database name is in the connection string

### Mobile App Can't Connect
- Verify `EXPO_PUBLIC_API_URL` matches your Railway domain exactly
- No trailing slashes
- Use https:// prefix
- Test API manually: `curl <your-url>/health`

## Architecture

```
Mobile App (Expo React Native)
        ↓
   https://your-railway-url.up.railway.app
        ↓
FastAPI Backend (Python)
        ↓
MongoDB Atlas (Cloud)
```

Your app is now ready for cloud deployment!
