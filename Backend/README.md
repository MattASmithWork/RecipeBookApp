# Recipe Book App Backend

A FastAPI-based REST API server for managing recipes, shopping lists, inventory, nutrition tracking, user accounts, and weight monitoring with MongoDB Atlas integration. This backend supports multi-user functionality with personalized health metrics and is designed to be deployed on Railway with Docker.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [How Docker Works](#how-docker-works)
4. [Setup From Scratch](#setup-from-scratch)
5. [Dependencies](#dependencies)
6. [Railway Deployment](#railway-deployment)
7. [API Endpoints](#api-endpoints)
8. [Environment Variables](#environment-variables)

---

## 🏗️ Architecture Overview

The backend is built with:
- **FastAPI**: Modern Python web framework for building APIs
- **MongoDB Atlas**: Cloud-hosted NoSQL database with 7 collections
- **Docker**: Containerization for consistent deployment
- **Railway**: Cloud platform for hosting
- **Uvicorn**: ASGI server for running FastAPI
- **Pydantic**: Data validation and serialization
- **slowapi**: Rate limiting for API protection

**Data Flow:**
```
Mobile App (React Native) 
    ↓ HTTP Requests
FastAPI Server (Railway)
    ↓ MongoDB Driver (pymongo)
MongoDB Atlas (Cloud Database)
    - recipes
    - shopping_list
    - items_owned
    - nutrition_logs
    - user_nutrition_goals
    - user_accounts
    - weight_tracking
```

---

## 📁 File Structure

```
Backend/
├── README.md                          # This file
└── RecipeBookAppBackend/
    ├── bin/                           # Virtual environment executables
    ├── lib/                           # Python packages
    ├── include/                       # Python headers
    ├── pyvenv.cfg                     # Virtual environment config
    └── src/                           # Main application code
        ├── app_api.py                 # Main FastAPI application (entry point)
        ├── connectToDataBase.py       # MongoDB connection handler
        ├── model_to_dict.py           # Pydantic version compatibility utility
        ├── requirements.txt           # Python dependencies
        ├── Dockerfile                 # Docker container configuration
        ├── docker-compose.yml         # Docker Compose setup (local testing)
        ├── railway.json               # Railway deployment config
        ├── BACKEND_SETUP.md           # MongoDB setup guide
        ├── RAILWAY_DEPLOYMENT.md      # Railway deployment guide
        └── __pycache__/               # Python bytecode cache
```

### Key Files Explained

**app_api.py**
- Main FastAPI application with all route handlers
- Defines endpoints for recipes, shopping lists, and inventory
- Handles CORS for cross-origin requests from mobile app
- Entry point for the web server

**connectToDataBase.py**
- Establishes connection to MongoDB Atlas
- Reads `MONGO_URI` from environment variables
- Returns database instance for use across the app
- Includes connection verification

**model_to_dict.py**
- Utility for converting Pydantic models to dictionaries
- Handles both Pydantic v1 and v2 compatibility
- Used when saving models to MongoDB

**requirements.txt**
- Lists all Python package dependencies
- Used by Docker and pip to install packages
- Version-pinned for reproducibility

**Dockerfile**
- Instructions for building the Docker container
- Defines Python 3.11 base image
- Copies code and installs dependencies
- Exposes port 8000 for the API

**railway.json** (in repo root)
- Configures Railway deployment
- Points to the Dockerfile location
- Sets build context and configuration

---

## 🐳 How Docker Works

### What is Docker?

Docker packages your application and all its dependencies into a "container" - a lightweight, standalone package that runs consistently across different environments.

### Container vs Virtual Machine

```
Virtual Machine:           Docker Container:
┌─────────────────┐       ┌─────────────────┐
│   Application   │       │   Application   │
├─────────────────┤       ├─────────────────┤
│   Guest OS      │       │   Dependencies  │
├─────────────────┤       ├─────────────────┤
│   Hypervisor    │       │   Docker Engine │
├─────────────────┤       ├─────────────────┤
│    Host OS      │       │    Host OS      │
└─────────────────┘       └─────────────────┘
   Heavy (~GBs)              Light (~MBs)
```

### Our Dockerfile Breakdown

```dockerfile
# 1. Base Image - Start with Python 3.11 on slim Linux
FROM python:3.11-slim

# 2. Environment Variables - Optimize Python behavior
ENV PYTHONDONTWRITEBYTECODE=1  # Don't create .pyc files
ENV PYTHONUNBUFFERED=1         # Print output immediately

# 3. Working Directory - Set /app as the container's working dir
WORKDIR /app

# 4. Install System Dependencies - gcc for some Python packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy and Install Python Dependencies
COPY Backend/RecipeBookAppBackend/src/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 6. Copy Application Code
COPY Backend/RecipeBookAppBackend/src /app

# 7. Expose Port - Tell Docker the app listens on port 8000
EXPOSE 8000

# 8. Start Command - Run the FastAPI server
CMD ["bash", "-c", "uvicorn app_api:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

**Why This Matters:**
- **Consistency**: Runs the same on your laptop, Railway, or any server
- **Isolation**: Dependencies don't conflict with other projects
- **Portability**: Easy to deploy anywhere that supports Docker
- **Reproducibility**: Same environment every time

### Docker Build Process

When Railway deploys your app:

1. **Reads Dockerfile**: Follows instructions step-by-step
2. **Pulls Base Image**: Downloads Python 3.11 slim image
3. **Installs Dependencies**: Runs `pip install` for all packages
4. **Copies Code**: Adds your app files to the container
5. **Creates Image**: Saves the complete package
6. **Runs Container**: Starts your app with the CMD command

---

## 🚀 Setup From Scratch

### Prerequisites

Before starting, ensure you have:
- Python 3.11 or higher
- pip (Python package manager)
- MongoDB Atlas account (free tier works)
- Git
- Railway account (optional, for deployment)

### Step 1: Clone the Repository

```bash
git clone https://github.com/MattASmithWork/RecipeBookApp.git
cd RecipeBookApp/Backend/RecipeBookAppBackend
```

### Step 2: Create Virtual Environment

Virtual environments keep project dependencies isolated:

```bash
# Create virtual environment
python3 -m venv RecipeBookAppBackend

# Activate it
# On macOS/Linux:
source RecipeBookAppBackend/bin/activate
# On Windows:
RecipeBookAppBackend\Scripts\activate

# You should see (RecipeBookAppBackend) in your terminal prompt
```

### Step 3: Install Dependencies

```bash
cd src
pip install -r requirements.txt
```

This installs:
- **fastapi**: Web framework for the API
- **uvicorn**: ASGI server to run FastAPI
- **pymongo**: MongoDB driver for Python
- **pydantic**: Data validation and serialization
- **python-dotenv**: Load environment variables from .env
- **httpx**: HTTP client for API calls
- **dnspython**: Required for MongoDB Atlas connections
- And other supporting packages

### Step 4: Set Up MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free
   - Create a free cluster (M0)

2. **Create Database User**
   - Go to "Database Access"
   - Add new database user
   - Choose "Password" authentication
   - Username: `recipe_app_user`
   - Generate a strong password
   - Grant "Read and write to any database" role

3. **Whitelist IP Address**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0)
   - This is needed for Railway to connect

4. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://<username>:<password>@cluster.mongodb.net/`

5. **Create Database**
   - Go to "Browse Collections"
   - Click "Create Database"
   - Database name: `recipeDatabase`
   - Collection name: `recipes` (you can add more later)

### Step 5: Configure Environment Variables

Create a `.env` file in the `src/` directory:

```bash
cd Backend/RecipeBookAppBackend/src
nano .env  # or use your preferred editor
```

Add this content:

```env
# MongoDB Atlas connection string
# Replace <username> and <password> with your MongoDB Atlas credentials
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/recipeDatabase?retryWrites=true&w=majority

# Optional: Set port (default is 8000)
PORT=8000
```

**Example:**
```env
MONGO_URI=mongodb+srv://recipe_app_user:MySecurePassword123@cluster0.mongodb.net/recipeDatabase?retryWrites=true&w=majority
PORT=8000
```

**Security Note:** Never commit `.env` files to Git! Add `.env` to your `.gitignore`.

### Step 6: Test the Connection

```bash
# Test database connection
python connectToDataBase.py

# Expected output:
# Pinged your deployment. You successfully connected to MongoDB!
# Successfully connected to database: recipeDatabase
```

### Step 7: Run the Server Locally

```bash
# Start the FastAPI server
uvicorn app_api:app --reload --host 0.0.0.0 --port 8000

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# INFO:     Started reloader process
# INFO:     Started server process
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
```

**Flags explained:**
- `app_api:app` - Module name and FastAPI instance
- `--reload` - Auto-restart when code changes (development only)
- `--host 0.0.0.0` - Listen on all network interfaces
- `--port 8000` - Use port 8000

### Step 8: Test the API

Open a new terminal and test the endpoints:

```bash
# Health check
curl http://localhost:8000/health
# Response: {"status":"ok"}

# Get recipes for a user
curl http://localhost:8000/recipes/testuser
# Response: {"total_count": 0, "recipes": []}

# Add a test recipe
curl -X POST http://localhost:8000/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Recipe",
    "ingredients": ["flour", "water"],
    "instructions": ["Mix ingredients", "Bake at 350F"],
    "prep_time": 10,
    "cook_time": 20,
    "servings": 4,
    "user": "testuser"
  }'
```

Or visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

---

## 📦 Dependencies

### Core Framework
```
fastapi==0.121.1          # Web framework for building APIs
uvicorn==0.38.0           # ASGI server for running FastAPI
starlette==0.49.3         # Low-level web framework (FastAPI dependency)
```

### Database
```
pymongo==4.15.4           # MongoDB driver for Python
dnspython==2.8.0          # Required for MongoDB Atlas SRV connections
```

### Data Validation
```
pydantic==2.12.4          # Data validation and serialization
pydantic_core==2.41.5     # Core functionality for Pydantic
annotated-types==0.7.0    # Type annotations for Pydantic
```

### HTTP Client
```
httpx==0.28.1             # Async HTTP client
httpcore==1.0.9           # HTTP core library
h11==0.16.0               # HTTP/1.1 protocol implementation
```

### Utilities
```
python-dotenv==1.2.1      # Load environment variables from .env
click==8.3.0              # Command-line interface creation
python-dateutil==2.9.0    # Date/time utilities
```

### Supporting Libraries
```
anyio==4.11.0             # Async I/O library
sniffio==1.3.1            # Async library detection
idna==3.11                # Internationalized domain names
typing_extensions==4.15.0 # Backport of typing features
six==1.17.0               # Python 2/3 compatibility
```

### Installing Specific Versions

If you need to update or install specific packages:

```bash
# Install single package
pip install fastapi==0.121.1

# Install all from requirements.txt
pip install -r requirements.txt

# Update all packages (use with caution)
pip install --upgrade -r requirements.txt

# Freeze current versions
pip freeze > requirements.txt
```

---

## 🚂 Railway Deployment

Railway is a cloud platform that makes deploying applications simple. It automatically detects your Dockerfile and handles the deployment.

### Why Railway?

- **Free Tier**: $5 credit per month (enough for small apps)
- **Automatic Deployments**: Push to Git, auto-deploy
- **Environment Variables**: Easy configuration management
- **Custom Domains**: Free HTTPS domains
- **Logs & Monitoring**: Built-in observability

### Deployment Process

#### Step 1: Prepare Your Repository

1. **Ensure files are committed:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Required files checklist:**
   - ✅ `Backend/RecipeBookAppBackend/src/Dockerfile`
   - ✅ `Backend/RecipeBookAppBackend/src/requirements.txt`
   - ✅ `railway.json` (in repo root)
   - ✅ `Backend/RecipeBookAppBackend/src/app_api.py`

#### Step 2: Create Railway Project

1. **Go to Railway**
   - Visit https://railway.app
   - Sign up/login with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your repositories
   - Select `RecipeBookApp` repository

3. **Railway Auto-Detection**
   - Railway reads `railway.json` from the repo root
   - It detects the Dockerfile location
   - Build context is set to repo root
   - Source directory: `Backend/RecipeBookAppBackend/src`

#### Step 3: Configure Environment Variables

1. **In Railway Dashboard:**
   - Click on your deployed service
   - Go to "Variables" tab
   - Click "Add Variable"

2. **Add MongoDB Connection:**
   ```
   Variable Name: MONGO_URI
   Value: mongodb+srv://username:password@cluster.mongodb.net/recipeDatabase
   ```
   Replace `username` and `password` with your MongoDB Atlas credentials.

3. **Railway Auto-Sets PORT:**
   - Railway automatically provides `PORT` environment variable
   - Your app uses `${PORT:-8000}` to use Railway's port or fallback to 8000

#### Step 4: Deploy

1. **Trigger Deployment**
   - Railway automatically builds and deploys
   - Watch the build logs in real-time
   - Build process:
     ```
     → Building Docker image
     → Installing dependencies
     → Copying application files
     → Starting container
     → Deployment successful ✓
     ```

2. **Monitor Deployment**
   - Check "Deployments" tab for status
   - View logs for any errors
   - Typical build time: 2-3 minutes

#### Step 5: Get Your API URL

1. **Find the Domain:**
   - In Railway dashboard, click on your service
   - Look for "Settings" → "Domains"
   - Railway provides a free domain like:
     ```
     https://recipeapp-production.up.railway.app
     ```

2. **Test Your API:**
   ```bash
   curl https://your-railway-url.up.railway.app/health
   # Expected: {"status":"ok"}
   ```

3. **View API Documentation:**
   - Visit `https://your-railway-url.up.railway.app/docs`
   - Interactive Swagger UI for testing endpoints

#### Step 6: Configure Mobile App

Update your mobile app's `.env` file:

```env
EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app
```

Then rebuild your mobile app:
```bash
cd Frontend/RecipeBookAppFrontend
npm install
npx expo start
```

### railway.json Configuration

The `railway.json` file in your repo root configures the deployment:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Backend/RecipeBookAppBackend/src/Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app_api:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Explanation:**
- `builder: DOCKERFILE` - Use Docker to build
- `dockerfilePath` - Where to find the Dockerfile
- `startCommand` - Command to run the app
- `restartPolicyType` - Auto-restart on crashes
- `restartPolicyMaxRetries` - Retry up to 10 times

### Continuous Deployment

Once set up, Railway automatically deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update API endpoint"
git push origin main

# Railway automatically:
# 1. Detects the push
# 2. Builds new Docker image
# 3. Deploys the update
# 4. Switches traffic to new version (zero downtime)
```

### Environment-Specific Deployments

You can create multiple Railway environments:

- **Production** - `main` branch
- **Staging** - `develop` branch
- **Development** - Local only

Set up branch deployments in Railway:
1. Go to Project Settings
2. Add branch trigger (e.g., `develop`)
3. Each branch gets its own URL and environment variables

### Troubleshooting Railway Deployment

**Build Fails:**
```bash
# Check Dockerfile syntax
docker build -t test-build .

# Verify requirements.txt
pip install -r requirements.txt
```

**Connection Errors:**
```bash
# Verify MONGO_URI in Railway variables
# Check MongoDB Atlas network access (allow 0.0.0.0/0)
# Check MongoDB Atlas database user credentials
```

**App Crashes on Startup:**
```bash
# Check Railway logs
# Common issues:
# - Missing MONGO_URI environment variable
# - Invalid MongoDB connection string
# - Port binding issues (ensure using $PORT)
```

**Logs Access:**
- Railway Dashboard → Your Service → "Logs" tab
- Real-time streaming logs
- Can filter by severity (info, warning, error)

---

## 🌐 API Endpoints

### Health Check
```
GET /health
Response: {"status": "ok"}
```

### Recipes

**Get all recipes for a user:**
```
GET /recipes/{user}
Response: {
  "total_count": number,
  "recipes": [...]
}
```

**Add a new recipe:**
```
POST /recipes
Body: {
  "name": string,
  "ingredients": string[],
  "instructions": string[],
  "prep_time": number,
  "cook_time": number,
  "servings": number,
  "user": string
}
```

**Delete a recipe:**
```
DELETE /recipes/{recipe_id}?user={user}
```

### GitHub Recipes

**Get curated community recipes:**
```
GET /github-recipes
Response: {
  "total_count": number,
  "recipes": [...]
}
```

### Shopping List

**Get shopping list for a user:**
```
GET /shopping-list/{user}
Response: {
  "total_count": number,
  "items": [...]
}
```

**Add item to shopping list:**
```
POST /shopping-list
Body: {
  "name": string,
  "amount": number,
  "unit": string,
  "estimatedPrice": number,
  "category": string,
  "addedBy": string
}
```

**Mark item as bought:**
```
PUT /shopping-list/{item_id}/mark-bought?user={user}
```

**Delete shopping list item:**
```
DELETE /shopping-list/{item_id}?user={user}
```

### Inventory

**Get inventory for a user:**
```
GET /inventory/{user}
Response: {
  "total_count": number,
  "items": [...]
}
```

**Add item to inventory:**
```
POST /inventory
Body: {
  "name": string,
  "amount": number,
  "unit": string,
  "lowStockThreshold": number,
  "category": string
}
```

**Consume ingredient from inventory:**
```
POST /inventory/consume-ingredient
Body: {
  "name": string,
  "amount": number,
  "unit": string
}
```

**Consume recipe (all ingredients):**
```
POST /inventory/consume-recipe
Body: {
  "recipeId": string,
  "servings": number
}
```

**Get low stock items:**
```
GET /inventory/low-stock
Response: [
  {
    "name": string,
    "amount": number,
    "unit": string,
    "lowStockThreshold": number,
    "percentRemaining": number
  }
]
```

**Update item amount:**
```
PUT /inventory/update-amount
Body: {
  "itemId": string,
  "amount": number
}
```

**Delete inventory item:**
```
DELETE /inventory/{item_id}?user={user}
```

### Nutrition Tracking

**Log a meal:**
```
POST /nutrition/log
Body: {
  "user": string,
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "mealName": string,
  "date": string (YYYY-MM-DD),
  "nutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number (optional),
    "sugar": number (optional),
    "sodium": number (optional)
  },
  "servings": number,
  "recipeId": string (optional),
  "notes": string (optional)
}
```

**Get meal logs:**
```
GET /nutrition/logs/{user}?date={YYYY-MM-DD}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
Response: [ meal logs ]
```

**Get daily nutrition summary:**
```
GET /nutrition/daily-summary/{user}/{date}
Response: {
  "date": string,
  "meals": [...],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "goals": {...},
  "progress": {...},
  "remaining": {...}
}
```

**Update meal log:**
```
PUT /nutrition/log/{id}
Body: { updated meal data }
```

**Delete meal log:**
```
DELETE /nutrition/log/{id}
```

**Set nutrition goals:**
```
POST /nutrition/goals
Body: {
  "user": string,
  "dailyCalories": number,
  "dailyProtein": number,
  "dailyCarbs": number,
  "dailyFat": number
}
```

**Get nutrition goals:**
```
GET /nutrition/goals/{user}
Response: { user's nutrition goals }
```

**Get weekly nutrition summary:**
```
GET /nutrition/weekly-summary/{user}?endDate={YYYY-MM-DD}
Response: {
  "weekStart": string,
  "weekEnd": string,
  "dailySummaries": [...],
  "weeklyAverages": {...},
  "weeklyTotals": {...}
}
```

### User Accounts

**Create account:**
```
POST /accounts/create
Body: {
  "username": string,
  "displayName": string,
  "email": string (optional),
  "age": number,
  "gender": "male" | "female",
  "weight": number (kg),
  "height": number (cm),
  "activityLevel": "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active"
}
Response: {
  "id": string,
  "message": string,
  "username": string,
  "bmr": number,
  "bmi": number,
  "bmiCategory": string,
  "recommendedDailyCalories": number
}
```

**Get account:**
```
GET /accounts/{username}
Response: { account details with health metrics }
```

**Update account:**
```
PUT /accounts/{username}
Body: { updated account data }
Response: { updated health metrics }
```

**Delete account:**
```
DELETE /accounts/{username}
Response: { message }
```

### Weight Tracking

**Log weight:**
```
POST /weight/log
Body: {
  "username": string,
  "weight": number (kg),
  "date": string (YYYY-MM-DD),
  "notes": string (optional)
}
Response: {
  "id": string,
  "message": string,
  "newBmi": number,
  "bmiCategory": string
}
```

**Get weight history:**
```
GET /weight/{username}?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
Response: [
  {
    "weight": number,
    "date": string,
    "notes": string,
    "weightChange": number,
    "weightChangePercentage": number
  }
]
```

**Delete weight entry:**
```
DELETE /weight/{id}
Response: { message }
```

**Get weight statistics:**
```
GET /weight/{username}/stats
Response: {
  "firstWeight": number,
  "currentWeight": number,
  "totalChange": number,
  "totalChangePercentage": number,
  "monthsTracked": number,
  "averageMonthlyChange": number,
  "highestWeight": number,
  "lowestWeight": number,
  "currentTrend": string,
  "entryCount": number
}
```

**Interactive Documentation:**
Visit `/docs` on your deployed API for full Swagger UI documentation.

---

## 🔒 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/recipeDatabase` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for the API server | `8000` |

### Setting Environment Variables

**Local Development (.env file):**
```env
MONGO_URI=mongodb+srv://...
PORT=8000
```

**Railway (Dashboard):**
1. Go to Project → Service → Variables
2. Add each variable
3. Railway automatically restarts the app

**Docker (command line):**
```bash
docker run -e MONGO_URI=mongodb+srv://... -e PORT=8000 myapp
```

**Verifying Variables:**
```python
import os
print(os.environ.get("MONGO_URI"))  # Should print your connection string
```

---

## 🧪 Testing

### Manual Testing

```bash
# Start the server
uvicorn app_api:app --reload

# Test health endpoint
curl http://localhost:8000/health

# Test recipes endpoint
curl http://localhost:8000/recipes/testuser
```

### Using Swagger UI

1. Start server: `uvicorn app_api:app --reload`
2. Open browser: http://localhost:8000/docs
3. Try out endpoints interactively

---

## 🐛 Common Issues

**"MONGO_URI environment variable is required"**
- Set the `MONGO_URI` environment variable
- Check your `.env` file exists and is in the correct directory

**"Failed to connect to MongoDB"**
- Verify connection string is correct
- Check MongoDB Atlas network access allows your IP
- Ensure database user has proper permissions

**"Port already in use"**
- Another process is using port 8000
- Kill the process: `lsof -ti:8000 | xargs kill -9`
- Or use a different port: `uvicorn app_api:app --port 8001`

**"Module not found"**
- Activate virtual environment
- Install dependencies: `pip install -r requirements.txt`

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Railway Documentation](https://docs.railway.app/)
- [Docker Documentation](https://docs.docker.com/)
- [Uvicorn Documentation](https://www.uvicorn.org/)

---

## 👤 Author

Matthew A. Smith
- GitHub: [@MattASmithWork](https://github.com/MattASmithWork)

---

## 📄 License

This project is part of the Recipe Book App. See the main repository for license information.
