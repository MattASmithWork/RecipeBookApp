/**
 * Shopping List Screen Component
 * 
 * This screen manages the household shopping list and inventory system.
 * It allows multiple users to:
 * - Add/remove items to a shared shopping list with price estimates
 * - Mark items as bought (moves them to inventory)
 * - View and manage inventory (items owned/in stock)
 * - Get recipe recommendations based on current inventory
 * - Track budget and spending
 * 
 * Features:
 * - Two tabs: Shopping List and Inventory
 * - Automatic price estimation for items
 * - Budget tracking with warnings when over budget
 * - Recipe recommendations (what you can make vs what you're close to making)
 * - Pull-to-refresh for real-time sync across devices
 * - All data syncs with MongoDB for multi-user access
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRecipeStore } from '../utils/store';  // Global state management
import { 
  Recipe, 
  GitHubRecipe, 
  fetchGitHubRecipes,
  getShoppingList,  // API call to fetch shopping list from MongoDB
  addShoppingItem,  // API call to add item to MongoDB
  deleteShoppingItem,  // API call to remove item
  markItemBought,  // API call to move item from shopping list to inventory
  getInventory,  // API call to fetch inventory from MongoDB
  addInventoryItem,  // API call to add item directly to inventory
  deleteInventoryItem,  // API call to remove item from inventory
  ShoppingItem as APIShoppingItem,  // TypeScript type for shopping items
  InventoryItem as APIInventoryItem,  // TypeScript type for inventory items
} from '../services/api';
import { estimatePrice, formatPrice, getConfidenceIcon } from '../services/priceEstimation';  // Price estimation utilities

export default function ShoppingListScreen() {
  // === Global State from Zustand Store ===
  const {
    shoppingList,  // Array of shopping items from database
    inventory,  // Array of owned items from database
    recipes,  // User's personal recipes (for recommendations)
    budget,  // Current budget limit in GBP
    setShoppingList,  // Update shopping list in global state
    setInventory,  // Update inventory in global state
    setBudget,  // Update budget in global state
  } = useRecipeStore();

  // === Local Component State ===
  // Input fields for adding new items
  const [newItem, setNewItem] = useState('');  // Item name input
  const [newQuantity, setNewQuantity] = useState('');  // Quantity input
  
  // UI state
  const [activeTab, setActiveTab] = useState<'shopping' | 'inventory'>('shopping');  // Which tab is active
  const [showRecommendations, setShowRecommendations] = useState(false);  // Show recipe recommendations modal
  const [showBudgetModal, setShowBudgetModal] = useState(false);  // Show budget editor modal
  const [newBudget, setNewBudget] = useState(budget.toString());  // Budget input field
  
  // Recipe recommendations state
  const [recommendations, setRecommendations] = useState<{
    canMake: Recipe[];  // Recipes you can make with current inventory
    needItems: Array<{ recipe: Recipe; missing: string[] }>;  // Recipes you're close to making (missing only a few items)
  }>({ canMake: [], needItems: [] });
  
  // Loading states
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);  // Loading recipe recommendations
  const [loading, setLoading] = useState(false);  // Initial data load
  const [refreshing, setRefreshing] = useState(false);  // Pull-to-refresh state

  // === Load Data on Component Mount ===
  // This runs once when the screen first loads
  // Fetches shopping list and inventory from MongoDB
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Load shopping list and inventory from database
   * Called on mount and when refreshing
   * Uses Promise.all to fetch both lists simultaneously for better performance
   */
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch both shopping list and inventory in parallel
      const [shoppingData, inventoryData] = await Promise.all([
        getShoppingList(),  // GET /shopping-list
        getInventory()      // GET /inventory
      ]);
      // Update global state with fetched data
      setShoppingList(shoppingData);
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load shopping list and inventory');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle pull-to-refresh gesture
   * Allows users to manually sync data from database
   * Useful when another user makes changes
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Add a new item to shopping list or inventory
   * Depending on which tab is active, adds to:
   * - Shopping list: Estimates price automatically and checks budget
   * - Inventory: Adds directly to owned items
   * 
   * After adding, reloads data to get updated lists with MongoDB IDs
   */
  const handleAddItem = async () => {
    // Validation: ensure item name is entered
    if (!newItem.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    try {
      if (activeTab === 'shopping') {
        // === Adding to Shopping List ===
        // Automatically estimate price using price estimation service
        const priceEstimate = estimatePrice(newItem.trim());
        
        // Create shopping item object
        const item: APIShoppingItem = {
          name: newItem.trim(),
          quantity: newQuantity.trim() || '1',  // Default to "1" if no quantity entered
          estimatedPrice: priceEstimate.estimatedPrice,
          category: priceEstimate.category,
        };
        
        // Save to database via API
        await addShoppingItem(item);
        
        // Check if this item puts us over budget
        const newTotal = calculateTotal() + priceEstimate.estimatedPrice;
        if (newTotal > budget) {
          Alert.alert(
            'Budget Warning',
            `Adding this item will put you £${(newTotal - budget).toFixed(2)} over budget!`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // === Adding to Inventory ===
        // Parse quantity into amount and unit
        const quantityStr = newQuantity.trim() || '1';
        const match = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
        const amount = match ? parseFloat(match[1]) : 1;
        const unit = match && match[2] ? match[2] : '';
        
        const item: APIInventoryItem = {
          name: newItem.trim(),
          amount: amount,
          unit: unit,
        };
        await addInventoryItem(item);
      }

      // Reload data from database to get updated lists
      await loadData();
      // Clear input fields after successful add
      setNewItem('');
      setNewQuantity('');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  /**
   * Calculate total cost of all items in shopping list
   * Sums up the estimatedPrice of all shopping items
   * @returns Total price in GBP
   */
  const calculateTotal = (): number => {
    return shoppingList.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
  };

  /**
   * Calculate remaining budget
   * @returns Remaining budget (budget - total spent)
   */
  const calculateRemaining = (): number => {
    return budget - calculateTotal();
  };

  /**
   * Update the budget limit
   * Validates input and saves to global state
   */
  const handleUpdateBudget = () => {
    const amount = parseFloat(newBudget);
    // Validation: ensure positive number
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid amount');
      return;
    }
    setBudget(amount);
    setShowBudgetModal(false);
    Alert.alert('Budget Updated', `Your budget is now ${formatPrice(amount)}`);
  };

  const handleMarkAsBought = async (id: string) => {
    Alert.alert('Mark as Bought', 'Move this item to your inventory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await markItemBought(id);
            await loadData();
            Alert.alert('Success', 'Item moved to inventory!');
          } catch (error) {
            console.error('Error marking item as bought:', error);
            Alert.alert('Error', 'Failed to update item');
          }
        },
      },
    ]);
  };

  /**
   * Delete an item from shopping list or inventory
   * Shows confirmation dialog before deleting
   * 
   * @param id - MongoDB ObjectId of the item
   * @param type - Whether item is in 'shopping' list or 'inventory'
   */
  const handleDeleteItem = async (id: string, type: 'shopping' | 'inventory') => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',  // Red text to indicate destructive action
        onPress: async () => {
          try {
            // Call appropriate delete API based on type
            if (type === 'shopping') {
              await deleteShoppingItem(id);
            } else {
              await deleteInventoryItem(id);
            }
            // Reload data to update UI
            await loadData();
          } catch (error) {
            console.error('Error deleting item:', error);
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const calculateRecipeMatch = (recipe: Recipe): { canMake: boolean; missing: string[] } => {
    const inventoryNames = inventory.map((i) => i.name.toLowerCase());
    const missing: string[] = [];

    recipe.ingredients.forEach((ingredient) => {
      const ingredientLower = ingredient.toLowerCase();
      const hasIngredient = inventoryNames.some((inv) => {
        return ingredientLower.includes(inv) || inv.includes(ingredientLower.split(' ')[0]);
      });

      if (!hasIngredient) {
        missing.push(ingredient);
      }
    });

    return { canMake: missing.length === 0, missing };
  };

  const getRecommendations = async () => {
    if (inventory.length === 0) {
      Alert.alert('Empty Inventory', 'Add some items to your inventory first!');
      return;
    }

    setLoadingRecommendations(true);
    setShowRecommendations(true);

    try {
      const canMake: Recipe[] = [];
      const needItems: Array<{ recipe: Recipe; missing: string[] }> = [];

      // Check user's own recipes
      recipes.forEach((recipe) => {
        const match = calculateRecipeMatch(recipe);
        if (match.canMake) {
          canMake.push(recipe);
        } else if (match.missing.length <= 3) {
          // Only show if missing 3 or fewer items
          needItems.push({ recipe, missing: match.missing });
        }
      });

      // Also check GitHub recipes
      const githubData = await fetchGitHubRecipes();
      githubData.recipes.forEach((ghRecipe) => {
        if (!ghRecipe.ingredients || !Array.isArray(ghRecipe.ingredients)) return;

        const inventoryNames = inventory.map((i) => i.name.toLowerCase());
        const missing: string[] = [];

        ghRecipe.ingredients.forEach((ingredient) => {
          const ingredientLower = String(ingredient).toLowerCase();
          const hasIngredient = inventoryNames.some((inv) => {
            return ingredientLower.includes(inv) || inv.includes(ingredientLower.split(' ')[0]);
          });

          if (!hasIngredient) {
            missing.push(String(ingredient));
          }
        });

        // Convert GitHub recipe to Recipe format for display
        const convertedRecipe: Recipe = {
          name: ghRecipe.name || ghRecipe.title || 'Untitled',
          ingredients: ghRecipe.ingredients.map((i) => String(i)),
          instructions: Array.isArray(ghRecipe.instructions)
            ? ghRecipe.instructions.map((i) => String(i))
            : [String(ghRecipe.instructions || '')],
          prep_time: 0,
          cook_time: 0,
          servings: 1,
          user: 'github',
        };

        if (missing.length === 0) {
          canMake.push(convertedRecipe);
        } else if (missing.length <= 3) {
          needItems.push({ recipe: convertedRecipe, missing });
        }
      });

      setRecommendations({ canMake, needItems });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const addMissingItemsToShoppingList = async (items: string[]) => {
    let addedCount = 0;
    let totalCost = calculateTotal();
    
    try {
      for (const item of items) {
        const priceEstimate = estimatePrice(item);
        if (totalCost + priceEstimate.estimatedPrice <= budget) {
          const shoppingItem: APIShoppingItem = {
            name: item,
            quantity: '1',
            estimatedPrice: priceEstimate.estimatedPrice,
            category: priceEstimate.category,
          };
          await addShoppingItem(shoppingItem);
          totalCost += priceEstimate.estimatedPrice;
          addedCount++;
        }
      }
      
      await loadData();
      
      if (addedCount > 0) {
        Alert.alert(
          'Items Added',
          `Added ${addedCount} item${addedCount !== 1 ? 's' : ''} to your shopping list!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Budget Exceeded', 'Could not add items without exceeding budget');
      }
    } catch (error) {
      console.error('Error adding items:', error);
      Alert.alert('Error', 'Failed to add some items');
    }
  };

  const renderShoppingItem = ({ item }: { item: any }) => {
    const priceEstimate = estimatePrice(item.name);
    const price = item.estimatedPrice || priceEstimate.estimatedPrice;
    const confidence = item.estimatedPrice ? 'high' : priceEstimate.confidence;

    return (
      <View style={styles.listItem}>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>
              {getConfidenceIcon(confidence)} {formatPrice(price)}
            </Text>
          </View>
          {item.quantity && <Text style={styles.itemQuantity}>{item.quantity}</Text>}
          {confidence !== 'high' && (
            <Text style={styles.estimateNote}>Estimated price</Text>
          )}
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleMarkAsBought(item._id)}
          >
            <Text style={styles.actionButtonText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteItem(item._id, 'shopping')}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInventoryItem = ({ item }: { item: any }) => (
    <View style={styles.listItem}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.quantity && <Text style={styles.itemQuantity}>{item.quantity}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => handleDeleteItem(item._id, 'inventory')}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecommendationsModal = () => (
    <Modal
      visible={showRecommendations}
      animationType="slide"
      onRequestClose={() => setShowRecommendations(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Recipe Recommendations</Text>
          <TouchableOpacity
            onPress={() => setShowRecommendations(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {loadingRecommendations ? (
            <Text style={styles.loadingText}>Finding recipes...</Text>
          ) : (
            <>
              <Text style={styles.sectionTitle}>✅ Recipes You Can Make Now</Text>
              {recommendations.canMake.length === 0 ? (
                <Text style={styles.emptyText}>
                  No complete matches. Add more items to your inventory!
                </Text>
              ) : (
                recommendations.canMake.map((recipe, index) => (
                  <View key={index} style={styles.recipeCard}>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <Text style={styles.recipeIngredients}>
                      {recipe.ingredients.length} ingredients
                    </Text>
                    <Text style={styles.canMakeText}>✅ You have everything!</Text>
                  </View>
                ))
              )}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                🛒 Almost There (Missing 1-3 items)
              </Text>
              {recommendations.needItems.length === 0 ? (
                <Text style={styles.emptyText}>No close matches found</Text>
              ) : (
                recommendations.needItems.map((item, index) => (
                  <View key={index} style={styles.recipeCard}>
                    <Text style={styles.recipeName}>{item.recipe.name}</Text>
                    <Text style={styles.missingLabel}>Missing:</Text>
                    {item.missing.map((missing, idx) => (
                      <Text key={idx} style={styles.missingItem}>
                        • {missing}
                      </Text>
                    ))}
                    <TouchableOpacity
                      style={styles.addToListButton}
                      onPress={() => addMissingItemsToShoppingList(item.missing)}
                    >
                      <Text style={styles.addToListButtonText}>
                        + Add Missing Items to Shopping List
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping & Inventory</Text>
        {inventory.length > 0 && (
          <TouchableOpacity style={styles.recommendButton} onPress={getRecommendations}>
            <Text style={styles.recommendButtonText}>🍳 Recipes</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Budget Summary - only show on shopping tab */}
      {activeTab === 'shopping' && (
        <TouchableOpacity 
          style={styles.budgetContainer}
          onPress={() => setShowBudgetModal(true)}
        >
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetLabel}>Budget</Text>
            <Text style={styles.budgetAmount}>{formatPrice(budget)}</Text>
          </View>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetLabel}>Estimated Total</Text>
            <Text style={[
              styles.budgetAmount,
              calculateTotal() > budget && styles.overBudget
            ]}>
              {formatPrice(calculateTotal())}
            </Text>
          </View>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetLabel}>Remaining</Text>
            <Text style={[
              styles.budgetAmount,
              calculateRemaining() < 0 ? styles.overBudget : styles.underBudget
            ]}>
              {formatPrice(calculateRemaining())}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shopping' && styles.activeTab]}
          onPress={() => setActiveTab('shopping')}
        >
          <Text style={[styles.tabText, activeTab === 'shopping' && styles.activeTabText]}>
            🛒 Shopping List ({shoppingList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
            📦 Inventory ({inventory.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={`Add to ${activeTab === 'shopping' ? 'shopping list' : 'inventory'}`}
          value={newItem}
          onChangeText={setNewItem}
        />
        <TextInput
          style={styles.quantityInput}
          placeholder="Qty"
          value={newQuantity}
          onChangeText={setNewQuantity}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'shopping' ? (
        shoppingList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your shopping list is empty</Text>
            <Text style={styles.emptySubtext}>Add items you need to buy</Text>
          </View>
        ) : (
          <FlatList
            data={shoppingList}
            renderItem={renderShoppingItem}
            keyExtractor={(item) => item._id || item.name}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )
      ) : inventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your inventory is empty</Text>
          <Text style={styles.emptySubtext}>
            Add items you have or mark shopping items as bought
          </Text>
        </View>
      ) : (
        <FlatList
          data={inventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item._id || item.name}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {renderRecommendationsModal()}

      {/* Budget Modal */}
      <Modal
        visible={showBudgetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.budgetModalContent}>
            <Text style={styles.budgetModalTitle}>Set Your Budget</Text>
            <Text style={styles.budgetModalSubtitle}>
              Set a spending limit for your shopping list
            </Text>
            <View style={styles.budgetInputContainer}>
              <Text style={styles.currencySymbol}>£</Text>
              <TextInput
                style={styles.budgetInput}
                value={newBudget}
                onChangeText={setNewBudget}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
            <View style={styles.budgetModalButtons}>
              <TouchableOpacity
                style={[styles.budgetModalButton, styles.cancelButton]}
                onPress={() => setShowBudgetModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.budgetModalButton, styles.saveButton]}
                onPress={handleUpdateBudget}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  recommendButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recommendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  budgetInfo: {
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  overBudget: {
    color: '#FF3B30',
  },
  underBudget: {
    color: '#34C759',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityInput: {
    width: 70,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#34C759',
    width: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    textTransform: 'capitalize',
    flex: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  estimateNote: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
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
    paddingVertical: 16,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  recipeCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  recipeIngredients: {
    fontSize: 14,
    color: '#666',
  },
  canMakeText: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '600',
    marginTop: 8,
  },
  missingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  missingItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginBottom: 2,
  },
  addToListButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  addToListButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  budgetModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#000',
  },
  budgetModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    paddingVertical: 12,
    color: '#000',
  },
  budgetModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
