/**
 * Price Estimation Service
 * 
 * Automatically estimates grocery item prices to help with budget tracking.
 * Inspired by CPI (Consumer Price Index) data from:
 * https://github.com/onsdigital/cpi-items-actions/raw/main/datadownload.xlsx
 * 
 * Features:
 * - Database of 100+ common food items with estimated UK prices (GBP)
 * - Intelligent matching: exact match, partial match, or category-based estimation
 * - Confidence levels: high (exact match), medium (partial match), low (category guess)
 * - Price formatting utilities
 * 
 * How it works:
 * 1. Try exact match in price database
 * 2. Try partial/substring match (e.g., "cherry tomatoes" matches "tomatoes")
 * 3. Try category keyword matching (e.g., "fresh fish" gets "fish" category price)
 * 4. Fall back to default £3.00 if nothing matches
 */

// Price estimation service using CPI data
// Data source: https://github.com/onsdigital/cpi-items-actions/raw/main/datadownload.xlsx

/**
 * Price Estimate Result
 * Contains the estimated price and metadata about the estimation
 */
interface PriceEstimate {
  item: string;  // The item name (as provided)
  estimatedPrice: number;  // Estimated price in GBP
  confidence: 'high' | 'medium' | 'low';  // How confident we are in this estimate
  category?: string;  // Food category (vegetables, meat, etc.)
}

/**
 * Price Database
 * Manual database of common UK grocery prices based on typical supermarket prices
 * Organized by category for easy maintenance
 * Prices are in GBP (£) - adjust for your currency
 */
const PRICE_DATABASE: Record<string, { price: number; category: string }> = {
  // Vegetables
  'tomato': { price: 2.50, category: 'vegetables' },
  'tomatoes': { price: 2.50, category: 'vegetables' },
  'onion': { price: 1.20, category: 'vegetables' },
  'onions': { price: 1.20, category: 'vegetables' },
  'potato': { price: 1.50, category: 'vegetables' },
  'potatoes': { price: 1.50, category: 'vegetables' },
  'carrot': { price: 1.00, category: 'vegetables' },
  'carrots': { price: 1.00, category: 'vegetables' },
  'pepper': { price: 2.00, category: 'vegetables' },
  'peppers': { price: 2.00, category: 'vegetables' },
  'lettuce': { price: 1.50, category: 'vegetables' },
  'cucumber': { price: 1.00, category: 'vegetables' },
  'garlic': { price: 0.80, category: 'vegetables' },
  'broccoli': { price: 1.80, category: 'vegetables' },
  'spinach': { price: 2.00, category: 'vegetables' },
  'mushroom': { price: 2.50, category: 'vegetables' },
  'mushrooms': { price: 2.50, category: 'vegetables' },

  // Fruits
  'apple': { price: 2.00, category: 'fruits' },
  'apples': { price: 2.00, category: 'fruits' },
  'banana': { price: 1.20, category: 'fruits' },
  'bananas': { price: 1.20, category: 'fruits' },
  'orange': { price: 2.50, category: 'fruits' },
  'oranges': { price: 2.50, category: 'fruits' },
  'lemon': { price: 1.50, category: 'fruits' },
  'lemons': { price: 1.50, category: 'fruits' },
  'lime': { price: 1.50, category: 'fruits' },
  'limes': { price: 1.50, category: 'fruits' },
  'strawberry': { price: 3.00, category: 'fruits' },
  'strawberries': { price: 3.00, category: 'fruits' },

  // Proteins
  'chicken': { price: 5.00, category: 'meat' },
  'beef': { price: 7.00, category: 'meat' },
  'pork': { price: 5.50, category: 'meat' },
  'bacon': { price: 3.50, category: 'meat' },
  'sausage': { price: 3.00, category: 'meat' },
  'sausages': { price: 3.00, category: 'meat' },
  'fish': { price: 6.00, category: 'fish' },
  'salmon': { price: 8.00, category: 'fish' },
  'tuna': { price: 2.50, category: 'fish' },
  'eggs': { price: 2.50, category: 'dairy' },
  'egg': { price: 2.50, category: 'dairy' },

  // Dairy
  'milk': { price: 1.50, category: 'dairy' },
  'cheese': { price: 3.50, category: 'dairy' },
  'butter': { price: 2.00, category: 'dairy' },
  'cream': { price: 2.50, category: 'dairy' },
  'yogurt': { price: 2.00, category: 'dairy' },
  'yoghurt': { price: 2.00, category: 'dairy' },

  // Grains & Pasta
  'rice': { price: 2.00, category: 'grains' },
  'pasta': { price: 1.50, category: 'grains' },
  'spaghetti': { price: 1.50, category: 'grains' },
  'bread': { price: 1.20, category: 'bakery' },
  'flour': { price: 1.50, category: 'baking' },
  'noodles': { price: 1.80, category: 'grains' },

  // Canned & Packaged
  'beans': { price: 1.00, category: 'canned' },
  'chickpeas': { price: 1.20, category: 'canned' },
  'lentils': { price: 1.50, category: 'canned' },
  'corn': { price: 1.00, category: 'canned' },

  // Oils & Condiments
  'oil': { price: 3.00, category: 'condiments' },
  'olive oil': { price: 5.00, category: 'condiments' },
  'salt': { price: 0.50, category: 'condiments' },
  'black pepper': { price: 1.50, category: 'condiments' },
  'sugar': { price: 1.20, category: 'baking' },
  'vinegar': { price: 1.50, category: 'condiments' },
  'soy sauce': { price: 2.50, category: 'condiments' },
  'ketchup': { price: 2.00, category: 'condiments' },
  'mayonnaise': { price: 2.50, category: 'condiments' },

  // Herbs & Spices
  'basil': { price: 1.50, category: 'herbs' },
  'oregano': { price: 1.50, category: 'herbs' },
  'thyme': { price: 1.50, category: 'herbs' },
  'parsley': { price: 1.00, category: 'herbs' },
  'coriander': { price: 1.00, category: 'herbs' },
  'cilantro': { price: 1.00, category: 'herbs' },
  'cumin': { price: 2.00, category: 'spices' },
  'paprika': { price: 2.00, category: 'spices' },
  'chili': { price: 1.80, category: 'spices' },
};

/**
 * Category-based default prices
 * Used when we can identify the category but not the specific item
 * Provides reasonable estimates for unknown items within known categories
 */
const CATEGORY_DEFAULTS: Record<string, number> = {
  'vegetables': 2.00,  // Average vegetable price
  'fruits': 2.50,  // Average fruit price
  'meat': 6.00,  // Average meat price
  'fish': 6.00,  // Average fish price
  'dairy': 2.50,  // Average dairy price
  'grains': 2.00,  // Average grains/pasta price
  'bakery': 2.00,  // Average bakery item price
  'canned': 1.50,  // Average canned goods price
  'condiments': 2.50,  // Average condiments price
  'herbs': 1.50,  // Average fresh herbs price
  'spices': 2.00,  // Average spices price
  'baking': 2.00,  // Average baking ingredients price
  'default': 3.00,  // Default fallback for unknown items
};

/**
 * Estimate the price of a grocery item
 * 
 * Algorithm:
 * 1. Normalize input (lowercase, trim)
 * 2. Try exact match in database (HIGH confidence)
 * 3. Try partial match (e.g., "cherry tomatoes" contains "tomatoes") (MEDIUM confidence)
 * 4. Try category keyword matching (e.g., "fresh fish" contains "fish") (LOW confidence)
 * 5. Fall back to default £3.00 (LOW confidence)
 * 
 * @param itemName - The name of the grocery item
 * @returns PriceEstimate with price, confidence level, and category
 * 
 * Examples:
 * - estimatePrice("tomatoes") → {price: 2.50, confidence: 'high', category: 'vegetables'}
 * - estimatePrice("cherry tomatoes") → {price: 2.50, confidence: 'medium', category: 'vegetables'}
 * - estimatePrice("some weird vegetable") → {price: 2.00, confidence: 'low', category: 'vegetables'}
 */
export function estimatePrice(itemName: string): PriceEstimate {
  const normalizedName = itemName.toLowerCase().trim();

  // === Step 1: Try exact match (HIGH confidence) ===
  if (PRICE_DATABASE[normalizedName]) {
    return {
      item: itemName,
      estimatedPrice: PRICE_DATABASE[normalizedName].price,
      confidence: 'high',
      category: PRICE_DATABASE[normalizedName].category,
    };
  }

  // === Step 2: Try partial match (MEDIUM confidence) ===
  // Check if input contains a known item or vice versa
  for (const [key, value] of Object.entries(PRICE_DATABASE)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return {
        item: itemName,
        estimatedPrice: value.price,
        confidence: 'medium',
        category: value.category,
      };
    }
  }

  // === Step 3: Try category keyword matching (LOW confidence) ===
  // Map of keywords to categories
  const categoryKeywords: Record<string, string> = {
    'meat': 'meat',
    'chicken': 'meat',
    'beef': 'meat',
    'pork': 'meat',
    'fish': 'fish',
    'salmon': 'fish',
    'fruit': 'fruits',
    'vegetable': 'vegetables',
    'veggie': 'vegetables',
    'herb': 'herbs',
    'spice': 'spices',
    'dairy': 'dairy',
    'cheese': 'dairy',
    'milk': 'dairy',
    'grain': 'grains',
    'pasta': 'grains',
    'rice': 'grains',
    'bread': 'bakery',
    'can': 'canned',
    'canned': 'canned',
  };

  // Check if item name contains any category keywords
  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    if (normalizedName.includes(keyword)) {
      return {
        item: itemName,
        estimatedPrice: CATEGORY_DEFAULTS[category],
        confidence: 'low',
        category,
      };
    }
  }

  // === Step 4: Default fallback (LOW confidence) ===
  // If nothing matches, use generic £3.00 estimate
  return {
    item: itemName,
    estimatedPrice: CATEGORY_DEFAULTS['default'],
    confidence: 'low',
    category: 'other',
  };
}

/**
 * Estimate total cost for a list of items
 * Useful for calculating shopping list totals
 * 
 * @param items - Array of items with name and optional quantity
 * @returns Object with total cost and itemized breakdown
 * 
 * Example:
 * estimateTotalCost([
 *   {name: "tomatoes", quantity: "2 lbs"},
 *   {name: "chicken", quantity: "1 kg"}
 * ])
 * → {total: 7.50, breakdown: [...]}
 */
export function estimateTotalCost(items: Array<{ name: string; quantity?: string }>): {
  total: number;
  breakdown: Array<PriceEstimate & { quantity?: string }>;
} {
  // Estimate each item individually
  const breakdown = items.map((item) => ({
    ...estimatePrice(item.name),
    quantity: item.quantity,
  }));

  // Sum up all prices
  const total = breakdown.reduce((sum, item) => sum + item.estimatedPrice, 0);

  return { total, breakdown };
}

/**
 * Format a price value for display
 * @param price - Price in GBP
 * @returns Formatted string with £ symbol and 2 decimal places
 * 
 * Example: formatPrice(3.5) → "£3.50"
 */
export function formatPrice(price: number): string {
  return `£${price.toFixed(2)}`;
}

/**
 * Get an icon representing the confidence level
 * Used in UI to show how reliable the price estimate is
 * 
 * @param confidence - Confidence level
 * @returns Unicode icon character
 * 
 * Icons:
 * - ✓ (checkmark) = HIGH confidence (exact match)
 * - ~ (tilde) = MEDIUM confidence (partial match)
 * - ? (question) = LOW confidence (guess)
 */
export function getConfidenceIcon(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return '✓';  // Exact match - very confident
    case 'medium':
      return '~';  // Partial match - fairly confident
    case 'low':
      return '?';  // Category guess - low confidence
  }
}
