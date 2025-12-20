"""
Recipe Book App Backend API
This FastAPI application provides endpoints for:
- Recipe management (CRUD operations for personal recipes)
- GitHub recipe fetching (community recipes)
- Shopping list management (shared across users)
- Inventory management (items owned/in stock)
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from bson import ObjectId
from bson.errors import InvalidId
from connectToDataBase import get_database
from model_to_dict import model_to_dict
import httpx
import json
from typing import Optional, List
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pymongo.errors import PyMongoError
import os

# Initialize FastAPI application
app = FastAPI()

# === Rate Limiting Configuration ===
# Protects API from abuse and DoS attacks
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# === CORS Configuration ===
# Allows frontend to call API from different origins (domains/ports)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:8081,http://localhost:19000,http://10.0.2.2:8081").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get MongoDB database connection
db = get_database()

# MongoDB collections
recipes = db["recipes"]  # User's personal recipes
shopping_list = db["shopping_list"]  # Shared shopping list for household
items_owned = db["items_owned"]  # Shared inventory of owned items
nutrition_logs = db["nutrition_logs"]  # Daily nutrition and calorie tracking
user_nutrition_goals = db["user_nutrition_goals"]  # User's nutrition goals/targets
user_accounts = db["user_accounts"]  # User account profiles with health metrics
weight_tracking = db["weight_tracking"]  # Monthly weight measurements for users
user_accounts = db["user_accounts"]  # User account profiles with health metrics
weight_tracking = db["weight_tracking"]  # Monthly weight measurements for users


# === Helper Functions ===

def validate_object_id(id_string: str, resource_name: str = "resource") -> ObjectId:
    """
    Validate and convert a string to MongoDB ObjectId.
    Prevents server crashes from invalid ID formats.
    
    Args:
        id_string: The ID string to validate
        resource_name: Name of the resource for error message (e.g., "recipe", "item")
    
    Returns:
        ObjectId: Valid MongoDB ObjectId
    
    Raises:
        HTTPException: 400 error if ID format is invalid
    """
    try:
        return ObjectId(id_string)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid {resource_name} ID format. Must be a valid MongoDB ObjectId."
        )


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """
    Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation.
    This is the number of calories your body burns at rest.
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
        age: Age in years
        gender: 'male' or 'female'
    
    Returns:
        float: BMR in calories per day
    
    Formula:
        Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
        Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
    """
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if gender.lower() == 'male':
        bmr += 5
    else:  # female
        bmr -= 161
    return round(bmr, 2)


def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    """
    Calculate Body Mass Index (BMI).
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
    
    Returns:
        float: BMI value
    
    Formula:
        BMI = weight (kg) / (height (m))^2
    
    BMI Categories:
        < 18.5: Underweight
        18.5 - 24.9: Normal weight
        25 - 29.9: Overweight
        >= 30: Obese
    """
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)
    return round(bmi, 2)


def calculate_daily_calories(bmr: float, activity_level: str) -> float:
    """
    Calculate recommended daily calorie intake based on BMR and activity level.
    
    Args:
        bmr: Basal Metabolic Rate
        activity_level: One of: 'sedentary', 'lightly_active', 'moderately_active', 
                       'very_active', 'extremely_active'
    
    Returns:
        float: Recommended daily calories
    
    Activity Level Multipliers:
        sedentary: BMR × 1.2 (little or no exercise)
        lightly_active: BMR × 1.375 (light exercise 1-3 days/week)
        moderately_active: BMR × 1.55 (moderate exercise 3-5 days/week)
        very_active: BMR × 1.725 (hard exercise 6-7 days/week)
        extremely_active: BMR × 1.9 (very hard exercise, physical job)
    """
    multipliers = {
        'sedentary': 1.2,
        'lightly_active': 1.375,
        'moderately_active': 1.55,
        'very_active': 1.725,
        'extremely_active': 1.9
    }
    multiplier = multipliers.get(activity_level.lower(), 1.2)
    return round(bmr * multiplier, 2)


def get_bmi_category(bmi: float) -> str:
    """
    Get BMI category based on BMI value.
    
    Args:
        bmi: BMI value
    
    Returns:
        str: BMI category
    """
    if bmi < 18.5:
        return 'Underweight'
    elif bmi < 25:
        return 'Normal weight'
    elif bmi < 30:
        return 'Overweight'
    else:
        return 'Obese'



def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """
    Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation.
    This is the number of calories your body burns at rest.
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
        age: Age in years
        gender: 'male' or 'female'
    
    Returns:
        float: BMR in calories per day
    
    Formula:
        Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
        Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
    """
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if gender.lower() == 'male':
        bmr += 5
    else:  # female
        bmr -= 161
    return round(bmr, 2)


def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    """
    Calculate Body Mass Index (BMI).
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
    
    Returns:
        float: BMI value
    
    Formula:
        BMI = weight (kg) / (height (m))^2
    
    BMI Categories:
        < 18.5: Underweight
        18.5 - 24.9: Normal weight
        25 - 29.9: Overweight
        >= 30: Obese
    """
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)
    return round(bmi, 2)


def calculate_daily_calories(bmr: float, activity_level: str) -> float:
    """
    Calculate recommended daily calorie intake based on BMR and activity level.
    
    Args:
        bmr: Basal Metabolic Rate
        activity_level: One of: 'sedentary', 'lightly_active', 'moderately_active', 
                       'very_active', 'extremely_active'
    
    Returns:
        float: Recommended daily calories
    
    Activity Level Multipliers:
        sedentary: BMR × 1.2 (little or no exercise)
        lightly_active: BMR × 1.375 (light exercise 1-3 days/week)
        moderately_active: BMR × 1.55 (moderate exercise 3-5 days/week)
        very_active: BMR × 1.725 (hard exercise 6-7 days/week)
        extremely_active: BMR × 1.9 (very hard exercise, physical job)
    """
    multipliers = {
        'sedentary': 1.2,
        'lightly_active': 1.375,
        'moderately_active': 1.55,
        'very_active': 1.725,
        'extremely_active': 1.9
    }
    multiplier = multipliers.get(activity_level.lower(), 1.2)
    return round(bmr * multiplier, 2)


@app.get("/health")
def health():
    """
    Health check endpoint to verify API and database connectivity.
    Returns: {"status": "ok"} if healthy, 503 error if database unreachable
    """
    try:
        # Ping MongoDB to check connection
        db.client.admin.command("ping")
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="DB unreachable")


# === Data Models (Pydantic schemas for request validation) ===

class RecipeIngredient(BaseModel):
    """Schema for recipe ingredient with quantity and unit"""
    name: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0, le=10000)  # Numeric amount needed
    unit: str = Field(..., min_length=1, max_length=20)  # kg, L, ml, g, etc.
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Sanitize ingredient name"""
        if not v or not v.strip():
            raise ValueError('Ingredient name cannot be empty')
        v = v.replace('$', '').replace('{', '').replace('}', '')
        return v.strip()
    
    @field_validator('unit')
    @classmethod
    def validate_unit(cls, v: str) -> str:
        """Validate unit is from allowed list"""
        allowed_units = ['kg', 'g', 'L', 'ml', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'unit', 'piece']
        v_lower = v.lower().strip()
        if v_lower not in allowed_units:
            raise ValueError(f'Unit must be one of: {", ".join(allowed_units)}')
        return v_lower

class Recipe(BaseModel):
    """Schema for personal recipe data with input validation"""
    name: str = Field(..., min_length=1, max_length=200)
    # Support both old string format and new structured format for backwards compatibility
    ingredients: List[str] = Field(..., min_items=1, max_items=100)  # Legacy format: ["2kg chicken", "1L milk"]
    ingredientsDetailed: Optional[List[RecipeIngredient]] = None  # New format with measurements
    instructions: List[str] = Field(..., min_items=1, max_items=100)
    prep_time: int = Field(..., ge=0, le=10000)
    cook_time: int = Field(..., ge=0, le=10000)
    servings: int = Field(..., ge=1, le=100)
    user: str = Field(..., min_length=1, max_length=100)
    
    @field_validator('name', 'user')
    @classmethod
    def validate_no_special_chars(cls, v: str) -> str:
        """Prevent NoSQL injection through special characters"""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        # Remove potentially dangerous MongoDB operators
        dangerous_patterns = ['$', '{', '}']
        for pattern in dangerous_patterns:
            if pattern in v:
                raise ValueError(f'Invalid character "{pattern}" not allowed')
        return v.strip()
    
    @field_validator('ingredients', 'instructions')
    @classmethod
    def validate_lists(cls, v: List[str]) -> List[str]:
        """Validate and clean list items"""
        if not v:
            raise ValueError('List cannot be empty')
        cleaned = []
        for item in v:
            if item and item.strip():
                if len(item) > 500:
                    raise ValueError('Item too long (max 500 characters)')
                cleaned.append(item.strip())
        if not cleaned:
            raise ValueError('At least one valid item required')
        return cleaned

class ShoppingItem(BaseModel):
    """Schema for shopping list items with validation and unit support"""
    name: str = Field(..., min_length=1, max_length=200)
    # Support both old string quantity and new numeric amount + unit
    quantity: Optional[str] = Field(None, max_length=50)  # Legacy: "2kg" or "1 liter"
    amount: Optional[float] = Field(None, gt=0, le=10000)  # New: numeric amount (2.5, 1, etc.)
    unit: Optional[str] = Field(None, max_length=20)  # New: unit type (kg, L, ml, etc.)
    estimatedPrice: Optional[float] = Field(None, ge=0, le=10000)
    category: Optional[str] = Field(None, max_length=100)
    addedBy: Optional[str] = Field(None, max_length=100)
    addedAt: Optional[str] = None
    # Barcode and nutrition fields
    barcode: Optional[str] = Field(None, max_length=50)  # Product barcode (UPC/EAN)
    calories: Optional[float] = Field(None, ge=0, le=10000)  # Calories per serving
    protein: Optional[float] = Field(None, ge=0, le=1000)  # Protein in grams
    carbs: Optional[float] = Field(None, ge=0, le=1000)  # Carbohydrates in grams
    fat: Optional[float] = Field(None, ge=0, le=1000)  # Fat in grams
    servingSize: Optional[str] = Field(None, max_length=100)  # e.g., "100g" or "1 bottle"
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Sanitize item name to prevent injection"""
        if not v or not v.strip():
            raise ValueError('Item name cannot be empty')
        v = v.replace('$', '').replace('{', '').replace('}', '')
        return v.strip()
    
    @field_validator('unit')
    @classmethod
    def validate_unit(cls, v: Optional[str]) -> Optional[str]:
        """Validate unit if provided"""
        if v is None:
            return v
        allowed_units = ['kg', 'g', 'L', 'ml', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'unit', 'piece']
        v_lower = v.lower().strip()
        if v_lower not in allowed_units:
            raise ValueError(f'Unit must be one of: {", ".join(allowed_units)}')
        return v_lower

class InventoryItem(BaseModel):
    """Schema for inventory/owned items with validation and unit-based tracking"""
    name: str = Field(..., min_length=1, max_length=200)
    # Support both old string quantity and new numeric amount + unit
    quantity: Optional[str] = Field(None, max_length=50)  # Legacy: "2kg" or "1 liter"
    amount: float = Field(..., gt=0, le=10000)  # Numeric amount in stock (2.5, 1, etc.)
    unit: str = Field(..., min_length=1, max_length=20)  # Unit type (kg, L, ml, etc.)
    lowStockThreshold: Optional[float] = Field(None, ge=0, le=10000)  # Alert when stock drops below this
    category: Optional[str] = Field(None, max_length=100)
    purchasedAt: Optional[str] = None
    purchasedBy: Optional[str] = Field(None, max_length=100)
    # Barcode and nutrition fields
    barcode: Optional[str] = Field(None, max_length=50)  # Product barcode (UPC/EAN)
    calories: Optional[float] = Field(None, ge=0, le=10000)  # Calories per serving
    protein: Optional[float] = Field(None, ge=0, le=1000)  # Protein in grams
    carbs: Optional[float] = Field(None, ge=0, le=1000)  # Carbohydrates in grams
    fat: Optional[float] = Field(None, ge=0, le=1000)  # Fat in grams
    servingSize: Optional[str] = Field(None, max_length=100)  # e.g., "100g" or "1 bottle"
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Sanitize item name to prevent injection"""
        if not v or not v.strip():
            raise ValueError('Item name cannot be empty')
        v = v.replace('$', '').replace('{', '').replace('}', '')
        return v.strip()
    
    @field_validator('unit')
    @classmethod
    def validate_unit(cls, v: str) -> str:
        """Validate unit is from allowed list"""
        allowed_units = ['kg', 'g', 'L', 'ml', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'unit', 'piece']
        v_lower = v.lower().strip()
        if v_lower not in allowed_units:
            raise ValueError(f'Unit must be one of: {", ".join(allowed_units)}')
        return v_lower


# === Nutrition Tracking Models ===

class NutritionInfo(BaseModel):
    """Nutritional information for a meal or food item"""
    calories: float = Field(..., ge=0, le=10000)  # Total calories
    protein: float = Field(..., ge=0, le=1000)  # Protein in grams
    carbs: float = Field(..., ge=0, le=1000)  # Carbohydrates in grams
    fat: float = Field(..., ge=0, le=1000)  # Fat in grams
    fiber: Optional[float] = Field(None, ge=0, le=500)  # Fiber in grams
    sugar: Optional[float] = Field(None, ge=0, le=500)  # Sugar in grams
    sodium: Optional[float] = Field(None, ge=0, le=10000)  # Sodium in mg

class MealLog(BaseModel):
    """Log entry for a meal consumed"""
    user: str = Field(..., min_length=1, max_length=100)
    mealType: str = Field(..., pattern='^(breakfast|lunch|dinner|snack)$')  # Type of meal
    mealName: str = Field(..., min_length=1, max_length=200)  # Name/description
    date: str = Field(..., min_length=1)  # ISO date string (YYYY-MM-DD)
    nutrition: NutritionInfo  # Nutritional breakdown
    recipeId: Optional[str] = None  # Link to recipe if from recipe
    servings: Optional[float] = Field(1.0, gt=0, le=20)  # Number of servings consumed
    notes: Optional[str] = Field(None, max_length=500)  # Optional notes
    
    @field_validator('user', 'mealName')
    @classmethod
    def validate_no_special_chars(cls, v: str) -> str:
        """Prevent NoSQL injection"""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        v = v.replace('$', '').replace('{', '').replace('}', '')
        return v.strip()
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v: str) -> str:
        """Validate date format"""
        from datetime import datetime
        try:
            datetime.fromisoformat(v.split('T')[0])  # Accept ISO format
            return v
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD or ISO format')

class UserNutritionGoals(BaseModel):
    """Daily nutrition goals/targets for a user"""
    user: str = Field(..., min_length=1, max_length=100)
    dailyCalories: float = Field(..., gt=0, le=10000)  # Target daily calories
    dailyProtein: float = Field(..., gt=0, le=1000)  # Target protein (g)
    dailyCarbs: float = Field(..., gt=0, le=1000)  # Target carbs (g)
    dailyFat: float = Field(..., gt=0, le=1000)  # Target fat (g)
    dailyFiber: Optional[float] = Field(None, gt=0, le=500)  # Target fiber (g)
    dailySugar: Optional[float] = Field(None, gt=0, le=500)  # Max sugar (g)
    dailySodium: Optional[float] = Field(None, gt=0, le=10000)  # Max sodium (mg)
    
    @field_validator('user')
    @classmethod
    def validate_user(cls, v: str) -> str:
        """Sanitize username"""
        if not v or not v.strip():
            raise ValueError('User cannot be empty')
        v = v.replace('$', '').replace('{', '').replace('}', '')
        return v.strip()


# === User Account Models ===

class UserAccount(BaseModel):
    """User account with health metrics and calculated values"""
    username: str = Field(..., min_length=1, max_length=50, pattern='^[a-zA-Z0-9_]+$')
    displayName: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=200)
    age: int = Field(..., ge=1, le=150)
    gender: str = Field(..., pattern='^(male|female)$')
    weight: float = Field(..., gt=0, le=500)  # Current weight in kg
    height: float = Field(..., gt=0, le=300)  # Height in cm
    activityLevel: str = Field(
        ..., 
        pattern='^(sedentary|lightly_active|moderately_active|very_active|extremely_active)$'
    )
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Ensure username is lowercase and valid"""
        return v.lower().strip()

class WeightEntry(BaseModel):
    """Monthly weight measurement for tracking progress"""
    username: str = Field(..., min_length=1, max_length=50)
    weight: float = Field(..., gt=0, le=500)  # Weight in kg
    date: str = Field(..., min_length=1)  # ISO date string (YYYY-MM-DD)
    notes: Optional[str] = Field(None, max_length=500)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Ensure username is lowercase"""
        return v.lower().strip()
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v: str) -> str:
        """Validate date format"""
        from datetime import datetime
        try:
            datetime.fromisoformat(v.split('T')[0])
            return v
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD or ISO format')



# === Recipe Endpoints ===

@app.post("/recipes/")
@limiter.limit("20/minute")
def add_recipe(request: Request, recipe: Recipe):
    """
    Create a new personal recipe.
    Args: recipe - Recipe object with all required fields
    Returns: {"id": "<mongo_object_id>"}
    """
    inserted = recipes.insert_one(model_to_dict(recipe))
    return {"id": str(inserted.inserted_id)}

@app.get("/recipes/{user}")
@limiter.limit("30/minute")
def get_recipes(request: Request, user: str):
    """
    Get all recipes for a specific user.
    Args: user - Username to filter recipes
    Returns: List of recipe objects with _id converted to string
    """
    data = list(recipes.find({"user": user}))
    # Convert MongoDB ObjectId to string for JSON serialization
    for d in data:
        d["_id"] = str(d["_id"])
    return data

@app.put("/recipes/{id}")
@limiter.limit("20/minute")
def update_recipe(request: Request, id: str, recipe: Recipe):
    """
    Update an existing recipe by ID.
    Args: 
        id - MongoDB ObjectId as string
        recipe - Updated recipe data
    Returns: {"message": "Recipe updated"}
    """
    object_id = validate_object_id(id, "recipe")
    result = recipes.update_one({"_id": object_id}, {"$set": model_to_dict(recipe)})
    if result.matched_count == 0:
        raise HTTPException(404, "Recipe not found")
    return {"message": "Recipe updated"}

@app.delete("/recipes/{id}")
@limiter.limit("10/minute")
def delete_recipe(request: Request, id: str):
    """
    Delete a recipe by ID.
    Args: id - MongoDB ObjectId as string
    Returns: {"message": "Recipe deleted"}
    """
    object_id = validate_object_id(id, "recipe")
    result = recipes.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Recipe not found")
    return {"message": "Recipe deleted"}

@app.get("/recipes/fetch-from-github")
@limiter.limit("5/hour")
async def fetch_recipes_from_github(request: Request):
    """
    Fetch community recipes from GitHub repository (dpapathanasiou/recipes).
    This endpoint retrieves all JSON recipe files from the repo without storing them.
    Rate limited to 5 requests per hour due to expensive operation.
    
    Returns: {
        "recipes": [...],  # Array of recipe objects
        "statistics": {"total_found", "successful", "failed", "success_rate"},
        "errors": [...]  # Details of any errors encountered
    }
    """
    github_api_base = "https://api.github.com/repos/dpapathanasiou/recipes/contents"
    
    try:
        # Create async HTTP client with 30 second timeout
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get list of files in the repository root
            response = await client.get(github_api_base)
            response.raise_for_status()
            contents = response.json()
            
            recipes_data = []
            errors = []
            
            # Filter for only JSON files (each contains a recipe)
            json_files = [item for item in contents if item["name"].endswith(".json")]
            
            # Fetch each recipe file
            for item in json_files:
                try:
                    # Download the raw JSON content
                    file_response = await client.get(item["download_url"])
                    file_response.raise_for_status()
                    
                    recipe_data = file_response.json()
                    
                    # Add metadata to track source
                    recipe_data["source"] = "github"
                    recipe_data["source_file"] = item["name"]
                    
                    recipes_data.append(recipe_data)
                    
                except json.JSONDecodeError as e:
                    errors.append({
                        "file": item["name"],
                        "error": "Invalid JSON format",
                        "details": str(e)
                    })
                except Exception as e:
                    # Track errors for individual files but continue processing
                    errors.append({
                        "file": item["name"],
                        "error": "Failed to fetch",
                        "details": str(e)
                    })
            
            # Return recipes with statistics
            total_found = len(json_files)
            successful = len(recipes_data)
            return {
                "recipes": recipes_data,
                "statistics": {
                    "total_found": total_found,
                    "successful": successful,
                    "failed": len(errors),
                    "success_rate": f"{(successful/total_found*100):.1f}%" if total_found > 0 else "0%"
                },
                "errors": errors if errors else None
            }
    
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="GitHub API request timed out. Please try again."
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=503,
            detail=f"GitHub API returned error: {e.response.status_code}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch recipes from GitHub: {str(e)}"
        )


# === Shopping List Endpoints (Multi-user shared shopping list) ===

@app.get("/shopping-list")
@limiter.limit("30/minute")
def get_shopping_list(request: Request):
    """
    Get all items in the shared shopping list.
    Returns: Array of shopping items with _id as string
    """
    items = list(shopping_list.find())
    # Convert ObjectId to string for JSON serialization
    for item in items:
        item["_id"] = str(item["_id"])
    return items

@app.post("/shopping-list")
@limiter.limit("20/minute")
def add_shopping_item(request: Request, item: ShoppingItem):
    """
    Add a new item to the shopping list.
    Automatically adds timestamp when item is created.
    Args: item - ShoppingItem with name, quantity, and optional price/category
    Returns: {"id": "<item_id>", "message": "Item added to shopping list"}
    """
    item_dict = model_to_dict(item)
    # Add server timestamp
    item_dict["addedAt"] = datetime.utcnow().isoformat()
    inserted = shopping_list.insert_one(item_dict)
    return {"id": str(inserted.inserted_id), "message": "Item added to shopping list"}

@app.put("/shopping-list/{id}")
@limiter.limit("20/minute")
def update_shopping_item(request: Request, id: str, item: ShoppingItem):
    """
    Update an existing shopping list item (e.g., change quantity or price).
    Args:
        id - Item's MongoDB ObjectId as string
        item - Updated shopping item data
    Returns: {"message": "Shopping item updated"}
    """
    object_id = validate_object_id(id, "shopping item")
    result = shopping_list.update_one(
        {"_id": object_id}, 
        {"$set": model_to_dict(item)}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Shopping item not found")
    return {"message": "Shopping item updated"}

@app.delete("/shopping-list/{id}")
@limiter.limit("20/minute")
def delete_shopping_item(request: Request, id: str):
    """
    Remove an item from the shopping list (item no longer needed).
    Args: id - Item's MongoDB ObjectId as string
    Returns: {"message": "Shopping item removed"}
    """
    object_id = validate_object_id(id, "shopping item")
    result = shopping_list.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Shopping item not found")
    return {"message": "Shopping item removed"}

@app.post("/shopping-list/{id}/mark-bought")
@limiter.limit("20/minute")
def mark_item_bought(request: Request, id: str, purchasedBy: Optional[str] = None):
    """
    Mark a shopping list item as bought and move it to inventory atomically.
    Uses MongoDB transaction to ensure data consistency and prevent race conditions.
    
    Args:
        id - Shopping list item's MongoDB ObjectId as string
        purchasedBy - Optional username of who bought the item
    
    Returns: {"message": "Item marked as bought and moved to inventory"}
    
    Process (atomic transaction):
    1. Find item in shopping_list collection
    2. Create new entry in items_owned collection
    3. Delete item from shopping_list collection
    If any step fails, entire transaction rolls back automatically.
    """
    object_id = validate_object_id(id, "shopping item")
    
    # Get MongoDB client for transaction
    client = db.client
    
    try:
        # Start a transaction to ensure atomic operation
        with client.start_session() as session:
            with session.start_transaction():
                # Step 1: Find and validate item exists
                item = shopping_list.find_one({"_id": object_id}, session=session)
                if not item:
                    raise HTTPException(404, "Shopping item not found")
                
                # Step 2: Create inventory item with purchase metadata
                inventory_item = {
                    "name": item["name"],
                    "quantity": item.get("quantity"),
                    "amount": item.get("amount", 1.0),
                    "unit": item.get("unit", "unit"),
                    "category": item.get("category"),
                    "purchasedAt": datetime.utcnow().isoformat(),
                    "purchasedBy": purchasedBy,
                    # Preserve nutrition data if available
                    "barcode": item.get("barcode"),
                    "calories": item.get("calories"),
                    "protein": item.get("protein"),
                    "carbs": item.get("carbs"),
                    "fat": item.get("fat"),
                    "servingSize": item.get("servingSize")
                }
                
                # Add to inventory collection
                items_owned.insert_one(inventory_item, session=session)
                
                # Step 3: Remove from shopping list collection
                shopping_list.delete_one({"_id": object_id}, session=session)
                
                # If we get here, commit the transaction
                # If any step fails, transaction automatically rolls back
        
        return {"message": "Item marked as bought and moved to inventory"}
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except PyMongoError as e:
        # Database error - transaction automatically rolled back
        raise HTTPException(
            status_code=503, 
            detail=f"Database error while moving item: {str(e)}"
        )
    except Exception as e:
        # Any other error
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to mark item as bought: {str(e)}"
        )


# === Barcode Lookup Endpoint ===

@app.get("/barcode/{barcode}")
@limiter.limit("10/minute")
async def lookup_barcode(request: Request, barcode: str):
    """
    Look up product information by barcode using Open Food Facts API.
    Returns nutrition data, product name, and other details.
    
    Args:
        barcode - Product barcode (UPC/EAN-13, typically 8-13 digits)
    
    Returns:
        {
            "found": bool,
            "product": {
                "name": str,
                "brand": str,
                "barcode": str,
                "calories": float (per 100g/ml),
                "protein": float (per 100g/ml),
                "carbs": float (per 100g/ml),
                "fat": float (per 100g/ml),
                "servingSize": str,
                "imageUrl": str,
                "category": str
            }
        }
    """
    # Validate barcode format
    if not barcode.isdigit() or len(barcode) < 8 or len(barcode) > 13:
        raise HTTPException(
            status_code=400, 
            detail="Invalid barcode format. Must be 8-13 digits."
        )
    
    try:
        # Query Open Food Facts API
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://world.openfoodfacts.org/api/v2/product/{barcode}",
                headers={"User-Agent": "RecipeBookApp/1.0"}
            )
        
        if response.status_code != 200:
            return {"found": False, "message": "Product not found in database"}
        
        data = response.json()
        
        # Check if product exists
        if data.get("status") != 1 or "product" not in data:
            return {"found": False, "message": "Product not found"}
        
        product_data = data["product"]
        
        # Extract nutrition info (per 100g/100ml)
        nutriments = product_data.get("nutriments", {})
        
        # Build response with available data
        product_info = {
            "name": product_data.get("product_name", "Unknown Product"),
            "brand": product_data.get("brands", ""),
            "barcode": barcode,
            "calories": nutriments.get("energy-kcal_100g", 0),
            "protein": nutriments.get("proteins_100g", 0),
            "carbs": nutriments.get("carbohydrates_100g", 0),
            "fat": nutriments.get("fat_100g", 0),
            "servingSize": product_data.get("serving_size", "100g"),
            "imageUrl": product_data.get("image_url", ""),
            "category": product_data.get("categories", "")
        }
        
        return {"found": True, "product": product_info}
    
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, 
            detail="Barcode lookup service timeout. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503, 
            detail=f"Failed to connect to barcode lookup service: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error looking up barcode: {str(e)}"
        )


# === Inventory (Items Owned) Endpoints ===

@app.get("/inventory")
@limiter.limit("30/minute")
def get_inventory(request: Request):
    """
    Get all items currently in inventory (what you have in stock).
    Returns: Array of inventory items with _id as string
    """
    items = list(items_owned.find())
    # Convert ObjectId to string for JSON serialization
    for item in items:
        item["_id"] = str(item["_id"])
    return items

@app.post("/inventory")
@limiter.limit("20/minute")
def add_inventory_item(request: Request, item: InventoryItem):
    """
    Add an item directly to inventory (without going through shopping list).
    Useful for adding items you already own.
    
    Args: item - InventoryItem with name, quantity, and optional metadata
    Returns: {"id": "<item_id>", "message": "Item added to inventory"}
    """
    item_dict = model_to_dict(item)
    # Add timestamp if not provided
    if not item_dict.get("purchasedAt"):
        item_dict["purchasedAt"] = datetime.utcnow().isoformat()
    inserted = items_owned.insert_one(item_dict)
    return {"id": str(inserted.inserted_id), "message": "Item added to inventory"}

@app.put("/inventory/{id}")
@limiter.limit("20/minute")
def update_inventory_item(request: Request, id: str, item: InventoryItem):
    """
    Update an existing inventory item (e.g., adjust quantity).
    Args:
        id - Item's MongoDB ObjectId as string
        item - Updated inventory item data
    Returns: {"message": "Inventory item updated"}
    """
    object_id = validate_object_id(id, "inventory item")
    result = items_owned.update_one(
        {"_id": object_id}, 
        {"$set": model_to_dict(item)}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Inventory item not found")
    return {"message": "Inventory item updated"}

@app.delete("/inventory/{id}")
@limiter.limit("20/minute")
def delete_inventory_item(request: Request, id: str):
    """
    Remove an item from inventory (item has been used up or discarded).
    Args: id - Item's MongoDB ObjectId as string
    Returns: {"message": "Inventory item removed"}
    """
    object_id = validate_object_id(id, "inventory item")
    result = items_owned.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Inventory item not found")
    return {"message": "Inventory item removed"}


# === New Inventory Management Endpoints ===

class ConsumeIngredientRequest(BaseModel):
    """Request to consume/use ingredients from inventory"""
    ingredientName: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0, le=10000)
    unit: str = Field(..., min_length=1, max_length=20)
    
    @field_validator('unit')
    @classmethod
    def validate_unit(cls, v: str) -> str:
        """Validate unit is from allowed list"""
        allowed_units = ['kg', 'g', 'L', 'ml', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'unit', 'piece']
        v_lower = v.lower().strip()
        if v_lower not in allowed_units:
            raise ValueError(f'Unit must be one of: {", ".join(allowed_units)}')
        return v_lower

class ConsumeRecipeRequest(BaseModel):
    """Request to consume all ingredients needed for a recipe"""
    recipeId: str = Field(..., min_length=1)
    servingsMultiplier: Optional[float] = Field(1.0, gt=0, le=10)  # Scale recipe (e.g., 2.0 for double)

class UpdateInventoryAmountRequest(BaseModel):
    """Request to manually update inventory amount"""
    amount: float = Field(..., gt=0, le=10000)

@app.post("/inventory/consume-ingredient")
@limiter.limit("20/minute")
def consume_ingredient(request: Request, consumeRequest: ConsumeIngredientRequest):
    """
    Consume (subtract) an ingredient from inventory.
    Automatically removes item if amount reaches 0 or below.
    Returns low stock warning if threshold is crossed.
    
    Args:
        consumeRequest - Ingredient name, amount to consume, and unit
    
    Returns: {
        "message": "Consumed X unit from ingredient",
        "remainingAmount": float,
        "removed": bool,  # True if item was auto-removed (reached 0)
        "lowStock": bool,  # True if below threshold
        "lowStockThreshold": float  # If lowStock is true
    }
    """
    ingredient_name = consumeRequest.ingredientName.strip().lower()
    amount_to_consume = consumeRequest.amount
    unit = consumeRequest.unit.lower()
    
    # Find inventory item by name (case-insensitive)
    item = items_owned.find_one({"name": {"$regex": f"^{ingredient_name}$", "$options": "i"}})
    
    if not item:
        raise HTTPException(404, f"Ingredient '{consumeRequest.ingredientName}' not found in inventory")
    
    # Check if units match
    if item.get("unit", "").lower() != unit:
        raise HTTPException(
            400, 
            f"Unit mismatch: '{consumeRequest.ingredientName}' is stored in '{item.get('unit')}', but you're trying to consume in '{unit}'"
        )
    
    current_amount = item.get("amount", 0)
    new_amount = current_amount - amount_to_consume
    
    response = {
        "message": f"Consumed {amount_to_consume}{unit} from {consumeRequest.ingredientName}",
        "previousAmount": current_amount,
        "consumedAmount": amount_to_consume,
        "remainingAmount": new_amount,
        "removed": False,
        "lowStock": False
    }
    
    # If amount reaches 0 or below, remove from inventory
    if new_amount <= 0:
        items_owned.delete_one({"_id": item["_id"]})
        response["removed"] = True
        response["remainingAmount"] = 0
        response["message"] = f"Consumed all {consumeRequest.ingredientName} - removed from inventory"
    else:
        # Update amount in inventory
        items_owned.update_one(
            {"_id": item["_id"]},
            {"$set": {"amount": new_amount}}
        )
        
        # Check if low stock threshold crossed
        low_stock_threshold = item.get("lowStockThreshold")
        if low_stock_threshold and new_amount <= low_stock_threshold:
            response["lowStock"] = True
            response["lowStockThreshold"] = low_stock_threshold
            response["message"] += f" ⚠️ LOW STOCK WARNING: Only {new_amount}{unit} remaining (threshold: {low_stock_threshold}{unit})"
    
    return response

@app.post("/inventory/consume-recipe/{recipe_id}")
@limiter.limit("20/minute")
def consume_recipe(request: Request, recipe_id: str, consumeRequest: Optional[ConsumeRecipeRequest] = None):
    """
    Consume all ingredients needed for a recipe from inventory.
    Automatically subtracts ingredient amounts and removes items that reach 0.
    Returns warnings for missing ingredients or low stock.
    
    Args:
        recipe_id - MongoDB ObjectId of the recipe
        consumeRequest - Optional servings multiplier (default 1.0)
    
    Returns: {
        "message": "Successfully consumed ingredients for recipe",
        "consumed": [...],  # List of consumed ingredients
        "lowStock": [...],  # List of ingredients now below threshold
        "removed": [...],  # List of ingredients removed (reached 0)
        "missing": [...],  # List of ingredients not found in inventory
        "warnings": [...]   # All warning messages combined
    }
    """
    object_id = validate_object_id(recipe_id, "recipe")
    
    # Get recipe
    recipe = recipes.find_one({"_id": object_id})
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    
    # Get servings multiplier (default 1.0)
    multiplier = 1.0
    if consumeRequest:
        multiplier = consumeRequest.servingsMultiplier
    
    # Check if recipe has detailed ingredients
    ingredients_detailed = recipe.get("ingredientsDetailed", [])
    if not ingredients_detailed:
        raise HTTPException(
            400, 
            "Recipe does not have detailed ingredient measurements. Please update recipe with ingredientsDetailed field."
        )
    
    response = {
        "message": f"Processing recipe: {recipe['name']}",
        "consumed": [],
        "lowStock": [],
        "removed": [],
        "missing": [],
        "warnings": []
    }
    
    # Process each ingredient
    for ingredient in ingredients_detailed:
        ingredient_name = ingredient["name"]
        amount_needed = ingredient["amount"] * multiplier
        unit = ingredient["unit"]
        
        # Find in inventory (case-insensitive)
        item = items_owned.find_one({"name": {"$regex": f"^{ingredient_name}$", "$options": "i"}})
        
        if not item:
            response["missing"].append({
                "name": ingredient_name,
                "needed": amount_needed,
                "unit": unit
            })
            response["warnings"].append(f"❌ Missing: {ingredient_name} ({amount_needed}{unit} needed)")
            continue
        
        # Check unit compatibility
        if item.get("unit", "").lower() != unit.lower():
            response["warnings"].append(
                f"⚠️ Unit mismatch: {ingredient_name} needs {unit} but inventory has {item.get('unit')}"
            )
            continue
        
        current_amount = item.get("amount", 0)
        
        # Check if we have enough
        if current_amount < amount_needed:
            response["warnings"].append(
                f"⚠️ Insufficient: {ingredient_name} (need {amount_needed}{unit}, have {current_amount}{unit})"
            )
            # Still consume what we have
            amount_needed = current_amount
        
        new_amount = current_amount - amount_needed
        
        consumed_info = {
            "name": ingredient_name,
            "consumed": amount_needed,
            "unit": unit,
            "remaining": new_amount
        }
        
        # Remove if reaches 0
        if new_amount <= 0:
            items_owned.delete_one({"_id": item["_id"]})
            consumed_info["removed"] = True
            response["removed"].append(ingredient_name)
            response["warnings"].append(f"🗑️ Removed: {ingredient_name} (used up completely)")
        else:
            # Update amount
            items_owned.update_one(
                {"_id": item["_id"]},
                {"$set": {"amount": new_amount}}
            )
            
            # Check low stock
            low_stock_threshold = item.get("lowStockThreshold")
            if low_stock_threshold and new_amount <= low_stock_threshold:
                consumed_info["lowStock"] = True
                consumed_info["threshold"] = low_stock_threshold
                response["lowStock"].append({
                    "name": ingredient_name,
                    "remaining": new_amount,
                    "threshold": low_stock_threshold,
                    "unit": unit
                })
                response["warnings"].append(
                    f"⚠️ LOW STOCK: {ingredient_name} ({new_amount}{unit} remaining, threshold: {low_stock_threshold}{unit})"
                )
        
        response["consumed"].append(consumed_info)
    
    # Update summary message
    if response["consumed"]:
        response["message"] = f"Successfully consumed ingredients for '{recipe['name']}'"
    else:
        response["message"] = f"Could not consume any ingredients for '{recipe['name']}'"
    
    return response

@app.get("/inventory/low-stock")
@limiter.limit("30/minute")
def get_low_stock_items(request: Request):
    """
    Get all inventory items that are below their low stock threshold.
    Useful for generating shopping lists or alerts.
    
    Returns: Array of items below threshold with details:
    [{
        "_id": "...",
        "name": "chicken",
        "amount": 0.5,
        "unit": "kg",
        "lowStockThreshold": 1.0,
        "percentRemaining": 50.0
    }]
    """
    # Find all items where amount <= lowStockThreshold
    low_stock_items = []
    
    for item in items_owned.find():
        threshold = item.get("lowStockThreshold")
        amount = item.get("amount", 0)
        
        if threshold and amount <= threshold:
            low_stock_items.append({
                "_id": str(item["_id"]),
                "name": item["name"],
                "amount": amount,
                "unit": item.get("unit", ""),
                "lowStockThreshold": threshold,
                "percentRemaining": (amount / threshold * 100) if threshold > 0 else 0,
                "category": item.get("category"),
                "purchasedAt": item.get("purchasedAt")
            })
    
    return {
        "lowStockItems": low_stock_items,
        "count": len(low_stock_items)
    }

@app.patch("/inventory/{id}/amount")
@limiter.limit("30/minute")
def update_inventory_amount(request: Request, id: str, updateRequest: UpdateInventoryAmountRequest):
    """
    Manually update the amount of an inventory item.
    Useful for corrections or adding more of an existing item.
    Automatically removes item if amount set to 0 or below.
    
    Args:
        id - Inventory item's MongoDB ObjectId as string
        updateRequest - New amount value
    
    Returns: {
        "message": "Updated amount",
        "previousAmount": float,
        "newAmount": float,
        "removed": bool,
        "lowStock": bool
    }
    """
    object_id = validate_object_id(id, "inventory item")
    
    item = items_owned.find_one({"_id": object_id})
    if not item:
        raise HTTPException(404, "Inventory item not found")
    
    previous_amount = item.get("amount", 0)
    new_amount = updateRequest.amount
    
    response = {
        "message": f"Updated {item['name']} amount",
        "previousAmount": previous_amount,
        "newAmount": new_amount,
        "removed": False,
        "lowStock": False
    }
    
    # Remove if set to 0 or below
    if new_amount <= 0:
        items_owned.delete_one({"_id": object_id})
        response["removed"] = True
        response["message"] = f"Removed {item['name']} from inventory (amount set to 0)"
    else:
        # Update amount
        items_owned.update_one(
            {"_id": object_id},
            {"$set": {"amount": new_amount}}
        )
        
        # Check low stock
        threshold = item.get("lowStockThreshold")
        if threshold and new_amount <= threshold:
            response["lowStock"] = True
            response["lowStockThreshold"] = threshold
            response["message"] += f" ⚠️ LOW STOCK: {new_amount}{item.get('unit', '')} (threshold: {threshold})"
    
    return response


# === Nutrition Tracking Endpoints ===

@app.post("/nutrition/log")
@limiter.limit("30/minute")
def log_meal(request: Request, meal: MealLog):
    """
    Log a meal with nutritional information.
    Tracks calories, macros (protein, carbs, fat), and micronutrients.
    
    Args:
        meal - MealLog with user, date, meal type, nutrition info
    
    Returns: {"id": "<meal_log_id>", "message": "Meal logged successfully"}
    """
    meal_dict = model_to_dict(meal)
    # Add server timestamp
    meal_dict["loggedAt"] = datetime.utcnow().isoformat()
    
    inserted = nutrition_logs.insert_one(meal_dict)
    return {
        "id": str(inserted.inserted_id),
        "message": "Meal logged successfully"
    }

@app.get("/nutrition/logs/{user}")
@limiter.limit("30/minute")
def get_nutrition_logs(
    request: Request,
    user: str,
    date: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None
):
    """
    Get nutrition logs for a user.
    Can filter by single date or date range.
    
    Args:
        user - Username
        date - Single date (YYYY-MM-DD) - returns logs for that day
        startDate - Start of date range (YYYY-MM-DD)
        endDate - End of date range (YYYY-MM-DD)
    
    Returns: Array of meal logs with _id as string
    """
    query = {"user": user}
    
    if date:
        # Single date query
        query["date"] = {"$regex": f"^{date}"}
    elif startDate and endDate:
        # Date range query
        query["date"] = {"$gte": startDate, "$lte": endDate}
    elif startDate:
        # From start date onwards
        query["date"] = {"$gte": startDate}
    elif endDate:
        # Up to end date
        query["date"] = {"$lte": endDate}
    
    logs = list(nutrition_logs.find(query).sort("date", -1))  # Sort by date descending
    
    # Convert ObjectId to string
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return logs

@app.get("/nutrition/daily-summary/{user}/{date}")
@limiter.limit("30/minute")
def get_daily_nutrition_summary(request: Request, user: str, date: str):
    """
    Get daily nutrition summary for a user on a specific date.
    Aggregates all meals for the day and compares to goals.
    
    Args:
        user - Username
        date - Date (YYYY-MM-DD)
    
    Returns: {
        "date": "2025-12-20",
        "totalCalories": 1850,
        "totalProtein": 95,
        "totalCarbs": 200,
        "totalFat": 60,
        "totalFiber": 25,
        "totalSugar": 45,
        "totalSodium": 1800,
        "meals": [...],
        "mealCount": 4,
        "goals": {...} or null,
        "progress": {...} or null
    }
    """
    # Get all meals for the date
    meals = list(nutrition_logs.find({
        "user": user,
        "date": {"$regex": f"^{date}"}
    }).sort("date", 1))
    
    # Calculate totals
    totals = {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0,
        "sugar": 0,
        "sodium": 0
    }
    
    for meal in meals:
        nutrition = meal.get("nutrition", {})
        totals["calories"] += nutrition.get("calories", 0)
        totals["protein"] += nutrition.get("protein", 0)
        totals["carbs"] += nutrition.get("carbs", 0)
        totals["fat"] += nutrition.get("fat", 0)
        totals["fiber"] += nutrition.get("fiber", 0) or 0
        totals["sugar"] += nutrition.get("sugar", 0) or 0
        totals["sodium"] += nutrition.get("sodium", 0) or 0
        meal["_id"] = str(meal["_id"])
    
    # Get user's goals
    goals_doc = user_nutrition_goals.find_one({"user": user})
    goals = None
    progress = None
    
    if goals_doc:
        goals = {
            "dailyCalories": goals_doc.get("dailyCalories"),
            "dailyProtein": goals_doc.get("dailyProtein"),
            "dailyCarbs": goals_doc.get("dailyCarbs"),
            "dailyFat": goals_doc.get("dailyFat"),
            "dailyFiber": goals_doc.get("dailyFiber"),
            "dailySugar": goals_doc.get("dailySugar"),
            "dailySodium": goals_doc.get("dailySodium")
        }
        
        # Calculate progress percentages
        progress = {
            "caloriesPercent": (totals["calories"] / goals["dailyCalories"] * 100) if goals["dailyCalories"] > 0 else 0,
            "proteinPercent": (totals["protein"] / goals["dailyProtein"] * 100) if goals["dailyProtein"] > 0 else 0,
            "carbsPercent": (totals["carbs"] / goals["dailyCarbs"] * 100) if goals["dailyCarbs"] > 0 else 0,
            "fatPercent": (totals["fat"] / goals["dailyFat"] * 100) if goals["dailyFat"] > 0 else 0,
            "remaining": {
                "calories": goals["dailyCalories"] - totals["calories"],
                "protein": goals["dailyProtein"] - totals["protein"],
                "carbs": goals["dailyCarbs"] - totals["carbs"],
                "fat": goals["dailyFat"] - totals["fat"]
            }
        }
    
    return {
        "date": date,
        "totalCalories": totals["calories"],
        "totalProtein": totals["protein"],
        "totalCarbs": totals["carbs"],
        "totalFat": totals["fat"],
        "totalFiber": totals["fiber"],
        "totalSugar": totals["sugar"],
        "totalSodium": totals["sodium"],
        "meals": meals,
        "mealCount": len(meals),
        "goals": goals,
        "progress": progress
    }

@app.put("/nutrition/log/{id}")
@limiter.limit("20/minute")
def update_meal_log(request: Request, id: str, meal: MealLog):
    """
    Update an existing meal log.
    Args:
        id - Meal log's MongoDB ObjectId
        meal - Updated meal data
    Returns: {"message": "Meal log updated"}
    """
    object_id = validate_object_id(id, "meal log")
    result = nutrition_logs.update_one(
        {"_id": object_id},
        {"$set": model_to_dict(meal)}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Meal log not found")
    return {"message": "Meal log updated"}

@app.delete("/nutrition/log/{id}")
@limiter.limit("20/minute")
def delete_meal_log(request: Request, id: str):
    """
    Delete a meal log.
    Args: id - Meal log's MongoDB ObjectId
    Returns: {"message": "Meal log deleted"}
    """
    object_id = validate_object_id(id, "meal log")
    result = nutrition_logs.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Meal log not found")
    return {"message": "Meal log deleted"}

@app.post("/nutrition/goals")
@limiter.limit("10/minute")
def set_nutrition_goals(request: Request, goals: UserNutritionGoals):
    """
    Set or update nutrition goals for a user.
    Creates new goals or updates existing ones.
    
    Args:
        goals - UserNutritionGoals with daily targets
    
    Returns: {"message": "Nutrition goals updated"}
    """
    # Upsert (update if exists, insert if not)
    result = user_nutrition_goals.update_one(
        {"user": goals.user},
        {"$set": model_to_dict(goals)},
        upsert=True
    )
    
    if result.upserted_id:
        return {"message": "Nutrition goals created", "id": str(result.upserted_id)}
    else:
        return {"message": "Nutrition goals updated"}

@app.get("/nutrition/goals/{user}")
@limiter.limit("30/minute")
def get_nutrition_goals(request: Request, user: str):
    """
    Get nutrition goals for a user.
    
    Args:
        user - Username
    
    Returns: UserNutritionGoals or 404 if not set
    """
    goals = user_nutrition_goals.find_one({"user": user})
    if not goals:
        raise HTTPException(404, "Nutrition goals not found for this user")
    
    goals["_id"] = str(goals["_id"])
    return goals

@app.get("/nutrition/weekly-summary/{user}")
@limiter.limit("20/minute")
def get_weekly_nutrition_summary(
    request: Request,
    user: str,
    endDate: Optional[str] = None
):
    """
    Get 7-day nutrition summary for a user.
    Shows daily totals and averages for the week.
    
    Args:
        user - Username
        endDate - End date (YYYY-MM-DD), defaults to today
    
    Returns: {
        "weekStart": "2025-12-14",
        "weekEnd": "2025-12-20",
        "dailySummaries": [...],
        "weeklyAverages": {...},
        "weeklyTotals": {...}
    }
    """
    from datetime import datetime, timedelta
    
    # Parse end date or use today
    if endDate:
        end = datetime.fromisoformat(endDate.split('T')[0])
    else:
        end = datetime.utcnow()
    
    # Calculate start date (7 days before end)
    start = end - timedelta(days=6)
    
    start_str = start.strftime('%Y-%m-%d')
    end_str = end.strftime('%Y-%m-%d')
    
    # Get all meals in the date range
    meals = list(nutrition_logs.find({
        "user": user,
        "date": {"$gte": start_str, "$lte": end_str}
    }).sort("date", 1))
    
    # Group by date
    daily_data = {}
    for i in range(7):
        current_date = start + timedelta(days=i)
        date_str = current_date.strftime('%Y-%m-%d')
        daily_data[date_str] = {
            "date": date_str,
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0,
            "mealCount": 0
        }
    
    for meal in meals:
        date_key = meal["date"].split('T')[0]
        if date_key in daily_data:
            nutrition = meal.get("nutrition", {})
            daily_data[date_key]["calories"] += nutrition.get("calories", 0)
            daily_data[date_key]["protein"] += nutrition.get("protein", 0)
            daily_data[date_key]["carbs"] += nutrition.get("carbs", 0)
            daily_data[date_key]["fat"] += nutrition.get("fat", 0)
            daily_data[date_key]["mealCount"] += 1
    
    # Calculate weekly totals and averages
    daily_summaries = list(daily_data.values())
    
    total_calories = sum(d["calories"] for d in daily_summaries)
    total_protein = sum(d["protein"] for d in daily_summaries)
    total_carbs = sum(d["carbs"] for d in daily_summaries)
    total_fat = sum(d["fat"] for d in daily_summaries)
    
    return {
        "weekStart": start_str,
        "weekEnd": end_str,
        "dailySummaries": daily_summaries,
        "weeklyAverages": {
            "calories": total_calories / 7,
            "protein": total_protein / 7,
            "carbs": total_carbs / 7,
            "fat": total_fat / 7
        },
        "weeklyTotals": {
            "calories": total_calories,
            "protein": total_protein,
            "carbs": total_carbs,
            "fat": total_fat
        }
    }


# === User Account Management Endpoints ===

@app.post("/accounts/create")
@limiter.limit("10/minute")
async def create_account(request: Request, account: UserAccount):
    """
    Create a new user account with health metrics.
    Calculates BMR, BMI, and recommended daily calories based on user data.
    Rate limited to prevent spam account creation.
    
    Args:
        account: UserAccount with username, age, gender, weight, height, activity level
    
    Returns:
        Account details with calculated BMR, BMI, and recommended calories
    """
    try:
        # Check if username already exists
        existing = user_accounts.find_one({"username": account.username.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Calculate health metrics
        bmr = calculate_bmr(account.weight, account.height, account.age, account.gender)
        bmi = calculate_bmi(account.weight, account.height)
        daily_calories = calculate_daily_calories(bmr, account.activityLevel)
        bmi_category = get_bmi_category(bmi)
        
        # Prepare account document
        account_dict = account.model_dump()
        account_dict["createdAt"] = datetime.now().isoformat()
        account_dict["updatedAt"] = datetime.now().isoformat()
        account_dict["bmr"] = bmr
        account_dict["bmi"] = bmi
        account_dict["bmiCategory"] = bmi_category
        account_dict["recommendedDailyCalories"] = daily_calories
        
        # Insert into database
        result = user_accounts.insert_one(account_dict)
        
        # Also create initial weight entry
        initial_weight = {
            "username": account.username.lower(),
            "weight": account.weight,
            "date": datetime.now().strftime('%Y-%m-%d'),
            "notes": "Initial weight"
        }
        weight_tracking.insert_one(initial_weight)
        
        # Automatically set nutrition goals based on calculated calories
        # Default macro split: 30% protein, 40% carbs, 30% fat
        protein_cals = daily_calories * 0.30
        carbs_cals = daily_calories * 0.40
        fat_cals = daily_calories * 0.30
        
        nutrition_goals = {
            "user": account.username.lower(),
            "dailyCalories": daily_calories,
            "dailyProtein": protein_cals / 4,  # 4 calories per gram of protein
            "dailyCarbs": carbs_cals / 4,  # 4 calories per gram of carbs
            "dailyFat": fat_cals / 9,  # 9 calories per gram of fat
            "dailyFiber": 25.0,  # Recommended daily fiber
            "dailySugar": 50.0,  # Max recommended sugar
            "dailySodium": 2300.0  # Max recommended sodium (mg)
        }
        user_nutrition_goals.insert_one(nutrition_goals)
        
        return {
            "id": str(result.inserted_id),
            "message": "Account created successfully",
            "username": account.username.lower(),
            "bmr": bmr,
            "bmi": bmi,
            "bmiCategory": bmi_category,
            "recommendedDailyCalories": daily_calories
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating account: {str(e)}")


@app.get("/accounts/{username}")
@limiter.limit("30/minute")
async def get_account(request: Request, username: str):
    """
    Get user account details including calculated health metrics.
    
    Args:
        username: Username to retrieve
    
    Returns:
        Complete account information with BMR, BMI, and recommended calories
    """
    try:
        account = user_accounts.find_one({"username": username.lower()})
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        account["_id"] = str(account["_id"])
        return account
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching account: {str(e)}")


@app.put("/accounts/{username}")
@limiter.limit("20/minute")
async def update_account(request: Request, username: str, account: UserAccount):
    """
    Update user account and recalculate health metrics.
    Useful when user's weight, height, age, or activity level changes.
    
    Args:
        username: Username to update
        account: Updated account data
    
    Returns:
        Updated account with recalculated BMR, BMI, and calories
    """
    try:
        # Ensure username matches
        if username.lower() != account.username.lower():
            raise HTTPException(status_code=400, detail="Username mismatch")
        
        # Check if account exists
        existing = user_accounts.find_one({"username": username.lower()})
        if not existing:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Recalculate health metrics
        bmr = calculate_bmr(account.weight, account.height, account.age, account.gender)
        bmi = calculate_bmi(account.weight, account.height)
        daily_calories = calculate_daily_calories(bmr, account.activityLevel)
        bmi_category = get_bmi_category(bmi)
        
        # Prepare update document
        account_dict = account.model_dump()
        account_dict["updatedAt"] = datetime.now().isoformat()
        account_dict["bmr"] = bmr
        account_dict["bmi"] = bmi
        account_dict["bmiCategory"] = bmi_category
        account_dict["recommendedDailyCalories"] = daily_calories
        # Keep original createdAt
        account_dict["createdAt"] = existing.get("createdAt")
        
        # Update in database
        user_accounts.update_one(
            {"username": username.lower()},
            {"$set": account_dict}
        )
        
        # If weight changed, add new weight entry
        if account.weight != existing.get("weight"):
            weight_entry = {
                "username": username.lower(),
                "weight": account.weight,
                "date": datetime.now().strftime('%Y-%m-%d'),
                "notes": "Weight updated from account profile"
            }
            weight_tracking.insert_one(weight_entry)
        
        # Update nutrition goals based on new calorie recommendations
        protein_cals = daily_calories * 0.30
        carbs_cals = daily_calories * 0.40
        fat_cals = daily_calories * 0.30
        
        user_nutrition_goals.update_one(
            {"user": username.lower()},
            {"$set": {
                "dailyCalories": daily_calories,
                "dailyProtein": protein_cals / 4,
                "dailyCarbs": carbs_cals / 4,
                "dailyFat": fat_cals / 9
            }},
            upsert=True
        )
        
        return {
            "message": "Account updated successfully",
            "username": username.lower(),
            "bmr": bmr,
            "bmi": bmi,
            "bmiCategory": bmi_category,
            "recommendedDailyCalories": daily_calories
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating account: {str(e)}")


@app.delete("/accounts/{username}")
@limiter.limit("10/minute")
async def delete_account(request: Request, username: str):
    """
    Delete user account and all associated data.
    
    Args:
        username: Username to delete
    
    Returns:
        Confirmation message
    """
    try:
        result = user_accounts.delete_one({"username": username.lower()})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Also delete associated data
        weight_tracking.delete_many({"username": username.lower()})
        nutrition_logs.delete_many({"user": username.lower()})
        user_nutrition_goals.delete_one({"user": username.lower()})
        
        return {"message": "Account and all associated data deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting account: {str(e)}")


# === Weight Tracking Endpoints ===

@app.post("/weight/log")
@limiter.limit("30/minute")
async def log_weight(request: Request, entry: WeightEntry):
    """
    Log a weight measurement for monthly tracking.
    
    Args:
        entry: WeightEntry with username, weight, date, and optional notes
    
    Returns:
        Confirmation with entry ID
    """
    try:
        # Check if account exists
        account = user_accounts.find_one({"username": entry.username.lower()})
        if not account:
            raise HTTPException(status_code=404, detail="Account not found. Create an account first.")
        
        # Insert weight entry
        entry_dict = entry.model_dump()
        result = weight_tracking.insert_one(entry_dict)
        
        # Update current weight in user account
        user_accounts.update_one(
            {"username": entry.username.lower()},
            {"$set": {
                "weight": entry.weight,
                "updatedAt": datetime.now().isoformat()
            }}
        )
        
        # Recalculate BMI with new weight
        bmi = calculate_bmi(entry.weight, account["height"])
        bmi_category = get_bmi_category(bmi)
        
        user_accounts.update_one(
            {"username": entry.username.lower()},
            {"$set": {
                "bmi": bmi,
                "bmiCategory": bmi_category
            }}
        )
        
        return {
            "id": str(result.inserted_id),
            "message": "Weight logged successfully",
            "newBmi": bmi,
            "bmiCategory": bmi_category
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging weight: {str(e)}")


@app.get("/weight/{username}")
@limiter.limit("30/minute")
async def get_weight_history(request: Request, username: str, startDate: Optional[str] = None, endDate: Optional[str] = None):
    """
    Get weight tracking history for a user.
    
    Args:
        username: Username to retrieve history for
        startDate: Optional start date filter (YYYY-MM-DD)
        endDate: Optional end date filter (YYYY-MM-DD)
    
    Returns:
        List of weight entries with calculated weight change
    """
    try:
        # Build query
        query = {"username": username.lower()}
        
        if startDate or endDate:
            query["date"] = {}
            if startDate:
                query["date"]["$gte"] = startDate
            if endDate:
                query["date"]["$lte"] = endDate
        
        # Get entries sorted by date
        entries = list(weight_tracking.find(query).sort("date", 1))
        
        if not entries:
            return []
        
        # Convert ObjectId to string and calculate changes
        for i, entry in enumerate(entries):
            entry["_id"] = str(entry["_id"])
            
            # Calculate weight change from previous entry
            if i > 0:
                prev_weight = entries[i-1]["weight"]
                weight_change = entry["weight"] - prev_weight
                entry["weightChange"] = round(weight_change, 2)
                entry["weightChangePercentage"] = round((weight_change / prev_weight) * 100, 2)
            else:
                entry["weightChange"] = 0
                entry["weightChangePercentage"] = 0
        
        return entries
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weight history: {str(e)}")


@app.delete("/weight/{id}")
@limiter.limit("20/minute")
async def delete_weight_entry(request: Request, id: str):
    """
    Delete a weight tracking entry.
    
    Args:
        id: Entry ID to delete
    
    Returns:
        Confirmation message
    """
    try:
        entry_id = validate_object_id(id, "weight entry")
        result = weight_tracking.delete_one({"_id": entry_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Weight entry not found")
        
        return {"message": "Weight entry deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting weight entry: {str(e)}")


@app.get("/weight/{username}/stats")
@limiter.limit("30/minute")
async def get_weight_stats(request: Request, username: str):
    """
    Get weight tracking statistics including total loss/gain, average monthly change, etc.
    
    Args:
        username: Username to calculate stats for
    
    Returns:
        Statistics object with weight trends
    """
    try:
        # Get all weight entries for user
        entries = list(weight_tracking.find({"username": username.lower()}).sort("date", 1))
        
        if len(entries) < 2:
            return {
                "message": "Not enough data for statistics. Log at least 2 weight entries.",
                "entryCount": len(entries)
            }
        
        # Calculate statistics
        first_entry = entries[0]
        last_entry = entries[-1]
        
        total_change = last_entry["weight"] - first_entry["weight"]
        total_change_percentage = (total_change / first_entry["weight"]) * 100
        
        # Calculate date range in months
        from datetime import datetime
        first_date = datetime.fromisoformat(first_entry["date"].split('T')[0])
        last_date = datetime.fromisoformat(last_entry["date"].split('T')[0])
        months_tracked = ((last_date.year - first_date.year) * 12 + last_date.month - first_date.month)
        if months_tracked == 0:
            months_tracked = 1
        
        avg_monthly_change = total_change / months_tracked
        
        # Find highest and lowest weights
        weights = [e["weight"] for e in entries]
        highest_weight = max(weights)
        lowest_weight = min(weights)
        
        # Current weight trend (last 3 entries)
        if len(entries) >= 3:
            recent_entries = entries[-3:]
            recent_trend = recent_entries[-1]["weight"] - recent_entries[0]["weight"]
            if recent_trend > 0:
                trend = "gaining"
            elif recent_trend < 0:
                trend = "losing"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
        
        return {
            "username": username.lower(),
            "firstWeight": first_entry["weight"],
            "currentWeight": last_entry["weight"],
            "totalChange": round(total_change, 2),
            "totalChangePercentage": round(total_change_percentage, 2),
            "monthsTracked": months_tracked,
            "averageMonthlyChange": round(avg_monthly_change, 2),
            "highestWeight": highest_weight,
            "lowestWeight": lowest_weight,
            "currentTrend": trend,
            "entryCount": len(entries),
            "firstDate": first_entry["date"],
            "lastDate": last_entry["date"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating weight stats: {str(e)}")


