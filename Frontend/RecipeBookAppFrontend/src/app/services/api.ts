/**
 * API Service Module
 * 
 * This module handles all HTTP communication with the backend API.
 * It provides typed functions for:
 * - Recipe CRUD operations (Create, Read, Update, Delete)
 * - GitHub recipe fetching
 * - Shopping list management
 * - Inventory management
 * 
 * Uses Axios for HTTP requests with automatic error handling.
 */

import axios from 'axios';

// API base URL - uses environment variable or defaults to localhost
// In production, set EXPO_PUBLIC_API_URL to your deployed backend URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout for all requests
});

// === TypeScript Interfaces (Data Types) ===

/**
 * Recipe Ingredient with measurement
 * Structured ingredient with quantity and unit
 */
export interface RecipeIngredient {
  name: string;  // Ingredient name (e.g., "chicken", "milk")
  amount: number;  // Numeric quantity (e.g., 2, 1.5)
  unit: string;  // Unit of measurement (kg, L, ml, g, etc.)
}

/**
 * Recipe interface for personal recipes
 * Represents a user's saved recipe with all cooking details
 */
export interface Recipe {
  _id?: string;  // MongoDB ID (optional, assigned by database)
  name: string;  // Recipe name/title
  ingredients: string[];  // Legacy: List of ingredient descriptions ["2kg chicken", "1L milk"]
  ingredientsDetailed?: RecipeIngredient[];  // New: Structured ingredients with measurements
  instructions: string[];  // Step-by-step cooking instructions
  prep_time: number;  // Preparation time in minutes
  cook_time: number;  // Cooking time in minutes
  servings: number;  // Number of servings this recipe makes
  user: string;  // Username who owns this recipe
  estimated_calories?: number;  // AI-estimated calories (optional)
}

/**
 * Response type when creating a recipe
 * Backend returns the new recipe's ID
 */
export interface RecipeResponse {
  id: string;  // The MongoDB ObjectId as string
  _id?: string;  // Alternative format
}

/**
 * GitHub Recipe Interface
 * Community recipes from GitHub have flexible/varied schema
 * Uses index signature to allow any additional properties
 */
export interface GitHubRecipe {
  name?: string;  // Recipe name (varies by source)
  title?: string;  // Alternative name field
  ingredients?: string[] | Record<string, any>;  // Can be array or object
  instructions?: string[] | string;  // Can be array or single string
  cuisine?: string;  // Type of cuisine (Italian, Chinese, etc.)
  category?: string;  // Category (dessert, main course, etc.)
  tags?: string[];  // Tags for filtering (vegetarian, quick, etc.)
  prepTime?: number | string;  // Prep time (format varies)
  cookTime?: number | string;  // Cook time (format varies)
  totalTime?: number | string;  // Total time (format varies)
  servings?: number | string;  // Number of servings
  source?: string;  // Always "github" for GitHub recipes
  source_file?: string;  // Original JSON filename
  [key: string]: any;  // Allow any additional properties
}

/**
 * Response when fetching GitHub recipes
 * Includes recipes array, count, and any errors
 */
export interface GitHubRecipesResponse {
  recipes: GitHubRecipe[];  // Array of recipe objects
  total_count: number;  // Number of recipes fetched
  errors: any[];  // Any errors that occurred during fetch
}

/**
 * Shopping List Item
 * Represents an item that needs to be purchased
 */
export interface ShoppingItem {
  _id?: string;  // MongoDB ID (assigned after creation)
  name: string;  // Item name (e.g., "Tomatoes", "Chicken")
  // Legacy format (backwards compatible)
  quantity?: string;  // Quantity description (e.g., "2 lbs", "1 kg")
  // New unit-based format
  amount?: number;  // Numeric quantity (e.g., 2, 1.5)
  unit?: string;  // Unit of measurement (kg, L, ml, g, etc.)
  estimatedPrice?: number;  // Estimated price in GBP
  category?: string;  // Food category (vegetables, dairy, etc.)
  addedBy?: string;  // User who added the item
  addedAt?: string;  // ISO timestamp when added
  // Barcode and nutrition fields
  barcode?: string;  // Product barcode (UPC/EAN)
  calories?: number;  // Calories per serving
  protein?: number;  // Protein in grams
  carbs?: number;  // Carbohydrates in grams
  fat?: number;  // Fat in grams
  servingSize?: string;  // e.g., "100g" or "1 bottle"
}

/**
 * Inventory Item
 * Represents an item currently owned/in stock
 */
export interface InventoryItem {
  _id?: string;  // MongoDB ID
  name: string;  // Item name (e.g., "Chicken", "Milk")
  // Legacy format (backwards compatible)
  quantity?: string;  // Quantity description (e.g., "2kg", "1L")
  // New unit-based format (required for new items)
  amount: number;  // Numeric quantity in stock (e.g., 2.5, 1)
  unit: string;  // Unit of measurement (kg, L, ml, g, etc.)
  lowStockThreshold?: number;  // Alert when amount drops below this value
  category?: string;  // Food category
  purchasedAt?: string;  // ISO timestamp when purchased
  purchasedBy?: string;  // User who purchased it
  // Barcode and nutrition fields
  barcode?: string;  // Product barcode (UPC/EAN)
  calories?: number;  // Calories per serving
  protein?: number;  // Protein in grams
  carbs?: number;  // Carbohydrates in grams
  fat?: number;  // Fat in grams
  servingSize?: string;  // e.g., "100g" or "1 bottle"
}

/**
 * Low Stock Item Response
 * Items that have fallen below their threshold
 */
export interface LowStockItem {
  _id: string;
  name: string;
  amount: number;
  unit: string;
  lowStockThreshold: number;
  percentRemaining: number;
  category?: string;
  purchasedAt?: string;
}

/**
 * Nutrition Information
 * Nutritional breakdown for a meal or food item
 */
export interface NutritionInfo {
  calories: number;  // Total calories
  protein: number;  // Protein in grams
  carbs: number;  // Carbohydrates in grams
  fat: number;  // Fat in grams
  fiber?: number;  // Fiber in grams (optional)
  sugar?: number;  // Sugar in grams (optional)
  sodium?: number;  // Sodium in mg (optional)
}

/**
 * Meal Log
 * Record of a meal consumed with nutritional information
 */
export interface MealLog {
  _id?: string;  // MongoDB ID (assigned after creation)
  user: string;  // Username
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';  // Type of meal
  mealName: string;  // Name/description of meal
  date: string;  // ISO date string (YYYY-MM-DD or full ISO)
  nutrition: NutritionInfo;  // Nutritional breakdown
  recipeId?: string;  // Link to recipe if meal is from a recipe
  servings?: number;  // Number of servings consumed (default 1.0)
  notes?: string;  // Optional notes
  loggedAt?: string;  // Server timestamp when logged
}

/**
 * User Nutrition Goals
 * Daily nutrition targets for a user
 */
export interface UserNutritionGoals {
  _id?: string;
  user: string;  // Username
  dailyCalories: number;  // Target daily calories
  dailyProtein: number;  // Target protein (g)
  dailyCarbs: number;  // Target carbs (g)
  dailyFat: number;  // Target fat (g)
  dailyFiber?: number;  // Target fiber (g)
  dailySugar?: number;  // Max sugar (g)
  dailySodium?: number;  // Max sodium (mg)
}

/**
 * Daily Nutrition Summary
 * Aggregated nutrition data for a single day
 */
export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  meals: MealLog[];
  mealCount: number;
  goals: UserNutritionGoals | null;
  progress: {
    caloriesPercent: number;
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
    remaining: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  } | null;
}

/**
 * Weekly Nutrition Summary
 * 7-day nutrition data with daily breakdowns and averages
 */
export interface WeeklyNutritionSummary {
  weekStart: string;
  weekEnd: string;
  dailySummaries: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealCount: number;
  }>;
  weeklyAverages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  weeklyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * User Account
 * User profile with health metrics
 */
export interface UserAccount {
  _id?: string;
  username: string;
  displayName: string;
  email?: string;
  age: number;
  gender: 'male' | 'female';
  weight: number;  // Current weight in kg
  height: number;  // Height in cm
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  createdAt?: string;
  updatedAt?: string;
  bmr?: number;  // Basal Metabolic Rate
  bmi?: number;  // Body Mass Index
  bmiCategory?: string;  // BMI category (Underweight, Normal, Overweight, Obese)
  recommendedDailyCalories?: number;  // Calculated recommended daily calories
}

/**
 * Weight Entry
 * Monthly weight measurement for tracking
 */
export interface WeightEntry {
  _id?: string;
  username: string;
  weight: number;  // Weight in kg
  date: string;  // Date in YYYY-MM-DD format
  notes?: string;
  weightChange?: number;  // Change from previous entry
  weightChangePercentage?: number;  // Percentage change from previous
}

/**
 * Weight Statistics
 * Calculated statistics for weight tracking
 */
export interface WeightStats {
  username: string;
  firstWeight: number;
  currentWeight: number;
  totalChange: number;
  totalChangePercentage: number;
  monthsTracked: number;
  averageMonthlyChange: number;
  highestWeight: number;
  lowestWeight: number;
  currentTrend: 'gaining' | 'losing' | 'stable' | 'insufficient_data';
  entryCount: number;
  firstDate: string;
  lastDate: string;
}

// === Health Check ===

/**
 * Check if the backend API is reachable and healthy
 * @returns Promise<boolean> - true if healthy, false if unreachable
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// === Recipe API Functions ===

/**
 * Get all recipes for a specific user
 * @param user - Username to filter recipes
 * @returns Promise<Recipe[]> - Array of user's recipes
 */
export const getRecipes = async (user: string): Promise<Recipe[]> => {
  try {
    const response = await api.get(`/recipes/${user}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
};

/**
 * Add a new recipe to the database
 * @param recipe - Recipe object with all required fields
 * @returns Promise<RecipeResponse> - Object containing the new recipe's ID
 */
export const addRecipe = async (recipe: Recipe): Promise<RecipeResponse> => {
  try {
    const response = await api.post('/recipes/', recipe);
    return response.data;
  } catch (error) {
    console.error('Error adding recipe:', error);
    throw error;
  }
};

/**
 * Update an existing recipe
 * @param id - MongoDB ObjectId of the recipe to update
 * @param recipe - Updated recipe data
 * @returns Promise<{message: string}> - Success message
 */
export const updateRecipe = async (id: string, recipe: Recipe): Promise<{ message: string }> => {
  try {
    const response = await api.put(`/recipes/${id}`, recipe);
    return response.data;
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }
};

/**
 * Delete a recipe from the database
 * @param id - MongoDB ObjectId of the recipe to delete
 * @returns Promise<{message: string}> - Success message
 */
export const deleteRecipe = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/recipes/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};

// === GitHub Recipe API ===

/**
 * Fetch community recipes from GitHub repository
 * Retrieves recipes from dpapathanasiou/recipes repo
 * @returns Promise<GitHubRecipesResponse> - Object with recipes array and metadata
 */
export const fetchGitHubRecipes = async (): Promise<GitHubRecipesResponse> => {
  try {
    const response = await api.get('/recipes/fetch-from-github');
    return response.data;
  } catch (error) {
    console.error('Error fetching GitHub recipes:', error);
    throw error;
  }
};

// === Shopping List API Functions ===

/**
 * Get all items in the shared shopping list
 * @returns Promise<ShoppingItem[]> - Array of shopping list items
 */
export const getShoppingList = async (): Promise<ShoppingItem[]> => {
  try {
    const response = await api.get('/shopping-list');
    return response.data;
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    throw error;
  }
};

/**
 * Add a new item to the shopping list
 * Backend automatically adds timestamp
 * @param item - ShoppingItem with name, quantity, and optional price/category
 * @returns Promise<{id: string, message: string}> - New item ID and success message
 */
export const addShoppingItem = async (item: ShoppingItem): Promise<{ id: string; message: string }> => {
  try {
    const response = await api.post('/shopping-list', item);
    return response.data;
  } catch (error) {
    console.error('Error adding shopping item:', error);
    throw error;
  }
};

/**
 * Update an existing shopping list item
 * @param id - Item's MongoDB ObjectId
 * @param item - Updated item data
 * @returns Promise<{message: string}> - Success message
 */
export const updateShoppingItem = async (id: string, item: ShoppingItem): Promise<{ message: string }> => {
  try {
    const response = await api.put(`/shopping-list/${id}`, item);
    return response.data;
  } catch (error) {
    console.error('Error updating shopping item:', error);
    throw error;
  }
};

/**
 * Delete an item from the shopping list
 * @param id - Item's MongoDB ObjectId
 * @returns Promise<{message: string}> - Success message
 */
export const deleteShoppingItem = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/shopping-list/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    throw error;
  }
};

/**
 * Mark a shopping list item as bought and move it to inventory
 * This is the key operation for the shopping workflow
 * @param id - Shopping list item's MongoDB ObjectId
 * @param purchasedBy - Optional username of who bought the item
 * @returns Promise<{message: string}> - Success message
 */
export const markItemBought = async (id: string, purchasedBy?: string): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/shopping-list/${id}/mark-bought`, null, {
      params: { purchasedBy }  // Pass purchasedBy as query parameter
    });
    return response.data;
  } catch (error) {
    console.error('Error marking item as bought:', error);
    throw error;
  }
};

/**
 * Look up product information by barcode
 * Uses Open Food Facts API via backend
 * @param barcode - Product barcode (UPC/EAN-13, 8-13 digits)
 * @returns Promise with product data if found
 */
export const lookupBarcode = async (barcode: string): Promise<{
  found: boolean;
  product?: {
    name: string;
    brand: string;
    barcode: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: string;
    imageUrl: string;
    category: string;
  };
  message?: string;
}> => {
  try {
    const response = await api.get(`/barcode/${barcode}`);
    return response.data;
  } catch (error) {
    console.error('Error looking up barcode:', error);
    throw error;
  }
};

// === Inventory API Functions ===

/**
 * Get all items in the inventory (items owned/in stock)
 * @returns Promise<InventoryItem[]> - Array of inventory items
 */
export const getInventory = async (): Promise<InventoryItem[]> => {
  try {
    const response = await api.get('/inventory');
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};

/**
 * Add an item directly to inventory (without shopping list)
 * Useful for adding items you already own
 * @param item - InventoryItem with name, quantity, and optional metadata
 * @returns Promise<{id: string, message: string}> - New item ID and success message
 */
export const addInventoryItem = async (item: InventoryItem): Promise<{ id: string; message: string }> => {
  try {
    const response = await api.post('/inventory', item);
    return response.data;
  } catch (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
};

/**
 * Update an existing inventory item
 * @param id - Item's MongoDB ObjectId
 * @param item - Updated item data
 * @returns Promise<{message: string}> - Success message
 */
export const updateInventoryItem = async (id: string, item: InventoryItem): Promise<{ message: string }> => {
  try {
    const response = await api.put(`/inventory/${id}`, item);
    return response.data;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

/**
 * Delete an item from inventory (item used up or discarded)
 * @param id - Item's MongoDB ObjectId
 * @returns Promise<{message: string}> - Success message
 */
export const deleteInventoryItem = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

// === New Inventory Management Functions ===

/**
 * Consume (subtract) an ingredient from inventory
 * Automatically removes item if amount reaches 0
 * @param ingredientName - Name of ingredient to consume
 * @param amount - Amount to subtract
 * @param unit - Unit of measurement
 * @returns Promise with consumption details, low stock warnings, and removal status
 */
export const consumeIngredient = async (
  ingredientName: string,
  amount: number,
  unit: string
): Promise<{
  message: string;
  previousAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  removed: boolean;
  lowStock: boolean;
  lowStockThreshold?: number;
}> => {
  try {
    const response = await api.post('/inventory/consume-ingredient', {
      ingredientName,
      amount,
      unit,
    });
    return response.data;
  } catch (error) {
    console.error('[API] Error consuming ingredient:', error);
    throw error;
  }
};

/**
 * Consume all ingredients needed for a recipe
 * Automatically subtracts from inventory and handles missing/low stock items
 * @param recipeId - MongoDB ObjectId of the recipe
 * @param servingsMultiplier - Scale recipe (default 1.0, use 2.0 for double)
 * @returns Promise with detailed consumption results, warnings, and low stock alerts
 */
export const consumeRecipe = async (
  recipeId: string,
  servingsMultiplier: number = 1.0
): Promise<{
  message: string;
  consumed: Array<{
    name: string;
    consumed: number;
    unit: string;
    remaining: number;
    removed?: boolean;
    lowStock?: boolean;
    threshold?: number;
  }>;
  lowStock: Array<{
    name: string;
    remaining: number;
    threshold: number;
    unit: string;
  }>;
  removed: string[];
  missing: Array<{
    name: string;
    needed: number;
    unit: string;
  }>;
  warnings: string[];
}> => {
  try {
    const response = await api.post(`/inventory/consume-recipe/${recipeId}`, {
      servingsMultiplier,
    });
    return response.data;
  } catch (error) {
    console.error('[API] Error consuming recipe:', error);
    throw error;
  }
};

/**
 * Get all inventory items below their low stock threshold
 * @returns Promise with array of low stock items and total count
 */
export const getLowStockItems = async (): Promise<{
  lowStockItems: LowStockItem[];
  count: number;
}> => {
  try {
    const response = await api.get('/inventory/low-stock');
    return response.data;
  } catch (error) {
    console.error('[API] Error fetching low stock items:', error);
    throw error;
  }
};

/**
 * Manually update the amount of an inventory item
 * Automatically removes item if amount set to 0 or below
 * @param id - Inventory item's MongoDB ObjectId
 * @param amount - New amount value
 * @returns Promise with update details and low stock warning if applicable
 */
export const updateInventoryAmount = async (
  id: string,
  amount: number
): Promise<{
  message: string;
  previousAmount: number;
  newAmount: number;
  removed: boolean;
  lowStock: boolean;
  lowStockThreshold?: number;
}> => {
  try {
    const response = await api.patch(`/inventory/${id}/amount`, { amount });
    return response.data;
  } catch (error) {
    console.error('[API] Error updating inventory amount:', error);
    throw error;
  }
};

// === Nutrition Tracking API Functions ===

/**
 * Log a meal with nutritional information
 * @param meal - MealLog with user, date, meal type, and nutrition data
 * @returns Promise with meal log ID and success message
 */
export const logMeal = async (meal: MealLog): Promise<{ id: string; message: string }> => {
  try {
    const response = await api.post('/nutrition/log', meal);
    return response.data;
  } catch (error) {
    console.error('[API] Error logging meal:', error);
    throw error;
  }
};

/**
 * Get nutrition logs for a user
 * @param user - Username
 * @param date - Single date (YYYY-MM-DD) for that day's logs
 * @param startDate - Start of date range (YYYY-MM-DD)
 * @param endDate - End of date range (YYYY-MM-DD)
 * @returns Promise with array of meal logs
 */
export const getNutritionLogs = async (
  user: string,
  date?: string,
  startDate?: string,
  endDate?: string
): Promise<MealLog[]> => {
  try {
    const params: any = {};
    if (date) params.date = date;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get(`/nutrition/logs/${user}`, { params });
    return response.data;
  } catch (error) {
    console.error('[API] Error fetching nutrition logs:', error);
    throw error;
  }
};

/**
 * Get daily nutrition summary for a user on a specific date
 * @param user - Username
 * @param date - Date (YYYY-MM-DD)
 * @returns Promise with daily totals, meals, goals, and progress
 */
export const getDailyNutritionSummary = async (
  user: string,
  date: string
): Promise<DailyNutritionSummary> => {
  try {
    const response = await api.get(`/nutrition/daily-summary/${user}/${date}`);
    return response.data;
  } catch (error) {
    console.error('[API] Error fetching daily nutrition summary:', error);
    throw error;
  }
};

/**
 * Update an existing meal log
 * @param id - Meal log's MongoDB ObjectId
 * @param meal - Updated meal data
 * @returns Promise with success message
 */
export const updateMealLog = async (id: string, meal: MealLog): Promise<{ message: string }> => {
  try {
    const response = await api.put(`/nutrition/log/${id}`, meal);
    return response.data;
  } catch (error) {
    console.error('[API] Error updating meal log:', error);
    throw error;
  }
};

/**
 * Delete a meal log
 * @param id - Meal log's MongoDB ObjectId
 * @returns Promise with success message
 */
export const deleteMealLog = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/nutrition/log/${id}`);
    return response.data;
  } catch (error) {
    console.error('[API] Error deleting meal log:', error);
    throw error;
  }
};

/**
 * Set or update nutrition goals for a user
 * @param goals - UserNutritionGoals with daily targets
 * @returns Promise with success message and optional ID
 */
export const setNutritionGoals = async (
  goals: UserNutritionGoals
): Promise<{ message: string; id?: string }> => {
  try {
    const response = await api.post('/nutrition/goals', goals);
    return response.data;
  } catch (error) {
    console.error('[API] Error setting nutrition goals:', error);
    throw error;
  }
};

/**
 * Get nutrition goals for a user
 * @param user - Username
 * @returns Promise with user's nutrition goals
 */
export const getNutritionGoals = async (user: string): Promise<UserNutritionGoals> => {
  try {
    const response = await api.get(`/nutrition/goals/${user}`);
    return response.data;
  } catch (error) {
    console.error('[API] Error fetching nutrition goals:', error);
    throw error;
  }
};

/**
 * Get 7-day nutrition summary for a user
 * @param user - Username
 * @param endDate - End date (YYYY-MM-DD), defaults to today
 * @returns Promise with weekly summary including daily data and averages
 */
export const getWeeklyNutritionSummary = async (
  user: string,
  endDate?: string
): Promise<WeeklyNutritionSummary> => {
  try {
    const params = endDate ? { endDate } : {};
    const response = await api.get(`/nutrition/weekly-summary/${user}`, { params });
    return response.data;
  } catch (error) {
    console.error('[API] Error fetching weekly nutrition summary:', error);
    throw error;
  }
};

// === User Account API Functions ===

/**
 * Create a new user account
 * @param account - UserAccount data
 * @returns Promise with account ID and calculated health metrics
 */
export const createAccount = async (
  account: UserAccount
): Promise<{ 
  id: string; 
  message: string; 
  username: string;
  bmr: number;
  bmi: number;
  bmiCategory: string;
  recommendedDailyCalories: number;
}> => {
  try {
    const response = await api.post('/accounts/create', account);
    return response.data;
  } catch (error) {
    console.error('[API] Error creating account:', error);
    throw error;
  }
};

/**
 * Get user account details
 * @param username - Username to retrieve
 * @returns Promise with user account data including health metrics
 */
export const getAccount = async (username: string): Promise<UserAccount> => {
  try {
    const response = await api.get(`/accounts/${username}`);
    return response.data;
  } catch (error) {
    console.error('[API] Error fetching account:', error);
    throw error;
  }
};

/**
 * Update user account
 * @param username - Username to update
 * @param account - Updated account data
 * @returns Promise with updated health metrics
 */
export const updateAccount = async (
  username: string,
  account: UserAccount
): Promise<{
  message: string;
  username: string;
  bmr: number;
  bmi: number;
  bmiCategory: string;
  recommendedDailyCalories: number;
}> => {
  try {
    const response = await api.put(`/accounts/${username}`, account);
    return response.data;
  } catch (error) {
    console.error('[API] Error updating account:', error);
    throw error;
  }
};

/**
 * Delete user account and all associated data
 * @param username - Username to delete
 * @returns Promise with confirmation message
 */
export const deleteAccount = async (username: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/accounts/${username}`);
    return response.data;
  } catch (error) {
    console.error('[API] Error deleting account:', error);
    throw error;
  }
};

// === Weight Tracking API Functions ===

/**
 * Log a weight measurement
 * @param entry - WeightEntry with username, weight, date, and optional notes
 * @returns Promise with entry ID and updated BMI
 */
export const logWeight = async (
  entry: WeightEntry
): Promise<{ id: string; message: string; newBmi: number; bmiCategory: string }> => {
  try {
    const response = await api.post('/weight/log', entry);
    return response.data;
  } catch (error) {
    console.error('[API] Error logging weight:', error);
    throw error;
  }
};

/**
 * Get weight tracking history for a user
 * @param username - Username to retrieve history for
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @returns Promise with array of weight entries
 */
export const getWeightHistory = async (
  username: string,
  startDate?: string,
  endDate?: string
): Promise<WeightEntry[]> => {
  try {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get(`/weight/${username}`, { params });
    return response.data;
  } catch (error) {
    console.error('[API] Error fetching weight history:', error);
    throw error;
  }
};

/**
 * Delete a weight entry
 * @param id - Weight entry ID
 * @returns Promise with confirmation message
 */
export const deleteWeightEntry = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/weight/${id}`);
    return response.data;
  } catch (error) {
    console.error('[API] Error deleting weight entry:', error);
    throw error;
  }
};

/**
 * Get weight tracking statistics
 * @param username - Username to calculate stats for
 * @returns Promise with weight statistics
 */
export const getWeightStats = async (username: string): Promise<WeightStats> => {
  try {
    const response = await api.get(`/weight/${username}/stats`);
    return response.data;
  } catch (error) {
    console.error('[API] Error fetching weight stats:', error);
    throw error;
  }
};

// Export the axios instance for advanced usage if needed
export default api;


