# Recipe Book App

A full-stack mobile application for managing recipes, shopping lists, and inventory with AI-powered features. Built with React Native (Expo) for the frontend and FastAPI (Python) for the backend, with MongoDB Atlas for data persistence and Railway for cloud deployment.

---

## 📱 What is Recipe Book App?

Recipe Book App is a comprehensive kitchen management solution that helps you:

- **Manage Your Recipes**: Store and organize your personal recipe collection with prep time, cook time, servings, and ingredients
- **Browse Community Recipes**: Access a curated database of recipes from the GitHub community with nutritional information
- **Create Shopping Lists**: Build shopping lists with unit-based quantity tracking and automatic price estimation
- **Track Inventory**: Manage your pantry and kitchen inventory with unit-based tracking (kg, L, ml, etc.), consumption monitoring, and low stock alerts
- **Nutrition & Calorie Tracking**: Log meals with detailed nutritional information, track daily/weekly intake, and monitor progress against goals
- **User Account Management**: Create personal profiles with health metrics (BMR, BMI) and get personalized calorie recommendations
- **Weight Tracking**: Monitor weight changes over time with monthly measurements, trend analysis, and statistics
- **AI-Powered Features**: 
  - Duplicate recipe detection using ingredient similarity analysis
  - Automatic calorie estimation based on similar recipes
  - Smart grocery price estimation for budget planning
- **Multi-User Support**: Full account system supporting multiple users (Matt and Niccy) with individual health profiles and tracking
- **Cross-Device Sync**: All data syncs via MongoDB Atlas for access across multiple devices

---

## 🏗️ Architecture

The application follows a modern full-stack architecture:

```
┌─────────────────────────────────────────┐
│   Mobile App (React Native + Expo)     │
│   - iOS, Android, Web support           │
│   - TypeScript for type safety          │
│   - Zustand for state management        │
└──────────────┬──────────────────────────┘
               │ HTTP/REST API
               ↓
┌─────────────────────────────────────────┐
│   Backend API (FastAPI + Python)        │
│   - RESTful endpoints                   │
│   - Pydantic data validation            │
│   - Deployed on Railway                 │
└──────────────┬──────────────────────────┘
               │ MongoDB Driver
               ↓
┌─────────────────────────────────────────┐
│   Database (MongoDB Atlas)              │
│   - Cloud-hosted NoSQL database         │
│   - Collections: recipes, shopping,     │
│     inventory, nutrition_logs,          │
│     user_accounts, weight_tracking      │
└─────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 📖 Recipe Management
- **Personal Recipes**: Add, view, and manage your own recipes
- **Time Filtering**: Quick filters for recipes by total cooking time (15, 30, 45, 60+ minutes)
- **AI Calorie Estimation**: Automatically estimates calories based on ingredients
- **Duplicate Detection**: AI analyzes ingredients to prevent duplicate recipes (similarity scoring)

### 🌍 Community Recipes
- **GitHub Database**: Access to curated community recipes
- **Advanced Search**: Search by name, cuisine, category, ingredients, or tags
- **Multi-Filter System**: Filter by calories, tags (vegetarian, quick, etc.), and cooking time
- **Detailed Nutritional Info**: View calorie counts and serving information

### 🛒 Shopping List
- **Unit-Based Tracking**: Add items with precise amounts and units (kg, L, ml, g, oz, lb, etc.)
- **Barcode Scanning**: Scan product barcodes to automatically add items with nutrition data
- **Nutrition Data**: Automatically fetch calories, protein, carbs, and fat from Open Food Facts database
- **Price Estimation**: Automatic grocery price estimation for budget planning
- **Buy Tracking**: Mark items as bought to move them to inventory with preserved nutrition data
- **Multi-User Lists**: Support for household shopping management
- **Manual Entry**: Option to enter barcodes manually if camera unavailable

### 📦 Inventory Management
- **Unit-Based Tracking**: Track amounts with 11 supported units (kg, g, L, ml, oz, lb, cup, tbsp, tsp, unit, piece)
- **Nutrition Tracking**: View nutrition information for items scanned with barcodes
- **Consumption Tracking**: Automatically deduct ingredients when consuming recipes
- **Low Stock Alerts**: Get notified when items fall below threshold
- **Auto-Removal**: Items at 0 quantity are automatically removed
- **Manual Adjustments**: Update quantities manually as needed
- **Barcode History**: Track which items were scanned and their nutritional values

### 🥗 Nutrition & Calorie Tracking
- **Meal Logging**: Log meals with detailed nutrition info (calories, protein, carbs, fat, fiber, sugar, sodium)
- **Meal Types**: Track breakfast, lunch, dinner, and snacks separately
- **Daily Summary**: View total nutrition with progress bars against goals
- **Weekly Summary**: 7-day overview with averages and trends
- **Nutrition Goals**: Set and track daily calorie and macronutrient targets
- **Recipe Integration**: Auto-log nutrition when consuming recipes

### 👤 User Account Management
- **Personal Profiles**: Create accounts with health metrics (age, gender, height, weight)
- **BMR Calculation**: Automatic Basal Metabolic Rate calculation using Mifflin-St Jeor equation
- **BMI Tracking**: Body Mass Index with categorization (Underweight, Normal, Overweight, Obese)
- **Activity Levels**: 5 activity levels from sedentary to extremely active
- **Calorie Recommendations**: Personalized daily calorie targets based on BMR and activity
- **Auto Nutrition Goals**: Automatic macro goals (30% protein, 40% carbs, 30% fat)
- **Multi-User Support**: Separate profiles for Matt and Niccy

### ⚖️ Weight Tracking
- **Monthly Measurements**: Log weight with dates and notes
- **Change Tracking**: Automatic calculation of weight changes between entries
- **Trend Analysis**: Track if weight is gaining, losing, or stable
- **Statistics Dashboard**: 
  - Total weight change (kg and percentage)
  - Average monthly change
  - Highest and lowest recorded weights
  - Months tracked
  - Current trend indicators
- **BMI Updates**: Automatically recalculates BMI with each weight entry
- **History View**: Timeline of all weight measurements with changes

### 🤖 AI-Powered Intelligence
- **Ingredient Matching**: Fuzzy matching for price estimation (e.g., "tomato" matches "tomatoes")
- **Similarity Analysis**: Calculates recipe similarity based on ingredient overlap
- **Confidence Scoring**: Provides confidence levels for price and calorie estimates
- **Learning System**: Uses GitHub recipe database as training data
- **Barcode Integration**: Connects to Open Food Facts API for product data (2.8M+ products worldwide)
- **Smart Nutrition**: Automatic nutrition data lookup and storage for grocery items

---

## 📋 Table of Contents

### 🗂️ Documentation

- **[Backend Documentation](./Backend/README.md)** - Complete guide to the FastAPI backend
  - Docker setup and explanation
  - File structure and architecture
  - MongoDB Atlas configuration
  - Railway deployment guide
  - API endpoints reference
  - Environment variables
  - Troubleshooting

- **[Frontend Documentation](./Frontend/README.md)** - Complete guide to the React Native mobile app
  - React Native and Expo setup
  - File structure and components
  - Dependencies and package management
  - Development and debugging
  - Running on iOS/Android/Web
  - Building for production
  - Troubleshooting

### 🎯 Quick Start Guides

**For Backend Setup:**
```bash
cd Backend/RecipeBookAppBackend/src
pip install -r requirements.txt
# Set MONGO_URI in .env
uvicorn app_api:app --reload
```
See [Backend README](./Backend/README.md) for detailed instructions.

**For Frontend Setup:**
```bash
cd Frontend/RecipeBookAppFrontend/src
npm install
# Set EXPO_PUBLIC_API_URL in .env
npm start
```
See [Frontend README](./Frontend/README.md) for detailed instructions.

---

## 🛠️ Technology Stack

### Frontend
- **React Native 0.76.3** - Cross-platform mobile framework
- **Expo 51.0.39** - Development platform and toolchain
- **Expo Camera 15.0.0** - Camera access for barcode scanning
- **Expo Barcode Scanner 13.0.0** - Barcode scanning functionality
- **TypeScript 5.5.0** - Type-safe JavaScript
- **Zustand 4.4.0** - Lightweight state management
- **Expo Router 3.4.0** - File-based navigation
- **Axios 1.7.0** - HTTP client for API calls

### Backend
- **FastAPI 0.121.1** - Modern Python web framework
- **Python 3.11** - Programming language
- **Uvicorn 0.38.0** - ASGI server
- **pymongo 4.15.4** - MongoDB driver
- **Pydantic 2.12.4** - Data validation
- **slowapi 0.1.9** - Rate limiting for API protection

### Database & Infrastructure
- **MongoDB Atlas** - Cloud-hosted NoSQL database
  - Collections: recipes, shopping_list, items_owned, nutrition_logs, user_nutrition_goals, user_accounts, weight_tracking
- **Railway** - Cloud deployment platform
- **Docker** - Containerization for consistent deployment

---

## 📊 Project Structure

```
RecipeBookApp/
├── README.md                          # This file - Main project overview
├── Backend/                           # Backend API (FastAPI + Python)
│   ├── README.md                      # Backend documentation
│   └── RecipeBookAppBackend/
│       └── src/
│           ├── app_api.py             # Main FastAPI application
│           ├── connectToDataBase.py   # MongoDB connection handler
│           ├── model_to_dict.py       # Pydantic utility
│           ├── requirements.txt       # Python dependencies
│           ├── Dockerfile             # Docker configuration
│           └── railway.json           # Railway deployment config
├── Frontend/                          # Mobile app (React Native + Expo)
│   ├── README.md                      # Frontend documentation
│   └── RecipeBookAppFrontend/
│       └── src/
│           ├── app/
│           │   ├── index.tsx          # Main app entry point
│           │   ├── components/        # Reusable UI components
│           │   ├── screens/           # App screens
│           │   ├── services/          # API and external services
│           │   └── utils/             # Utilities and state management
│           ├── package.json           # npm dependencies
│           ├── app.json               # Expo configuration
│           └── tsconfig.json          # TypeScript configuration
└── railway.json                       # Root Railway configuration
```

---

## 🚦 Getting Started

### Prerequisites

**For Backend:**
- Python 3.11 or higher
- pip (Python package manager)
- MongoDB Atlas account (free tier available)

**For Frontend:**
- Node.js 18 or higher
- npm (Node package manager)
- Expo Go app on your mobile device (iOS/Android)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MattASmithWork/RecipeBookApp.git
   cd RecipeBookApp
   ```

2. **Set up the Backend:**
   
   Follow the detailed instructions in the [Backend README](./Backend/README.md).
   
   Quick version:
   ```bash
   cd Backend/RecipeBookAppBackend/src
   pip install -r requirements.txt
   # Create .env with MONGO_URI
   uvicorn app_api:app --reload
   ```

3. **Set up the Frontend:**
   
   Follow the detailed instructions in the [Frontend README](./Frontend/README.md).
   
   Quick version:
   ```bash
   cd Frontend/RecipeBookAppFrontend/src
   npm install
   # Create .env with EXPO_PUBLIC_API_URL
   npm start
   ```

4. **Test the Application:**
   - Scan the QR code with Expo Go app
   - Navigate through the three main tabs
   - Try adding a recipe, creating a shopping list, and using filters

---

## 🌟 Feature Highlights

### AI-Powered Duplicate Detection

When adding a new recipe, the app analyzes the ingredients against the GitHub recipe database to find similar recipes:

```typescript
// Calculates similarity score based on ingredient matching
calculateSimilarity(userIngredients, githubRecipeIngredients)
// Returns: { similarity: 85%, matchedIngredients: [...] }
```

If a recipe has >20% similarity, it's suggested to the user to prevent duplicates.

### Smart Price Estimation

The shopping list features intelligent price estimation:

```typescript
// Matches "tomato" to known prices for "tomatoes", "cherry tomatoes", etc.
estimatePrice("2 tomatoes")
// Returns: { price: 3.50, confidence: "high", matchedItem: "tomatoes" }
```

Handles unit conversions, plural forms, and common variations.

### Multi-User Architecture

Each user has their own isolated data:

```
User: "john"
  ├── Recipes (10 personal recipes)
  ├── Shopping List (5 items)
  └── Inventory (15 items)

User: "mary"
  ├── Recipes (8 personal recipes)
  ├── Shopping List (3 items)
  └── Inventory (12 items)
```

Switch users in the app to test different scenarios or support multiple family members.

---

## 🔧 Configuration

### Backend Environment Variables

Create `Backend/RecipeBookAppBackend/src/.env`:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/recipeDatabase
PORT=8000
```

### Frontend Environment Variables

Create `Frontend/RecipeBookAppFrontend/src/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
# Or your Railway deployment URL:
# EXPO_PUBLIC_API_URL=https://your-app.up.railway.app
```

---

## 🚀 Deployment

### Backend Deployment (Railway)

The backend is configured to deploy automatically to Railway:

1. Connect your GitHub repository to Railway
2. Railway reads the root `railway.json` configuration
3. It builds the Docker container from `Backend/RecipeBookAppBackend/src/Dockerfile`
4. Set the `MONGO_URI` environment variable in Railway dashboard
5. Deploy automatically on every push to main branch

See [Backend README - Railway Deployment](./Backend/README.md#-railway-deployment) for detailed instructions.

### Frontend Deployment (Expo)

Build standalone apps for iOS and Android:

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Publish over-the-air updates
eas update
```

See [Frontend README - Building for Production](./Frontend/README.md#-building-for-production) for detailed instructions.

---

## 📱 Screenshots & Demo

### Main Screens

1. **My Recipes** - Personal recipe collection with time filtering
2. **Community Recipes** - Browse GitHub recipes with advanced search
3. **Shopping List** - Smart shopping list with price estimation and inventory tracking

### Key Workflows

**Adding a Recipe:**
1. Tap "Add Recipe" button
2. Enter name, ingredients, and instructions
3. Tap "Analyze Recipe" for AI suggestions
4. Review similar recipes and calorie estimates
5. Save to your personal collection

**Shopping List to Inventory:**
1. Add items to shopping list with quantities
2. View estimated total price
3. Mark items as "bought" while shopping
4. Items automatically move to inventory
5. Track what's in your kitchen

---

## 🧪 Testing & Quality Assurance

### Frontend Testing

The React Native frontend has comprehensive test coverage:

**Test Statistics:**
- **116/116 tests passing** (100% pass rate)
- **59 store tests** - State management (Zustand)
- **57 API tests** - HTTP client functionality

**Coverage Metrics:**
- `store.ts`: **100%** coverage (lines, branches, functions, statements)
- `api.ts`: **70%** coverage, **91.66%** branch coverage
- All 16 store actions tested with edge cases
- All 36 API functions tested with success and error paths

**Test Features:**
- Edge case testing (empty strings, special characters, large datasets)
- Error scenario coverage (network failures, 404s, validation errors, timeouts)
- Multi-user scenario testing
- Data integrity validation
- Optional parameter variations

**Running Tests:**
```bash
cd Frontend/RecipeBookAppFrontend/src
npm test                    # Run all tests
npm test -- --coverage      # Run with coverage report
npm test -- --watch         # Watch mode for development
```

See [Frontend README - Testing](./Frontend/README.md#testing) for detailed information.

### Backend Testing

The FastAPI backend has excellent test coverage:

**Test Statistics:**
- **216/216 tests passing** (100% pass rate)
- **95%** overall coverage across all modules

**Coverage Areas:**
- All API endpoints tested (recipes, shopping, inventory, nutrition, weight, accounts)
- Database operations validated
- Security features verified
- Rate limiting tested
- Error handling comprehensive

**Running Tests:**
```bash
cd Backend/RecipeBookAppBackend/src
pytest                      # Run all tests
pytest --cov                # Run with coverage report
pytest tests/test_*.py      # Run specific test file
```

See [Backend README - Testing](./Backend/README.md#testing) for detailed information.

---

## 🧪 API Endpoints

The backend provides RESTful endpoints:

### Recipe Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/recipes/{user}` | GET | Get user's recipes |
| `/recipes` | POST | Add new recipe |
| `/recipes/{id}` | DELETE | Delete recipe |
| `/github-recipes` | GET | Get community recipes |

### Shopping & Inventory Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/shopping-list/{user}` | GET | Get shopping list |
| `/shopping-list` | POST | Add shopping item |
| `/shopping-list/{id}/mark-bought` | PUT | Mark item as bought |
| `/inventory/{user}` | GET | Get inventory |
| `/inventory` | POST | Add inventory item |
| `/inventory/consume-ingredient` | POST | Consume ingredient from inventory |
| `/inventory/consume-recipe` | POST | Consume all recipe ingredients |
| `/inventory/low-stock` | GET | Get low stock items |
| `/inventory/update-amount` | PUT | Update item amount |

### Nutrition Tracking Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/nutrition/log` | POST | Log a meal |
| `/nutrition/logs/{user}` | GET | Get meal logs |
| `/nutrition/daily-summary/{user}/{date}` | GET | Get daily nutrition summary |
| `/nutrition/log/{id}` | PUT | Update meal log |
| `/nutrition/log/{id}` | DELETE | Delete meal log |
| `/nutrition/goals` | POST | Set nutrition goals |
| `/nutrition/goals/{user}` | GET | Get nutrition goals |
| `/nutrition/weekly-summary/{user}` | GET | Get weekly nutrition summary |

### User Account Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/accounts/create` | POST | Create user account |
| `/accounts/{username}` | GET | Get account details |
| `/accounts/{username}` | PUT | Update account |
| `/accounts/{username}` | DELETE | Delete account |

### Weight Tracking Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/weight/log` | POST | Log weight measurement |
| `/weight/{username}` | GET | Get weight history |
| `/weight/{id}` | DELETE | Delete weight entry |
| `/weight/{username}/stats` | GET | Get weight statistics |

Interactive API documentation available at: `http://your-api-url/docs`

See [Backend README - API Endpoints](./Backend/README.md#-api-endpoints) for full details.

---

## 🧠 AI Algorithms

### Ingredient Similarity Algorithm

```python
def calculate_similarity(user_ingredients, recipe_ingredients):
    """
    Calculates percentage of matching ingredients.
    
    Example:
    User: ["chicken", "rice", "tomatoes"]
    Recipe: ["chicken breast", "basmati rice", "tomato paste", "onions"]
    
    Matches: "chicken" ↔ "chicken breast" ✓
             "rice" ↔ "basmati rice" ✓
             "tomatoes" ↔ "tomato paste" ✓
    
    Similarity: 3/3 = 100%
    """
    matches = 0
    for user_ing in user_ingredients:
        if any(user_ing in recipe_ing or recipe_ing.startswith(user_ing) 
               for recipe_ing in recipe_ingredients):
            matches += 1
    
    return (matches / len(user_ingredients)) * 100
```

### BMR Calculation (Mifflin-St Jeor Equation)

```python
def calculate_bmr(weight_kg, height_cm, age, gender):
    """
    Calculates Basal Metabolic Rate - calories burned at rest.
    
    Men: BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
    Women: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
    
    Then multiply by activity level:
    - Sedentary: BMR × 1.2
    - Lightly Active: BMR × 1.375
    - Moderately Active: BMR × 1.55
    - Very Active: BMR × 1.725
    - Extremely Active: BMR × 1.9
    """
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if gender == 'male':
        bmr += 5
    else:
        bmr -= 161
    return bmr
```

### BMI Calculation

```python
def calculate_bmi(weight_kg, height_cm):
    """
    Calculates Body Mass Index.
    
    BMI = weight (kg) / (height (m))²
    
    Categories:
    < 18.5: Underweight
    18.5 - 24.9: Normal weight
    25 - 29.9: Overweight
    >= 30: Obese
    """
    height_m = height_cm / 100
    return weight_kg / (height_m ** 2)
```

### Price Estimation Algorithm

```typescript
function estimatePrice(item: string): PriceEstimate {
  // 1. Normalize input (lowercase, remove extra spaces)
  // 2. Extract quantity and unit
  // 3. Match to known grocery prices (fuzzy matching)
  // 4. Convert units if needed
  // 5. Calculate total price
  // 6. Return with confidence score
}
```

See [Frontend README - Key Features](./Frontend/README.md#-key-features) for implementation details.

---

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check `MONGO_URI` is set in `.env`
- Verify MongoDB Atlas network access allows your IP
- Ensure Python 3.11+ is installed

**Frontend can't connect to backend:**
- Verify `EXPO_PUBLIC_API_URL` in `.env`
- Use your computer's local IP, not `localhost` for physical devices
- Ensure backend is running and accessible

**App crashes on startup:**
- Clear Metro bundler cache: `npm start -- --clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors in terminal

For detailed troubleshooting, see:
- [Backend Troubleshooting](./Backend/README.md#-common-issues)
- [Frontend Troubleshooting](./Frontend/README.md#-troubleshooting)

---

## 📚 Documentation

- **[Backend Documentation](./Backend/README.md)** - API, Docker, deployment, troubleshooting
- **[Frontend Documentation](./Frontend/README.md)** - App setup, development, building

Additional documentation in the codebase:
- `Backend/RecipeBookAppBackend/src/BACKEND_SETUP.md` - MongoDB Atlas setup
- `Backend/RecipeBookAppBackend/src/RAILWAY_DEPLOYMENT.md` - Railway deployment details

---

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use environment variables for all sensitive data
- MongoDB Atlas connection strings contain credentials - keep them secret
- Enable IP whitelisting on MongoDB Atlas for production
- Use HTTPS for all production API endpoints
- Railway automatically provides HTTPS domains

---

## 📝 License

This project is for educational and personal use. See individual component licenses in the `Backend/` and `Frontend/` directories.

---

## 👤 Author

**Matthew A. Smith**
- GitHub: [@MattASmithWork](https://github.com/MattASmithWork)
- Project: [RecipeBookApp](https://github.com/MattASmithWork/RecipeBookApp)

---

## 🙏 Acknowledgments

- **FastAPI** - For the excellent Python web framework
- **Expo** - For making React Native development accessible
- **MongoDB Atlas** - For reliable cloud database hosting
- **Railway** - For simple and powerful deployment
- **GitHub** - For hosting the community recipe database

---

## 📞 Support

For questions, issues, or suggestions:
1. Check the [Backend README](./Backend/README.md) or [Frontend README](./Frontend/README.md)
2. Review the troubleshooting sections
3. Open an issue on GitHub
4. Consult the official documentation:
   - [FastAPI Docs](https://fastapi.tiangolo.com/)
   - [Expo Docs](https://docs.expo.dev/)
   - [MongoDB Docs](https://docs.mongodb.com/)

---

**Built with ❤️ using Python, TypeScript, and modern cloud technologies.**
