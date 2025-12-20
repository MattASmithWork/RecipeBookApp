/**
 * Recipes Screen Component
 * 
 * Displays the user's personal recipe collection with filtering capabilities.
 * 
 * Features:
 * - Loads recipes from MongoDB for the current user
 * - Time-based filtering (≤15, ≤30, ≤45, ≤60 minutes)
 * - Add new recipes via modal with AI-powered calorie estimation
 * - Displays recipe details including prep/cook time, servings, ingredients
 * - Shows estimated calories for recipes (if available)
 * 
 * Uses:
 * - Zustand store for global recipe state
 * - API service for fetching recipes from backend
 * - AddRecipeModal component for creating new recipes
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getRecipes, Recipe } from '../services/api';  // API functions and types
import { useRecipeStore } from '../utils/store';  // Global state management
import AddRecipeModal from '../components/AddRecipeModal';  // Modal for adding recipes

export default function RecipesScreen() {
  // === Global State ===
  const { recipes, currentUser, setRecipes } = useRecipeStore();
  
  // === Local State ===
  const [loading, setLoading] = useState(true);  // Loading indicator while fetching recipes
  const [showAddModal, setShowAddModal] = useState(false);  // Control add recipe modal visibility
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);  // Recipes after applying filters
  const [showFilters, setShowFilters] = useState(false);  // Toggle filter panel visibility
  const [maxTime, setMaxTime] = useState<number | null>(null);  // Max total time filter (in minutes)

  // === Fetch recipes when user changes ===
  useEffect(() => {
    fetchRecipes();
  }, [currentUser]);

  // === Apply filters whenever recipes or filters change ===
  useEffect(() => {
    applyFilters();
  }, [recipes, maxTime]);

  /**
   * Fetch recipes from backend for current user
   * Called on mount and when user changes
   */
  const fetchRecipes = async () => {
    try {
      setLoading(true);
      console.log(`[RecipesScreen] Fetching recipes for user: ${currentUser}`);
      const data = await getRecipes(currentUser);  // GET /recipes/{user}
      console.log(`[RecipesScreen] Received ${data.length} recipes:`, data);
      setRecipes(data);  // Update global state
    } catch (error) {
      console.error(`[RecipesScreen] Error fetching recipes:`, error);
      Alert.alert('Error', `Failed to load recipes for user "${currentUser}"`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply time-based filters to recipes
   * Filters recipes by total cooking time (prep + cook)
   * Updates filteredRecipes state
   */
  const applyFilters = () => {
    let filtered = recipes;

    // Apply time filter if set
    if (maxTime !== null) {
      filtered = filtered.filter((recipe) => {
        const totalTime = recipe.prep_time + recipe.cook_time;
        return totalTime <= maxTime;  // Only include recipes within time limit
      });
    }

    setFilteredRecipes(filtered);
  };

  /**
   * Clear all active filters
   * Resets maxTime to null, which shows all recipes
   */
  const clearFilters = () => {
    setMaxTime(null);
  };

  /**
   * Render a single recipe card
   * Displays recipe name, calories (if available), time info, servings, and ingredient count
   */
  const renderRecipe = ({ item }: { item: Recipe }) => {
    const totalTime = item.prep_time + item.cook_time;
    return (
      <TouchableOpacity style={styles.recipeCard}>
        <Text style={styles.recipeName}>{item.name}</Text>
        {/* Show estimated calories if available (added by AI during recipe creation) */}
        {(item as any).estimated_calories && (
          <Text style={styles.calorieInfo}>
            🔥 {(item as any).estimated_calories} calories (estimated)
          </Text>
        )}
        <Text style={styles.recipeInfo}>
          ⏱️ Total: {totalTime} mins ({item.prep_time}min prep + {item.cook_time}min cook)
        </Text>
        <Text style={styles.recipeInfo}>👥 Servings: {item.servings}</Text>
        <Text style={styles.ingredients}>
          Ingredients: {item.ingredients.length} items
        </Text>
      </TouchableOpacity>
    );
  };

  // === Loading State ===
  // Show spinner while fetching recipes from backend
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // === Main Render ===
  return (
    <View style={styles.container}>
      {/* Header with title and Add button */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>My Recipes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Recipe</Text>
        </TouchableOpacity>
      </View>

      {/* Time Filter Section - Collapsible panel */}
      <View style={styles.filterSection}>
        {/* Toggle button to show/hide filter options */}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            ⏱️ Time Filter {showFilters ? '▲' : '▼'}
          </Text>
          {/* Badge showing filter is active */}
          {maxTime !== null && (
            <View style={styles.filterActiveBadge}>
              <Text style={styles.filterActiveBadgeText}>Active</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Filter Options Panel - Only shown when showFilters is true */}
        {showFilters && (
          <View style={styles.filterContent}>
            <Text style={styles.filterLabel}>Maximum Total Time</Text>
            {/* Quick filter buttons for common time limits */}
            <View style={styles.quickFilters}>
              {/* 15 minutes button */}
              <TouchableOpacity
                style={[styles.quickFilterButton, maxTime === 15 && styles.quickFilterActive]}
                onPress={() => setMaxTime(15)}
              >
                <Text style={[styles.quickFilterText, maxTime === 15 && styles.quickFilterTextActive]}>
                  ≤ 15 mins
                </Text>
              </TouchableOpacity>
              {/* 30 minutes button */}
              <TouchableOpacity
                style={[styles.quickFilterButton, maxTime === 30 && styles.quickFilterActive]}
                onPress={() => setMaxTime(30)}
              >
                <Text style={[styles.quickFilterText, maxTime === 30 && styles.quickFilterTextActive]}>
                  ≤ 30 mins
                </Text>
              </TouchableOpacity>
              {/* 45 minutes button */}
              <TouchableOpacity
                style={[styles.quickFilterButton, maxTime === 45 && styles.quickFilterActive]}
                onPress={() => setMaxTime(45)}
              >
                <Text style={[styles.quickFilterText, maxTime === 45 && styles.quickFilterTextActive]}>
                  ≤ 45 mins
                </Text>
              </TouchableOpacity>
              {/* 60 minutes button */}
              <TouchableOpacity
                style={[styles.quickFilterButton, maxTime === 60 && styles.quickFilterActive]}
                onPress={() => setMaxTime(60)}
              >
                <Text style={[styles.quickFilterText, maxTime === 60 && styles.quickFilterTextActive]}>
                  ≤ 60 mins
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clear filter button - only shown when filter is active */}
            {maxTime !== null && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Recipe List or Empty States */}
      {/* Conditional rendering based on recipe availability and filter status */}
      {recipes.length === 0 ? (
        // No recipes at all - encourage user to add first recipe
        // This is the initial state when user hasn't created any recipes yet
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recipes yet</Text>
          <Text style={styles.emptySubtext}>Add a recipe to get started</Text>
        </View>
      ) : filteredRecipes.length === 0 ? (
        // Has recipes, but none match the current time filter
        // Suggests user to adjust their filter criteria
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recipes match your filters</Text>
          <Text style={styles.emptySubtext}>Try adjusting the time filter</Text>
        </View>
      ) : (
        // Has recipes that match the filter - display them in a list
        <>
          {/* Result count - shows how many recipes match the current filter */}
          <Text style={styles.resultCount}>
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
          </Text>
          
          {/* FlatList - efficient scrollable list of recipes */}
          <FlatList
            data={filteredRecipes} // Array of recipes to display
            renderItem={renderRecipe} // Function that renders each recipe card
            keyExtractor={(item) => item._id || Math.random().toString()} // Unique key for each item
            contentContainerStyle={styles.listContent} // Styling for the scrollable area
          />
        </>
      )}

      {/* AddRecipeModal - popup for creating new recipes */}
      {/* Features: AI-powered duplicate detection, similarity analysis, calorie estimation */}
      <AddRecipeModal
        visible={showAddModal} // Controls modal visibility
        onClose={() => setShowAddModal(false)} // Handler to close the modal
        onRecipeAdded={fetchRecipes} // Callback to refresh recipe list after adding
      />
    </View>
  );
}

// Styles for the RecipesScreen component
// Uses React Native StyleSheet for optimized style performance
const styles = StyleSheet.create({
  // Main container - fills the screen with light gray background
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Light gray background for contrast with white cards
    paddingTop: 16,
  },
  
  // Header section at the top with title and Add button
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  
  // "My Recipes" title
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  
  // Add button in header (triggers AddRecipeModal)
  addButton: {
    backgroundColor: '#007AFF', // iOS blue
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Filter section container - collapsible panel
  filterSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 1, // Subtle shadow on Android
  },
  
  // Toggle button to show/hide filter options
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  
  // Green badge showing "Active" when filter is applied
  filterActiveBadge: {
    backgroundColor: '#34C759', // iOS green
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterActiveBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  
  // Filter content panel (quick filter buttons)
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  
  // "Filter by Total Time" label
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  
  // Container for quick filter buttons (15, 30, 45, 60 min)
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  
  // Individual quick filter button (e.g., "≤15 mins")
  quickFilterButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f0f0f0', // Light gray default
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  
  // Active state for selected quick filter
  quickFilterActive: {
    backgroundColor: '#007AFF', // iOS blue when selected
    borderColor: '#007AFF',
  },
  
  // Text for quick filter button
  quickFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  
  // Text color when quick filter is active
  quickFilterTextActive: {
    color: '#fff',
  },
  
  // Clear filters button (red)
  clearFiltersButton: {
    backgroundColor: '#FF3B30', // iOS red
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  
  // Result count text (e.g., "5 recipes found")
  resultCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#666',
  },
  
  // Individual recipe card in the list
  recipeCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    elevation: 2, // Card shadow on Android
  },
  
  // Recipe name (main title on card)
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  
  // Calorie information - highlighted in orange
  calorieInfo: {
    fontSize: 15,
    color: '#FF6B35', // Orange to stand out
    fontWeight: '600',
    marginBottom: 6,
  },
  
  // General recipe info (prep time, cook time, servings)
  recipeInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  
  // Ingredients list preview - blue color
  ingredients: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 8,
  },
  
  // Empty state container (no recipes or no matches)
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Main empty state message
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  
  // Secondary empty state message (suggestion)
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  
  // Padding at bottom of scrollable list
  listContent: {
    paddingBottom: 20,
  },
});
