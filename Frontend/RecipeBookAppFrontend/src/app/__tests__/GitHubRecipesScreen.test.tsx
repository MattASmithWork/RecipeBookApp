/**
 * Unit tests for GitHubRecipesScreen component
 * Tests: Community recipe display, search, filtering (calories/tags/time), recipe detail modal
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import GitHubRecipesScreen from '../screens/GitHubRecipesScreen';
import * as api from '../services/api';

// Mock API functions
jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('GitHubRecipesScreen', () => {
  const mockGitHubRecipes = {
    total_count: 4,
    recipes: [
      {
        name: 'Classic Pasta',
        ingredients: ['pasta', 'tomato sauce', 'basil'],
        instructions: ['Boil pasta', 'Add sauce', 'Garnish with basil'],
        calories: 450,
        cuisine: 'Italian',
        category: 'Main Course',
        tags: ['vegetarian', 'quick', 'easy'],
        prep_time: 10,
        cook_time: 20,
        servings: 4,
        source_file: 'italian/pasta.json',
      },
      {
        name: 'Quick Salad',
        ingredients: ['lettuce', 'tomatoes', 'cucumber', 'dressing'],
        instructions: ['Chop vegetables', 'Mix together', 'Add dressing'],
        calories: 150,
        cuisine: 'Mediterranean',
        category: 'Salad',
        tags: ['healthy', 'vegetarian', 'quick'],
        prep_time: 5,
        cook_time: 0,
        servings: 2,
        source_file: 'salads/quick.json',
      },
      {
        name: 'Slow Cooked Stew',
        ingredients: ['beef', 'potatoes', 'carrots', 'broth'],
        instructions: ['Brown meat', 'Add vegetables', 'Simmer for 2 hours'],
        calories: 620,
        cuisine: 'American',
        category: 'Main Course',
        tags: ['comfort food', 'hearty'],
        prep_time: 15,
        cook_time: 120,
        servings: 6,
        source_file: 'american/stew.json',
      },
      {
        title: 'Chocolate Cake', // Using 'title' instead of 'name'
        ingredients: { flour: '2 cups', sugar: '1 cup', cocoa: '1/2 cup' },
        instructions: 'Mix dry ingredients. Add wet. Bake at 350°F.',
        calories: 850,
        cuisine: 'French',
        category: 'Dessert',
        tags: ['dessert', 'sweet', 'baking'],
        totalTime: 75,
        servings: 8,
        source_file: 'desserts/chocolate.json',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.fetchGitHubRecipes.mockResolvedValue(mockGitHubRecipes);
  });

  describe('Initial Rendering', () => {
    it('should show loading indicator while fetching recipes', () => {
      mockedApi.fetchGitHubRecipes.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<GitHubRecipesScreen />);
      
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('should fetch GitHub recipes on mount', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(mockedApi.fetchGitHubRecipes).toHaveBeenCalledTimes(1);
      });
    });

    it('should display all recipes after loading', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.getByText('Slow Cooked Stew')).toBeTruthy();
        expect(screen.getByText('Chocolate Cake')).toBeTruthy();
      });
    });

    it('should render header with title', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/Community Recipes|GitHub Recipes/)).toBeTruthy();
      });
    });
  });

  describe('Recipe Display', () => {
    it('should display recipe name', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
      });
    });

    it('should display calorie information', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('🔥 450 calories')).toBeTruthy();
        expect(screen.getByText('🔥 150 calories')).toBeTruthy();
      });
    });

    it('should display cuisine', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/Cuisine: Italian/)).toBeTruthy();
        expect(screen.getByText(/Cuisine: Mediterranean/)).toBeTruthy();
      });
    });

    it('should display category', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/Category: Main Course/)).toBeTruthy();
        expect(screen.getByText(/Category: Salad/)).toBeTruthy();
      });
    });

    it('should display first 3 tags', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('vegetarian')).toBeTruthy();
        expect(screen.getByText('quick')).toBeTruthy();
        expect(screen.getByText('easy')).toBeTruthy();
      });
    });

    it('should show "more" indicator for recipes with many tags', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        // Recipes with > 3 tags should show "+N more"
        const moreTags = screen.queryAllByText(/\+\d+ more/);
        expect(moreTags.length).toBeGreaterThan(0);
      });
    });

    it('should display source file', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/Source: italian\/pasta\.json/)).toBeTruthy();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search/i)).toBeTruthy();
      });
    });

    it('should filter recipes by name', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'pasta');
      });
      
      await waitFor(() => {
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.queryByText('Quick Salad')).toBeNull();
        expect(screen.queryByText('Slow Cooked Stew')).toBeNull();
      });
    });

    it('should filter recipes by cuisine', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'italian');
      });
      
      await waitFor(() => {
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.queryByText('Quick Salad')).toBeNull();
      });
    });

    it('should filter recipes by category', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'dessert');
      });
      
      await waitFor(() => {
        expect(screen.getByText('Chocolate Cake')).toBeTruthy();
        expect(screen.queryByText('Classic Pasta')).toBeNull();
      });
    });

    it('should filter recipes by ingredients', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'tomatoes');
      });
      
      await waitFor(() => {
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.queryByText('Chocolate Cake')).toBeNull();
      });
    });

    it('should filter recipes by tags', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'vegetarian');
      });
      
      await waitFor(() => {
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.queryByText('Slow Cooked Stew')).toBeNull();
      });
    });

    it('should be case-insensitive', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'PASTA');
      });
      
      await waitFor(() => {
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
      });
    });

    it('should clear search results when search is cleared', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'pasta');
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Quick Salad')).toBeNull();
      });
      
      const searchInput = screen.getByPlaceholderText(/Search/i);
      fireEvent.changeText(searchInput, '');
      
      await waitFor(() => {
        expect(screen.getByText('Quick Salad')).toBeTruthy();
      });
    });
  });

  describe('Calorie Range Filtering', () => {
    it('should show filter toggle button', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/Filters/i)).toBeTruthy();
      });
    });

    it('should expand filter panel when toggle clicked', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Calorie Range/i)).toBeTruthy();
      });
    });

    it('should filter recipes by minimum calories', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const minInput = screen.getByPlaceholderText(/Min/i);
        fireEvent.changeText(minInput, '400');
      });
      
      await waitFor(() => {
        // Recipes >= 400 calories: Classic Pasta (450), Slow Cooked Stew (620), Chocolate Cake (850)
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.getByText('Slow Cooked Stew')).toBeTruthy();
        expect(screen.queryByText('Quick Salad')).toBeNull(); // 150 calories
      });
    });

    it('should filter recipes by maximum calories', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const maxInput = screen.getByPlaceholderText(/Max/i);
        fireEvent.changeText(maxInput, '500');
      });
      
      await waitFor(() => {
        // Recipes <= 500 calories: Quick Salad (150), Classic Pasta (450)
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.queryByText('Slow Cooked Stew')).toBeNull(); // 620 calories
        expect(screen.queryByText('Chocolate Cake')).toBeNull(); // 850 calories
      });
    });

    it('should filter recipes by calorie range (min and max)', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const minInput = screen.getByPlaceholderText(/Min/i);
        const maxInput = screen.getByPlaceholderText(/Max/i);
        fireEvent.changeText(minInput, '200');
        fireEvent.changeText(maxInput, '700');
      });
      
      await waitFor(() => {
        // Recipes between 200-700 calories: Classic Pasta (450), Slow Cooked Stew (620)
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.getByText('Slow Cooked Stew')).toBeTruthy();
        expect(screen.queryByText('Quick Salad')).toBeNull(); // 150 calories
        expect(screen.queryByText('Chocolate Cake')).toBeNull(); // 850 calories
      });
    });
  });

  describe('Tag Filtering', () => {
    it('should display all available tags in filter panel', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        // Tags from all recipes
        expect(screen.getByText('vegetarian')).toBeTruthy();
        expect(screen.getByText('quick')).toBeTruthy();
        expect(screen.getByText('healthy')).toBeTruthy();
        expect(screen.getByText('dessert')).toBeTruthy();
      });
    });

    it('should filter recipes by single tag', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const vegetarianTag = screen.getAllByText('vegetarian').find((el) => 
          el.props.style && el.props.style.some && el.props.style.some((s: any) => s.fontSize === 12)
        );
        fireEvent.press(vegetarianTag!);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.queryByText('Slow Cooked Stew')).toBeNull();
      });
    });

    it('should filter recipes by multiple tags (AND logic)', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        // Select "vegetarian" and "quick" - only Quick Salad has both
        const vegetarianTags = screen.getAllByText('vegetarian');
        const quickTags = screen.getAllByText('quick');
        fireEvent.press(vegetarianTags[vegetarianTags.length - 1]);
        fireEvent.press(quickTags[quickTags.length - 1]);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.queryByText('Classic Pasta')).toBeNull(); // Has vegetarian but not in combination
      });
    });

    it('should deselect tag when clicked again', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const vegetarianTags = screen.getAllByText('vegetarian');
        fireEvent.press(vegetarianTags[vegetarianTags.length - 1]);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Slow Cooked Stew')).toBeNull();
      });
      
      // Click again to deselect
      const vegetarianTags = screen.getAllByText('vegetarian');
      fireEvent.press(vegetarianTags[vegetarianTags.length - 1]);
      
      await waitFor(() => {
        expect(screen.getByText('Slow Cooked Stew')).toBeTruthy(); // All recipes visible again
      });
    });
  });

  describe('Time Filtering', () => {
    it('should show time filter options', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Time/i)).toBeTruthy();
        expect(screen.getByText('≤ 15 mins')).toBeTruthy();
        expect(screen.getByText('≤ 30 mins')).toBeTruthy();
        expect(screen.getByText('≤ 45 mins')).toBeTruthy();
        expect(screen.getByText('≤ 60 mins')).toBeTruthy();
      });
    });

    it('should filter recipes by 15 minutes or less', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        // Only Quick Salad (5 mins)
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.queryByText('Classic Pasta')).toBeNull(); // 30 mins
      });
    });

    it('should filter recipes by 30 minutes or less', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const filter30 = screen.getByText('≤ 30 mins');
        fireEvent.press(filter30);
      });
      
      await waitFor(() => {
        // Quick Salad (5) and Classic Pasta (30)
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.queryByText('Slow Cooked Stew')).toBeNull(); // 135 mins
      });
    });
  });

  describe('Combined Filters', () => {
    it('should apply search and calorie filter together', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'vegetarian');
      });
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const maxInput = screen.getByPlaceholderText(/Max/i);
        fireEvent.changeText(maxInput, '300');
      });
      
      await waitFor(() => {
        // Only Quick Salad: vegetarian + <= 300 calories
        expect(screen.getByText('Quick Salad')).toBeTruthy();
        expect(screen.queryByText('Classic Pasta')).toBeNull(); // 450 calories
      });
    });

    it('should apply search, tag, and time filters together', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'main');
      });
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const filter30 = screen.getByText('≤ 30 mins');
        fireEvent.press(filter30);
      });
      
      await waitFor(() => {
        // Only Classic Pasta: "main" in category + <= 30 mins
        expect(screen.getByText('Classic Pasta')).toBeTruthy();
        expect(screen.queryByText('Slow Cooked Stew')).toBeNull(); // > 30 mins
      });
    });
  });

  describe('Clear Filters', () => {
    it('should show clear filters button when any filter is active', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const filter15 = screen.getByText('≤ 15 mins');
        fireEvent.press(filter15);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Clear.*Filters/i)).toBeTruthy();
      });
    });

    it('should clear all filters when clicked', async () => {
      render(<GitHubRecipesScreen />);
      
      // Apply multiple filters
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'pasta');
      });
      
      await waitFor(() => {
        const filterToggle = screen.getByText(/Filters/i);
        fireEvent.press(filterToggle);
      });
      
      await waitFor(() => {
        const maxInput = screen.getByPlaceholderText(/Max/i);
        fireEvent.changeText(maxInput, '500');
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Slow Cooked Stew')).toBeNull();
      });
      
      // Clear all filters
      const clearButton = screen.getByText(/Clear.*Filters/i);
      fireEvent.press(clearButton);
      
      await waitFor(() => {
        expect(screen.getByText('Slow Cooked Stew')).toBeTruthy(); // All recipes visible
        expect(screen.getByText('Quick Salad')).toBeTruthy();
      });
    });
  });

  describe('Recipe Detail Modal', () => {
    it('should open modal when recipe card is clicked', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const recipeCard = screen.getByText('Classic Pasta');
        fireEvent.press(recipeCard);
      });
      
      await waitFor(() => {
        // Modal should show full recipe details
        expect(screen.getAllByText('Classic Pasta')).toHaveLength(2); // In list and modal
      });
    });

    it('should display full ingredients list in modal', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const recipeCard = screen.getByText('Classic Pasta');
        fireEvent.press(recipeCard);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/pasta/i)).toBeTruthy();
        expect(screen.getByText(/tomato sauce/i)).toBeTruthy();
        expect(screen.getByText(/basil/i)).toBeTruthy();
      });
    });

    it('should display cooking instructions in modal', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const recipeCard = screen.getByText('Classic Pasta');
        fireEvent.press(recipeCard);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Boil pasta/i)).toBeTruthy();
        expect(screen.getByText(/Add sauce/i)).toBeTruthy();
      });
    });

    it('should close modal when close button is clicked', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const recipeCard = screen.getByText('Classic Pasta');
        fireEvent.press(recipeCard);
      });
      
      await waitFor(() => {
        const closeButton = screen.getByText('✕');
        fireEvent.press(closeButton);
      });
      
      await waitFor(() => {
        const allPastaTexts = screen.getAllByText('Classic Pasta');
        expect(allPastaTexts).toHaveLength(1); // Only in list, not in modal
      });
    });

    it('should handle recipes with object-formatted ingredients', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const recipeCard = screen.getByText('Chocolate Cake');
        fireEvent.press(recipeCard);
      });
      
      await waitFor(() => {
        // Object format: { flour: '2 cups', sugar: '1 cup' }
        expect(screen.getByText(/flour: 2 cups/i)).toBeTruthy();
        expect(screen.getByText(/sugar: 1 cup/i)).toBeTruthy();
      });
    });

    it('should handle recipes with string-formatted instructions', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const recipeCard = screen.getByText('Chocolate Cake');
        fireEvent.press(recipeCard);
      });
      
      await waitFor(() => {
        // String format split by newlines
        expect(screen.getByText(/Mix dry ingredients/i)).toBeTruthy();
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no recipes are available', async () => {
      mockedApi.fetchGitHubRecipes.mockResolvedValue({ total_count: 0, recipes: [] });
      
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/No recipes/i)).toBeTruthy();
      });
    });

    it('should show empty state when filters exclude all recipes', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'nonexistentrecipe123');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/No recipes match/i)).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show alert when fetching recipes fails', async () => {
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      mockedApi.fetchGitHubRecipes.mockRejectedValue(new Error('Network error'));
      
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to load recipes from GitHub');
      });
    });

    it('should stop showing loading indicator after error', async () => {
      mockedApi.fetchGitHubRecipes.mockRejectedValue(new Error('Network error'));
      
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('activity-indicator')).toBeNull();
      });
    });
  });

  describe('Recipe Count Display', () => {
    it('should display total recipe count', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        expect(screen.getByText(/4 recipes/i)).toBeTruthy();
      });
    });

    it('should update count when filters are applied', async () => {
      render(<GitHubRecipesScreen />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.changeText(searchInput, 'vegetarian');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/2 recipes/i)).toBeTruthy();
      });
    });
  });
});
