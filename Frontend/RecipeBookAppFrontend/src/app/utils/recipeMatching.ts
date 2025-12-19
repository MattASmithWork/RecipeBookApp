/**
 * Ingredient matching and recipe suggestion logic
 */

export interface MatchedRecipe {
  recipe: any;
  matchPercentage: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

/**
 * Normalize ingredient strings for comparison
 */
const normalizeIngredient = (ingredient: string): string => {
  return ingredient
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .split(',')[0]; // Remove quantities, just get the ingredient name
};

/**
 * Check if two ingredients are similar
 */
const ingredientMatches = (userIngredient: string, recipeIngredient: string): boolean => {
  const normalized1 = normalizeIngredient(userIngredient);
  const normalized2 = normalizeIngredient(recipeIngredient);

  // Exact match
  if (normalized1 === normalized2) return true;

  // Substring match (e.g., "tomato" matches "cherry tomato")
  if (normalized2.includes(normalized1) || normalized1.includes(normalized2)) return true;

  return false;
};

/**
 * Match user ingredients against a recipe
 */
export const matchRecipeWithIngredients = (
  recipe: any,
  userIngredients: string[]
): MatchedRecipe => {
  const matchedIngredients: string[] = [];
  const missingIngredients: string[] = [];

  recipe.ingredients.forEach((recipeIngredient: string) => {
    const isMatched = userIngredients.some((userIng) =>
      ingredientMatches(userIng, recipeIngredient)
    );

    if (isMatched) {
      matchedIngredients.push(recipeIngredient);
    } else {
      missingIngredients.push(recipeIngredient);
    }
  });

  const matchPercentage = Math.round(
    (matchedIngredients.length / recipe.ingredients.length) * 100
  );

  return {
    recipe,
    matchPercentage,
    matchedIngredients,
    missingIngredients,
  };
};

/**
 * Find recipes that can be made with available ingredients
 */
export const findRecipesWithIngredients = (
  recipes: any[],
  userIngredients: string[],
  minMatchPercentage: number = 100
): MatchedRecipe[] => {
  return recipes
    .map((recipe) => matchRecipeWithIngredients(recipe, userIngredients))
    .filter((matched) => matched.matchPercentage >= minMatchPercentage)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
};

/**
 * Find recipes with partial matches (e.g., 80% of ingredients available)
 */
export const findPartialRecipes = (
  recipes: any[],
  userIngredients: string[],
  minMatchPercentage: number = 80
): MatchedRecipe[] => {
  return recipes
    .map((recipe) => matchRecipeWithIngredients(recipe, userIngredients))
    .filter((matched) => matched.matchPercentage >= minMatchPercentage)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
};
