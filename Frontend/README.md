# Recipe Book App Frontend

A React Native mobile application built with Expo for managing recipes, shopping lists, inventory, nutrition tracking, user accounts, and weight monitoring. Features AI-powered calorie estimation, duplicate detection, personalized health metrics (BMR/BMI), and multi-user support with cross-device synchronization via MongoDB.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Setup From Scratch](#setup-from-scratch)
4. [Dependencies](#dependencies)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Key Features](#key-features)
8. [Building for Production](#building-for-production)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

The frontend is built with:
- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and toolchain
- **TypeScript**: Type-safe JavaScript
- **Zustand**: Lightweight state management
- **Expo Router**: File-based routing system
- **Axios**: HTTP client for API communication

**Technology Stack:**
```
React Native (UI Framework)
    ↓
Expo (Development Platform)
    ↓
TypeScript (Type Safety)
    ↓
Zustand (State Management)
    ↓
Axios (API Communication)
    ↓
FastAPI Backend (Railway)
    ↓
MongoDB Atlas (Database)
```

### Why These Technologies?

**React Native:**
- Write once, run on iOS, Android, and Web
- Large ecosystem of libraries
- Hot reloading for fast development
- Native performance

**Expo:**
- Simplified development workflow
- Over-the-air updates
- Easy deployment
- Built-in components and APIs
- No need to manage native code

**TypeScript:**
- Catch errors at compile time
- Better IDE support and autocomplete
- Self-documenting code with types
- Easier refactoring

**Zustand:**
- Simple and lightweight (vs Redux)
- No boilerplate code
- Built-in TypeScript support
- Easy to learn and use

---

## 📁 File Structure

```
Frontend/
├── README.md                          # This file
└── RecipeBookAppFrontend/
    ├── bin/                           # Virtual environment executables (Python)
    ├── lib/                           # Python packages
    ├── include/                       # Python headers
    ├── pyvenv.cfg                     # Virtual environment config
    └── src/                           # Main application code
        ├── app/                       # Expo Router app directory
        │   ├── index.tsx              # Home screen / tab navigator
        │   ├── components/            # Reusable UI components
        │   │   └── AddRecipeModal.tsx # Modal for adding recipes
        │   ├── screens/               # Main app screens
        │   │   ├── RecipesScreen.tsx           # Personal recipe collection
        │   │   ├── GitHubRecipesScreen.tsx     # Community recipes
        │   │   ├── ShoppingListScreen.tsx      # Shopping list & inventory
        │   │   ├── AccountSetupScreen.tsx      # User account management
        │   │   └── WeightTrackingScreen.tsx    # Weight tracking & statistics
        │   ├── services/              # External integrations
        │   │   ├── api.ts                  # Backend API client
        │   │   └── priceEstimation.ts      # Grocery price estimation
        │   └── utils/                 # Utility functions
        │       └── store.ts                # Zustand global state
        ├── assets/                    # Images, fonts, icons
        │   ├── icon.png               # App icon
        │   ├── splash.png             # Splash screen
        │   └── adaptive-icon.png      # Android adaptive icon
        ├── package.json               # npm dependencies and scripts
        ├── tsconfig.json              # TypeScript configuration
        ├── app.json                   # Expo configuration
        └── .env                       # Environment variables (not committed)
```

### Key Directories Explained

**app/**
- Entry point for the Expo Router application
- File-based routing (files become routes automatically)
- `index.tsx` is the main screen with tab navigation

**app/components/**
- Reusable UI components used across screens
- `AddRecipeModal.tsx`: AI-powered recipe creation with duplicate detection

**app/screens/**
- Main application screens
- `RecipesScreen.tsx`: Personal recipe collection with time filtering
- `GitHubRecipesScreen.tsx`: Community recipes with search and filters
- `ShoppingListScreen.tsx`: Shopping list and inventory management
- `AccountSetupScreen.tsx`: User account creation and management with BMR/BMI calculations
- `WeightTrackingScreen.tsx`: Weight tracking with history and statistics

**app/services/**
- External service integrations
- `api.ts`: All backend API communication functions
- `priceEstimation.ts`: Grocery price estimation algorithm

**app/utils/**
- Utility functions and shared logic
- `store.ts`: Zustand state management (current user, recipes, shopping list)

**assets/**
- Static files (images, icons, fonts)
- App icons and splash screens for iOS/Android

---

## 🚀 Setup From Scratch

### Prerequisites

Before starting, ensure you have:

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should show v18.x.x or higher
   ```
   Download from: https://nodejs.org/

2. **npm** (comes with Node.js)
   ```bash
   npm --version  # Should show 9.x.x or higher
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **Expo CLI** (optional, but recommended)
   ```bash
   npm install -g expo-cli
   ```

5. **Expo Go App** on your mobile device
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/MattASmithWork/RecipeBookApp.git

# Navigate to frontend directory
cd RecipeBookApp/Frontend/RecipeBookAppFrontend/src
```

### Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This installs:
# - React Native and Expo framework
# - TypeScript and type definitions
# - Zustand for state management
# - Axios for API calls
# - Expo Router for navigation
# - All other dependencies from package.json
```

**Expected output:**
```
added 1247 packages, and audited 1248 packages in 45s

252 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**If you encounter errors:**

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the `src/` directory:

```bash
cd RecipeBookApp/Frontend/RecipeBookAppFrontend/src
touch .env
```

Add your backend API URL:

```env
# Backend API URL (Railway deployment or local)
EXPO_PUBLIC_API_URL=https://your-railway-app.up.railway.app

# For local development:
# EXPO_PUBLIC_API_URL=http://localhost:8000

# Note: Use your computer's local IP for testing on physical devices
# EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

**Finding Your Local IP:**

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"
```

**Security Note:** 
- Never commit `.env` files to Git
- Add `.env` to your `.gitignore`
- Use `EXPO_PUBLIC_` prefix for Expo environment variables

### Step 4: Verify Configuration

Check that everything is set up correctly:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Verify dependencies are installed
ls node_modules  # Should show many folders

# Check if Expo is properly configured
npx expo --version
```

### Step 5: Start the Development Server

```bash
# Start Expo development server
npm start

# Or use specific commands:
npm run start    # Start with options menu
npm run android  # Start and open on Android emulator
npm run ios      # Start and open on iOS simulator (macOS only)
npm run web      # Start and open in web browser
```

**Expected output:**
```
Starting Metro Bundler
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Using Expo Go
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor

› Press ? │ show all commands
```

### Step 6: Run on Your Device

**Method 1: Expo Go App (Easiest)**

1. Install Expo Go on your phone:
   - iOS: App Store → Search "Expo Go"
   - Android: Play Store → Search "Expo Go"

2. Scan the QR code:
   - iOS: Use the Camera app to scan
   - Android: Use the Expo Go app to scan

3. Wait for the app to load (first load takes 30-60 seconds)

**Method 2: Android Emulator**

1. Install Android Studio: https://developer.android.com/studio
2. Create a virtual device (AVD Manager)
3. Start the emulator
4. Run: `npm run android`

**Method 3: iOS Simulator (macOS only)**

1. Install Xcode from Mac App Store
2. Install Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. Run: `npm run ios`

**Method 4: Web Browser**

```bash
npm run web
# Opens in browser at http://localhost:8081
```

### Step 7: Test the Application

1. **Check connection to backend:**
   - Open the app
   - Navigate to "Community Recipes" tab
   - Should fetch and display recipes from GitHub

2. **Test user functionality:**
   - Tap on the user icon/name at the top
   - Change to a different user name
   - Add a test recipe in "My Recipes" tab

3. **Test shopping list:**
   - Navigate to "Shopping List" tab
   - Add items
   - Mark items as bought
   - Check inventory section

---

## 📦 Dependencies

### Core Framework

```json
"expo": "^51.0.39"                    // Expo development platform
"react": "18.3.1"                     // React library
"react-native": "0.76.3"              // React Native framework
```

**Expo** provides:
- Development server with hot reload
- Over-the-air updates
- Easy deployment
- Native API access (camera, location, etc.)

### Navigation & Routing

```json
"expo-router": "^3.4.0"               // File-based routing system
"expo-linking": "~7.0.0"              // Deep linking support
"react-native-screens": "~4.4.0"      // Native screen management
"react-native-safe-area-context": "4.12.0"  // Safe area handling
```

**Expo Router** enables:
- File-based routing (files = routes)
- Automatic deep linking
- TypeScript support
- Shared layouts

### UI & Gestures

```json
"react-native-gesture-handler": "~2.20.0"  // Touch gesture handling
"react-native-reanimated": "~3.15.0"       // Smooth animations
"expo-status-bar": "~1.12.0"               // Status bar styling
"expo-splash-screen": "~0.28.0"            // Splash screen management
```

### State Management

```json
"zustand": "^4.4.0"                   // Lightweight state management
```

**Why Zustand over Redux?**
- Much simpler API (less boilerplate)
- Smaller bundle size (~1KB vs ~25KB)
- Built-in TypeScript support
- No context providers needed
- Easier to learn

### HTTP Client

```json
"axios": "^1.7.0"                     // HTTP client for API calls
```

**Axios features:**
- Promise-based API
- Request/response interceptors
- Automatic JSON transformation
- Better error handling than fetch

### Web Support

```json
"react-dom": "18.2.0"                 // React DOM for web
"react-native-web": "~0.19.10"        // React Native components for web
```

### Configuration & Constants

```json
"expo-constants": "~16.0.0"           // Access app.json config
```

### Development Dependencies

```json
"typescript": "~5.5.0"                // TypeScript compiler
"@types/react": "^18.2.0"             // React type definitions
"@babel/preset-env": "^7.23.0"        // Babel ES6+ support
"@react-native/babel-preset": "0.76.3"  // React Native Babel preset
```

### Installing/Updating Dependencies

```bash
# Install all dependencies
npm install

# Install a specific package
npm install package-name

# Install a specific version
npm install package-name@1.2.3

# Update a package
npm update package-name

# Update all packages (use with caution)
npm update

# Check for outdated packages
npm outdated

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

### Expo-Specific Packages

When adding Expo-related packages, use the Expo CLI:

```bash
# Install Expo package
npx expo install expo-camera

# Expo CLI ensures version compatibility
# It automatically picks the right version for your Expo SDK
```

---

## ⚙️ Environment Configuration

### Environment Variables

Create a `.env` file in `src/` directory:

```env
# Backend API URL
EXPO_PUBLIC_API_URL=https://your-api.up.railway.app

# For local development
# EXPO_PUBLIC_API_URL=http://localhost:8000

# For testing on physical device (use your computer's IP)
# EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

### Accessing Environment Variables

In TypeScript/JavaScript:

```typescript
import Constants from 'expo-constants';

// Access environment variable
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

// With fallback
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
```

**Important Notes:**
- Variables must start with `EXPO_PUBLIC_` to be accessible in the app
- Restart the development server after changing `.env`
- Never commit `.env` to version control

### app.json Configuration

Main app configuration in `app.json`:

```json
{
  "expo": {
    "name": "RecipeApp",                    // App display name
    "slug": "recipeapp-mobile",             // URL slug
    "version": "1.0.0",                     // App version
    "orientation": "portrait",              // Lock to portrait
    "icon": "./assets/icon.png",            // App icon (1024x1024)
    "splash": {
      "image": "./assets/splash.png",       // Splash screen
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTabletMode": true,           // iPad support
      "bundleIdentifier": "com.yourcompany.recipeapp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.recipeapp"
    },
    "web": {
      "bundler": "metro",                   // Use Metro bundler for web
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router"                         // Enable Expo Router
    ],
    "scheme": "recipeapp"                   // Deep linking scheme
  }
}
```

### TypeScript Configuration

`tsconfig.json` configures TypeScript compilation:

```json
{
  "compilerOptions": {
    "target": "ES2020",                     // JavaScript target version
    "jsx": "react-native",                  // JSX compilation mode
    "lib": ["ES2020"],                      // Standard library to include
    "moduleResolution": "node",             // Module resolution strategy
    "strict": true,                         // Enable all strict type checks
    "esModuleInterop": true,               // Enable CommonJS interop
    "skipLibCheck": true,                   // Skip type checking of .d.ts files
    "resolveJsonModule": true              // Allow importing JSON files
  },
  "extends": "expo/tsconfig.base"          // Extend Expo's base config
}
```

---

## 🏃 Running the Application

### Development Commands

```bash
# Start development server
npm start

# Start with cache cleared
npm start -- --clear

# Start on specific platform
npm run android    # Open on Android emulator/device
npm run ios        # Open on iOS simulator (macOS only)
npm run web        # Open in web browser
```

### Development Server Options

When you run `npm start`, you'll see an interactive menu:

```
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor

› Press ? │ show all commands
```

### Hot Reloading

Expo automatically reloads the app when you save files:

- **Fast Refresh**: Preserves component state
- **Full Reload**: Press `r` in terminal to force reload
- **Clear Cache**: `npm start -- --clear` if you have issues

### Debugging

**Method 1: Console Logs**

```typescript
console.log('Debug message:', variable);
console.warn('Warning message');
console.error('Error message');
```

View logs in the terminal where you ran `npm start`.

**Method 2: React DevTools**

```bash
# Install React DevTools
npm install -g react-devtools

# Start React DevTools
react-devtools

# In app, shake device and select "Debug Remote JS"
```

**Method 3: Chrome DevTools**

1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Debug Remote JS"
3. Opens Chrome tab with DevTools
4. Use Console, Network, and Sources tabs

**Method 4: Expo DevTools**

- Press `m` in terminal to open Expo DevTools
- View logs, performance metrics, and device info

### Testing on Different Devices

**Physical Device (Expo Go):**
- Easiest method for quick testing
- Scan QR code with Expo Go app
- Works over same WiFi network

**Android Emulator:**
```bash
# Ensure Android emulator is running
npm run android
```

**iOS Simulator (macOS only):**
```bash
# Ensure Xcode is installed
npm run ios
```

**Web Browser:**
```bash
npm run web
# Opens at http://localhost:8081
```

### Network Debugging

If app can't connect to backend:

1. **Check API URL in .env:**
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
   ```

2. **Find your computer's local IP:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

3. **Ensure backend is running:**
   ```bash
   curl http://YOUR_COMPUTER_IP:8000/health
   ```

4. **Check firewall:**
   - Allow connections on port 8000
   - Ensure device and computer are on same network

---

## ✨ Key Features

### 1. Multi-User Support

Switch between users to manage separate accounts and data:

```typescript
// In store.ts - Zustand state
const useRecipeStore = create<RecipeStore>((set) => ({
  currentUser: 'user1',
  setCurrentUser: (user: string) => set({ currentUser: user }),
}));

// Usage in components
const { currentUser, setCurrentUser } = useRecipeStore();
```

### 2. User Account Management

**AccountSetupScreen.tsx:**
- Create and manage user accounts (e.g., Matt, Niccy)
- Personal information: username, display name, email
- Health metrics: age, gender, weight, height
- Activity level selection (5 levels: sedentary to extremely active)
- **Real-time health calculations:**
  - BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
  - BMI (Body Mass Index) with category classification
  - Recommended daily calorie intake based on activity level
- Automatic nutrition goal creation
- Update account details and recalculate metrics

### 3. Weight Tracking & Statistics

**WeightTrackingScreen.tsx:**
- **Log Weight tab:**
  - Record monthly weight measurements
  - Date picker for tracking specific dates
  - Optional notes for each entry
- **History tab:**
  - Timeline of all weight entries
  - Weight change (kg) since previous entry
  - Percentage change calculations
  - Delete individual entries
- **Statistics tab:**
  - Overall progress (first weight → current weight)
  - Trend analysis (gaining/losing/stable)
  - Monthly average weight changes
  - Records: highest and lowest weights
  - Total tracking period in months

### 4. AI-Powered Recipe Features

**Duplicate Detection:**
- Analyzes ingredients to find similar recipes
- Shows similarity percentage
- Prevents accidental duplicates

**Calorie Estimation:**
- Estimates calories based on ingredients
- Uses similar recipes from GitHub database
- Displays confidence level

### 5. Shopping List Management

**Features:**
- Add items with quantity and unit
- Mark items as bought (moves to inventory)
- Price estimation for grocery budget
- Multi-user support (each user has own list)

**Price Estimation Algorithm:**
- Matches items to known grocery prices
- Handles variations (e.g., "tomato" → "tomatoes")
- Provides confidence scores
- Updates in real-time

### 6. Recipe Filtering

**Personal Recipes:**
- Filter by total cooking time
- Quick filters (15, 30, 45, 60 minutes)
- Shows prep + cook time

**Community Recipes:**
- Search by name, cuisine, category, ingredient
- Filter by calorie range
- Filter by tags (vegetarian, quick, etc.)
- Filter by time

### 7. Cross-Device Synchronization

All data syncs via MongoDB:
- Add recipe on phone → appears on tablet
- Mark item as bought → updates everywhere
- Real-time updates across devices

### 8. Ingredient Matching System

**How It Works:**

1. User adds ingredients manually (e.g., "tomato", "chicken", "pasta")
2. App compares user ingredients against all recipes
3. Recipes are categorized:
   - ✅ **Can Cook:** 100% of ingredients available
   - 🟡 **Close Match:** 80%+ of ingredients available (1-2 items short)

**Matching Algorithm:**
- Normalizes ingredient names (lowercase, trim whitespace)
- Supports partial matches (e.g., "tomato" matches "cherry tomato")
- Calculates match percentage for each recipe
- Ranks by highest match percentage first

### 9. Barcode Scanning & Nutrition

**Workflow:**

1. User taps "Scan Barcode" button in shopping list
2. Camera opens with barcode detection overlay
3. App scans barcode (UPC/EAN-8/EAN-13 formats)
4. Backend queries Open Food Facts API (2.8M+ products worldwide)
5. Product data returned with nutrition info:
   - Calories per 100g/ml
   - Protein, carbs, and fat content
   - Brand and product name
   - Serving size information
6. User confirms to add to shopping list with nutrition data
7. When marked as bought, nutrition data moves to inventory

**Supported Barcode Formats:**
- UPC-A (12 digits) - Common in North America
- UPC-E (8 digits) - Shortened UPC
- EAN-13 (13 digits) - International standard
- EAN-8 (8 digits) - Shorter European format

**Manual Entry:** If camera unavailable, users can type barcode numbers directly

### 10. Backend API Integration

The app communicates with the FastAPI backend using these endpoints:

**Recipe Management:**
- `GET /health` - Health check
- `GET /recipes/{user}` - Get all recipes for a user
- `POST /recipes/` - Create a new recipe
- `PUT /recipes/{id}` - Update a recipe
- `DELETE /recipes/{id}` - Delete a recipe
- `GET /github-recipes` - Fetch community recipes

**Shopping & Inventory:**
- `GET /shopping-list/{user}` - Get shopping list
- `POST /shopping-list` - Add item to shopping list
- `DELETE /shopping-list/{id}` - Remove item
- `POST /shopping-list/{id}/mark-bought` - Move item to inventory
- `GET /inventory/{user}` - Get inventory items
- `POST /inventory` - Add item to inventory
- `POST /inventory/consume-ingredient` - Consume ingredient
- `POST /inventory/consume-recipe` - Consume recipe ingredients
- `GET /inventory/low-stock` - Get low stock items
- `PUT /inventory/update-amount` - Update item amount

**Barcode & Nutrition:**
- `GET /barcode/{barcode}` - Look up product by barcode (Open Food Facts)
- `GET /nutrition/logs/{user}` - Get nutrition logs
- `POST /nutrition/log` - Log a meal
- `GET /nutrition/daily-summary/{user}/{date}` - Get daily summary
- `PUT /nutrition/log/{id}` - Update meal log
- `DELETE /nutrition/log/{id}` - Delete meal log
- `POST /nutrition/goals` - Set nutrition goals
- `GET /nutrition/goals/{user}` - Get nutrition goals
- `GET /nutrition/weekly-summary/{user}` - Get weekly summary

**Account & Weight:**
- `POST /accounts/create` - Create user account
- `GET /accounts/{username}` - Get account details
- `PUT /accounts/{username}` - Update account
- `DELETE /accounts/{username}` - Delete account
- `POST /weight/log` - Add weight measurement
- `GET /weight/{username}` - Get weight history
- `DELETE /weight/{id}` - Delete weight entry
- `GET /weight/{username}/stats` - Get weight statistics

See the [Backend README](../Backend/README.md) for full API documentation.

---

## 📱 Building for Production

### Building Standalone Apps

**For iOS (requires macOS and Apple Developer Account):**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

**For Android:**

```bash
# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Google Play Store
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

### Over-the-Air (OTA) Updates

Update your app without app store submission:

```bash
# Publish update
eas update

# Users get the update next time they open the app
# No need to download from store
```

### Environment-Specific Builds

Create multiple build profiles in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.railway.app"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://production-api.railway.app"
      }
    }
  }
}
```

Then build with:
```bash
eas build --profile production
```

### Pre-Build Checklist

Before building for production:

- [ ] Update version in `app.json`
- [ ] Test on multiple devices
- [ ] Verify API endpoint is production URL
- [ ] Check all environment variables
- [ ] Test offline functionality
- [ ] Review app icons and splash screen
- [ ] Test deep linking
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Update README and documentation
- [ ] Create release notes

---

## 🐛 Troubleshooting

### Common Issues

**1. "Unable to resolve module"**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm start -- --clear
```

**2. "Network request failed"**

- Check API URL in `.env`
- Ensure backend is running
- Verify device and computer on same WiFi
- Check firewall settings
- Use computer's IP, not `localhost`

**3. "Metro bundler crashed"**

```bash
# Kill existing Metro processes
killall -9 node

# Restart
npm start -- --clear
```

**4. "Expo Go won't load app"**

- Ensure Expo Go is updated to latest version
- Check QR code is for correct network
- Try entering URL manually in Expo Go
- Restart Expo Go app

**5. "TypeScript errors"**

```bash
# Regenerate TypeScript cache
rm -rf .expo
npm start -- --clear
```

**6. "Can't find variable: process.env"**

- Ensure variable starts with `EXPO_PUBLIC_`
- Restart development server
- Check `.env` file location (should be in `src/`)

**7. "iOS Simulator not opening"**

```bash
# Ensure Xcode Command Line Tools are installed
xcode-select --install

# Open Simulator manually
open -a Simulator

# Then run
npm run ios
```

**8. "Android emulator connection issues"**

```bash
# Check emulator is running
adb devices

# Restart ADB
adb kill-server
adb start-server

# Run again
npm run android
```

### Performance Issues

**App running slow:**

```bash
# Enable production mode
npm start -- --no-dev

# Clear Metro cache
npm start -- --clear

# Check for memory leaks in components
# Use React DevTools Profiler
```

**Large bundle size:**

```bash
# Analyze bundle
npx react-native-bundle-visualizer

# Remove unused dependencies
npm prune

# Use dynamic imports for large components
const Component = lazy(() => import('./Component'));
```

### Getting Help

**Official Documentation:**
- Expo Docs: https://docs.expo.dev/
- React Native Docs: https://reactnative.dev/
- Expo Router Docs: https://expo.github.io/router/

**Community:**
- Expo Discord: https://chat.expo.dev/
- React Native Community: https://www.reactnative.dev/community/overview
- Stack Overflow: Tag `expo` or `react-native`

**Debugging Tools:**
- React DevTools: `npm install -g react-devtools`
- Expo DevTools: Built-in (press `m` in terminal)
- Flipper: https://fbflipper.com/

---

## 🔧 Useful Commands Cheat Sheet

```bash
# Development
npm start                    # Start development server
npm start -- --clear         # Start with cleared cache
npm run android              # Open on Android
npm run ios                  # Open on iOS
npm run web                  # Open in browser

# Dependencies
npm install                  # Install all dependencies
npm install package-name     # Install specific package
npm update                   # Update all packages
npm outdated                 # Check for outdated packages
npm audit                    # Check for vulnerabilities
npm audit fix                # Fix vulnerabilities

# Expo
npx expo install package     # Install Expo-compatible package
npx expo upgrade             # Upgrade Expo SDK version
npx expo doctor              # Diagnose issues

# Building (requires EAS)
eas build --platform ios     # Build for iOS
eas build --platform android # Build for Android
eas submit                   # Submit to app store
eas update                   # Publish OTA update

# Cleanup
rm -rf node_modules          # Remove dependencies
rm package-lock.json         # Remove lock file
npm cache clean --force      # Clear npm cache
```

---

## 📚 Project Structure Deep Dive

### State Management (Zustand)

`app/utils/store.ts` manages global state:

```typescript
interface RecipeStore {
  currentUser: string;              // Currently logged-in user
  recipes: Recipe[];                // User's personal recipes
  shoppingList: ShoppingItem[];     // Shopping list items
  inventory: InventoryItem[];       // Inventory items
  
  setCurrentUser: (user: string) => void;
  setRecipes: (recipes: Recipe[]) => void;
  setShoppingList: (items: ShoppingItem[]) => void;
  setInventory: (items: InventoryItem[]) => void;
}
```

**Why Zustand?**
- No Provider wrapper needed
- Simple API: `const user = useRecipeStore(state => state.currentUser)`
- Automatic re-renders on state changes
- DevTools support

### API Communication

`app/services/api.ts` handles all backend requests:

```typescript
// Example API functions

// Recipes
export const fetchRecipes = async (user: string): Promise<RecipesResponse>
export const addRecipe = async (recipe: Recipe): Promise<Recipe>
export const fetchGitHubRecipes = async (): Promise<GitHubRecipesResponse>

// Shopping & Inventory
export const addShoppingItem = async (item: ShoppingItem): Promise<void>

// User Accounts
export const createAccount = async (accountData: Omit<UserAccount, 'id' | 'bmr' | 'bmi' | 'bmiCategory' | 'recommendedDailyCalories'>): Promise<UserAccountResponse>
export const getAccount = async (username: string): Promise<UserAccount>
export const updateAccount = async (username: string, accountData: Partial<UserAccount>): Promise<UserAccountResponse>
export const deleteAccount = async (username: string): Promise<void>

// Weight Tracking
export const logWeight = async (entry: Omit<WeightEntry, 'id'>): Promise<WeightLogResponse>
export const getWeightHistory = async (username: string, startDate?: string, endDate?: string): Promise<WeightEntry[]>
export const deleteWeightEntry = async (id: string): Promise<void>
export const getWeightStats = async (username: string): Promise<WeightStats>
```

**Features:**
- TypeScript interfaces for type safety
- Error handling
- Automatic JSON parsing
- Configurable base URL from environment

### Navigation Structure

Expo Router uses file-based routing:

```
app/
├── index.tsx              → / (root route - tab navigator)
├── screens/
│   ├── RecipesScreen.tsx           → /screens/recipes
│   ├── GitHubRecipesScreen.tsx     → /screens/github-recipes
│   ├── ShoppingListScreen.tsx      → /screens/shopping-list
│   ├── AccountSetupScreen.tsx      → /screens/account-setup
│   └── WeightTrackingScreen.tsx    → /screens/weight-tracking
```

**Benefits:**
- Automatic deep linking
- Type-safe navigation
- Shared layouts
- Easy to understand structure

---

## 🎨 Styling Guidelines

### React Native StyleSheet

All styles use React Native's StyleSheet API:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});
```

**Best Practices:**
- Use StyleSheet.create for performance
- Keep styles close to components
- Use consistent color palette
- Define reusable style constants

### Color Palette

```typescript
const Colors = {
  primary: '#007AFF',      // iOS blue
  success: '#34C759',      // Green
  warning: '#FF9500',      // Orange
  danger: '#FF3B30',       // Red
  background: '#f5f5f5',   // Light gray
  text: '#333333',         // Dark gray
  textLight: '#666666',    // Medium gray
  border: '#e0e0e0',       // Border gray
};
```

---

## 👤 Author

Matthew A. Smith
- GitHub: [@MattASmithWork](https://github.com/MattASmithWork)

---

## 📄 License

This project is part of the Recipe Book App. See the main repository for license information.

---

## 🚀 Quick Start Summary

```bash
# 1. Clone and navigate
git clone https://github.com/MattASmithWork/RecipeBookApp.git
cd RecipeBookApp/Frontend/RecipeBookAppFrontend/src

# 2. Install dependencies
npm install

# 3. Configure environment
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env

# 4. Start development server
npm start

# 5. Scan QR code with Expo Go app on your phone
```

That's it! The app should now be running on your device.
