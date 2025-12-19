import { create } from 'zustand';
import { Recipe } from '../services/api';

interface RecipeStore {
  recipes: Recipe[];
  userIngredients: string[];
  currentUser: string;
  setRecipes: (recipes: Recipe[]) => void;
  addRecipe: (recipe: Recipe) => void;
  removeRecipe: (id: string) => void;
  setUserIngredients: (ingredients: string[]) => void;
  addIngredient: (ingredient: string) => void;
  removeIngredient: (ingredient: string) => void;
  setCurrentUser: (user: string) => void;
}

export const useRecipeStore = create<RecipeStore>((set) => ({
  recipes: [],
  userIngredients: [],
  currentUser: 'alice',

  setRecipes: (recipes) => set({ recipes }),
  addRecipe: (recipe) =>
    set((state) => ({
      recipes: [...state.recipes, recipe],
    })),
  removeRecipe: (id) =>
    set((state) => ({
      recipes: state.recipes.filter((r) => r._id !== id),
    })),

  setUserIngredients: (ingredients) => set({ userIngredients: ingredients }),
  addIngredient: (ingredient) =>
    set((state) => ({
      userIngredients: Array.from(new Set([...state.userIngredients, ingredient.toLowerCase()])),
    })),
  removeIngredient: (ingredient) =>
    set((state) => ({
      userIngredients: state.userIngredients.filter(
        (ing) => ing.toLowerCase() !== ingredient.toLowerCase()
      ),
    })),

  setCurrentUser: (user) => set({ currentUser: user }),
}));
