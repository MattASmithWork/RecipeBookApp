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
from typing import Optional, List, Dict
from datetime import datetime, timezone, timezone
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
gut_health_logs = db["gut_health_logs"]  # Gut health symptoms and tracking data


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
    ingredients: List[str] = Field(..., min_length=1, max_length=100)  # Legacy format: ["2kg chicken", "1L milk"]
    ingredientsDetailed: Optional[List[RecipeIngredient]] = None  # New format with measurements
    instructions: List[str] = Field(..., min_length=1, max_length=100)
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
    bought: Optional[bool] = Field(False)  # Track if item has been purchased
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

class UserAccountUpdate(BaseModel):
    """Partial update model for user account - all fields optional"""
    username: Optional[str] = Field(None, min_length=1, max_length=50, pattern='^[a-zA-Z0-9_]+$')
    displayName: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=200)
    age: Optional[int] = Field(None, ge=1, le=150)
    gender: Optional[str] = Field(None, pattern='^(male|female)$')
    weight: Optional[float] = Field(None, gt=0, le=500)
    height: Optional[float] = Field(None, gt=0, le=300)
    activityLevel: Optional[str] = Field(
        None, 
        pattern='^(sedentary|lightly_active|moderately_active|very_active|extremely_active)$'
    )

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


class GutHealthLog(BaseModel):
    """
    Gut health tracking entry with symptoms, severity, and notes.
    
    Supports tracking:
    - Digestive symptoms (bloating, cramps, diarrhea, constipation, etc.)
    - Bowel movements (Bristol Stool Scale)
    - Mood and energy levels (gut-brain connection)
    - Triggers and notes
    """
    username: str = Field(..., min_length=1, max_length=50)
    date: str = Field(..., min_length=1)  # ISO date string
    
    # Symptom tracking
    symptom_type: str = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="Type of symptom: bloating, cramps, gas, diarrhea, constipation, nausea, heartburn, etc."
    )
    severity: int = Field(..., ge=1, le=10, description="Severity rating from 1 (mild) to 10 (severe)")
    
    # Optional bowel movement tracking (Bristol Stool Scale: 1-7)
    bristol_scale: Optional[int] = Field(None, ge=1, le=7, description="Bristol Stool Scale (1=hard lumps, 7=liquid)")
    
    # Mood and energy (gut-brain connection)
    mood: Optional[str] = Field(None, max_length=50, description="Mood: happy, anxious, stressed, calm, etc.")
    energy_level: Optional[int] = Field(None, ge=1, le=10, description="Energy level 1-10")
    
    # Additional context
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes, potential triggers")
    potential_triggers: Optional[List[str]] = Field(None, description="Foods or activities that may have triggered symptoms")
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Ensure username is lowercase"""
        return v.lower().strip()
    
    @field_validator('symptom_type')
    @classmethod
    def validate_symptom_type(cls, v: str) -> str:
        """Normalize symptom type"""
        return v.lower().strip()


class GutHealthGoals(BaseModel):
    """User's gut health goals and dietary preferences for AI recommendations"""
    username: str = Field(..., min_length=1, max_length=50)
    
    # Goals
    primary_goals: List[str] = Field(
        ..., 
        description="Goals: reduce_bloating, improve_regularity, reduce_cramps, increase_energy, etc."
    )
    
    # Dietary restrictions/preferences
    dietary_restrictions: Optional[List[str]] = Field(
        None, 
        description="Restrictions: lactose_free, gluten_free, vegan, low_fodmap, etc."
    )
    
    # Foods to avoid (known triggers)
    known_trigger_foods: Optional[List[str]] = Field(None, description="Foods user knows cause issues")
    
    # Preferred probiotic sources
    probiotic_preferences: Optional[List[str]] = Field(
        None, 
        description="Preferred probiotics: yogurt, kefir, kombucha, sauerkraut, etc."
    )
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        return v.lower().strip()


# === Recipe Endpoints ===

@app.post("/recipes/")
@limiter.limit("20/minute")
def add_recipe(request: Request, recipe: Recipe):
    """
    Create a new personal recipe.
    Args: recipe - Recipe object with all required fields
    Returns: {"id": "<mongo_object_id>", "message": "Recipe added successfully!"}
    """
    inserted = recipes.insert_one(model_to_dict(recipe))
    return {"id": str(inserted.inserted_id), "message": "Recipe added successfully!"}

@app.get("/recipes/{user}")
@limiter.limit("30/minute")
def get_recipes(request: Request, user: str):
    """
    Get all recipes for a specific user.
    Args: user - Username to filter recipes
    Returns: Object with total_count and recipes list
    """
    data = list(recipes.find({"user": user}))
    # Convert MongoDB ObjectId to string for JSON serialization
    for d in data:
        d["_id"] = str(d["_id"])
    return {
        "total_count": len(data),
        "recipes": data
    }

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
def delete_recipe(request: Request, id: str, user: str):
    """
    Delete a recipe by ID if it belongs to the user.
    Args: 
        id - MongoDB ObjectId as string
        user - Username of recipe owner (for authorization)
    Returns: {"message": "Recipe deleted successfully!"}
    """
    object_id = validate_object_id(id, "recipe")
    result = recipes.delete_one({"_id": object_id, "user": user})
    if result.deleted_count == 0:
        raise HTTPException(404, "Recipe not found or you don't have permission to delete it")
    return {"message": "Recipe deleted successfully!"}

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


@app.get("/github-recipes")
@limiter.limit("5/hour")
async def get_github_recipes(request: Request):
    """
    Alias endpoint for fetching community recipes from GitHub.
    Returns recipes in a standardized format compatible with frontend expectations.
    Rate limited to 5 requests per hour.
    
    Returns: {
        "total_count": int,
        "recipes": [...],
        "statistics": {...}
    }
    """
    # Reuse the existing GitHub fetch logic
    result = await fetch_recipes_from_github(request)
    
    # Transform to match expected format
    return {
        "total_count": len(result["recipes"]),
        "recipes": result["recipes"],
        "statistics": result.get("statistics"),
        "errors": result.get("errors")
    }


# === Shopping List Endpoints (Multi-user shared shopping list) ===

@app.get("/shopping-list/{user}")
@limiter.limit("30/minute")
def get_shopping_list(request: Request, user: str):
    """
    Get all shopping list items for a specific user.
    Args: user - Username to filter items
    Returns: Object with total_count and items list
    """
    items = list(shopping_list.find({"addedBy": user}))
    # Convert ObjectId to string for JSON serialization
    for item in items:
        item["_id"] = str(item["_id"])
    return {
        "total_count": len(items),
        "items": items
    }

@app.post("/shopping-list")
@limiter.limit("20/minute")
def add_shopping_item(request: Request, item: ShoppingItem):
    """
    Add a new item to the shopping list.
    Automatically adds timestamp when item is created.
    Args: item - ShoppingItem with name, quantity, and optional price/category
    Returns: {"id": "<item_id>", "message": "Item added to shopping list!"}
    """
    item_dict = model_to_dict(item)
    # Add server timestamp
    item_dict["addedAt"] = datetime.now(timezone.utc).isoformat()
    inserted = shopping_list.insert_one(item_dict)
    return {"id": str(inserted.inserted_id), "message": "Item added to shopping list!"}

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
def delete_shopping_item(request: Request, id: str, user: str):
    """
    Remove an item from the shopping list (item no longer needed).
    Args: 
        id - Item's MongoDB ObjectId as string
        user - Username of item owner (for authorization)
    Returns: {"message": "Shopping item deleted successfully!"}
    """
    object_id = validate_object_id(id, "shopping item")
    result = shopping_list.delete_one({"_id": object_id, "addedBy": user})
    if result.deleted_count == 0:
        raise HTTPException(404, "Shopping item not found or you don't have permission to delete it")
    return {"message": "Shopping item deleted successfully!"}

@app.put("/shopping-list/{id}/mark-bought")
@limiter.limit("20/minute")
def mark_item_bought(request: Request, id: str, user: str, purchasedBy: Optional[str] = None):
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
                # Step 1: Find and validate item exists and belongs to user
                item = shopping_list.find_one({"_id": object_id, "addedBy": user}, session=session)
                if not item:
                    raise HTTPException(404, "Shopping item not found or you don't have permission to modify it")
                
                # Step 2: Create inventory item with purchase metadata
                inventory_item = {
                    "name": item["name"],
                    "quantity": item.get("quantity"),
                    "amount": item.get("amount", 1.0),
                    "unit": item.get("unit", "unit"),
                    "category": item.get("category"),
                    "user": user,  # Set owner
                    "purchasedAt": datetime.now(timezone.utc).isoformat(),
                    "purchasedBy": purchasedBy or user,
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

@app.get("/inventory/{user}")
@limiter.limit("30/minute")
def get_inventory(request: Request, user: str):
    """
    Get all items currently in inventory for a specific user.
    Args: user - Username to filter items
    Returns: Object with total_count and items list
    """
    items = list(items_owned.find({"user": user}))
    # Convert ObjectId to string for JSON serialization
    for item in items:
        item["_id"] = str(item["_id"])
    return {
        "total_count": len(items),
        "items": items
    }

@app.post("/inventory")
@limiter.limit("20/minute")
def add_inventory_item(request: Request, item: InventoryItem):
    """
    Add an item directly to inventory (without going through shopping list).
    Useful for adding items you already own.
    
    Args: item - InventoryItem with name, quantity, and optional metadata
    Returns: {"id": "<item_id>", "message": "Item added to inventory!"}
    """
    item_dict = model_to_dict(item)
    # Add timestamp if not provided
    if not item_dict.get("purchasedAt"):
        item_dict["purchasedAt"] = datetime.now(timezone.utc).isoformat()
    inserted = items_owned.insert_one(item_dict)
    return {"id": str(inserted.inserted_id), "message": "Item added to inventory!"}

class UpdateAmountRequest(BaseModel):
    """Request to update inventory item amount"""
    itemId: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0, le=10000)


@app.put("/inventory/update-amount")
@limiter.limit("20/minute")
def update_inventory_amount(request: Request, update: UpdateAmountRequest):
    """
    Update the amount of an inventory item.
    Args:
        update - UpdateAmountRequest with itemId and new amount
    Returns: {"message": "Inventory amount updated successfully!"}
    """
    object_id = validate_object_id(update.itemId, "inventory item")
    result = items_owned.update_one(
        {"_id": object_id},
        {"$set": {"amount": update.amount}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Inventory item not found")
    return {"message": "Inventory amount updated successfully!"}


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
def delete_inventory_item(request: Request, id: str, user: str):
    """
    Remove an item from inventory (item has been used up or discarded).
    Args: 
        id - Item's MongoDB ObjectId as string
        user - Username of item owner (for authorization)
    Returns: {"message": "Inventory item deleted successfully!"}
    """
    object_id = validate_object_id(id, "inventory item")
    result = items_owned.delete_one({"_id": object_id, "user": user})
    if result.deleted_count == 0:
        raise HTTPException(404, "Inventory item not found or you don't have permission to delete it")
    return {"message": "Inventory item deleted successfully!"}


# === New Inventory Management Endpoints ===

class ConsumeIngredientRequest(BaseModel):
    """Request to consume/use ingredients from inventory"""
    name: str = Field(..., min_length=1, max_length=200)  # Changed from ingredientName to match tests
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
    ingredient_name = consumeRequest.name.strip().lower()
    amount_to_consume = consumeRequest.amount
    unit = consumeRequest.unit.lower()
    
    # Find inventory item by name (case-insensitive)
    item = items_owned.find_one({"name": {"$regex": f"^{ingredient_name}$", "$options": "i"}})
    
    if not item:
        raise HTTPException(404, f"Ingredient '{consumeRequest.name}' not found in inventory")
    
    # Check if units match
    if item.get("unit", "").lower() != unit:
        raise HTTPException(
            400, 
            f"Unit mismatch: '{consumeRequest.name}' is stored in '{item.get('unit')}', but you're trying to consume in '{unit}'"
        )
    
    current_amount = item.get("amount", 0)
    
    # Check if sufficient amount available
    if amount_to_consume > current_amount:
        raise HTTPException(
            400,
            f"Insufficient amount: Only {current_amount} {unit} of '{consumeRequest.name}' available, cannot consume {amount_to_consume} {unit}"
        )
    
    new_amount = current_amount - amount_to_consume
    
    response = {
        "message": "Ingredient consumed successfully!",
        "previousAmount": current_amount,
        "consumedAmount": amount_to_consume,
        "newAmount": new_amount,  # Match test expectations
        "remainingAmount": new_amount,
        "removed": False,
        "lowStock": False
    }
    
    # If amount reaches 0 or below, remove from inventory
    if new_amount <= 0:
        items_owned.delete_one({"_id": item["_id"]})
        response["removed"] = True
        response["newAmount"] = 0
        response["remainingAmount"] = 0
        response["message"] = f"Consumed all {consumeRequest.name} - removed from inventory"
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
    
    Returns: {"id": "<meal_log_id>", "message": "Meal logged successfully!"}
    """
    meal_dict = model_to_dict(meal)
    # Add server timestamp
    meal_dict["loggedAt"] = datetime.now(timezone.utc).isoformat()
    
    inserted = nutrition_logs.insert_one(meal_dict)
    return {
        "id": str(inserted.inserted_id),
        "message": "Meal logged successfully!"
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
            "fatPercent": (totals["fat"] / goals["dailyFat"] * 100) if goals["dailyFat"] > 0 else 0
        }
        
        remaining = {
            "calories": goals["dailyCalories"] - totals["calories"],
            "protein": goals["dailyProtein"] - totals["protein"],
            "carbs": goals["dailyCarbs"] - totals["carbs"],
            "fat": goals["dailyFat"] - totals["fat"]
        }
    else:
        remaining = None
    
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
        "progress": progress,
        "remaining": remaining
    }

class MealLogUpdate(BaseModel):
    """Partial update for meal log"""
    nutrition: Optional[Dict] = None
    notes: Optional[str] = Field(None, max_length=500)


@app.put("/nutrition/log/{id}")
@limiter.limit("20/minute")
def update_meal_log(request: Request, id: str, update: MealLogUpdate):
    """
    Update an existing meal log (partial update supported).
    Args:
        id - Meal log's MongoDB ObjectId
        update - Fields to update
    Returns: {"message": "Meal log updated successfully!"}
    """
    object_id = validate_object_id(id, "meal log")
    
    update_fields = update.model_dump(exclude_none=True)
    
    if not update_fields:
        raise HTTPException(400, "No update fields provided")
    
    result = nutrition_logs.update_one(
        {"_id": object_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Meal log not found")
    return {"message": "Meal log updated successfully!"}

@app.delete("/nutrition/log/{id}")
@limiter.limit("20/minute")
def delete_meal_log(request: Request, id: str):
    """
    Delete a meal log.
    Args: id - Meal log's MongoDB ObjectId
    Returns: {"message": "Meal log deleted successfully!"}
    """
    object_id = validate_object_id(id, "meal log")
    result = nutrition_logs.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Meal log not found")
    return {"message": "Meal log deleted successfully!"}

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
        return {"message": "Nutrition goals set successfully!", "id": str(result.upserted_id)}
    else:
        return {"message": "Nutrition goals set successfully!"}

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
        end = datetime.now(timezone.utc)
    
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
            "message": "Account created successfully!",
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
async def update_account(request: Request, username: str, account: UserAccountUpdate):
    """
    Update user account (partial updates supported) and recalculate health metrics.
    Useful when user's weight, height, age, or activity level changes.
    
    Args:
        username: Username to update
        account: Partial account data (only include fields you want to update)
    
    Returns:
        Updated account with recalculated BMR, BMI, and calories
    """
    try:
        # Check if account exists
        existing = user_accounts.find_one({"username": username.lower()})
        if not existing:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Build update document with only provided fields
        update_fields = account.model_dump(exclude_none=True)
        
        # If username is being updated, ensure it matches
        if "username" in update_fields:
            if username.lower() != update_fields["username"].lower():
                raise HTTPException(status_code=400, detail="Username mismatch")
        
        # Merge with existing data to calculate metrics
        merged_account = {**existing, **update_fields}
        
        # Recalculate health metrics if relevant fields changed
        if any(field in update_fields for field in ['weight', 'height', 'age', 'gender', 'activityLevel']):
            bmr = calculate_bmr(
                merged_account["weight"], 
                merged_account["height"], 
                merged_account["age"], 
                merged_account["gender"]
            )
            bmi = calculate_bmi(merged_account["weight"], merged_account["height"])
            daily_calories = calculate_daily_calories(bmr, merged_account["activityLevel"])
            bmi_category = get_bmi_category(bmi)
            
            update_fields["bmr"] = bmr
            update_fields["bmi"] = bmi
            update_fields["bmiCategory"] = bmi_category
            update_fields["recommendedDailyCalories"] = daily_calories
        else:
            daily_calories = existing.get("recommendedDailyCalories")
        
        update_fields["updatedAt"] = datetime.now().isoformat()

        
        # Update in database
        # Update account
        user_accounts.update_one(
            {"username": username.lower()},
            {"$set": update_fields}
        )
        
        # If weight changed, add new weight entry
        if "weight" in update_fields and update_fields["weight"] != existing.get("weight"):
            weight_entry = {
                "username": username.lower(),
                "weight": update_fields["weight"],
                "date": datetime.now().strftime('%Y-%m-%d'),
                "notes": "Weight updated from account profile"
            }
            weight_tracking.insert_one(weight_entry)
        
        # Update nutrition goals if calories were recalculated
        if any(field in update_fields for field in ['weight', 'height', 'age', 'gender', 'activityLevel']):
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
        
        # Fetch updated account for response
        updated_account = user_accounts.find_one({"username": username.lower()})
        
        return {
            "message": "Account updated successfully!",
            "username": username.lower(),
            "bmr": updated_account.get("bmr"),
            "bmi": updated_account.get("bmi"),
            "bmiCategory": updated_account.get("bmiCategory"),
            "recommendedDailyCalories": updated_account.get("recommendedDailyCalories")
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
            "message": "Weight logged successfully!",
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
        
        # Get entries sorted by date ascending for calculation
        entries = list(weight_tracking.find(query).sort("date", 1))
        
        if not entries:
            return []
        
        # Convert ObjectId to string and calculate changes (in chronological order)
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
        
        # Return in descending order (newest first)
        return list(reversed(entries))
    
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
                "entryCount": len(entries),
                "currentTrend": "insufficient_data"
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
        # Consider stable if change is less than 0.5kg
        STABLE_THRESHOLD = 0.5
        if len(entries) >= 3:
            recent_entries = entries[-3:]
            recent_trend = recent_entries[-1]["weight"] - recent_entries[0]["weight"]
            if abs(recent_trend) < STABLE_THRESHOLD:
                trend = "stable"
            elif recent_trend > 0:
                trend = "gaining"
            else:
                trend = "losing"
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


# === Gut Health & AI Recommendation Endpoints ===

@app.post("/gut-health/log")
@limiter.limit("60/minute")
async def log_gut_health(request: Request, entry: GutHealthLog):
    """
    Log a gut health entry (symptoms, bowel movements, mood, etc.).
    
    Tracks digestive symptoms with severity ratings, Bristol Stool Scale,
    mood/energy levels, and potential triggers for correlation analysis.
    
    Args:
        entry: Gut health log entry
    
    Returns:
        Created entry with ID
    """
    try:
        # Parse date to datetime object for database storage
        from datetime import datetime
        entry_date = datetime.fromisoformat(entry.date.split('T')[0])
        
        entry_dict = {
            "username": entry.username.lower(),
            "date": entry_date,
            "symptom_type": entry.symptom_type,
            "severity": entry.severity,
            "bristol_scale": entry.bristol_scale,
            "mood": entry.mood,
            "energy_level": entry.energy_level,
            "notes": entry.notes,
            "potential_triggers": entry.potential_triggers,
            "created_at": datetime.now(timezone.utc)
        }
        
        result = gut_health_logs.insert_one(entry_dict)
        entry_dict["_id"] = str(result.inserted_id)
        
        return model_to_dict(entry_dict)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging gut health: {str(e)}")


@app.get("/gut-health/{username}")
@limiter.limit("60/minute")
async def get_gut_health_logs(
    request: Request, 
    username: str, 
    days: Optional[int] = 30,
    symptom_type: Optional[str] = None
):
    """
    Get gut health logs for a user.
    
    Args:
        username: Username to fetch logs for
        days: Number of days to look back (default: 30)
        symptom_type: Optional filter by symptom type
    
    Returns:
        List of gut health logs
    """
    try:
        from datetime import datetime, timedelta
        
        # Calculate cutoff date
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Build query
        query = {
            "username": username.lower(),
            "date": {"$gte": cutoff}
        }
        
        if symptom_type:
            query["symptom_type"] = symptom_type.lower()
        
        # Fetch logs
        logs = list(gut_health_logs.find(query).sort("date", -1))
        
        return [model_to_dict(log) for log in logs]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching gut health logs: {str(e)}")


@app.delete("/gut-health/{id}")
@limiter.limit("30/minute")
async def delete_gut_health_log(request: Request, id: str):
    """
    Delete a gut health log entry.
    
    Args:
        id: Log entry ID to delete
    
    Returns:
        Confirmation message
    """
    try:
        entry_id = validate_object_id(id, "gut health log")
        result = gut_health_logs.delete_one({"_id": entry_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Gut health log not found")
        
        return {"message": "Gut health log deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting gut health log: {str(e)}")


@app.get("/gut-health/{username}/summary")
@limiter.limit("30/minute")
async def get_gut_health_summary(
    request: Request, 
    username: str, 
    days: Optional[int] = 7
):
    """
    Get a summary of gut health for a user over a specified period.
    
    Returns:
        - Symptom frequency breakdown
        - Average severity
        - Most common symptoms
        - Gut health score (0-100)
    
    Args:
        username: Username to analyze
        days: Number of days to analyze (default: 7)
    
    Returns:
        Summary statistics and gut health score
    """
    try:
        from datetime import datetime, timedelta
        from ai_services import GutHealthAnalyzer
        
        # Get recent logs
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        logs = list(gut_health_logs.find({
            "username": username.lower(),
            "date": {"$gte": cutoff}
        }).sort("date", -1))
        
        if not logs:
            return {
                "username": username.lower(),
                "days_analyzed": days,
                "total_logs": 0,
                "gut_health_score": 100,
                "rating": "Excellent",
                "message": "No symptoms logged - gut health appears excellent!",
                "symptom_breakdown": {}
            }
        
        # Convert to dicts for analyzer
        log_dicts = [model_to_dict(log) for log in logs]
        
        # Calculate gut health score
        analyzer = GutHealthAnalyzer()
        score_data = analyzer.calculate_gut_health_score(log_dicts)
        
        # Calculate symptom breakdown
        from collections import defaultdict
        symptom_counts = defaultdict(int)
        total_severity = 0
        
        for log in log_dicts:
            symptom_counts[log.get('symptom_type', 'Unknown')] += 1
            total_severity += log.get('severity', 0)
        
        avg_severity = total_severity / len(log_dicts) if log_dicts else 0
        
        return {
            "username": username.lower(),
            "days_analyzed": days,
            "total_logs": len(log_dicts),
            "gut_health_score": score_data["score"],
            "rating": score_data["rating"],
            "message": score_data["message"],
            "average_severity": round(avg_severity, 1),
            "symptom_breakdown": dict(symptom_counts),
            "most_common_symptom": max(symptom_counts.items(), key=lambda x: x[1])[0] if symptom_counts else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating gut health summary: {str(e)}")


@app.post("/gut-health/{username}/analyze")
@limiter.limit("10/minute")  # Lower limit for AI-powered endpoint
async def analyze_gut_health(
    request: Request, 
    username: str, 
    days: Optional[int] = 7
):
    """
    AI-powered gut health analysis with personalized recommendations.
    
    Uses Google Gemini AI (free tier) to:
    - Analyze symptom patterns and food correlations
    - Identify potential trigger foods
    - Recommend beneficial foods and dietary changes
    - Suggest gut-friendly meals
    
    This endpoint is rate-limited to conserve API usage.
    
    Args:
        username: Username to analyze
        days: Number of days to analyze (default: 7)
    
    Returns:
        - AI recommendations
        - Food-symptom correlations
        - Trigger foods
        - Beneficial foods
        - Gut health trends
    """
    try:
        from datetime import datetime, timedelta
        from ai_services import GutHealthAnalyzer
        
        # Get user account for profile data
        user_account = user_accounts.find_one({"username": username.lower()})
        if not user_account:
            raise HTTPException(status_code=404, detail="User account not found")
        
        # Get recent gut health logs
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        gut_logs = list(gut_health_logs.find({
            "username": username.lower(),
            "date": {"$gte": cutoff}
        }).sort("date", -1))
        
        # Get recent nutrition logs for correlation
        nutrition_data = list(nutrition_logs.find({
            "username": username.lower(),
            "date": {"$gte": cutoff}
        }).sort("date", -1))
        
        # Convert to dicts
        gut_log_dicts = [model_to_dict(log) for log in gut_logs]
        nutrition_dicts = [model_to_dict(log) for log in nutrition_data]
        
        # Build user profile for AI
        user_profile = {
            "age": user_account.get("age"),
            "gender": user_account.get("gender"),
            "weight": user_account.get("weight"),
            "height": user_account.get("height"),
            "activity_level": user_account.get("activity_level"),
            "bmi": user_account.get("bmi"),
            "bmr": user_account.get("bmr"),
            "goals": "Improve gut health and overall wellness"
        }
        
        # Run AI analysis
        analyzer = GutHealthAnalyzer()
        analysis = await analyzer.analyze_and_recommend(
            user_id=username.lower(),
            gut_health_logs=gut_log_dicts,
            nutrition_logs=nutrition_dicts,
            user_profile=user_profile,
            days_to_analyze=days
        )
        
        return analysis
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in gut health analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing gut health: {str(e)}")


@app.post("/gut-health/goals")
@limiter.limit("30/minute")
async def set_gut_health_goals(request: Request, goals: GutHealthGoals):
    """
    Set user's gut health goals and dietary preferences.
    
    Used by AI to personalize recommendations.
    
    Args:
        goals: User's gut health goals and preferences
    
    Returns:
        Saved goals with ID
    """
    try:
        goals_dict = {
            "username": goals.username.lower(),
            "primary_goals": goals.primary_goals,
            "dietary_restrictions": goals.dietary_restrictions,
            "known_trigger_foods": goals.known_trigger_foods,
            "probiotic_preferences": goals.probiotic_preferences,
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Upsert (update if exists, insert if not)
        result = db["gut_health_goals"].update_one(
            {"username": goals.username.lower()},
            {"$set": goals_dict},
            upsert=True
        )
        
        if result.upserted_id:
            goals_dict["_id"] = str(result.upserted_id)
        else:
            # Get existing document
            existing = db["gut_health_goals"].find_one({"username": goals.username.lower()})
            goals_dict["_id"] = str(existing["_id"])
        
        return model_to_dict(goals_dict)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving gut health goals: {str(e)}")


@app.get("/gut-health/goals/{username}")
@limiter.limit("60/minute")
async def get_gut_health_goals(request: Request, username: str):
    """
    Get user's gut health goals and preferences.
    
    Args:
        username: Username to fetch goals for
    
    Returns:
        User's gut health goals
    """
    try:
        goals = db["gut_health_goals"].find_one({"username": username.lower()})
        
        if not goals:
            raise HTTPException(status_code=404, detail="No gut health goals found for this user")
        
        return model_to_dict(goals)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching gut health goals: {str(e)}")


@app.post("/gut-health/{username}/meal-suggestions")
@limiter.limit("10/minute")  # Lower limit for AI endpoint
async def get_gut_friendly_meals(
    request: Request,
    username: str,
    available_ingredients: Optional[List[str]] = None
):
    """
    Get AI-powered gut-friendly meal suggestions.
    
    Uses user's gut health goals and dietary restrictions to suggest
    meals that support digestive health.
    
    Args:
        username: Username to get suggestions for
        available_ingredients: Optional list of ingredients user has
    
    Returns:
        List of meal suggestions with recipes and why they're beneficial
    """
    try:
        from ai_services import GutHealthAnalyzer
        
        # Get user's gut health goals
        goals = db["gut_health_goals"].find_one({"username": username.lower()})
        
        if not goals:
            # Use defaults if no goals set
            dietary_restrictions = []
            health_goals = ["improve_digestion", "general_gut_health"]
        else:
            dietary_restrictions = goals.get("dietary_restrictions", [])
            health_goals = goals.get("primary_goals", [])
        
        # Get user profile for context
        user_account = user_accounts.find_one({"username": username.lower()})
        user_profile = model_to_dict(user_account) if user_account else {}
        
        # Get meal suggestions from AI
        analyzer = GutHealthAnalyzer()
        meals = await analyzer.get_personalized_meal_plan(
            user_profile=user_profile,
            dietary_restrictions=dietary_restrictions,
            gut_health_goals=health_goals,
            available_ingredients=available_ingredients
        )
        
        return {"username": username.lower(), "meal_suggestions": meals}
    
    except Exception as e:
        print(f"Error getting meal suggestions: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating meal suggestions: {str(e)}")



