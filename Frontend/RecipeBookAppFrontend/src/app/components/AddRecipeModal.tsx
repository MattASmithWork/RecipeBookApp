/**
 * AddRecipeModal.tsx
 * 
 * This modal component allows users to create new recipes in their personal collection.
 * It features AI-powered functionality to prevent duplicates and estimate calories.
 * 
 * Key Features:
 * - AI-Powered Duplicate Detection: Analyzes ingredients to find similar recipes in GitHub database
 * - Similarity Score: Shows percentage match with existing recipes
 * - Calorie Estimation: Automatically estimates calories based on similar recipes
 * - Smart Suggestions: Recommends existing recipes that might be what the user is trying to add
 * - MongoDB Sync: Saves recipes to backend for cross-device access
 * 
 * This helps users:
 * 1. Avoid adding duplicate recipes
 * 2. Get calorie estimates without manual calculation
 * 3. Discover existing recipes they might want to use instead
 */

import React, { useState, useEffect } from 'react'; // React hooks for state and lifecycle
import {
  View,              // Container component
  Text,              // Text display
  Modal,             // Popup modal
  TextInput,         // Text input fields
  TouchableOpacity,  // Touchable button
  StyleSheet,        // Styling system
  ScrollView,        // Scrollable container
  Alert,             // Alert dialogs
  ActivityIndicator, // Loading spinner
} from 'react-native';
import { Recipe, addRecipe, fetchGitHubRecipes, GitHubRecipe } from '../services/api'; // API functions and types
import { useRecipeStore } from '../utils/store'; // Zustand global state

// Props interface for the modal component
interface AddRecipeModalProps {
  visible: boolean;           // Controls modal visibility
  onClose: () => void;        // Callback when modal is closed
  onRecipeAdded: () => void;  // Callback after recipe is successfully added
}

// Structure for recipe suggestions (similar recipes from GitHub)
interface RecipeSuggestion {
  recipe: GitHubRecipe;          // The GitHub recipe
  similarity: number;            // Similarity score (0-100%)
  matchedIngredients: string[];  // Which ingredients matched
  estimatedCalories: number | null; // Calorie estimate from this recipe
}

export default function AddRecipeModal({ visible, onClose, onRecipeAdded }: AddRecipeModalProps) {
  // Get current user from global state
  const { currentUser } = useRecipeStore();
  
  // Form field states
  const [name, setName] = useState('');               // Recipe name
  const [ingredients, setIngredients] = useState(''); // Ingredients (comma-separated)
  const [instructions, setInstructions] = useState(''); // Cooking instructions
  const [prepTime, setPrepTime] = useState('');       // Prep time in minutes
  const [cookTime, setCookTime] = useState('');       // Cook time in minutes
  const [servings, setServings] = useState('');       // Number of servings
  
  // AI analysis states
  const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null); // Estimated calories
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]); // Similar recipes
  const [analyzing, setAnalyzing] = useState(false); // Loading state for analysis
  const [saving, setSaving] = useState(false);       // Loading state for saving

  // Reset form when modal is closed
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  /**
   * resetForm
   * Clears all form fields and analysis results.
   * Called when modal is closed or after successful save.
   */
  const resetForm = () => {
    setName('');
    setIngredients('');
    setInstructions('');
    setPrepTime('');
    setCookTime('');
    setServings('');
    setEstimatedCalories(null);
    setSuggestions([]);
  };

  /**
   * extractCalories
   * Extracts calorie information from a GitHub recipe.
   * Handles various field names and formats.
   * 
   * @param recipe - The GitHub recipe to extract calories from
   * @returns Calories as number, or null if not available
   */
  const extractCalories = (recipe: GitHubRecipe): number | null => {
    const calorieFields = ['calories', 'calorie', 'cal', 'nutrition', 'nutritionInfo', 'energy'];

    for (const field of calorieFields) {
      const value = recipe[field];
      if (value !== undefined && value !== null) {
        if (typeof value === 'number') return value; // Direct numeric value
        if (typeof value === 'string') {
          const match = value.match(/(\d+)/); // Extract number from string
          if (match) return parseInt(match[1], 10);
        }
        // Handle nested objects
        if (typeof value === 'object' && value.calories) {
          return extractCalories({ calories: value.calories } as GitHubRecipe);
        }
      }
    }
    return null;
  };

  /**
   * calculateSimilarity
   * Calculates how similar the user's recipe is to a GitHub recipe.
   * Uses ingredient matching to determine similarity percentage.
   * 
   * This is the core AI algorithm that powers duplicate detection.
   * 
   * @param userIngredients - Array of ingredients from user's recipe
   * @param recipeIngredients - Ingredients from GitHub recipe (various formats)
   * @returns Object with similarity score (0-100) and matched ingredients
   */
  const calculateSimilarity = (userIngredients: string[], recipeIngredients: any): {
    similarity: number;
    matchedIngredients: string[];
  } => {
    // Normalize user ingredients to lowercase for case-insensitive matching
    const userIngredientsLower = userIngredients.map((ing) => ing.trim().toLowerCase());
    let recipeIngredientsArray: string[] = [];

    // Convert recipe ingredients to array format (handles both array and object formats)
    if (Array.isArray(recipeIngredients)) {
      // Already an array - just convert to lowercase strings
      recipeIngredientsArray = recipeIngredients.map((ing) => String(ing).toLowerCase());
    } else if (typeof recipeIngredients === 'object' && recipeIngredients !== null) {
      // Object format - extract keys as ingredient names
      recipeIngredientsArray = Object.keys(recipeIngredients).map((key) => key.toLowerCase());
    }

    let matchCount = 0;
    const matchedIngredients: string[] = [];

    // Check each user ingredient against recipe ingredients
    userIngredientsLower.forEach((userIng) => {
      const isMatch = recipeIngredientsArray.some((recipeIng) => {
        // Check for partial matches (e.g., "chicken" matches "chicken breast")
        // or exact word matches (e.g., "flour" matches "flour, all-purpose")
        return recipeIng.includes(userIng) || userIng.includes(recipeIng.split(' ')[0]);
      });

      if (isMatch) {
        matchCount++;
        matchedIngredients.push(userIng); // Track which ingredients matched
      }
    });

    // Calculate similarity as percentage of matched ingredients
    const similarity = userIngredientsLower.length > 0
      ? (matchCount / userIngredientsLower.length) * 100
      : 0;

    return { similarity, matchedIngredients };
  };

  /**
   * analyzeRecipe
   * Main AI function that analyzes the user's recipe against GitHub recipes.
   * 
   * Process:
   * 1. Fetches all GitHub recipes
   * 2. Splits user ingredients into array
   * 3. Calculates similarity with each GitHub recipe
   * 4. Filters recipes with >20% match
   * 5. Sorts by similarity (highest first)
   * 6. Takes top 5 suggestions
   * 7. Estimates calories based on similar recipes
   * 
   * This is the "magic" that powers duplicate detection and calorie estimation.
   */
  const analyzeRecipe = async () => {
    // Validate that user has entered at least some ingredients
    if (!ingredients.trim()) {
      Alert.alert('Missing Information', 'Please add at least some ingredients to get suggestions.');
      return;
    }

    setAnalyzing(true);
    try {
      // Fetch all recipes from GitHub database
      const githubData = await fetchGitHubRecipes();
      
      // Parse user ingredients (each line is one ingredient)
      const userIngredients = ingredients
        .split('\n')
        .map((ing) => ing.trim())
        .filter((ing) => ing.length > 0);

      const analyzed: RecipeSuggestion[] = [];

      // Analyze each GitHub recipe for similarity
      githubData.recipes.forEach((recipe) => {
        if (!recipe.ingredients) return; // Skip recipes without ingredients

        // Calculate how similar this recipe is to user's recipe
        const { similarity, matchedIngredients } = calculateSimilarity(
          userIngredients,
          recipe.ingredients
        );

        // Only include recipes with at least 20% ingredient match
        if (similarity > 20) {
          const calories = extractCalories(recipe);
          analyzed.push({
            recipe,
            similarity,
            matchedIngredients,
            estimatedCalories: calories,
          });
        }
      });

      // Sort by similarity (highest match first)
      analyzed.sort((a, b) => b.similarity - a.similarity);

      setSuggestions(analyzed.slice(0, 5)); // Keep only top 5 suggestions

      // Calculate estimated calories based on similar recipes
      // Averages the calories from all similar recipes that have calorie data
      if (analyzed.length > 0) {
        const recipesWithCalories = analyzed.filter((s) => s.estimatedCalories !== null);
        if (recipesWithCalories.length > 0) {
          const avgCalories = Math.round(
            recipesWithCalories.reduce((sum, s) => sum + (s.estimatedCalories || 0), 0) /
              recipesWithCalories.length
          );
          setEstimatedCalories(avgCalories);
        }
      }

      // Show success message with result summary
      Alert.alert(
        'Analysis Complete',
        `Found ${analyzed.length} similar recipes!${
          estimatedCalories ? `\n\nEstimated calories: ${estimatedCalories}` : ''
        }`
      );
    } catch (error) {
      console.error('Error analyzing recipe:', error);
      Alert.alert('Error', 'Failed to analyze recipe. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * handleSave
   * Saves the new recipe to the backend database.
   * 
   * Process:
   * 1. Validates required fields (name, ingredients, instructions)
   * 2. Formats ingredients and instructions into arrays
   * 3. Includes calorie estimate if available
   * 4. Associates recipe with current user
   * 5. Saves to MongoDB via backend API
   * 6. Triggers parent refresh and closes modal
   */
  const handleSave = async () => {
    // Validate required fields
    if (!name.trim() || !ingredients.trim() || !instructions.trim()) {
      Alert.alert('Missing Information', 'Please fill in name, ingredients, and instructions.');
      return;
    }

    setSaving(true);
    try {
      // Build recipe object
      const recipe: Recipe = {
        name: name.trim(),
        // Split ingredients by line, clean and filter empty lines
        ingredients: ingredients
          .split('\n')
          .map((ing) => ing.trim())
          .filter((ing) => ing.length > 0),
        // Split instructions by line, clean and filter empty lines
        instructions: instructions
          .split('\n')
          .map((inst) => inst.trim())
          .filter((inst) => inst.length > 0),
        prep_time: parseInt(prepTime) || 0,  // Convert to number, default to 0
        cook_time: parseInt(cookTime) || 0,  // Convert to number, default to 0
        servings: parseInt(servings) || 1,  // Convert to number, default to 1
        user: currentUser,  // Associate with current logged-in user
      };

      // Add estimated calories as a field if AI analysis was run
      if (estimatedCalories !== null) {
        (recipe as any).estimated_calories = estimatedCalories;
      }

      // Send to backend API to save in MongoDB
      await addRecipe(recipe);
      Alert.alert('Success', 'Recipe added successfully!');
      
      // Trigger parent component to refresh recipe list
      onRecipeAdded();
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error adding recipe:', error);
      Alert.alert('Error', 'Failed to add recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * applySuggestion
   * Allows user to use details from a suggested similar recipe.
   * Can auto-fill fields that are currently empty.
   * 
   * @param suggestion - The recipe suggestion to apply
   */
  const applySuggestion = (suggestion: RecipeSuggestion) => {
    Alert.alert(
      'Apply Suggestion',
      `Use details from "${suggestion.recipe.name || suggestion.recipe.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            // Auto-fill name if empty
            if (!name.trim() && (suggestion.recipe.name || suggestion.recipe.title)) {
              setName(suggestion.recipe.name || suggestion.recipe.title || '');
            }

            if (suggestion.recipe.prepTime) {
              setPrepTime(String(suggestion.recipe.prepTime).match(/\d+/)?.[0] || '');
            }

            if (suggestion.recipe.cookTime) {
              setCookTime(String(suggestion.recipe.cookTime).match(/\d+/)?.[0] || '');
            }

            // Auto-fill servings if available
            if (suggestion.recipe.servings) {
              setServings(String(suggestion.recipe.servings).match(/\d+/)?.[0] || '');
            }

            // Use calorie estimate from suggestion
            if (suggestion.estimatedCalories) {
              setEstimatedCalories(suggestion.estimatedCalories);
            }
          },
        },
      ]
    );
  };

  // Main modal render
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Modal header with title and close button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add New Recipe</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Recipe name input */}
          <Text style={styles.label}>Recipe Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Spaghetti Carbonara"
            value={name}
            onChangeText={setName}
          />

          {/* Ingredients input (multiline textarea) */}
          <Text style={styles.label}>Ingredients (one per line) *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g.,&#10;200g spaghetti&#10;100g bacon&#10;2 eggs"
            value={ingredients}
            onChangeText={setIngredients}
            multiline
            numberOfLines={5}
          />

          {/* AI Analyze button - finds similar recipes and estimates calories */}
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={analyzeRecipe}
            disabled={analyzing || !ingredients.trim()}
          >
            {analyzing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.analyzeButtonText}>🔍 Analyze & Get Suggestions</Text>
            )}
          </TouchableOpacity>

          {estimatedCalories !== null && (
            <View style={styles.calorieEstimate}>
              <Text style={styles.calorieEstimateTitle}>Estimated Calories</Text>
              <Text style={styles.calorieEstimateValue}>🔥 {estimatedCalories} cal</Text>
              <Text style={styles.calorieEstimateNote}>
                Based on {suggestions.filter((s) => s.estimatedCalories).length} similar recipes
              </Text>
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.sectionTitle}>Similar Recipes</Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionCard}
                  onPress={() => applySuggestion(suggestion)}
                >
                  <View style={styles.suggestionHeader}>
                    <Text style={styles.suggestionName}>
                      {suggestion.recipe.name || suggestion.recipe.title}
                    </Text>
                    <Text style={styles.suggestionMatch}>
                      {Math.round(suggestion.similarity)}% match
                    </Text>
                  </View>
                  <Text style={styles.suggestionMatched}>
                    Matched: {suggestion.matchedIngredients.join(', ')}
                  </Text>
                  {suggestion.estimatedCalories && (
                    <Text style={styles.suggestionCalories}>
                      🔥 {suggestion.estimatedCalories} calories
                    </Text>
                  )}
                  <Text style={styles.suggestionAction}>Tap to apply details</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Instructions (one per line) *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g.,&#10;1. Boil water&#10;2. Cook pasta&#10;3. Mix with sauce"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={5}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Prep Time (min)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 15"
                value={prepTime}
                onChangeText={setPrepTime}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Cook Time (min)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={cookTime}
                onChangeText={setCookTime}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>Servings</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 4"
            value={servings}
            onChangeText={setServings}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Recipe</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#000',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  calorieEstimate: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  calorieEstimateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  calorieEstimateValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  calorieEstimateNote: {
    fontSize: 12,
    color: '#999',
  },
  suggestionsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  suggestionCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#000',
  },
  suggestionMatch: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    marginLeft: 8,
  },
  suggestionMatched: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  suggestionCalories: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionAction: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
