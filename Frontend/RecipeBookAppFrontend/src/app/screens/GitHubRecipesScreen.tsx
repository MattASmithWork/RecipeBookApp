/**
 * GitHubRecipesScreen.tsx
 * 
 * This screen displays community recipes fetched from a GitHub repository.
 * These are curated recipes shared by the community with detailed nutritional information.
 * 
 * Key Features:
 * - Fetches recipes from GitHub repository (acts as centralized recipe database)
 * - Multi-filter system: search, calorie range, tags, and time
 * - Detailed recipe view modal with full ingredients and instructions
 * - AI-estimated calorie information displayed prominently
 * - Tag-based categorization (e.g., "vegetarian", "quick", "dessert")
 * - Time filtering (prep + cook time) for busy users
 * 
 * This complements RecipesScreen (personal recipes) by providing a library
 * of tried-and-tested community recipes users can browse and reference.
 */

import React, { useEffect, useState } from 'react'; // React hooks for component state and lifecycle
import {
  View,           // Container component
  Text,           // Text display
  FlatList,       // Efficient scrollable list
  TouchableOpacity, // Touchable button
  StyleSheet,     // Styling system
  ActivityIndicator, // Loading spinner
  Alert,          // Alert dialogs
  TextInput,      // Text input field
  ScrollView,     // Scrollable container
  Modal,          // Popup modal
} from 'react-native';
import { fetchGitHubRecipes, GitHubRecipe } from '../services/api'; // API function and TypeScript type

export default function GitHubRecipesScreen() {
  // State for recipe data
  const [recipes, setRecipes] = useState<GitHubRecipe[]>([]); // All recipes from GitHub
  const [filteredRecipes, setFilteredRecipes] = useState<GitHubRecipe[]>([]); // Recipes after applying filters
  const [loading, setLoading] = useState(true); // Loading state during fetch
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState(''); // Text search query
  const [selectedRecipe, setSelectedRecipe] = useState<GitHubRecipe | null>(null); // Recipe selected for detail view
  const [modalVisible, setModalVisible] = useState(false); // Controls recipe detail modal visibility
  const [showFilters, setShowFilters] = useState(false); // Controls filter panel visibility
  
  // Calorie range filter (e.g., 0-500 calories)
  const [calorieRange, setCalorieRange] = useState<{ min: number | null; max: number | null }>({
    min: null, // Minimum calories (null = no min limit)
    max: null, // Maximum calories (null = no max limit)
  });
  
  // Tag filtering system
  const [availableTags, setAvailableTags] = useState<string[]>([]); // All unique tags from recipes
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // Tags user has selected to filter by
  
  // Time filter (total time = prep_time + cook_time)
  const [maxTime, setMaxTime] = useState<number | null>(null); // Maximum total time in minutes

  // On component mount, load recipes from GitHub
  useEffect(() => {
    loadGitHubRecipes();
  }, []);

  // Re-filter recipes whenever any filter criteria changes
  useEffect(() => {
    filterRecipes();
  }, [searchQuery, recipes, calorieRange, selectedTags, maxTime]);

  /**
   * loadGitHubRecipes
   * Fetches all recipes from the GitHub repository via the backend API.
   * Also extracts all unique tags from the recipes for the tag filter UI.
   */
  const loadGitHubRecipes = async () => {
    try {
      setLoading(true);
      const data = await fetchGitHubRecipes(); // Fetch from backend (which reads from GitHub)
      console.log(`[GitHubRecipesScreen] Fetched ${data.total_count} recipes from GitHub`);
      setRecipes(data.recipes);
      setFilteredRecipes(data.recipes);
      
      // Extract all unique tags from recipes for tag filter
      const tagsSet = new Set<string>();
      data.recipes.forEach((recipe) => {
        if (recipe.tags && Array.isArray(recipe.tags)) {
          recipe.tags.forEach((tag) => tagsSet.add(tag)); // Add each tag to set (ensures uniqueness)
        }
      });
      setAvailableTags(Array.from(tagsSet).sort()); // Convert to sorted array
    } catch (error) {
      console.error('[GitHubRecipesScreen] Error fetching GitHub recipes:', error);
      Alert.alert('Error', 'Failed to load recipes from GitHub');
    } finally {
      setLoading(false);
    }
  };

  /**
   * filterRecipes
   * Applies all active filters (search, calories, tags, time) to the recipe list.
   * Filters are additive (AND logic) - recipes must match ALL active filters.
   */
  const filterRecipes = () => {
    let filtered = recipes;

    // Filter 1: Text search (searches name, cuisine, category)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((recipe) => {
        // Search by name/title
        const name = (recipe.name || recipe.title || '').toLowerCase();
        if (name.includes(query)) return true;

        // Search by cuisine (e.g., "Italian", "Mexican")
        const cuisine = (recipe.cuisine || '').toLowerCase();
        if (cuisine.includes(query)) return true;

        // Search by category (e.g., "Main Course", "Dessert")
        const category = (recipe.category || '').toLowerCase();
        if (category.includes(query)) return true;

        // Search by tags
        if (recipe.tags && Array.isArray(recipe.tags)) {
          const tagsMatch = recipe.tags.some((tag) => 
            tag.toLowerCase().includes(query)
          );
          if (tagsMatch) return true;
        }

        // Search by ingredients
        if (recipe.ingredients) {
          if (Array.isArray(recipe.ingredients)) {
            const ingredientsMatch = recipe.ingredients.some((ing) =>
              String(ing).toLowerCase().includes(query)
            );
            if (ingredientsMatch) return true;
          } else if (typeof recipe.ingredients === 'object') {
            const ingredientsText = JSON.stringify(recipe.ingredients).toLowerCase();
            if (ingredientsText.includes(query)) return true;
          }
        }

        return false; // No match found
      });
    }

    // Filter 2: Calorie range filter
    if (calorieRange.min !== null || calorieRange.max !== null) {
      filtered = filtered.filter((recipe) => {
        const calories = extractCalories(recipe); // Extract calorie value from recipe
        if (calories === null) return false; // Exclude recipes without calorie info

        // Check if calories fall within the specified range
        if (calorieRange.min !== null && calories < calorieRange.min) return false;
        if (calorieRange.max !== null && calories > calorieRange.max) return false;

        return true; // Matches calorie criteria
      });
    }

    // Filter 3: Tag filter (must have ALL selected tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((recipe) => {
        if (!recipe.tags || !Array.isArray(recipe.tags)) return false;
        // Check if recipe has all selected tags (AND logic)
        return selectedTags.every((selectedTag) =>
          recipe.tags!.includes(selectedTag)
        );
      });
    }

    // Filter 4: Time filter (total time = prep + cook)
    if (maxTime !== null) {
      filtered = filtered.filter((recipe) => {
        const totalTime = extractTotalTime(recipe); // Calculate total prep + cook time
        if (totalTime === null) return false; // Exclude recipes without time info
        return totalTime <= maxTime; // Only include recipes within time limit
      });
    }

    setFilteredRecipes(filtered); // Update displayed recipes
  };

  /**
   * extractTotalTime
   * Extracts the total time (prep + cook) from a recipe object.
   * Handles various field names and formats used in GitHub recipes.
   * 
   * @param recipe - The recipe object
   * @returns Total time in minutes, or null if not available
   */
  const extractTotalTime = (recipe: GitHubRecipe): number | null => {
    // Try to extract total time from various field names
    const timeFields = ['totalTime', 'total_time', 'time', 'cookTime', 'prepTime'];
    
    for (const field of timeFields) {
      const value = recipe[field];
      if (value !== undefined && value !== null) {
        if (typeof value === 'number') return value; // Already a number
        if (typeof value === 'string') {
          const match = value.match(/(\d+)/); // Extract number from string (e.g., "45 mins")
          if (match) return parseInt(match[1], 10);
        }
      }
    }

    // If no total time field, try combining prep and cook time
    const prepTime = extractTimeValue(recipe.prepTime || recipe.prep_time);
    const cookTime = extractTimeValue(recipe.cookTime || recipe.cook_time);
    
    if (prepTime !== null && cookTime !== null) {
      return prepTime + cookTime; // Both available: sum them
    }
    if (prepTime !== null) return prepTime; // Only prep time available
    if (cookTime !== null) return cookTime; // Only cook time available

    return null; // No time information available
  };

  /**
   * extractTimeValue
   * Helper function to extract a numeric time value from various formats.
   * 
   * @param value - Can be number, string, or undefined
   * @returns Time in minutes, or null if not parseable
   */
  const extractTimeValue = (value: any): number | null => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number') return value; // Already numeric
    if (typeof value === 'string') {
      const match = value.match(/(\d+)/); // Extract digits (e.g., "30 minutes" → 30)
      if (match) return parseInt(match[1], 10);
    }
    return null;
  };

  /**
   * extractCalories
   * Extracts calorie information from a recipe object.
   * Handles various field names and nested structures used in GitHub recipes.
   * 
   * @param recipe - The recipe object
   * @returns Calories as a number, or null if not available
   */
  const extractCalories = (recipe: GitHubRecipe): number | null => {
    // Check for various calorie field names
    const calorieFields = [
      'calories',      // Most common
      'calorie',       // Alternative spelling
      'cal',           // Abbreviation
      'nutrition',     // May contain nested calorie info
      'nutritionInfo', // Alternative nested structure
      'energy',        // Scientific term
    ];

    for (const field of calorieFields) {
      const value = recipe[field];
      if (value !== undefined && value !== null) {
        // Handle different value formats
        if (typeof value === 'number') return value; // Direct numeric value
        if (typeof value === 'string') {
          const match = value.match(/(\d+)/); // Extract number from string (e.g., "450 kcal")
          if (match) return parseInt(match[1], 10);
        }
        // Handle nested object (e.g., { calories: 450 })
        if (typeof value === 'object' && value.calories) {
          return extractCalories({ calories: value.calories } as GitHubRecipe);
        }
      }
    }

    return null; // No calorie information found
  };

  /**
   * clearFilters
   * Resets all filter criteria to their default (empty) state.
   * Used by the "Clear All Filters" button.
   */
  const clearFilters = () => {
    setCalorieRange({ min: null, max: null });
    setSelectedTags([]);
    setSearchQuery('');
    setMaxTime(null);
  };

  /**
   * toggleTag
   * Toggles a tag in the selectedTags array.
   * If the tag is already selected, removes it. Otherwise, adds it.
   * 
   * @param tag - The tag to toggle
   */
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag)); // Remove tag
    } else {
      setSelectedTags([...selectedTags, tag]); // Add tag
    }
  };

  /**
   * openRecipeDetail
   * Opens the recipe detail modal with the selected recipe.
   * 
   * @param recipe - The recipe to display in detail
   */
  const openRecipeDetail = (recipe: GitHubRecipe) => {
    setSelectedRecipe(recipe);
    setModalVisible(true);
  };

  /**
   * formatIngredients
   * Formats ingredients from various structures into a consistent string array.
   * GitHub recipes may have ingredients as arrays or objects.
   * 
   * @param ingredients - Can be array or object
   * @returns Array of ingredient strings
   */
  const formatIngredients = (ingredients: any): string[] => {
    if (Array.isArray(ingredients)) {
      // Already an array - just convert to strings
      return ingredients.map((ing) => String(ing));
    } else if (typeof ingredients === 'object' && ingredients !== null) {
      // Object format (e.g., { "flour": "2 cups", "sugar": "1 cup" })
      // Convert to "ingredient: amount" format
      return Object.entries(ingredients).map(
        ([key, value]) => `${key}: ${value}`
      );
    }
    return []; // Invalid format
  };

  /**
   * formatInstructions
   * Formats cooking instructions from various structures into a consistent string array.
   * 
   * @param instructions - Can be array, string, or object
   * @returns Array of instruction strings
   */
  const formatInstructions = (instructions: any): string[] => {
    if (Array.isArray(instructions)) {
      // Array format - just convert to strings
      return instructions.map((inst) => String(inst));
    } else if (typeof instructions === 'string') {
      // String format with newlines - split into array
      return instructions.split('\n').filter((line) => line.trim());
    }
    return []; // Invalid format
  };

  /**
   * renderRecipe
   * Renders a single recipe card in the list.
   * Shows recipe name, calorie info, cuisine, category, tags, and source.
   * 
   * @param item - The recipe object to render
   */
  const renderRecipe = ({ item }: { item: GitHubRecipe }) => {
    // Extract recipe information with fallbacks
    const recipeName = item.name || item.title || 'Untitled Recipe';
    const cuisine = item.cuisine || '';
    const category = item.category || '';
    const tags = item.tags || [];
    const calories = extractCalories(item);

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => openRecipeDetail(item)} // Open detail modal on tap
      >
        {/* Recipe name/title */}
        <Text style={styles.recipeName}>{recipeName}</Text>
        
        {/* Calorie information - only if available */}
        {calories !== null && (
          <Text style={styles.calorieInfo}>🔥 {calories} calories</Text>
        )}
        
        {/* Cuisine type (e.g., Italian, Mexican) */}
        {cuisine && (
          <Text style={styles.recipeInfo}>🌍 Cuisine: {cuisine}</Text>
        )}
        
        {/* Category (e.g., Main Course, Dessert) */}
        {category && (
          <Text style={styles.recipeInfo}>📂 Category: {category}</Text>
        )}
        
        {/* Tags - show first 3, plus count of remaining */}
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{tags.length - 3} more</Text>
            )}
          </View>
        )}
        
        {/* Source file from GitHub repo */}
        <Text style={styles.sourceText}>Source: {item.source_file || 'GitHub'}</Text>
      </TouchableOpacity>
    );
  };

  /**
   * renderRecipeDetail
   * Renders the detailed view of a recipe in the modal.
   * Shows full ingredients list and cooking instructions.
   * 
   * @returns JSX for the recipe detail modal, or null if no recipe selected
   */
  const renderRecipeDetail = () => {
    if (!selectedRecipe) return null;

    const recipeName = selectedRecipe.name || selectedRecipe.title || 'Untitled Recipe';
    const ingredients = formatIngredients(selectedRecipe.ingredients);
    const instructions = formatInstructions(selectedRecipe.instructions);
    const calories = extractCalories(selectedRecipe);

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{recipeName}</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {calories !== null && (
              <Text style={styles.calorieInfoLarge}>🔥 {calories} calories</Text>
            )}

            {selectedRecipe.cuisine && (
              <Text style={styles.detailInfo}>🌍 {selectedRecipe.cuisine}</Text>
            )}
            
            {selectedRecipe.category && (
              <Text style={styles.detailInfo}>📂 {selectedRecipe.category}</Text>
            )}

            {selectedRecipe.servings && (
              <Text style={styles.detailInfo}>👥 Servings: {selectedRecipe.servings}</Text>
            )}

            {selectedRecipe.prepTime && (
              <Text style={styles.detailInfo}>⏱️ Prep: {selectedRecipe.prepTime}</Text>
            )}

            {selectedRecipe.cookTime && (
              <Text style={styles.detailInfo}>🍳 Cook: {selectedRecipe.cookTime}</Text>
            )}

            {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagsContainer}>
                  {selectedRecipe.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {ingredients.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {ingredients.map((ingredient, index) => (
                  <Text key={index} style={styles.listItem}>
                    • {ingredient}
                  </Text>
                ))}
              </View>
            )}

            {instructions.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {instructions.map((instruction, index) => (
                  <Text key={index} style={styles.instructionItem}>
                    {index + 1}. {instruction}
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // Loading state - shown while fetching recipes from GitHub
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading GitHub recipes...</Text>
      </View>
    );
  }

  // Main screen render
  return (
    <View style={styles.container}>
      {/* Header section */}
      <View style={styles.header}>
        <Text style={styles.title}>Community Recipes</Text>
        <Text style={styles.subtitle}>From GitHub</Text>
      </View>

      {/* Search bar - searches name, cuisine, category, ingredients, tags */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by cuisine, category, ingredient, or tag..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {/* Clear button - only shown when there's text */}
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter panel - collapsible section with calorie, tag, and time filters */}
      <View style={styles.filterSection}>
        {/* Filter toggle button - shows active filter count */}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            🔍 Filters {showFilters ? '▲' : '▼'}
          </Text>
          {/* Active filters badge - shows count of active filters */}
          {(calorieRange.min !== null || calorieRange.max !== null || selectedTags.length > 0 || maxTime !== null) && (
            <View style={styles.filterActiveBadge}>
              <Text style={styles.filterActiveBadgeText}>
                {selectedTags.length + (calorieRange.min !== null || calorieRange.max !== null ? 1 : 0) + (maxTime !== null ? 1 : 0)} Active
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Filter content - shown when showFilters is true */}
        {showFilters && (
          <View style={styles.filterContent}>
            {/* Calorie Range Filter - min and max inputs */}
            <Text style={styles.filterSectionTitle}>🔥 Calories</Text>
            <View style={styles.filterRow}>
              {/* Minimum calorie input */}
              <View style={styles.filterInputContainer}>
                <Text style={styles.filterLabel}>Min Calories</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g., 200"
                  keyboardType="numeric"
                  value={calorieRange.min?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text ? parseInt(text, 10) : null;
                    setCalorieRange({ ...calorieRange, min: value });
                  }}
                />
              </View>

              {/* Maximum calorie input */}
              <View style={styles.filterInputContainer}>
                <Text style={styles.filterLabel}>Max Calories</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g., 500"
                  keyboardType="numeric"
                  value={calorieRange.max?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text ? parseInt(text, 10) : null;
                    setCalorieRange({ ...calorieRange, max: value });
                  }}
                />
              </View>
            </View>

            {/* Quick calorie filter buttons - common ranges */}
            <View style={styles.quickFiltersContainer}>
              <Text style={styles.quickFiltersLabel}>Quick filters:</Text>
              <View style={styles.quickFilters}>
                <TouchableOpacity
                  style={styles.quickFilterButton}
                  onPress={() => setCalorieRange({ min: null, max: 300 })}
                >
                  <Text style={styles.quickFilterText}>Under 300</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickFilterButton}
                  onPress={() => setCalorieRange({ min: 300, max: 600 })}
                >
                  <Text style={styles.quickFilterText}>300-600</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickFilterButton}
                  onPress={() => setCalorieRange({ min: 600, max: null })}
                >
                  <Text style={styles.quickFilterText}>Over 600</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <>
                <Text style={styles.filterSectionTitle}>🏷️ Tags</Text>
                <View style={styles.tagFilterContainer}>
                  {availableTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagFilterButton,
                        selectedTags.includes(tag) && styles.tagFilterButtonActive,
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagFilterButtonText,
                          selectedTags.includes(tag) && styles.tagFilterButtonTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Time Filter */}
            <Text style={styles.filterSectionTitle}>⏱️ Maximum Total Time</Text>
            <View style={styles.quickFiltersContainer}>
              <View style={styles.quickFilters}>
                <TouchableOpacity
                  style={[styles.quickFilterButton, maxTime === 15 && styles.quickFilterButtonActive]}
                  onPress={() => setMaxTime(maxTime === 15 ? null : 15)}
                >
                  <Text style={[styles.quickFilterText, maxTime === 15 && styles.quickFilterTextActive]}>≤ 15 mins</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickFilterButton, maxTime === 30 && styles.quickFilterButtonActive]}
                  onPress={() => setMaxTime(maxTime === 30 ? null : 30)}
                >
                  <Text style={[styles.quickFilterText, maxTime === 30 && styles.quickFilterTextActive]}>≤ 30 mins</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickFilterButton, maxTime === 45 && styles.quickFilterButtonActive]}
                  onPress={() => setMaxTime(maxTime === 45 ? null : 45)}
                >
                  <Text style={[styles.quickFilterText, maxTime === 45 && styles.quickFilterTextActive]}>≤ 45 mins</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickFilterButton, maxTime === 60 && styles.quickFilterButtonActive]}
                  onPress={() => setMaxTime(maxTime === 60 ? null : 60)}
                >
                  <Text style={[styles.quickFilterText, maxTime === 60 && styles.quickFilterTextActive]}>≤ 60 mins</Text>
                </TouchableOpacity>
              </View>
            </View>

            {(calorieRange.min !== null || calorieRange.max !== null || selectedTags.length > 0 || maxTime !== null) && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No recipes found' : 'No recipes available'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Pull to refresh'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.resultCount}>
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
          </Text>
          <FlatList
            data={filteredRecipes}
            renderItem={renderRecipe}
            keyExtractor={(item, index) => `${item.source_file}-${index}`}
            contentContainerStyle={styles.listContent}
            onRefresh={loadGitHubRecipes}
            refreshing={loading}
          />
        </>
      )}

      {renderRecipeDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
  },
  resultCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingBottom: 16,
  },
  recipeCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  recipeInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  calorieInfo: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 6,
  },
  calorieInfoLarge: {
    fontSize: 18,
    color: '#FF6B35',
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  filterSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
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
  filterActiveBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterActiveBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterInputContainer: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  filterInput: {
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  quickFiltersContainer: {
    marginBottom: 12,
  },
  quickFiltersLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFilterButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickFilterText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  clearFiltersButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  tagFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  tagFilterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagFilterButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tagFilterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  sourceText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  detailInfo: {
    fontSize: 16,
    color: '#555',
    marginTop: 8,
  },
  detailSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  listItem: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  instructionItem: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  quickFilterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quickFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
