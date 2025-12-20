/**
 * Unit tests for API service functions
 * Tests: HTTP requests, error handling, data transformation
 */

import axios from 'axios';
import {
  fetchRecipes,
  addRecipe,
  deleteRecipe,
  fetchGitHubRecipes,
  addShoppingItem,
  markItemAsBought,
  deleteShoppingItem,
  fetchInventory,
  addInventoryItem,
  consumeIngredient,
  consumeRecipe,
  getLowStockItems,
  updateItemAmount,
  deleteInventoryItem,
  createAccount,
  getAccount,
  updateAccount,
  deleteAccount,
  logWeight,
  getWeightHistory,
  deleteWeightEntry,
  getWeightStats,
  logMeal,
  getMealLogs,
  getDailySummary,
  updateMealLog,
  deleteMealLog,
  setNutritionGoals,
  getNutritionGoals,
  getWeeklySummary,
} from '../services/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Recipe API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRecipes', () => {
    it('should fetch recipes for a user successfully', async () => {
      const mockResponse = {
        data: {
          total_count: 2,
          recipes: [
            { id: '1', name: 'Recipe 1', ingredients: ['a'], instructions: ['b'], prep_time: 10, cook_time: 20, servings: 2 },
            { id: '2', name: 'Recipe 2', ingredients: ['c'], instructions: ['d'], prep_time: 15, cook_time: 25, servings: 4 },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await fetchRecipes('test_user');

      expect(mockedAxios.get).toHaveBeenCalledWith('/recipes/test_user');
      expect(result.total_count).toBe(2);
      expect(result.recipes).toHaveLength(2);
    });

    it('should handle fetch recipes error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(fetchRecipes('test_user')).rejects.toThrow('Network error');
    });
  });

  describe('addRecipe', () => {
    it('should add a recipe successfully', async () => {
      const newRecipe = {
        name: 'New Recipe',
        ingredients: ['ingredient1', 'ingredient2'],
        instructions: ['step1', 'step2'],
        prep_time: 10,
        cook_time: 20,
        servings: 4,
        user: 'test_user',
      };

      const mockResponse = {
        data: { id: '123', message: 'Recipe added successfully!' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await addRecipe(newRecipe);

      expect(mockedAxios.post).toHaveBeenCalledWith('/recipes', newRecipe);
      expect(result.id).toBe('123');
    });
  });

  describe('deleteRecipe', () => {
    it('should delete a recipe successfully', async () => {
      const mockResponse = {
        data: { message: 'Recipe deleted successfully!' },
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      await deleteRecipe('recipe123', 'test_user');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/recipes/recipe123?user=test_user');
    });
  });

  describe('fetchGitHubRecipes', () => {
    it('should fetch GitHub recipes successfully', async () => {
      const mockResponse = {
        data: {
          total_count: 10,
          recipes: [{ id: '1', name: 'Community Recipe' }],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await fetchGitHubRecipes();

      expect(mockedAxios.get).toHaveBeenCalledWith('/github-recipes');
      expect(result.total_count).toBe(10);
    });
  });
});

describe('User Account API Functions', () => {
  describe('createAccount', () => {
    it('should create account with calculated metrics', async () => {
      const accountData = {
        username: 'matt',
        displayName: 'Matt',
        age: 30,
        gender: 'male' as const,
        weight: 80.0,
        height: 180,
        activityLevel: 'moderately_active' as const,
      };

      const mockResponse = {
        data: {
          id: 'acc123',
          username: 'matt',
          bmr: 1780.0,
          bmi: 24.69,
          bmiCategory: 'Normal weight',
          recommendedDailyCalories: 2759.0,
          message: 'Account created successfully!',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await createAccount(accountData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/accounts/create', accountData);
      expect(result.bmr).toBe(1780.0);
      expect(result.bmiCategory).toBe('Normal weight');
    });
  });

  describe('getAccount', () => {
    it('should fetch account details', async () => {
      const mockResponse = {
        data: {
          username: 'matt',
          age: 30,
          bmr: 1780.0,
          bmi: 24.69,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getAccount('matt');

      expect(mockedAxios.get).toHaveBeenCalledWith('/accounts/matt');
      expect(result.username).toBe('matt');
    });

    it('should handle account not found error', async () => {
      mockedAxios.get.mockRejectedValue({ response: { status: 404, data: { detail: 'Account not found' } } });

      await expect(getAccount('nonexistent')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe('updateAccount', () => {
    it('should update account and recalculate metrics', async () => {
      const updateData = {
        weight: 75.0,
        activityLevel: 'very_active' as const,
      };

      const mockResponse = {
        data: {
          message: 'Account updated successfully!',
          bmr: 1730.0,
          bmi: 23.15,
          recommendedDailyCalories: 2985.0,
        },
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await updateAccount('matt', updateData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/accounts/matt', updateData);
      expect(result.bmr).toBe(1730.0);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account', async () => {
      const mockResponse = {
        data: { message: 'Account deleted successfully' },
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      await deleteAccount('matt');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/accounts/matt');
    });
  });
});

describe('Weight Tracking API Functions', () => {
  describe('logWeight', () => {
    it('should log weight entry successfully', async () => {
      const weightEntry = {
        username: 'matt',
        weight: 79.5,
        date: '2025-12-20',
        notes: 'Morning weight',
      };

      const mockResponse = {
        data: {
          id: 'weight123',
          message: 'Weight logged successfully!',
          newBmi: 24.54,
          bmiCategory: 'Normal weight',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await logWeight(weightEntry);

      expect(mockedAxios.post).toHaveBeenCalledWith('/weight/log', weightEntry);
      expect(result.newBmi).toBe(24.54);
    });
  });

  describe('getWeightHistory', () => {
    it('should fetch weight history with calculations', async () => {
      const mockResponse = {
        data: [
          { weight: 80.0, date: '2025-11-20' },
          { weight: 79.5, date: '2025-12-01', weightChange: -0.5, weightChangePercentage: -0.63 },
          { weight: 79.0, date: '2025-12-20', weightChange: -0.5, weightChangePercentage: -0.63 },
        ],
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getWeightHistory('matt');

      expect(mockedAxios.get).toHaveBeenCalledWith('/weight/matt');
      expect(result).toHaveLength(3);
    });

    it('should fetch weight history with date range', async () => {
      const mockResponse = { data: [] };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getWeightHistory('matt', '2025-12-01', '2025-12-31');

      expect(mockedAxios.get).toHaveBeenCalledWith('/weight/matt?startDate=2025-12-01&endDate=2025-12-31');
    });
  });

  describe('getWeightStats', () => {
    it('should fetch comprehensive weight statistics', async () => {
      const mockResponse = {
        data: {
          firstWeight: 80.0,
          currentWeight: 78.0,
          totalChange: -2.0,
          totalChangePercentage: -2.5,
          monthsTracked: 2,
          averageMonthlyChange: -1.0,
          highestWeight: 80.0,
          lowestWeight: 78.0,
          currentTrend: 'losing',
          entryCount: 5,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getWeightStats('matt');

      expect(mockedAxios.get).toHaveBeenCalledWith('/weight/matt/stats');
      expect(result.currentTrend).toBe('losing');
      expect(result.totalChange).toBe(-2.0);
    });
  });

  describe('deleteWeightEntry', () => {
    it('should delete weight entry', async () => {
      const mockResponse = {
        data: { message: 'Weight entry deleted successfully' },
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      await deleteWeightEntry('weight123');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/weight/weight123');
    });
  });
});

describe('Nutrition Tracking API Functions', () => {
  describe('logMeal', () => {
    it('should log meal successfully', async () => {
      const mealData = {
        user: 'test_user',
        mealType: 'lunch' as const,
        mealName: 'Grilled Chicken Salad',
        date: '2025-12-20',
        nutrition: {
          calories: 450,
          protein: 35,
          carbs: 25,
          fat: 20,
        },
        servings: 1,
      };

      const mockResponse = {
        data: { id: 'meal123', message: 'Meal logged successfully!' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await logMeal(mealData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/nutrition/log', mealData);
      expect(result.id).toBe('meal123');
    });
  });

  describe('getDailySummary', () => {
    it('should fetch daily nutrition summary', async () => {
      const mockResponse = {
        data: {
          date: '2025-12-20',
          meals: [],
          totalCalories: 1850,
          totalProtein: 120,
          totalCarbs: 190,
          totalFat: 62,
          goals: { dailyCalories: 2500 },
          progress: { calories: 74 },
          remaining: { calories: 650 },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getDailySummary('test_user', '2025-12-20');

      expect(mockedAxios.get).toHaveBeenCalledWith('/nutrition/daily-summary/test_user/2025-12-20');
      expect(result.totalCalories).toBe(1850);
    });
  });

  describe('getWeeklySummary', () => {
    it('should fetch weekly nutrition summary', async () => {
      const mockResponse = {
        data: {
          weekStart: '2025-12-14',
          weekEnd: '2025-12-20',
          dailySummaries: [],
          weeklyAverages: { calories: 2100 },
          weeklyTotals: { calories: 14700 },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getWeeklySummary('test_user', '2025-12-20');

      expect(mockedAxios.get).toHaveBeenCalledWith('/nutrition/weekly-summary/test_user?endDate=2025-12-20');
      expect(result.weeklyAverages.calories).toBe(2100);
    });
  });

  describe('setNutritionGoals', () => {
    it('should set nutrition goals', async () => {
      const goalsData = {
        user: 'test_user',
        dailyCalories: 2500,
        dailyProtein: 150,
        dailyCarbs: 250,
        dailyFat: 83,
      };

      const mockResponse = {
        data: { message: 'Nutrition goals set successfully!' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await setNutritionGoals(goalsData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/nutrition/goals', goalsData);
    });
  });

  describe('getNutritionGoals', () => {
    it('should fetch nutrition goals', async () => {
      const mockResponse = {
        data: {
          user: 'test_user',
          dailyCalories: 2500,
          dailyProtein: 150,
          dailyCarbs: 250,
          dailyFat: 83,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getNutritionGoals('test_user');

      expect(mockedAxios.get).toHaveBeenCalledWith('/nutrition/goals/test_user');
      expect(result.dailyCalories).toBe(2500);
    });
  });
});

describe('Shopping List API Functions', () => {
  describe('addShoppingItem', () => {
    it('should add item to shopping list', async () => {
      const item = {
        name: 'Tomatoes',
        amount: 5,
        unit: 'pieces',
        estimatedPrice: 3.5,
        category: 'vegetables',
        addedBy: 'test_user',
        bought: false,
      };

      const mockResponse = {
        data: { message: 'Item added to shopping list!' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await addShoppingItem(item);

      expect(mockedAxios.post).toHaveBeenCalledWith('/shopping-list', item);
    });
  });

  describe('markItemAsBought', () => {
    it('should mark item as bought', async () => {
      const mockResponse = {
        data: { message: 'Item marked as bought and moved to inventory' },
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      await markItemAsBought('item123', 'test_user');

      expect(mockedAxios.put).toHaveBeenCalledWith('/shopping-list/item123/mark-bought?user=test_user');
    });
  });
});

describe('Inventory API Functions', () => {
  describe('consumeIngredient', () => {
    it('should consume ingredient from inventory', async () => {
      const consumeData = {
        name: 'Flour',
        amount: 2.0,
        unit: 'kg',
      };

      const mockResponse = {
        data: {
          message: 'Ingredient consumed successfully!',
          newAmount: 3.0,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await consumeIngredient(consumeData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/inventory/consume-ingredient', consumeData);
      expect(result.newAmount).toBe(3.0);
    });
  });

  describe('getLowStockItems', () => {
    it('should fetch low stock items', async () => {
      const mockResponse = {
        data: [
          { name: 'Flour', amount: 0.3, lowStockThreshold: 1.0, percentRemaining: 30 },
          { name: 'Salt', amount: 0.05, lowStockThreshold: 0.1, percentRemaining: 50 },
        ],
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getLowStockItems();

      expect(mockedAxios.get).toHaveBeenCalledWith('/inventory/low-stock');
      expect(result).toHaveLength(2);
    });
  });

  describe('updateItemAmount', () => {
    it('should update item amount', async () => {
      const updateData = {
        itemId: 'item123',
        amount: 5.0,
      };

      const mockResponse = {
        data: { message: 'Item amount updated successfully!' },
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      await updateItemAmount(updateData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/inventory/update-amount', updateData);
    });
  });
});
