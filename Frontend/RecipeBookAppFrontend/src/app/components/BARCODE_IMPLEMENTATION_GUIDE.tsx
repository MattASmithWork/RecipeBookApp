/**
 * BARCODE SCANNING & NUTRITION TRACKING IMPLEMENTATION GUIDE
 * ============================================================
 * 
 * This guide shows you how to integrate barcode scanning into your shopping list
 * to automatically add products with nutrition information.
 * 
 * WHAT'S BEEN ADDED:
 * ------------------
 * 
 * 1. BACKEND (Backend/RecipeBookAppBackend/src/app_api.py):
 *    ✅ Updated ShoppingItem model with nutrition fields (barcode, calories, protein, carbs, fat, servingSize)
 *    ✅ Updated InventoryItem model with nutrition fields
 *    ✅ New endpoint: GET /barcode/{barcode} - Look up product by barcode
 *    ✅ Updated mark-bought endpoint to preserve nutrition data
 * 
 * 2. FRONTEND (Frontend/RecipeBookAppFrontend/src):
 *    ✅ New component: app/components/BarcodeScannerModal.tsx
 *    ✅ Updated api.ts with barcode lookup function
 *    ✅ Updated TypeScript interfaces with nutrition fields
 *    ✅ Added expo-barcode-scanner and expo-camera packages
 * 
 * 
 * HOW TO USE IN YOUR SHOPPING LIST SCREEN:
 * -----------------------------------------
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { addShoppingItem, lookupBarcode } from '../services/api';

// Example integration in ShoppingListScreen.tsx
export function ExampleShoppingListWithBarcode() {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);

  /**
   * Handle when a product is found from barcode scan
   * This is called by BarcodeScannerModal when successful
   */
  const handleProductFound = async (product: any) => {
    console.log('Product found:', product);
    
    // Show confirmation dialog with product details
    Alert.alert(
      'Product Found',
      `${product.name}\n${product.brand}\n\nNutrition (per ${product.servingSize}):\n` +
      `Calories: ${product.calories} kcal\n` +
      `Protein: ${product.protein}g\n` +
      `Carbs: ${product.carbs}g\n` +
      `Fat: ${product.fat}g\n\n` +
      'Add to shopping list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to List',
          onPress: async () => {
            try {
              // Create shopping item with nutrition data
              const newItem = {
                name: product.name,
                quantity: '1', // User can edit this later
                amount: 1,
                unit: 'unit',
                category: product.category || 'Other',
                barcode: product.barcode,
                calories: product.calories,
                protein: product.protein,
                carbs: product.carbs,
                fat: product.fat,
                servingSize: product.servingSize,
              };

              // Add to shopping list via API
              await addShoppingItem(newItem);
              
              Alert.alert('Success', 'Product added to shopping list!');
              
              // Refresh your shopping list here
              // loadShoppingList();
            } catch (error) {
              console.error('Error adding product:', error);
              Alert.alert('Error', 'Failed to add product to shopping list');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle manual barcode entry (backup if camera doesn't work)
   */
  const handleManualBarcodeEntry = async (barcode: string) => {
    try {
      const result = await lookupBarcode(barcode);
      
      if (result.found && result.product) {
        handleProductFound(result.product);
      } else {
        Alert.alert('Not Found', 'Product not in database. You can add it manually.');
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Alert.alert('Error', 'Failed to look up barcode');
    }
  };

  return (
    <View style={styles.container}>
      {/* Add Scan Barcode button to your UI */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => setShowBarcodeScanner(true)}
      >
        <Text style={styles.scanButtonText}>📷 Scan Barcode</Text>
      </TouchableOpacity>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onProductFound={handleProductFound}
        apiUrl={process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}
      />

      {/* Display scanned product nutrition info */}
      {scannedProduct && (
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>Last Scanned Product</Text>
          <Text style={styles.productName}>{scannedProduct.name}</Text>
          <Text style={styles.productBrand}>{scannedProduct.brand}</Text>
          
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{scannedProduct.calories}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{scannedProduct.protein}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{scannedProduct.carbs}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{scannedProduct.fat}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * DISPLAYING NUTRITION INFO IN SHOPPING LIST ITEMS:
 * --------------------------------------------------
 */

// Add this to your shopping list item renderer
export function ShoppingListItemWithNutrition({ item }: { item: any }) {
  return (
    <View style={styles.itemContainer}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemQuantity}>{item.quantity || `${item.amount} ${item.unit}`}</Text>
      
      {/* Show nutrition badge if available */}
      {item.calories && (
        <View style={styles.nutritionBadge}>
          <Text style={styles.nutritionBadgeText}>
            {item.calories} cal | {item.protein}g protein
          </Text>
        </View>
      )}
      
      {/* Show barcode if available */}
      {item.barcode && (
        <Text style={styles.barcodeText}>🔖 {item.barcode}</Text>
      )}
    </View>
  );
}

/**
 * TRACKING NUTRITION WHEN ITEMS ARE BOUGHT:
 * ------------------------------------------
 */

// When you mark an item as bought, nutrition data is automatically
// preserved and moved to inventory. You can then use it for:
// 1. Tracking daily calorie intake
// 2. Meal planning with nutrition goals
// 3. Nutrition reports and analytics

export function InventoryItemWithNutrition({ item }: { item: any }) {
  return (
    <View style={styles.inventoryItem}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemAmount}>{item.amount} {item.unit}</Text>
      
      {/* Show nutrition info */}
      {item.calories && (
        <View style={styles.nutritionInfo}>
          <Text style={styles.nutritionText}>
            Per {item.servingSize}: {item.calories} cal
          </Text>
          <Text style={styles.macrosText}>
            P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * INSTALLATION STEPS:
 * -------------------
 * 
 * 1. Install new dependencies:
 *    cd Frontend/RecipeBookAppFrontend/src
 *    npm install
 * 
 * 2. Test the backend endpoint:
 *    curl http://localhost:8000/barcode/737628064502
 * 
 * 3. Run the backend:
 *    cd Backend/RecipeBookAppBackend
 *    source bin/activate
 *    cd src
 *    uvicorn app_api:app --reload
 * 
 * 4. Run the frontend:
 *    cd Frontend/RecipeBookAppFrontend/src
 *    npm start
 * 
 * 5. Test on your device (camera required for scanning)
 * 
 * 
 * EXAMPLE BARCODES TO TEST:
 * -------------------------
 * 737628064502 - Coca Cola
 * 3017620422003 - Nutella
 * 5000159484695 - Heinz Ketchup
 * 8712566336470 - Red Bull
 * 5449000000996 - Coca Cola (UK)
 * 
 * 
 * API FLOW:
 * ---------
 * 1. User scans barcode → BarcodeScannerModal
 * 2. Modal calls backend: GET /barcode/{barcode}
 * 3. Backend queries Open Food Facts API
 * 4. Product data returned with nutrition info
 * 5. User confirms and adds to shopping list
 * 6. Item saved with all nutrition data
 * 7. When marked as bought, moves to inventory with nutrition
 * 
 * 
 * OPEN FOOD FACTS API:
 * --------------------
 * - Free and open-source
 * - 2.8+ million products worldwide
 * - No API key required
 * - Rate limit: reasonable (no strict limits for non-commercial)
 * - Data includes: name, brand, nutrition, ingredients, images
 * - Best coverage: Europe, North America
 * - URL: https://world.openfoodfacts.org/api/v2/product/{barcode}
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  nutritionCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  nutritionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  productBrand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  itemContainer: {
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  nutritionBadge: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
  },
  nutritionBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  barcodeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  inventoryItem: {
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 10,
  },
  itemAmount: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  nutritionInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  nutritionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  macrosText: {
    fontSize: 12,
    color: '#666',
  },
});
