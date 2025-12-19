# RecipeApp Mobile

A React Native (Expo) mobile app for managing recipes and discovering what you can cook based on available ingredients.

## Features

- 📖 **View Recipes:** Browse all your recipes organized by user
- 🥘 **Ingredient Matching:** Add your ingredients and see which recipes you can cook
- 🎯 **Smart Suggestions:** Get exact matches and close-match recipes
- 🔄 **Sync with Backend:** Real-time sync with your FastAPI backend
- 📱 **Cross-Platform:** Works on Android and iOS

## Setup

### Prerequisites

- Node.js 16+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio emulator or physical device with Expo Go app

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Create .env file (copy from .env.example)
cp .env.example .env

# Update .env with your API URL
EXPO_PUBLIC_API_URL=http://your-api-url:8000
```

### Running the App

```bash
# Start Expo development server
npm start

# For Android emulator
npm run android

# For iOS simulator (macOS only)
npm run ios

# For web
npm run web
```

## Architecture

### Services
- `app/services/api.ts` - HTTP client for FastAPI backend (recipes CRUD operations)

### Screens
- `app/screens/RecipesScreen.tsx` - View and manage recipes
- `app/screens/IngredientsScreen.tsx` - Add ingredients and see matching recipes

### Utilities
- `app/utils/recipeMatching.ts` - Ingredient matching logic and recipe suggestions
- `app/utils/store.ts` - Zustand state management (recipes, ingredients, user)

### Main Entry
- `app/index.tsx` - App shell with tab navigation and API health check

## How It Works

### Ingredient Matching

1. User adds ingredients manually (e.g., "tomato", "chicken", "pasta")
2. App compares user ingredients against all recipes
3. Recipes are categorized:
   - ✅ **Can Cook:** 100% of ingredients available
   - 🟡 **Close Match:** 80%+ of ingredients available (1-2 items short)

### Matching Algorithm

- Normalizes ingredient names (lowercase, trim whitespace)
- Supports partial matches (e.g., "tomato" matches "cherry tomato")
- Calculates match percentage for each recipe
- Ranks by highest match percentage first

## Environment Variables

Create a `.env` file:

```env
# API endpoint (defaults to localhost:8000 if not set)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

For local development with Docker:
```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

For Railway deployment:
```env
EXPO_PUBLIC_API_URL=https://your-railway-app.up.railway.app
```

## Backend Integration

The app expects these FastAPI endpoints:

- `GET /health` - Health check
- `GET /recipes/{user}` - Get all recipes for a user
- `POST /recipes/` - Create a new recipe
- `PUT /recipes/{id}` - Update a recipe
- `DELETE /recipes/{id}` - Delete a recipe

See `../../../backend` for the FastAPI implementation.

## Future Enhancements

- [ ] AnyList API integration for automatic ingredient sync
- [ ] Add recipe screen with full details and instructions
- [ ] User authentication
- [ ] Shopping list generation
- [ ] Recipe filtering and search
- [ ] Nutritional info and ratings
- [ ] Offline caching

## Dependencies

- **expo** - React Native framework
- **expo-router** - File-based routing
- **react-native** - Mobile UI framework
- **axios** - HTTP client
- **zustand** - Lightweight state management
- **typescript** - Type safety

## Troubleshooting

### "Could not connect to API"
- Ensure backend is running (`docker compose up` in backend folder)
- Check that `EXPO_PUBLIC_API_URL` points to correct backend URL
- On physical device, use your machine's local IP, not `localhost`

### "Cannot find module" errors
- Run `npm install` to ensure all dependencies are installed
- Restart Expo dev server: `npm start` (press 'r')

### Emulator connection issues
- For Android emulator, use `10.0.2.2` instead of `localhost`
- Ensure firewall allows port 8000 (or whatever backend port is used)

## License

MIT
