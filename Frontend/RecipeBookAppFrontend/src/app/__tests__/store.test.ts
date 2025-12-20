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
});
