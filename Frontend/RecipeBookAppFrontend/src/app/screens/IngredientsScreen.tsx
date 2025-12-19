import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  findRecipesWithIngredients,
  findPartialRecipes,
  MatchedRecipe,
} from '../utils/recipeMatching';
import { useRecipeStore } from '../utils/store';

export default function IngredientsScreen() {
  const { recipes, userIngredients, addIngredient, removeIngredient, setUserIngredients } =
    useRecipeStore();
  const [ingredientInput, setIngredientInput] = useState('');
  const [canCookRecipes, setCanCookRecipes] = useState<MatchedRecipe[]>([]);
  const [partialRecipes, setPartialRecipes] = useState<MatchedRecipe[]>([]);

  useEffect(() => {
    updateMatches();
  }, [userIngredients, recipes]);

  const updateMatches = () => {
    const exact = findRecipesWithIngredients(recipes, userIngredients, 100);
    const partial = findPartialRecipes(recipes, userIngredients, 80);
    setCanCookRecipes(exact);
    setPartialRecipes(partial.filter((p) => !exact.some((e) => e.recipe._id === p.recipe._id)));
  };

  const handleAddIngredient = () => {
    if (ingredientInput.trim()) {
      addIngredient(ingredientInput.trim());
      setIngredientInput('');
    }
  };

  const renderIngredientChip = (ingredient: string) => (
    <TouchableOpacity
      key={ingredient}
      style={styles.ingredientChip}
      onPress={() => removeIngredient(ingredient)}
    >
      <Text style={styles.chipText}>{ingredient}</Text>
      <Text style={styles.chipDelete}> ✕</Text>
    </TouchableOpacity>
  );

  const renderMatchedRecipe = ({ item }: { item: MatchedRecipe }) => (
    <View style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <Text style={styles.matchRecipeName}>{item.recipe.name}</Text>
        <View style={styles.matchBadge}>
          <Text style={styles.matchPercentage}>{item.matchPercentage}%</Text>
        </View>
      </View>
      <Text style={styles.matchInfo}>
        ✓ {item.matchedIngredients.length}/{item.recipe.ingredients.length} ingredients
      </Text>
      {item.missingIngredients.length > 0 && (
        <Text style={styles.missingInfo}>
          Missing: {item.missingIngredients.slice(0, 2).join(', ')}
          {item.missingIngredients.length > 2 ? '...' : ''}
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Ingredients</Text>

      {/* Ingredient Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add ingredient (e.g., tomato, chicken)"
          value={ingredientInput}
          onChangeText={setIngredientInput}
          onSubmitEditing={handleAddIngredient}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Current Ingredients */}
      {userIngredients.length > 0 && (
        <View style={styles.ingredientsSection}>
          <Text style={styles.sectionTitle}>Current Ingredients ({userIngredients.length})</Text>
          <View style={styles.chipContainer}>
            {userIngredients.map((ing) => renderIngredientChip(ing))}
          </View>
        </View>
      )}

      {/* Can Cook Recipes */}
      {canCookRecipes.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>🎉 Can Cook ({canCookRecipes.length})</Text>
          <FlatList
            scrollEnabled={false}
            data={canCookRecipes}
            renderItem={renderMatchedRecipe}
            keyExtractor={(item) => item.recipe._id}
          />
        </View>
      )}

      {/* Partial Recipes */}
      {partialRecipes.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>🟡 Close Match ({partialRecipes.length})</Text>
          <FlatList
            scrollEnabled={false}
            data={partialRecipes}
            renderItem={renderMatchedRecipe}
            keyExtractor={(item) => item.recipe._id}
          />
        </View>
      )}

      {userIngredients.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Add ingredients to see what you can cook!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  ingredientsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientChip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  chipDelete: {
    color: 'white',
    fontSize: 16,
    marginLeft: 4,
  },
  resultsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  matchCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchRecipeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  matchBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  matchPercentage: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  missingInfo: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
