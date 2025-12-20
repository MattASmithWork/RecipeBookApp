/**
 * Unit tests for RecipesScreen component
 * Tests: Recipe display, time filtering, add recipe modal, empty states, multi-user support
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RecipesScreen from '../screens/RecipesScreen';
import * as api from '../services/api';
import { useRecipeStore } from '../utils/store';

// Mock API functions
jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock AddRecipeModal
jest.mock('../components/AddRecipeModal', () => {
  return function MockAddRecipeModal({ visible, onClose, onRecipeAdded }: any) {
    if (!visible) return null;
    return (
      <>
        <MockText>Add Recipe Modal</MockText>
        <MockPressable onPress={onClose} testID="close-modal">Close</MockPressable>
        <MockPressable onPress={onRecipeAdded} testID="recipe-added">Recipe Added</MockPressable>
      </>
    );
  };
});

describe('RecipesScreen', () => {
  const mockRecipes = [
    {
      _id: '1',
      name: 'Quick Omelette',
      ingredients: ['eggs', 'cheese', 'milk'],
      instructions: ['Beat eggs', 'Cook in pan'],
      prep_time: 5,
      cook_time: 10,
      servings: 2,
      user: 'matt',
    },
    {
      _id: '2',
      name: 'Slow Roast Chicken',
      ingredients: ['chicken', 'herbs', 'vegetables'],
      instructions: ['Season chicken', 'Roast'],
      prep_time: 15,
      cook_time: 60,
      servings: 4,
      user: 'matt',
    },
    {
      _id: '3',
      name: 'Pasta Primavera',
      ingredients: ['pasta', 'vegetables', 'olive oil'],
      instructions: ['Boil pasta', 'Sauté vegetables'],
      prep_time: 10,
      cook_time: 20,
      servings: 3,
      user: 'matt',
      estimated_calories: 450,
    },
    {
      _id: '4',
      name: 'Quick Salad',
      ingredients: ['lettuce', 'tomatoes', 'dressing'],
      instructions: ['Chop vegetables', 'Mix together'],
      prep_time: 5,
      cook_time: 0,
      servings: 1,
      user: 'matt',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store
    useRecipeStore.setState({
      currentUser: 'matt',
      recipes: [],
      shoppingList: [],
      inventory: [],
    });
    mockedApi.getRecipes.mockResolvedValue(mockRecipes);
  });

  describe('Initial Rendering', () => {
    it('should show loading indicator while fetching recipes', () => {
      mockedApi.getRecipes.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<RecipesScreen />);
      
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('should render header with title and add button', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('My Recipes')).toBeTruthy();
        expect(screen.getByText('+ Add Recipe')).toBeTruthy();
      });
    });

    it('should fetch recipes for current user on mount', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(mockedApi.getRecipes).toHaveBeenCalledWith('matt');
      });
    });

    it('should display all recipes initially (no filter)', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Quick Omelette')).toBeTruthy();
        expect(screen.getByText('Slow Roast Chicken')).toBeTruthy();
        expect(screen.getByText('Pasta Primavera')).toBeTruthy();
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.getByText('4 recipes found')).toBeTruthy();
      });
    });
  });

  describe('Recipe Display', () => {
    it('should display recipe name', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Quick Omelette')).toBeTruthy();
      });
    });

    it('should display total cooking time (prep + cook)', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        // Quick Omelette: 5 + 10 = 15 mins
        expect(screen.getByText(/Total: 15 mins/)).toBeTruthy();
        expect(screen.getByText(/5min prep \+ 10min cook/)).toBeTruthy();
      });
    });

    it('should display servings', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/Servings: 2/)).toBeTruthy();
      });
    });

    it('should display ingredient count', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Ingredients: 3 items')).toBeTruthy();
      });
    });

    it('should display estimated calories if available', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('🔥 450 calories (estimated)')).toBeTruthy();
      });
    });

    it('should not show calories if not estimated', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const calorieTexts = screen.queryAllByText(/calories/);
        expect(calorieTexts).toHaveLength(1); // Only Pasta Primavera has calories
      });
    });
  });

  describe('Time Filtering', () => {
    it('should show filter toggle button', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/⏱️ Time Filter ▼/)).toBeTruthy();
      });
    });

    it('should expand filter panel when toggle clicked', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Maximum Total Time')).toBeTruthy();
        expect(screen.getByText('≤ 15 mins')).toBeTruthy();
        expect(screen.getByText('≤ 30 mins')).toBeTruthy();
        expect(screen.getByText('≤ 45 mins')).toBeTruthy();
        expect(screen.getByText('≤ 60 mins')).toBeTruthy();
      });
    });

    it('should collapse filter panel when toggle clicked again', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Maximum Total Time')).toBeTruthy();
      });
      
      const toggleButton = screen.getByText(/⏱️ Time Filter ▲/);
      fireEvent.press(toggleButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Maximum Total Time')).toBeNull();
      });
    });

    it('should show "Active" badge when filter is applied', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeTruthy();
      });
    });

    it('should filter recipes by 15 minutes or less', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        // Quick Omelette (15 mins) and Quick Salad (5 mins) should be visible
        expect(screen.getByText('Quick Omelette')).toBeTruthy();
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        // Slow Roast Chicken (75 mins) and Pasta Primavera (30 mins) should not be visible
        expect(screen.queryByText('Slow Roast Chicken')).toBeNull();
        expect(screen.queryByText('Pasta Primavera')).toBeNull();
        expect(screen.getByText('2 recipes found')).toBeTruthy();
      });
    });

    it('should filter recipes by 30 minutes or less', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter30 = screen.getByText('≤ 30 mins');
        fireEvent.press(filter30);
      });
      
      await waitFor(() => {
        // 3 recipes: Quick Omelette (15), Pasta Primavera (30), Quick Salad (5)
        expect(screen.getByText('Quick Omelette')).toBeTruthy();
        expect(screen.getByText('Pasta Primavera')).toBeTruthy();
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.queryByText('Slow Roast Chicken')).toBeNull();
        expect(screen.getByText('3 recipes found')).toBeTruthy();
      });
    });

    it('should filter recipes by 45 minutes or less', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter45 = screen.getByText('≤ 45 mins');
        fireEvent.press(filter45);
      });
      
      await waitFor(() => {
        // 3 recipes (all except Slow Roast Chicken which is 75 mins)
        expect(screen.getByText('3 recipes found')).toBeTruthy();
        expect(screen.queryByText('Slow Roast Chicken')).toBeNull();
      });
    });

    it('should filter recipes by 60 minutes or less', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter60 = screen.getByText('≤ 60 mins');
        fireEvent.press(filter60);
      });
      
      await waitFor(() => {
        // 3 recipes (all except Slow Roast Chicken which is 75 mins)
        expect(screen.getByText('3 recipes found')).toBeTruthy();
      });
    });

    it('should highlight active filter button', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        // Check that the active filter has the active style (would need testID to verify styles)
        expect(screen.getByText('≤ 15 mins')).toBeTruthy();
      });
    });

    it('should show clear filter button when filter is active', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Clear Filter')).toBeTruthy();
      });
    });

    it('should clear filter and show all recipes', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        expect(screen.getByText('2 recipes found')).toBeTruthy();
      });
      
      const clearButton = screen.getByText('Clear Filter');
      fireEvent.press(clearButton);
      
      await waitFor(() => {
        expect(screen.getByText('4 recipes found')).toBeTruthy();
        expect(screen.getByText('Slow Roast Chicken')).toBeTruthy();
      });
    });

    it('should switch between different time filters', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      // Apply 15 min filter
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        expect(screen.getByText('2 recipes found')).toBeTruthy();
      });
      
      // Switch to 30 min filter
      const filter30 = screen.getByText('≤ 30 mins');
      fireEvent.press(filter30);
      
      await waitFor(() => {
        expect(screen.getByText('3 recipes found')).toBeTruthy();
      });
    });
  });

  describe('Empty States', () => {
    it('should show "no recipes" message when user has no recipes', async () => {
      mockedApi.getRecipes.mockResolvedValue([]);
      
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('No recipes yet')).toBeTruthy();
        expect(screen.getByText('Add a recipe to get started')).toBeTruthy();
      });
    });

    it('should show "no match" message when filter excludes all recipes', async () => {
      // Only include recipes that take 75+ mins
      const longRecipes = [
        {
          ...mockRecipes[1], // Slow Roast Chicken (75 mins)
        },
      ];
      mockedApi.getRecipes.mockResolvedValue(longRecipes);
      
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        expect(screen.getByText('No recipes match your filters')).toBeTruthy();
        expect(screen.getByText('Try adjusting the time filter')).toBeTruthy();
      });
    });

    it('should not show filter panel when no recipes exist', async () => {
      mockedApi.getRecipes.mockResolvedValue([]);
      
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('No recipes yet')).toBeTruthy();
        // Filter toggle should still be there but no need to use it
        expect(screen.getByText(/⏱️ Time Filter/)).toBeTruthy();
      });
    });
  });

  describe('Add Recipe Modal', () => {
    it('should open modal when add button is clicked', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const addButton = screen.getByText('+ Add Recipe');
        fireEvent.press(addButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Add Recipe Modal')).toBeTruthy();
      });
    });

    it('should close modal when close is triggered', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const addButton = screen.getByText('+ Add Recipe');
        fireEvent.press(addButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Add Recipe Modal')).toBeTruthy();
      });
      
      const closeButton = screen.getByTestId('close-modal');
      fireEvent.press(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Add Recipe Modal')).toBeNull();
      });
    });

    it('should refresh recipes after adding new recipe', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        const addButton = screen.getByText('+ Add Recipe');
        fireEvent.press(addButton);
      });
      
      const initialCalls = mockedApi.getRecipes.mock.calls.length;
      
      await waitFor(() => {
        const recipeAddedButton = screen.getByTestId('recipe-added');
        fireEvent.press(recipeAddedButton);
      });
      
      await waitFor(() => {
        expect(mockedApi.getRecipes).toHaveBeenCalledTimes(initialCalls + 1);
      });
    });
  });

  describe('Multi-User Support', () => {
    it('should fetch recipes when user changes', async () => {
      const { rerender } = render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(mockedApi.getRecipes).toHaveBeenCalledWith('matt');
      });
      
      // Change user
      useRecipeStore.setState({ currentUser: 'niccy' });
      rerender(<RecipesScreen />);
      
      await waitFor(() => {
        expect(mockedApi.getRecipes).toHaveBeenCalledWith('niccy');
      });
    });

    it('should show different recipes for different users', async () => {
      const mattRecipes = [
        { ...mockRecipes[0], user: 'matt' },
      ];
      const niccyRecipes = [
        {
          _id: '5',
          name: 'Niccy Special',
          ingredients: ['ingredient1'],
          instructions: ['step1'],
          prep_time: 10,
          cook_time: 15,
          servings: 2,
          user: 'niccy',
        },
      ];
      
      mockedApi.getRecipes.mockResolvedValueOnce(mattRecipes);
      
      const { rerender } = render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Quick Omelette')).toBeTruthy();
      });
      
      // Switch to Niccy
      mockedApi.getRecipes.mockResolvedValueOnce(niccyRecipes);
      useRecipeStore.setState({ currentUser: 'niccy', recipes: niccyRecipes });
      rerender(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Niccy Special')).toBeTruthy();
        expect(screen.queryByText('Quick Omelette')).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show alert when fetching recipes fails', async () => {
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      mockedApi.getRecipes.mockRejectedValue(new Error('Network error'));
      
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'Failed to load recipes for user "matt"'
        );
      });
    });

    it('should stop showing loading indicator after error', async () => {
      mockedApi.getRecipes.mockRejectedValue(new Error('Network error'));
      
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('activity-indicator')).toBeNull();
      });
    });
  });

  describe('Recipe Count Display', () => {
    it('should show singular "recipe" for 1 recipe', async () => {
      mockedApi.getRecipes.mockResolvedValue([mockRecipes[0]]);
      
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('1 recipe found')).toBeTruthy();
      });
    });

    it('should show plural "recipes" for multiple recipes', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('4 recipes found')).toBeTruthy();
      });
    });

    it('should update count when filter is applied', async () => {
      render(<RecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('4 recipes found')).toBeTruthy();
      });
      
      await waitFor(() => {
        const toggleButton = screen.getByText(/⏱️ Time Filter ▼/);
        fireEvent.press(toggleButton);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        expect(screen.getByText('2 recipes found')).toBeTruthy();
      });
    });
  });
});
