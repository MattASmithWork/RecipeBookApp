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
import { getRecipes, Recipe } from '../services/api';
import { useRecipeStore } from '../utils/store';

export default function RecipesScreen() {
  const { recipes, currentUser, setRecipes } = useRecipeStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, [currentUser]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      console.log(`[RecipesScreen] Fetching recipes for user: ${currentUser}`);
      const data = await getRecipes(currentUser);
      console.log(`[RecipesScreen] Received ${data.length} recipes:`, data);
      setRecipes(data);
    } catch (error) {
      console.error(`[RecipesScreen] Error fetching recipes:`, error);
      Alert.alert('Error', `Failed to load recipes for user "${currentUser}"`);
    } finally {
      setLoading(false);
    }
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <TouchableOpacity style={styles.recipeCard}>
      <Text style={styles.recipeName}>{item.name}</Text>
      <Text style={styles.recipeInfo}>
        ⏱️ {item.prep_time}min prep + {item.cook_time}min cook
      </Text>
      <Text style={styles.recipeInfo}>👥 Servings: {item.servings}</Text>
      <Text style={styles.ingredients}>
        Ingredients: {item.ingredients.length} items
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Recipes</Text>
      {recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recipes yet</Text>
          <Text style={styles.emptySubtext}>Add a recipe to get started</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item._id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
  recipeCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  recipeInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ingredients: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
});
