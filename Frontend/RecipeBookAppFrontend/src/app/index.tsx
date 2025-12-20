import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRecipeStore } from './utils/store';
import { checkHealth, getRecipes } from './services/api';
import RecipesScreen from './screens/RecipesScreen';
import IngredientsScreen from './screens/IngredientsScreen';
import GitHubRecipesScreen from './screens/GitHubRecipesScreen';
import ShoppingListScreen from './screens/ShoppingListScreen';

export default function App() {
  const { currentUser } = useRecipeStore();
  const [activeTab, setActiveTab] = React.useState<'recipes' | 'ingredients' | 'github' | 'shopping'>('recipes');
  const [apiReady, setApiReady] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    checkAPIHealth();
  }, []);

  const checkAPIHealth = async () => {
    try {
      const isHealthy = await checkHealth();
      if (isHealthy) {
        setApiReady(true);
        // Load initial recipes
        const recipes = await getRecipes(currentUser);
        useRecipeStore.setState({ recipes });
      } else {
        Alert.alert('API Warning', 'Could not connect to API. Some features may not work.');
        setApiReady(false);
      }
    } catch (error) {
      console.error('API health check failed:', error);
      Alert.alert(
        'Connection Error',
        'Could not reach the API. Make sure your backend is running.\n\nYou can still use the app in offline mode.'
      );
      setApiReady(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.title}>RecipeApp</Text>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: apiReady ? '#34C759' : '#FF3B30' },
            ]}
          />
          <Text style={styles.statusText}>{apiReady ? 'Connected' : 'Offline'}</Text>
        </View>
      </View>

      {/* Main Content */}
      {activeTab === 'recipes' && <RecipesScreen />}
      {activeTab === 'ingredients' && <IngredientsScreen />}
      {activeTab === 'github' && <GitHubRecipesScreen />}
      {activeTab === 'shopping' && <ShoppingListScreen />}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'recipes' && styles.navButtonActive]}
          onPress={() => setActiveTab('recipes')}
        >
          <Text style={[styles.navText, activeTab === 'recipes' && styles.navTextActive]}>
            📖 Recipes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'github' && styles.navButtonActive]}
          onPress={() => setActiveTab('github')}
        >
          <Text style={[styles.navText, activeTab === 'github' && styles.navTextActive]}>
            🌐 Community
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'shopping' && styles.navButtonActive]}
          onPress={() => setActiveTab('shopping')}
        >
          <Text style={[styles.navText, activeTab === 'shopping' && styles.navTextActive]}>
            🛒 Shopping
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'ingredients' && styles.navButtonActive]}
          onPress={() => setActiveTab('ingredients')}
        >
          <Text style={[styles.navText, activeTab === 'ingredients' && styles.navTextActive]}>
            🥘 Ingredients
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 40,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  navText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#007AFF',
  },
});
