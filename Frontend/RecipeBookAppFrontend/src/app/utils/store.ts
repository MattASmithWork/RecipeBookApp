/**
 * Global State Management Store (using Zustand)
 * 
 * This file defines the app's global state that is shared across all screens.
 * Uses Zustand library for lightweight state management (simpler than Redux).
 * 
 * State includes:
 * - User's personal recipes
 * - Shopping list (synced with MongoDB)
 * - Inventory/owned items (synced with MongoDB)
 * - Budget settings
 * - User information
 * 
 * Note: Shopping list and inventory are now primarily managed in MongoDB.
 * This store holds the local copy for fast UI updates.
 */

import { create } from 'zustand';
import { Recipe, ShoppingItem as APIShoppingItem, InventoryItem as APIInventoryItem } from '../services/api';

// === Type Definitions ===

/**
 * ShoppingItem with optional id for backwards compatibility
 * Extends the API interface with legacy id field
 */
interface ShoppingItem extends APIShoppingItem {
  id?: string;  // For backwards compatibility with older code
}

/**
 * InventoryItem with optional addedAt date
 * Extends the API interface with local timestamp field
 */
interface InventoryItem extends APIInventoryItem {
  addedAt?: Date;  // Local timestamp for sorting/display
}

/**
 * RecipeStore Interface
 * Defines all the state properties and methods available in the store
 */
interface RecipeStore {
  // === State Properties ===
  recipes: Recipe[];  // User's personal recipes
  userIngredients: string[];  // Ingredients user has marked as available
  currentUser: string;  // Current logged-in user
  shoppingList: ShoppingItem[];  // Items to buy (synced from MongoDB)
  inventory: InventoryItem[];  // Items owned (synced from MongoDB)
  budget: number;  // Budget limit in GBP
  lowStockAlerts: string[];  // Items that are low on stock (item names)
  
  // === Recipe Management Methods ===
  setRecipes: (recipes: Recipe[]) => void;  // Replace all recipes
  addRecipe: (recipe: Recipe) => void;  // Add a single recipe
  removeRecipe: (id: string) => void;  // Remove recipe by ID
  
  // === Ingredient Management Methods ===
  setUserIngredients: (ingredients: string[]) => void;  // Replace all ingredients
  addIngredient: (ingredient: string) => void;  // Add single ingredient
  removeIngredient: (ingredient: string) => void;  // Remove ingredient
  
  // === User Management ===
  setCurrentUser: (user: string) => void;  // Change active user
  
  // === Shopping List & Inventory Methods ===
  // These update local state - actual persistence happens via API calls in components
  setShoppingList: (items: ShoppingItem[]) => void;  // Update shopping list from API
  setInventory: (items: InventoryItem[]) => void;  // Update inventory from API
  setLowStockAlerts: (items: string[]) => void;  // Update low stock alerts
  
  // === Budget Management ===
  setBudget: (amount: number) => void;  // Set budget limit
}

/**
 * Create and export the Zustand store
 * This hook can be used in any component: const { recipes, addRecipe } = useRecipeStore();
 */
export const useRecipeStore = create<RecipeStore>((set) => ({
  // === Initial State Values ===
  recipes: [],  // Empty recipes array initially
  userIngredients: [],  // No ingredients marked initially
  currentUser: 'alice',  // Default user (can be changed to support user switching)
  shoppingList: [],  // Empty shopping list (loaded from API on mount)
  inventory: [],  // Empty inventory (loaded from API on mount)
  budget: 100,  // Default budget of £100
  lowStockAlerts: [],  // No low stock alerts initially

  // === Recipe Management Implementation ===
  
  /**
   * Replace entire recipes array
   * Used when loading recipes from API
   */
  setRecipes: (recipes) => set({ recipes }),
  
  /**
   * Add a single recipe to the store
   * Appends to existing recipes array
   */
  addRecipe: (recipe) =>
    set((state) => ({
      recipes: [...state.recipes, recipe],
    })),
  
  /**
   * Remove a recipe by its MongoDB _id
   * Filters out the recipe with matching ID
   */
  removeRecipe: (id) =>
    set((state) => ({
      recipes: state.recipes.filter((r) => r._id !== id),
    })),

  // === Ingredient Management Implementation ===
  
  /**
   * Replace entire ingredients array
   */
  setUserIngredients: (ingredients) => set({ userIngredients: ingredients }),
  
  /**
   * Add a single ingredient
   * Converts to lowercase and uses Set to prevent duplicates
   */
  addIngredient: (ingredient) =>
    set((state) => ({
      userIngredients: Array.from(new Set([...state.userIngredients, ingredient.toLowerCase()])),
    })),
  
  /**
   * Remove an ingredient (case-insensitive)
   */
  removeIngredient: (ingredient) =>
    set((state) => ({
      userIngredients: state.userIngredients.filter(
        (ing) => ing.toLowerCase() !== ingredient.toLowerCase()
      ),
    })),

  // === User Management Implementation ===
  
  /**
   * Change the active user
   * Used to switch between different household members
   */
  setCurrentUser: (user) => set({ currentUser: user }),

  // === Budget Management Implementation ===
  
  /**
   * Set the budget limit
   * Amount in GBP
   */
  setBudget: (amount) => set({ budget: amount }),

  // === Shopping List & Inventory Implementation ===
  
  /**
   * Update shopping list from API data
   * Called after fetching from MongoDB
   */
  setShoppingList: (items) => set({ shoppingList: items }),
  
  /**
   * Update inventory from API data
   * Called after fetching from MongoDB
   */
  setInventory: (items) => set({ inventory: items }),
  
  /**
   * Update low stock alerts
   * Called after checking inventory against thresholds
   */
  setLowStockAlerts: (items) => set({ lowStockAlerts: items }),
}));
