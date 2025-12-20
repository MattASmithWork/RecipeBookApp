/**
 * Inventory Management Example Component
 * 
 * This component demonstrates the new unit-based inventory system.
 * Features:
 * - Add items with specific amounts and units (kg, L, ml, etc.)
 * - Set low stock thresholds for automatic alerts
 * - Manually adjust quantities
 * - Consume ingredients (subtract from inventory)
 * - Consume entire recipes automatically
 * - View low stock warnings
 * - Auto-remove items when they reach 0
 * 
 * IMPORTANT UNITS SUPPORTED:
 * - Weight: kg, g, oz, lb
 * - Volume: L (liters), ml
 * - Count: unit, piece
 * - Cooking: cup, tbsp (tablespoon), tsp (teaspoon)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import {
  getInventory,
  addInventoryItem,
  updateInventoryAmount,
  consumeIngredient,
  consumeRecipe,
  getLowStockItems,
  InventoryItem,
  LowStockItem,
} from '../services/api';
import { useRecipeStore } from '../utils/store';

export default function InventoryManagementExample() {
  // === State Management ===
  const { inventory, setInventory, lowStockAlerts, setLowStockAlerts } = useRecipeStore();
  
  // Form states for adding new items
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemThreshold, setNewItemThreshold] = useState('');
  
  // Consumption states
  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [consumeAmount, setConsumeAmount] = useState('');
  
  // Low stock modal
  const [lowStockModalVisible, setLowStockModalVisible] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  
  // Available units
  const units = ['kg', 'g', 'L', 'ml', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'unit', 'piece'];

  // === Load Data on Mount ===
  useEffect(() => {
    loadInventory();
    checkLowStock();
  }, []);

  /**
   * Load inventory from API
   */
  const loadInventory = async () => {
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load inventory');
    }
  };

  /**
   * Check for low stock items
   */
  const checkLowStock = async () => {
    try {
      const response = await getLowStockItems();
      setLowStockItems(response.lowStockItems);
      setLowStockAlerts(response.lowStockItems.map(item => item.name));
      
      // Show alert if items are low
      if (response.count > 0) {
        Alert.alert(
          '⚠️ Low Stock Alert',
          `${response.count} item(s) are running low. Tap "View Low Stock" to see details.`
        );
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  };

  /**
   * Add new item to inventory
   */
  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }
    
    const amount = parseFloat(newItemAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter valid amount (greater than 0)');
      return;
    }
    
    const threshold = newItemThreshold ? parseFloat(newItemThreshold) : undefined;
    
    try {
      const newItem: InventoryItem = {
        name: newItemName.trim(),
        amount: amount,
        unit: newItemUnit,
        lowStockThreshold: threshold,
        purchasedAt: new Date().toISOString(),
      };
      
      await addInventoryItem(newItem);
      
      // Clear form
      setNewItemName('');
      setNewItemAmount('');
      setNewItemThreshold('');
      
      // Reload inventory
      await loadInventory();
      Alert.alert('Success', `Added ${amount}${newItemUnit} of ${newItemName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  /**
   * Open consume modal for an item
   */
  const openConsumeModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setConsumeAmount('');
    setConsumeModalVisible(true);
  };

  /**
   * Consume (subtract) amount from item
   */
  const handleConsume = async () => {
    if (!selectedItem) return;
    
    const amount = parseFloat(consumeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter valid amount to consume');
      return;
    }
    
    try {
      const result = await consumeIngredient(
        selectedItem.name,
        amount,
        selectedItem.unit
      );
      
      setConsumeModalVisible(false);
      
      // Show result message with warnings
      let message = result.message;
      if (result.removed) {
        message += '\n\n🗑️ Item removed from inventory (reached 0)';
      } else if (result.lowStock) {
        message += `\n\n⚠️ LOW STOCK: ${result.remainingAmount}${selectedItem.unit} remaining`;
        message += `\nThreshold: ${result.lowStockThreshold}${selectedItem.unit}`;
      }
      
      Alert.alert('Consumed', message);
      
      // Reload inventory and check low stock
      await loadInventory();
      await checkLowStock();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to consume ingredient');
    }
  };

  /**
   * Manually adjust item amount
   */
  const handleManualAdjust = (item: InventoryItem) => {
    Alert.prompt(
      'Adjust Amount',
      `Current: ${item.amount}${item.unit}\nEnter new amount:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (newAmountStr) => {
            if (!newAmountStr) return;
            
            const newAmount = parseFloat(newAmountStr);
            if (isNaN(newAmount) || newAmount < 0) {
              Alert.alert('Error', 'Please enter valid amount (0 or greater)');
              return;
            }
            
            try {
              const result = await updateInventoryAmount(item._id!, newAmount);
              
              let message = result.message;
              if (result.removed) {
                message = `Removed ${item.name} from inventory`;
              } else if (result.lowStock) {
                message += `\n\n⚠️ LOW STOCK WARNING`;
              }
              
              Alert.alert('Updated', message);
              await loadInventory();
              await checkLowStock();
            } catch (error) {
              Alert.alert('Error', 'Failed to update amount');
            }
          },
        },
      ],
      'plain-text',
      item.amount.toString()
    );
  };

  /**
   * Render inventory item
   */
  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const isLowStock = item.lowStockThreshold && item.amount <= item.lowStockThreshold;
    
    return (
      <View style={[styles.itemCard, isLowStock ? styles.lowStockCard : undefined]}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          {isLowStock && <Text style={styles.lowStockBadge}>⚠️ LOW STOCK</Text>}
        </View>
        
        <Text style={styles.itemAmount}>
          Amount: {item.amount}{item.unit}
        </Text>
        
        {item.lowStockThreshold && (
          <Text style={styles.itemThreshold}>
            Threshold: {item.lowStockThreshold}{item.unit}
          </Text>
        )}
        
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openConsumeModal(item)}
          >
            <Text style={styles.actionButtonText}>Consume</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.adjustButton]}
            onPress={() => handleManualAdjust(item)}
          >
            <Text style={styles.actionButtonText}>Adjust</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Inventory Management</Text>
      
      {/* Low Stock Alert Banner */}
      {lowStockAlerts.length > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => setLowStockModalVisible(true)}
        >
          <Text style={styles.alertText}>
            ⚠️ {lowStockAlerts.length} item(s) low on stock - Tap to view
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Add New Item Form */}
      <View style={styles.addForm}>
        <Text style={styles.formTitle}>Add New Item</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Item name (e.g., Chicken, Milk)"
          value={newItemName}
          onChangeText={setNewItemName}
        />
        
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Amount"
            keyboardType="decimal-pad"
            value={newItemAmount}
            onChangeText={setNewItemAmount}
          />
          
          <View style={styles.unitPicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {units.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitButton,
                    newItemUnit === unit && styles.unitButtonSelected,
                  ]}
                  onPress={() => setNewItemUnit(unit)}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      newItemUnit === unit && styles.unitButtonTextSelected,
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Low stock threshold (optional)"
          keyboardType="decimal-pad"
          value={newItemThreshold}
          onChangeText={setNewItemThreshold}
        />
        
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>Add to Inventory</Text>
        </TouchableOpacity>
      </View>
      
      {/* Inventory List */}
      <Text style={styles.sectionTitle}>Current Inventory</Text>
      <FlatList
        data={inventory}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item._id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No items in inventory. Add some above!
          </Text>
        }
      />
      
      {/* Consume Modal */}
      <Modal
        visible={consumeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConsumeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Consume {selectedItem?.name}
            </Text>
            <Text style={styles.modalSubtitle}>
              Available: {selectedItem?.amount}{selectedItem?.unit}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder={`Amount to consume (${selectedItem?.unit})`}
              keyboardType="decimal-pad"
              value={consumeAmount}
              onChangeText={setConsumeAmount}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setConsumeModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConsume}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                  Consume
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Low Stock Modal */}
      <Modal
        visible={lowStockModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLowStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Low Stock Items</Text>
            
            <ScrollView style={styles.lowStockList}>
              {lowStockItems.map((item) => (
                <View key={item._id} style={styles.lowStockItem}>
                  <Text style={styles.lowStockItemName}>{item.name}</Text>
                  <Text style={styles.lowStockItemAmount}>
                    {item.amount}{item.unit} / {item.lowStockThreshold}{item.unit}
                  </Text>
                  <Text style={styles.lowStockItemPercent}>
                    {item.percentRemaining.toFixed(0)}% remaining
                  </Text>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setLowStockModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// === Styles ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  alertBanner: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  alertText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  addForm: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  unitPicker: {
    flex: 1,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  unitButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  unitButtonText: {
    fontSize: 14,
    color: '#666',
  },
  unitButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  lowStockBadge: {
    fontSize: 12,
    color: '#f57c00',
    fontWeight: '600',
  },
  itemAmount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  itemThreshold: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  adjustButton: {
    backgroundColor: '#9C27B0',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    color: '#fff',
  },
  lowStockList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  lowStockItem: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  lowStockItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  lowStockItemAmount: {
    fontSize: 14,
    color: '#666',
  },
  lowStockItemPercent: {
    fontSize: 12,
    color: '#f57c00',
    marginTop: 4,
  },
});
