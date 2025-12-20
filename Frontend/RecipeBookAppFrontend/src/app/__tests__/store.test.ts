/**
 * Unit tests for Zustand state management store
 * Tests: State updates, actions, persistence
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRecipeStore } from '../utils/store';

describe('useRecipeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useRecipeStore());
    act(() => {
      result.current.setCurrentUser('user1');
      result.current.setRecipes([]);
      result.current.setShoppingList([]);
      result.current.setInventory([]);
      result.current.setUserIngredients([]);
      result.current.setBudget(100);
      result.current.setLowStockAlerts([]);
    });
  });

  describe('currentUser', () => {
    it('should have default user', () => {
      const { result } = renderHook(() => useRecipeStore());
      expect(result.current.currentUser).toBeDefined();
    });

    it('should update current user', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      act(() => {
        result.current.setCurrentUser('matt');
      });

      expect(result.current.currentUser).toBe('matt');
    });

    it('should switch between users', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      act(() => {
        result.current.setCurrentUser('matt');
      });
      expect(result.current.currentUser).toBe('matt');

      act(() => {
        result.current.setCurrentUser('niccy');
      });
      expect(result.current.currentUser).toBe('niccy');
    });
  });

  describe('recipes', () => {
    it('should initialize with empty recipes array', () => {
      const { result } = renderHook(() => useRecipeStore());
      expect(result.current.recipes).toEqual([]);
    });

    it('should set recipes', () => {
      const mockRecipes = [
        {
          id: '1',
          name: 'Spaghetti Carbonara',
          ingredients: ['spaghetti', 'eggs', 'bacon'],
          instructions: ['Cook pasta', 'Mix ingredients'],
          prep_time: 10,
          cook_time: 20,
          servings: 4,
        },
        {
          id: '2',
          name: 'Caesar Salad',
          ingredients: ['lettuce', 'chicken', 'dressing'],
          instructions: ['Chop lettuce', 'Add chicken'],
          prep_time: 15,
          cook_time: 0,
          servings: 2,
        },
      ];

      const { result } = renderHook(() => useRecipeStore());
      
      act(() => {
        result.current.setRecipes(mockRecipes);
      });

      expect(result.current.recipes).toHaveLength(2);
      expect(result.current.recipes[0].name).toBe('Spaghetti Carbonara');
      expect(result.current.recipes[0].ingredients).toEqual(['spaghetti', 'eggs', 'bacon']);
      expect(result.current.recipes[1].name).toBe('Caesar Salad');
      expect(result.current.recipes[1].cook_time).toBe(0);
    });

    it('should replace existing recipes', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      const initialRecipes = [{ id: '1', name: 'Recipe 1', ingredients: [], instructions: [], prep_time: 10, cook_time: 20, servings: 2 }];
      const newRecipes = [{ id: '2', name: 'Recipe 2', ingredients: [], instructions: [], prep_time: 15, cook_time: 25, servings: 4 }];

      act(() => {
        result.current.setRecipes(initialRecipes);
      });
      expect(result.current.recipes).toHaveLength(1);

      act(() => {
        result.current.setRecipes(newRecipes);
      });
      expect(result.current.recipes).toHaveLength(1);
      expect(result.current.recipes[0].name).toBe('Recipe 2');
    });
  });

  describe('shoppingList', () => {
    it('should initialize with empty shopping list', () => {
      const { result } = renderHook(() => useRecipeStore());
      expect(result.current.shoppingList).toEqual([]);
    });

    it('should set shopping list items', () => {
      const mockShoppingList = [
        {
          id: '1',
          name: 'Tomatoes',
          amount: 5,
          unit: 'pieces',
          estimatedPrice: 3.5,
          category: 'vegetables',
          addedBy: 'test_user',
          bought: false,
        },
        {
          id: '2',
          name: 'Bread',
          amount: 1,
          unit: 'loaf',
          estimatedPrice: 2.0,
          category: 'bakery',
          addedBy: 'test_user',
          bought: false,
        },
      ];

      const { result } = renderHook(() => useRecipeStore());
      
      act(() => {
        result.current.setShoppingList(mockShoppingList);
      });

      expect(result.current.shoppingList).toHaveLength(2);
      expect(result.current.shoppingList[0].name).toBe('Tomatoes');
    });

    it('should update shopping list', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      const initialList = [
        { id: '1', name: 'Item 1', amount: 1, unit: 'piece', estimatedPrice: 1, category: 'test', addedBy: 'user', bought: false },
      ];

      act(() => {
        result.current.setShoppingList(initialList);
      });

      const updatedList = [
        ...initialList,
        { id: '2', name: 'Item 2', amount: 2, unit: 'kg', estimatedPrice: 5, category: 'test', addedBy: 'user', bought: false },
      ];

      act(() => {
        result.current.setShoppingList(updatedList);
      });

      expect(result.current.shoppingList).toHaveLength(2);
    });
  });

  describe('inventory', () => {
    it('should initialize with empty inventory', () => {
      const { result } = renderHook(() => useRecipeStore());
      expect(result.current.inventory).toEqual([]);
    });

    it('should set inventory items', () => {
      const mockInventory = [
        {
          id: '1',
          name: 'Flour',
          amount: 5.0,
          unit: 'kg',
          lowStockThreshold: 1.0,
          category: 'baking',
          user: 'test_user',
        },
        {
          id: '2',
          name: 'Sugar',
          amount: 2.0,
          unit: 'kg',
          lowStockThreshold: 0.5,
          category: 'baking',
          user: 'test_user',
        },
      ];

      const { result } = renderHook(() => useRecipeStore());
      
      act(() => {
        result.current.setInventory(mockInventory);
      });

      expect(result.current.inventory).toHaveLength(2);
      expect(result.current.inventory[0].name).toBe('Flour');
    });

    it('should update inventory amounts', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      const inventory = [
        { id: '1', name: 'Flour', amount: 5.0, unit: 'kg', lowStockThreshold: 1.0, category: 'baking', user: 'test' },
      ];

      act(() => {
        result.current.setInventory(inventory);
      });

      const updatedInventory = [
        { id: '1', name: 'Flour', amount: 3.0, unit: 'kg', lowStockThreshold: 1.0, category: 'baking', user: 'test' },
      ];

      act(() => {
        result.current.setInventory(updatedInventory);
      });

      expect(result.current.inventory[0].amount).toBe(3.0);
    });
  });

  describe('state persistence', () => {
    it('should maintain state across multiple accesses', () => {
      const { result: result1 } = renderHook(() => useRecipeStore());
      
      act(() => {
        result1.current.setCurrentUser('matt');
      });

      const { result: result2 } = renderHook(() => useRecipeStore());
      
      expect(result2.current.currentUser).toBe('matt');
    });

    it('should update state for all subscribers', () => {
      const { result: result1 } = renderHook(() => useRecipeStore());
      const { result: result2 } = renderHook(() => useRecipeStore());
      
      act(() => {
        result1.current.setCurrentUser('niccy');
      });

      expect(result1.current.currentUser).toBe('niccy');
      expect(result2.current.currentUser).toBe('niccy');
    });
  });

  describe('multi-user scenario', () => {
    it('should handle switching users and clearing data', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      // User 1 data
      act(() => {
        result.current.setCurrentUser('matt');
        result.current.setRecipes([
          { id: '1', name: 'Matt Recipe', ingredients: [], instructions: [], prep_time: 10, cook_time: 20, servings: 2 },
        ]);
      });

      expect(result.current.currentUser).toBe('matt');
      expect(result.current.recipes).toHaveLength(1);

      // Switch to User 2
      act(() => {
        result.current.setCurrentUser('niccy');
        result.current.setRecipes([]); // Clear for new user
      });

      expect(result.current.currentUser).toBe('niccy');
      expect(result.current.recipes).toHaveLength(0);
    });
  });

  describe('addRecipe', () => {
    it('should add a single recipe to existing recipes', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      const existingRecipe = { 
        id: '1', 
        name: 'Existing Recipe', 
        ingredients: ['flour'], 
        instructions: ['mix'], 
        prep_time: 5, 
        cook_time: 10, 
        servings: 2 
      };
      
      const newRecipe = { 
        id: '2', 
        name: 'New Recipe', 
        ingredients: ['sugar'], 
        instructions: ['stir'], 
        prep_time: 3, 
        cook_time: 7, 
        servings: 4 
      };

      act(() => {
        result.current.setRecipes([existingRecipe]);
      });

      act(() => {
        result.current.addRecipe(newRecipe);
      });

      expect(result.current.recipes).toHaveLength(2);
      expect(result.current.recipes[0].name).toBe('Existing Recipe');
      expect(result.current.recipes[1].name).toBe('New Recipe');
    });

    it('should add recipe to empty array', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      const recipe = { 
        id: '1', 
        name: 'First Recipe', 
        ingredients: ['egg'], 
        instructions: ['cook'], 
        prep_time: 2, 
        cook_time: 5, 
        servings: 1 
      };

      act(() => {
        result.current.addRecipe(recipe);
      });

      expect(result.current.recipes).toHaveLength(1);
      expect(result.current.recipes[0].name).toBe('First Recipe');
    });

    it('should preserve all recipe properties when adding', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      const recipe = { 
        id: '1', 
        name: 'Detailed Recipe', 
        ingredients: ['flour', 'water', 'yeast'], 
        instructions: ['Mix', 'Knead', 'Bake'], 
        prep_time: 15, 
        cook_time: 45, 
        servings: 8,
        category: 'bread'
      };

      act(() => {
        result.current.addRecipe(recipe);
      });

      expect(result.current.recipes[0]).toMatchObject(recipe);
      expect(result.current.recipes[0].ingredients).toHaveLength(3);
      expect(result.current.recipes[0].instructions).toHaveLength(3);
    });
  });

  describe('removeRecipe', () => {
    it('should remove recipe by _id', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      const recipes = [
        { _id: 'abc123', name: 'Recipe 1', ingredients: [], instructions: [], prep_time: 5, cook_time: 10, servings: 2 },
        { _id: 'def456', name: 'Recipe 2', ingredients: [], instructions: [], prep_time: 10, cook_time: 15, servings: 4 },
      ];

      act(() => {
        result.current.setRecipes(recipes);
      });

      act(() => {
        result.current.removeRecipe('abc123');
      });

      expect(result.current.recipes).toHaveLength(1);
      expect(result.current.recipes[0]._id).toBe('def456');
    });

    it('should not remove anything if _id not found', () => {
      const { result } = renderHook(() => useRecipeStore());
      
      const recipes = [
        { _id: 'abc123', name: 'Recipe 1', ingredients: [], instructions: [], prep_time: 5, cook_time: 10, servings: 2 },
      ];

      act(() => {
        result.current.setRecipes(recipes);
      });

      act(() => {
        result.current.removeRecipe('nonexistent');
      });

      expect(result.current.recipes).toHaveLength(1);
    });

    it('should handle removing from empty array', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.removeRecipe('any-id');
      });

      expect(result.current.recipes).toHaveLength(0);
    });
  });

  describe('addIngredient', () => {
    it('should add ingredient to empty array', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.addIngredient('Tomato');
      });

      expect(result.current.userIngredients).toContain('tomato');
      expect(result.current.userIngredients).toHaveLength(1);
    });

    it('should convert ingredient to lowercase', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.addIngredient('FLOUR');
      });

      expect(result.current.userIngredients).toContain('flour');
      expect(result.current.userIngredients).not.toContain('FLOUR');
    });

    it('should prevent duplicate ingredients', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.addIngredient('salt');
      });

      act(() => {
        result.current.addIngredient('salt');
      });

      expect(result.current.userIngredients).toHaveLength(1);
    });

    it('should prevent duplicates regardless of case', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.addIngredient('pepper');
      });

      act(() => {
        result.current.addIngredient('Pepper');
      });

      act(() => {
        result.current.addIngredient('PEPPER');
      });

      expect(result.current.userIngredients).toHaveLength(1);
    });
  });

  describe('removeIngredient', () => {
    it('should remove ingredient case-insensitively', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setUserIngredients(['flour', 'sugar', 'salt']);
      });

      act(() => {
        result.current.removeIngredient('SUGAR');
      });

      expect(result.current.userIngredients).toHaveLength(2);
      expect(result.current.userIngredients).not.toContain('sugar');
    });

    it('should handle removing non-existent ingredient', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setUserIngredients(['flour']);
      });

      act(() => {
        result.current.removeIngredient('sugar');
      });

      expect(result.current.userIngredients).toHaveLength(1);
    });
  });

  describe('budget', () => {
    it('should have default budget of 100', () => {
      const { result } = renderHook(() => useRecipeStore());
      expect(result.current.budget).toBe(100);
    });

    it('should set budget to new value', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setBudget(250);
      });

      expect(result.current.budget).toBe(250);
    });

    it('should handle zero budget', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setBudget(0);
      });

      expect(result.current.budget).toBe(0);
    });

    it('should handle decimal budget', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setBudget(99.99);
      });

      expect(result.current.budget).toBe(99.99);
    });
  });

  describe('lowStockAlerts', () => {
    it('should initialize with empty array', () => {
      const { result } = renderHook(() => useRecipeStore());
      expect(result.current.lowStockAlerts).toEqual([]);
    });

    it('should set low stock items', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setLowStockAlerts(['flour', 'milk', 'eggs']);
      });

      expect(result.current.lowStockAlerts).toHaveLength(3);
      expect(result.current.lowStockAlerts).toContain('flour');
    });

    it('should replace existing low stock alerts', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setLowStockAlerts(['flour']);
      });

      act(() => {
        result.current.setLowStockAlerts(['sugar', 'salt']);
      });

      expect(result.current.lowStockAlerts).toHaveLength(2);
      expect(result.current.lowStockAlerts).not.toContain('flour');
    });
  });

  describe('edge cases and data integrity', () => {
    it('should handle empty string user', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setCurrentUser('');
      });

      expect(result.current.currentUser).toBe('');
    });

    it('should handle special characters in user name', () => {
      const { result } = renderHook(() => useRecipeStore());

      act(() => {
        result.current.setCurrentUser('user@123!');
      });

      expect(result.current.currentUser).toBe('user@123!');
    });

    it('should handle very large recipe arrays', () => {
      const { result } = renderHook(() => useRecipeStore());

      const largeRecipeArray = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `Recipe ${i}`,
        ingredients: [`ingredient${i}`],
        instructions: [`step${i}`],
        prep_time: i,
        cook_time: i * 2,
        servings: i + 1,
      }));

      act(() => {
        result.current.setRecipes(largeRecipeArray);
      });

      expect(result.current.recipes).toHaveLength(100);
      expect(result.current.recipes[99].name).toBe('Recipe 99');
    });

    it('should handle shopping list with all optional fields', () => {
      const { result } = renderHook(() => useRecipeStore());

      const item = {
        _id: '123',
        name: 'Milk',
        quantity: 2,
        unit: 'liters',
        addedBy: 'matt',
        purchased: true,
        purchasedBy: 'niccy',
        addedAt: '2025-12-20',
      };

      act(() => {
        result.current.setShoppingList([item]);
      });

      expect(result.current.shoppingList[0]).toMatchObject(item);
      expect(result.current.shoppingList[0].purchased).toBe(true);
    });

    it('should handle inventory with low stock threshold', () => {
      const { result } = renderHook(() => useRecipeStore());

      const item = {
        _id: '456',
        name: 'Sugar',
        amount: 0.5,
        unit: 'kg',
        lowStockThreshold: 1.0,
        category: 'baking',
        user: 'matt',
      };

      act(() => {
        result.current.setInventory([item]);
      });

      expect(result.current.inventory[0].amount).toBeLessThan(item.lowStockThreshold);
    });
  });
});
