# Backend Setup with MongoDB Atlas

## Environment Variable Configuration

Your backend needs to be configured to use the MongoDB Atlas connection string.

### Step 1: Set the MONGO_URI Environment Variable

Update your backend's `.env` file (or Railway environment variables) with:

```
MONGO_URI=mongodb+srv://matthewasshetonsmith_db_user:<db_password>@recipeapp.nsmbuj7.mongodb.net/
```

**Replace `<db_password>` with your actual MongoDB Atlas password.**

### Step 2: Deploy Backend to Railway

Make sure your Railway deployment has this environment variable set:

1. Go to your Railway project dashboard
2. Click on your API service
3. Go to "Variables" tab
4. Add/update `MONGO_URI` with the full connection string above

### Step 3: Update API URL in Mobile App

The `.env` file in this mobile app should point to your Railway backend URL:

```
EXPO_PUBLIC_API_URL=https://your-railway-app-url.up.railway.app
```

You can find your Railway app URL in the Railway dashboard under "Domains" or "URL Preview".

### Step 4: Verify Connection

Test that your backend can connect to MongoDB Atlas by running:

```bash
curl https://your-railway-app-url.up.railway.app/health
```

You should get:
```json
{"status":"ok"}
```

### Troubleshooting

If the connection fails:

1. **Check password**: Verify the MongoDB Atlas password is correct (special characters should be URL-encoded)
2. **IP Whitelist**: In MongoDB Atlas, go to Network Access and ensure your Railway IP is whitelisted (or allow all: 0.0.0.0/0)
3. **Connection String Format**: The URI should include the database name at the end if needed

Example with database name:
```
mongodb+srv://user:password@cluster.mongodb.net/recipedb
```
