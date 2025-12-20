/**
 * Unit tests for API service functions
 * Tests: HTTP requests, error handling, data transformation
 */

import {
  checkHealth,
  getRecipes,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  fetchGitHubRecipes,
  getShoppingList,
  addShoppingItem,
  updateShoppingItem,
  markItemBought,
  deleteShoppingItem,
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  consumeIngredient,
  consumeRecipe,
  getLowStockItems,
  updateInventoryAmount,
  lookupBarcode,
  createAccount,
  getAccount,
  updateAccount,
  deleteAccount,
  logWeight,
  getWeightHistory,
  deleteWeightEntry,
  getWeightStats,
  logMeal,
  getNutritionLogs,
  getDailyNutritionSummary,
  updateMealLog,
  deleteMealLog,
  setNutritionGoals,
  getNutritionGoals,
  getWeeklyNutritionSummary,
} from '../services/api';

// Use the globally mocked axios instance
const mockAxiosInstance = (global as any).mockAxiosInstance;

describe('Recipe API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecipes', () => {
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getRecipes('test_user');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/recipes/test_user');
      expect(result.total_count).toBe(2);
      expect(result.recipes).toHaveLength(2);
    });

    it('should handle fetch recipes error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(getRecipes('test_user')).rejects.toThrow('Network error');
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

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await addRecipe(newRecipe);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/recipes/', newRecipe);
      expect(result.id).toBe('123');
    });
  });

  describe('deleteRecipe', () => {
    it('should delete a recipe successfully', async () => {
      const mockResponse = {
        data: { message: 'Recipe deleted successfully!' },
      };

      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      await deleteRecipe('recipe123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/recipes/recipe123');
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await fetchGitHubRecipes();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/recipes/fetch-from-github');
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

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await createAccount(accountData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/accounts/create', accountData);
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getAccount('matt');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/accounts/matt');
      expect(result.username).toBe('matt');
    });

    it('should handle account not found error', async () => {
      mockAxiosInstance.get.mockRejectedValue({ response: { status: 404, data: { detail: 'Account not found' } } });

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

      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const result = await updateAccount('matt', updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/accounts/matt', updateData);
      expect(result.bmr).toBe(1730.0);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account', async () => {
      const mockResponse = {
        data: { message: 'Account deleted successfully' },
      };

      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      await deleteAccount('matt');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/accounts/matt');
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

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await logWeight(weightEntry);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/weight/log', weightEntry);
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getWeightHistory('matt');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/weight/matt', { params: {} });
      expect(result).toHaveLength(3);
    });

    it('should fetch weight history with date range', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await getWeightHistory('matt', '2025-12-01', '2025-12-31');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/weight/matt', { 
        params: { startDate: '2025-12-01', endDate: '2025-12-31' } 
      });
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getWeightStats('matt');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/weight/matt/stats');
      expect(result.currentTrend).toBe('losing');
      expect(result.totalChange).toBe(-2.0);
    });
  });

  describe('deleteWeightEntry', () => {
    it('should delete weight entry', async () => {
      const mockResponse = {
        data: { message: 'Weight entry deleted successfully' },
      };

      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      await deleteWeightEntry('weight123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/weight/weight123');
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

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await logMeal(mealData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/nutrition/log', mealData);
      expect(result.id).toBe('meal123');
    });
  });

  describe('getDailyNutritionSummary', () => {
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getDailyNutritionSummary('test_user', '2025-12-20');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/nutrition/daily-summary/test_user/2025-12-20');
      expect(result.totalCalories).toBe(1850);
    });
  });

  describe('getWeeklyNutritionSummary', () => {
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getWeeklyNutritionSummary('test_user', '2025-12-20');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/nutrition/weekly-summary/test_user', { 
        params: { endDate: '2025-12-20' } 
      });
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

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await setNutritionGoals(goalsData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/nutrition/goals', goalsData);
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getNutritionGoals('test_user');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/nutrition/goals/test_user');
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

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await addShoppingItem(item);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/shopping-list', item);
    });
  });

  describe('markItemBought', () => {
    it('should mark item as bought', async () => {
      const mockResponse = {
        data: { message: 'Item marked as bought and moved to inventory' },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await markItemBought('item123', 'test_user');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/shopping-list/item123/mark-bought', null, {
        params: { purchasedBy: 'test_user' }
      });
    });
  });
});

describe('Inventory API Functions', () => {
  describe('consumeIngredient', () => {
    it('should consume ingredient from inventory', async () => {
      const mockResponse = {
        data: {
          message: 'Ingredient consumed successfully!',
          previousAmount: 5.0,
          consumedAmount: 2.0,
          remainingAmount: 3.0,
          removed: false,
          lowStock: false,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await consumeIngredient('Flour', 2.0, 'kg');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/inventory/consume-ingredient', {
        ingredientName: 'Flour',
        amount: 2.0,
        unit: 'kg',
      });
      expect(result.remainingAmount).toBe(3.0);
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

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getLowStockItems();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/inventory/low-stock');
      expect(result).toHaveLength(2);
    });
  });

  describe('updateInventoryAmount', () => {
    it('should update item amount', async () => {
      const mockResponse = {
        data: { 
          message: 'Item amount updated successfully!',
          previousAmount: 3.0,
          newAmount: 5.0,
          removed: false,
          lowStock: false,
        },
      };

      mockAxiosInstance.patch.mockResolvedValue(mockResponse);

      const result = await updateInventoryAmount('item123', 5.0);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/inventory/item123/amount', { amount: 5.0 });
      expect(result.newAmount).toBe(5.0);
    });
  });
});

// ===== NEW COMPREHENSIVE TESTS =====

describe('API Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle network errors in getRecipes', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));

    await expect(getRecipes('test_user')).rejects.toThrow('Network Error');
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it('should handle 404 errors in getAccount', async () => {
    mockAxiosInstance.get.mockRejectedValue({
      response: { status: 404, data: { detail: 'Account not found' } }
    });

    await expect(getAccount('nonexistent')).rejects.toMatchObject({
      response: { status: 404 }
    });
  });

  it('should handle timeout errors', async () => {
    mockAxiosInstance.post.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

    await expect(addRecipe({
      name: 'Test',
      ingredients: [],
      instructions: [],
      prep_time: 5,
      cook_time: 10,
      servings: 2
    })).rejects.toThrow('timeout');
  });

  it('should handle validation errors from backend', async () => {
    mockAxiosInstance.post.mockRejectedValue({
      response: {
        status: 422,
        data: { detail: 'Invalid ingredient format' }
      }
    });

    await expect(addInventoryItem({
      name: '',
      amount: -1,
      unit: '',
      lowStockThreshold: 0,
      category: '',
      user: ''
    })).rejects.toMatchObject({
      response: { status: 422 }
    });
  });
});

describe('Recipe API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateRecipe', () => {
    it('should update recipe successfully', async () => {
      const updatedRecipe = {
        name: 'Updated Recipe',
        ingredients: ['new ingredient'],
        instructions: ['new step'],
        prep_time: 20,
        cook_time: 30,
        servings: 6,
      };

      mockAxiosInstance.put.mockResolvedValue({
        data: { message: 'Recipe updated successfully!' }
      });

      const result = await updateRecipe('recipe123', updatedRecipe);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/recipes/recipe123', updatedRecipe);
      expect(result.message).toBe('Recipe updated successfully!');
    });

    it('should handle update with optional fields', async () => {
      const recipeWithOptional = {
        name: 'Recipe',
        ingredients: ['flour'],
        instructions: ['mix'],
        prep_time: 10,
        cook_time: 20,
        servings: 4,
        category: 'dessert',
        cuisine: 'italian',
        difficulty: 'easy',
      };

      mockAxiosInstance.put.mockResolvedValue({
        data: { message: 'Updated' }
      });

      await updateRecipe('rec1', recipeWithOptional);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/recipes/rec1', recipeWithOptional);
    });
  });

  describe('getRecipes - edge cases', () => {
    it('should return empty array for user with no recipes', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { total_count: 0, recipes: [] }
      });

      const result = await getRecipes('new_user');

      expect(result.recipes).toEqual([]);
      expect(result.total_count).toBe(0);
    });

    it('should handle large recipe datasets', async () => {
      const largeRecipeSet = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `Recipe ${i}`,
        ingredients: [`ingredient${i}`],
        instructions: [`step${i}`],
        prep_time: 10,
        cook_time: 20,
        servings: 4,
      }));

      mockAxiosInstance.get.mockResolvedValue({
        data: { total_count: 100, recipes: largeRecipeSet }
      });

      const result = await getRecipes('prolific_user');

      expect(result.recipes).toHaveLength(100);
    });
  });
});

describe('Shopping List API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getShoppingList', () => {
    it('should fetch shopping list successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [
          { _id: '1', name: 'Milk', quantity: 2, unit: 'liters', addedBy: 'matt' },
          { _id: '2', name: 'Bread', quantity: 1, unit: 'loaf', addedBy: 'niccy' },
        ]
      });

      const result = await getShoppingList();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/shopping-list');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Milk');
    });

    it('should return empty list when no items', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await getShoppingList();

      expect(result).toEqual([]);
    });
  });

  describe('updateShoppingItem', () => {
    it('should update shopping item successfully', async () => {
      const updatedItem = {
        name: 'Organic Milk',
        quantity: 3,
        unit: 'liters',
        addedBy: 'matt',
      };

      mockAxiosInstance.put.mockResolvedValue({
        data: { message: 'Item updated' }
      });

      await updateShoppingItem('item1', updatedItem);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/shopping-list/item1', updatedItem);
    });
  });

  describe('markItemBought - edge cases', () => {
    it('should mark item bought without purchaser', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { message: 'Item marked as bought' }
      });

      await markItemBought('item1');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/shopping-list/item1/mark-bought',
        null,
        { params: { purchasedBy: undefined } }
      );
    });

    it('should mark item bought with purchaser name', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { message: 'Item marked as bought and moved to inventory' }
      });

      await markItemBought('item2', 'matt');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/shopping-list/item2/mark-bought',
        null,
        { params: { purchasedBy: 'matt' } }
      );
    });
  });

  describe('lookupBarcode', () => {
    it('should lookup product by barcode successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          found: true,
          product: {
            name: 'Coca Cola',
            brand: 'Coca-Cola Company',
            categories: ['beverages'],
            nutrition: { calories: 140 }
          }
        }
      });

      const result = await lookupBarcode('012345678901');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/barcode/012345678901');
      expect(result.found).toBe(true);
      expect(result.product?.name).toBe('Coca Cola');
    });

    it('should handle product not found', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { found: false }
      });

      const result = await lookupBarcode('999999999999');

      expect(result.found).toBe(false);
      expect(result.product).toBeUndefined();
    });

    it('should validate barcode format', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 400, data: { detail: 'Invalid barcode format' } }
      });

      await expect(lookupBarcode('invalid')).rejects.toMatchObject({
        response: { status: 400 }
      });
    });
  });
});

describe('Inventory API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInventory', () => {
    it('should fetch inventory successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [
          { _id: '1', name: 'Flour', amount: 2.5, unit: 'kg', lowStockThreshold: 1.0, category: 'baking', user: 'matt' },
          { _id: '2', name: 'Sugar', amount: 1.0, unit: 'kg', lowStockThreshold: 0.5, category: 'baking', user: 'matt' },
        ]
      });

      const result = await getInventory();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Flour');
    });
  });

  describe('addInventoryItem', () => {
    it('should add inventory item with all fields', async () => {
      const newItem = {
        name: 'Olive Oil',
        amount: 1.0,
        unit: 'liter',
        lowStockThreshold: 0.25,
        category: 'oils',
        user: 'matt',
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'inv123', message: 'Item added' }
      });

      const result = await addInventoryItem(newItem);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/inventory', newItem);
      expect(result.id).toBe('inv123');
    });
  });

  describe('updateInventoryItem', () => {
    it('should update inventory item', async () => {
      const updatedItem = {
        name: 'Flour',
        amount: 5.0,
        unit: 'kg',
        lowStockThreshold: 2.0,
        category: 'baking',
        user: 'matt',
      };

      mockAxiosInstance.put.mockResolvedValue({
        data: { message: 'Item updated' }
      });

      await updateInventoryItem('inv1', updatedItem);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/inventory/inv1', updatedItem);
    });
  });

  describe('deleteInventoryItem', () => {
    it('should delete inventory item', async () => {
      mockAxiosInstance.delete.mockResolvedValue({
        data: { message: 'Item deleted' }
      });

      await deleteInventoryItem('inv123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/inventory/inv123');
    });
  });

  describe('consumeIngredient - edge cases', () => {
    it('should handle consuming all available amount', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: 'Ingredient fully consumed and removed',
          previousAmount: 2.0,
          consumedAmount: 2.0,
          remainingAmount: 0,
          removed: true,
          lowStock: false,
        }
      });

      const result = await consumeIngredient('Sugar', 2.0, 'kg');

      expect(result.removed).toBe(true);
      expect(result.remainingAmount).toBe(0);
    });

    it('should trigger low stock warning', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: 'Ingredient consumed - LOW STOCK!',
          previousAmount: 1.5,
          consumedAmount: 1.0,
          remainingAmount: 0.5,
          removed: false,
          lowStock: true,
          lowStockThreshold: 1.0,
        }
      });

      const result = await consumeIngredient('Flour', 1.0, 'kg');

      expect(result.lowStock).toBe(true);
      expect(result.remainingAmount).toBeLessThan(result.lowStockThreshold!);
    });

    it('should handle decimal amounts precisely', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: 'Ingredient consumed',
          previousAmount: 1.75,
          consumedAmount: 0.33,
          remainingAmount: 1.42,
          removed: false,
          lowStock: false,
        }
      });

      const result = await consumeIngredient('Salt', 0.33, 'kg');

      expect(result.remainingAmount).toBeCloseTo(1.42, 2);
    });
  });

  describe('consumeRecipe', () => {
    it('should consume all ingredients for a recipe', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: 'Recipe ingredients consumed successfully',
          consumed: [
            { name: 'flour', consumed: 0.5, unit: 'kg', remaining: 1.5 },
            { name: 'sugar', consumed: 0.2, unit: 'kg', remaining: 0.8 },
          ],
          lowStock: [],
          removed: [],
          missing: [],
          warnings: [],
        }
      });

      const result = await consumeRecipe('recipe123', 1.0);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/inventory/consume-recipe/recipe123', {
        servingsMultiplier: 1.0,
      });
      expect(result.consumed).toHaveLength(2);
    });

    it('should handle missing ingredients', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: 'Some ingredients missing',
          consumed: [],
          lowStock: [],
          removed: [],
          missing: [
            { name: 'eggs', needed: 2, unit: 'pieces' },
            { name: 'butter', needed: 0.1, unit: 'kg' },
          ],
          warnings: ['Missing ingredients'],
        }
      });

      const result = await consumeRecipe('recipe456', 1.0);

      expect(result.missing).toHaveLength(2);
      expect(result.missing[0].name).toBe('eggs');
    });

    it('should scale recipe consumption', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: 'Recipe consumed (doubled)',
          consumed: [
            { name: 'flour', consumed: 1.0, unit: 'kg', remaining: 1.0 },
          ],
          lowStock: [],
          removed: [],
          missing: [],
          warnings: [],
        }
      });

      await consumeRecipe('recipe789', 2.0);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/inventory/consume-recipe/recipe789', {
        servingsMultiplier: 2.0,
      });
    });
  });

  describe('updateInventoryAmount - edge cases', () => {
    it('should update to zero and remove item', async () => {
      mockAxiosInstance.patch.mockResolvedValue({
        data: {
          message: 'Item removed (amount set to 0)',
          previousAmount: 2.0,
          newAmount: 0,
          removed: true,
          lowStock: false,
        }
      });

      const result = await updateInventoryAmount('item1', 0);

      expect(result.removed).toBe(true);
      expect(result.newAmount).toBe(0);
    });

    it('should increase amount significantly', async () => {
      mockAxiosInstance.patch.mockResolvedValue({
        data: {
          message: 'Amount increased',
          previousAmount: 1.0,
          newAmount: 10.0,
          removed: false,
          lowStock: false,
        }
      });

      const result = await updateInventoryAmount('item2', 10.0);

      expect(result.newAmount).toBe(10.0);
      expect(result.newAmount).toBeGreaterThan(result.previousAmount);
    });
  });
});

describe('Nutrition Tracking API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logMeal - detailed tests', () => {
    it('should log breakfast meal', async () => {
      const breakfast = {
        user: 'matt',
        date: '2025-12-20',
        mealType: 'breakfast' as const,
        description: 'Oatmeal with berries',
        calories: 350,
        protein: 12,
        carbs: 60,
        fat: 8,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'meal1', message: 'Meal logged' }
      });

      await logMeal(breakfast);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/nutrition/log', breakfast);
    });

    it('should log meal with all optional nutrition fields', async () => {
      const detailedMeal = {
        user: 'niccy',
        date: '2025-12-20',
        mealType: 'dinner' as const,
        description: 'Grilled salmon',
        calories: 450,
        protein: 40,
        carbs: 20,
        fat: 25,
        fiber: 5,
        sugar: 3,
        sodium: 400,
        cholesterol: 80,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'meal2', message: 'Detailed meal logged' }
      });

      await logMeal(detailedMeal);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/nutrition/log', detailedMeal);
    });
  });

  describe('getNutritionLogs', () => {
    it('should get logs for specific date', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [
          { _id: '1', user: 'matt', date: '2025-12-20', mealType: 'breakfast', calories: 350 },
          { _id: '2', user: 'matt', date: '2025-12-20', mealType: 'lunch', calories: 500 },
        ]
      });

      await getNutritionLogs('matt', '2025-12-20');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/nutrition/logs/matt', {
        params: { date: '2025-12-20' }
      });
    });

    it('should get logs for date range', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await getNutritionLogs('matt', undefined, '2025-12-01', '2025-12-31');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/nutrition/logs/matt', {
        params: { startDate: '2025-12-01', endDate: '2025-12-31' }
      });
    });

    it('should get all logs without date filter', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await getNutritionLogs('matt');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/nutrition/logs/matt', {
        params: {}
      });
    });
  });

  describe('getDailyNutritionSummary', () => {
    it('should get comprehensive daily summary', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          user: 'matt',
          date: '2025-12-20',
          meals: [
            { mealType: 'breakfast', calories: 350 },
            { mealType: 'lunch', calories: 600 },
            { mealType: 'dinner', calories: 750 },
          ],
          totals: {
            calories: 1700,
            protein: 95,
            carbs: 200,
            fat: 65,
          },
          goals: {
            calories: 2000,
            protein: 100,
            carbs: 250,
            fat: 70,
          },
          progress: {
            caloriesPercent: 85,
            proteinPercent: 95,
            carbsPercent: 80,
            fatPercent: 93,
          },
        }
      });

      const result = await getDailyNutritionSummary('matt', '2025-12-20');

      expect(result.meals).toHaveLength(3);
      expect(result.totals.calories).toBe(1700);
      expect(result.progress.caloriesPercent).toBe(85);
    });
  });

  describe('setNutritionGoals', () => {
    it('should set goals with all fields', async () => {
      const goals = {
        user: 'matt',
        dailyCalories: 2200,
        dailyProtein: 110,
        dailyCarbs: 275,
        dailyFat: 73,
        dailyFiber: 30,
        dailySugar: 50,
        dailySodium: 2300,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { message: 'Goals set', id: 'goal1' }
      });

      await setNutritionGoals(goals);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/nutrition/goals', goals);
    });

    it('should update existing goals', async () => {
      const updatedGoals = {
        user: 'matt',
        dailyCalories: 2000,
        dailyProtein: 100,
        dailyCarbs: 250,
        dailyFat: 70,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { message: 'Goals updated' }
      });

      await setNutritionGoals(updatedGoals);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/nutrition/goals', updatedGoals);
    });
  });

  describe('getWeeklyNutritionSummary', () => {
    it('should get weekly summary with default end date', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          user: 'matt',
          weekStart: '2025-12-14',
          weekEnd: '2025-12-20',
          dailySummaries: [],
          weeklyAverages: { calories: 2000 },
          weeklyTotals: { calories: 14000 },
        }
      });

      await getWeeklyNutritionSummary('matt');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/nutrition/weekly-summary/matt', {
        params: {}
      });
    });

    it('should get weekly summary with custom end date', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          user: 'matt',
          weekStart: '2025-12-14',
          weekEnd: '2025-12-20',
          dailySummaries: Array.from({ length: 7 }, (_, i) => ({
            date: `2025-12-${14 + i}`,
            totals: { calories: 2000 + i * 100 },
          })),
          weeklyAverages: { calories: 2300 },
          weeklyTotals: { calories: 16100 },
        }
      });

      const result = await getWeeklyNutritionSummary('matt', '2025-12-20');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/nutrition/weekly-summary/matt', {
        params: { endDate: '2025-12-20' }
      });
      expect(result.dailySummaries).toHaveLength(7);
    });
  });
});

describe('Weight Tracking API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logWeight', () => {
    it('should log weight with all fields', async () => {
      const weightEntry = {
        username: 'matt',
        weight: 79.5,
        date: '2025-12-20',
        notes: 'After morning workout',
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          id: 'weight1',
          message: 'Weight logged',
          newBmi: 24.5,
          bmiCategory: 'normal_weight',
        }
      });

      const result = await logWeight(weightEntry);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/weight/log', weightEntry);
      expect(result.newBmi).toBe(24.5);
    });

    it('should log first weight entry', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          id: 'weight1',
          message: 'First weight logged',
          newBmi: 26.0,
          bmiCategory: 'overweight',
        }
      });

      await logWeight({
        username: 'newuser',
        weight: 75.0,
        date: '2025-12-20',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });
  });

  describe('getWeightStats', () => {
    it('should get comprehensive weight statistics', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          username: 'matt',
          firstWeight: 82.0,
          currentWeight: 78.5,
          totalChange: -3.5,
          totalChangePercentage: -4.27,
          monthsTracked: 6,
          averageMonthlyChange: -0.58,
          highestWeight: 83.0,
          lowestWeight: 77.0,
          currentTrend: 'losing',
          entryCount: 48,
          firstDate: '2025-06-20',
          lastDate: '2025-12-20',
        }
      });

      const result = await getWeightStats('matt');

      expect(result.totalChange).toBe(-3.5);
      expect(result.currentTrend).toBe('losing');
      expect(result.monthsTracked).toBe(6);
    });

    it('should handle insufficient data', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          username: 'newuser',
          firstWeight: 80.0,
          currentWeight: 80.0,
          totalChange: 0,
          totalChangePercentage: 0,
          monthsTracked: 0,
          averageMonthlyChange: 0,
          highestWeight: 80.0,
          lowestWeight: 80.0,
          currentTrend: 'insufficient_data',
          entryCount: 1,
          firstDate: '2025-12-20',
          lastDate: '2025-12-20',
        }
      });

      const result = await getWeightStats('newuser');

      expect(result.currentTrend).toBe('insufficient_data');
      expect(result.entryCount).toBe(1);
    });
  });

  describe('deleteWeightEntry', () => {
    it('should delete weight entry successfully', async () => {
      mockAxiosInstance.delete.mockResolvedValue({
        data: { message: 'Weight entry deleted' }
      });

      await deleteWeightEntry('weight123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/weight/weight123');
    });
  });
});

describe('Account Management API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAccount', () => {
    it('should create account with BMR and TDEE calculations', async () => {
      const accountData = {
        username: 'matt',
        displayName: 'Matt',
        age: 30,
        gender: 'male' as const,
        weight: 80.0,
        height: 180,
        activityLevel: 'moderately_active' as const,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          id: 'acc1',
          username: 'matt',
          bmr: 1780.0,
          tdee: 2759.0,
          bmi: 24.7,
          bmiCategory: 'normal_weight',
          message: 'Account created successfully',
        }
      });

      const result = await createAccount(accountData);

      expect(result.bmr).toBeGreaterThan(0);
      expect(result.tdee).toBeGreaterThan(result.bmr);
      expect(result.bmiCategory).toBe('normal_weight');
    });

    it('should handle female account creation', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          id: 'acc2',
          username: 'niccy',
          bmr: 1450.0,
          tdee: 2247.5,
          bmi: 21.5,
          bmiCategory: 'normal_weight',
          message: 'Account created',
        }
      });

      const result = await createAccount({
        username: 'niccy',
        displayName: 'Niccy',
        age: 28,
        gender: 'female',
        weight: 65.0,
        height: 170,
        activityLevel: 'moderately_active',
      });

      expect(result.bmr).toBeLessThan(1800); // Typically lower for females
    });

    it('should handle different activity levels', async () => {
      const sedentary = await (async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { bmr: 1800, tdee: 2160, bmi: 25, bmiCategory: 'normal_weight' }
        });
        return createAccount({
          username: 'user1',
          displayName: 'User 1',
          age: 30,
          gender: 'male',
          weight: 80,
          height: 180,
          activityLevel: 'sedentary',
        });
      })();

      const veryActive = await (async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { bmr: 1800, tdee: 3150, bmi: 25, bmiCategory: 'normal_weight' }
        });
        return createAccount({
          username: 'user2',
          displayName: 'User 2',
          age: 30,
          gender: 'male',
          weight: 80,
          height: 180,
          activityLevel: 'very_active',
        });
      })();

      expect((await veryActive).tdee).toBeGreaterThan((await sedentary).tdee);
    });
  });

  describe('updateAccount', () => {
    it('should recalculate metrics on update', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          message: 'Account updated',
          bmr: 1850.0,
          tdee: 2867.5,
          bmi: 22.0,
          bmiCategory: 'normal_weight',
        }
      });

      const result = await updateAccount('matt', {
        weight: 75.0,
        height: 182,
      });

      expect(result.bmi).toBe(22.0);
    });

    it('should handle partial updates', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          message: 'Display name updated',
        }
      });

      await updateAccount('matt', {
        displayName: 'Matthew',
      });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/accounts/matt', {
        displayName: 'Matthew',
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and all associated data', async () => {
      mockAxiosInstance.delete.mockResolvedValue({
        data: { message: 'Account and all associated data deleted' }
      });

      const result = await deleteAccount('user_to_delete');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/accounts/user_to_delete');
      expect(result.message).toContain('deleted');
    });
  });
});

describe('API Health Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when API is healthy', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      status: 200,
      data: { status: 'healthy' }
    });

    const result = await checkHealth();

    expect(result).toBe(true);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
  });

  it('should return false when API is unreachable', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

    const result = await checkHealth();

    expect(result).toBe(false);
  });

  it('should handle timeout gracefully', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('timeout'));

    const result = await checkHealth();

    expect(result).toBe(false);
  });
});
