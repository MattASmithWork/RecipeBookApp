import axios from 'axios';

// Replace with your Railway or local API URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export interface Recipe {
  _id?: string;
  name: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  user: string;
}

export interface RecipeResponse {
  id: string;
  _id?: string;
}

// Health check
export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// Get all recipes for a user
export const getRecipes = async (user: string): Promise<Recipe[]> => {
  try {
    const response = await api.get(`/recipes/${user}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
};

// Add a new recipe
export const addRecipe = async (recipe: Recipe): Promise<RecipeResponse> => {
  try {
    const response = await api.post('/recipes/', recipe);
    return response.data;
  } catch (error) {
    console.error('Error adding recipe:', error);
    throw error;
  }
};

// Update a recipe
export const updateRecipe = async (id: string, recipe: Recipe): Promise<{ message: string }> => {
  try {
    const response = await api.put(`/recipes/${id}`, recipe);
    return response.data;
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }
};

// Delete a recipe
export const deleteRecipe = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/recipes/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};

export default api;
