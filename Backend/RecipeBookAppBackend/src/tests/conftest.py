"""
Pytest fixtures and configuration for Recipe Book App tests.
Provides reusable test components like database connections, test clients, and mock data.
"""

import pytest
from fastapi.testclient import TestClient
from mongomock import MongoClient
from datetime import datetime, date
from typing import Generator, Dict, Any
import sys
import os

# Add src directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app_api import app, calculate_bmr, calculate_bmi, calculate_daily_calories, get_bmi_category


@pytest.fixture(scope="function")
def test_client() -> TestClient:
    """
    Provides a test client for making API requests.
    Scope: function - new client for each test to ensure isolation.
    """
    # Disable rate limiting for tests
    app.state.limiter.enabled = False
    return TestClient(app)


@pytest.fixture(scope="function")
def mock_db(monkeypatch) -> MongoClient:
    """
    Provides a mock MongoDB database using mongomock.
    Replaces the real database connection with an in-memory mock.
    Includes transaction mock since mongomock doesn't support transactions.
    """
    from app_api import db as real_db
    from unittest.mock import MagicMock
    
    mock_client = MongoClient()
    mock_database = mock_client.recipe_book_test_db
    
    # Mock transaction support (mongomock doesn't support transactions)
    mock_transaction = MagicMock()
    mock_transaction.__enter__ = MagicMock(return_value=None)
    mock_transaction.__exit__ = MagicMock(return_value=None)
    
    mock_session = MagicMock()
    mock_session.start_transaction = MagicMock(return_value=mock_transaction)
    mock_session.__enter__ = MagicMock(return_value=mock_session)
    mock_session.__exit__ = MagicMock(return_value=None)
    
    # Patch the client's start_session to return our mock
    mock_client.start_session = MagicMock(return_value=mock_session)
    
    # Create wrapper for collections that ignores session parameter
    class SessionIgnoringCollection:
        def __init__(self, collection):
            self._collection = collection
            
        def __getattr__(self, name):
            attr = getattr(self._collection, name)
            if callable(attr):
                def wrapper(*args, **kwargs):
                    # Remove session parameter if present
                    kwargs.pop('session', None)
                    return attr(*args, **kwargs)
                return wrapper
            return attr
    
    # Create a wrapper that has both database functionality and client access
    mock_db_wrapper = type('MockDatabase', (), {})()
    for attr in dir(mock_database):
        if not attr.startswith('_'):
            try:
                setattr(mock_db_wrapper, attr, getattr(mock_database, attr))
            except:
                pass
    # Add the collections with session-ignoring wrappers
    mock_db_wrapper.__getitem__ = mock_database.__getitem__
    mock_db_wrapper.client = mock_client
    
    # Patch the database in app_api module
    monkeypatch.setattr("app_api.db", mock_db_wrapper)
    monkeypatch.setattr("app_api.recipes", SessionIgnoringCollection(mock_database["recipes"]))
    monkeypatch.setattr("app_api.shopping_list", SessionIgnoringCollection(mock_database["shopping_list"]))
    monkeypatch.setattr("app_api.items_owned", SessionIgnoringCollection(mock_database["items_owned"]))
    monkeypatch.setattr("app_api.nutrition_logs", SessionIgnoringCollection(mock_database["nutrition_logs"]))
    monkeypatch.setattr("app_api.user_nutrition_goals", SessionIgnoringCollection(mock_database["user_nutrition_goals"]))
    monkeypatch.setattr("app_api.user_accounts", SessionIgnoringCollection(mock_database["user_accounts"]))
    monkeypatch.setattr("app_api.weight_tracking", SessionIgnoringCollection(mock_database["weight_tracking"]))
    
    return mock_database


@pytest.fixture
def sample_recipe() -> Dict[str, Any]:
    """Provides a sample recipe for testing."""
    return {
        "name": "Spaghetti Carbonara",
        "ingredients": ["spaghetti", "eggs", "bacon", "parmesan", "black pepper"],
        "instructions": ["Cook pasta", "Fry bacon", "Mix eggs and cheese", "Combine all"],
        "prep_time": 10,
        "cook_time": 20,
        "servings": 4,
        "user": "test_user"
    }


@pytest.fixture
def sample_shopping_item() -> Dict[str, Any]:
    """Provides a sample shopping list item for testing."""
    return {
        "name": "Tomatoes",
        "amount": 5,
        "unit": "piece",  # Changed from "pieces" to "piece" to match allowed units
        "estimatedPrice": 3.50,
        "category": "vegetables",
        "addedBy": "test_user",
        "bought": False
    }


@pytest.fixture
def sample_inventory_item() -> Dict[str, Any]:
    """Provides a sample inventory item for testing."""
    return {
        "name": "Flour",
        "amount": 2.5,
        "unit": "kg",
        "lowStockThreshold": 0.5,
        "category": "baking",
        "user": "test_user"
    }


@pytest.fixture
def sample_nutrition_log() -> Dict[str, Any]:
    """Provides a sample nutrition log entry for testing."""
    return {
        "user": "test_user",
        "mealType": "lunch",
        "mealName": "Grilled Chicken Salad",
        "date": "2025-12-20",
        "nutrition": {
            "calories": 450,
            "protein": 35,
            "carbs": 25,
            "fat": 20,
            "fiber": 8,
            "sugar": 5,
            "sodium": 600
        },
        "servings": 1,
        "notes": "Added extra veggies"
    }


@pytest.fixture
def sample_user_account() -> Dict[str, Any]:
    """Provides a sample user account for testing."""
    return {
        "username": "matt",
        "displayName": "Matt",
        "email": "matt@example.com",
        "age": 30,
        "gender": "male",
        "weight": 80.0,
        "height": 180,
        "activityLevel": "moderately_active"
    }


@pytest.fixture
def sample_weight_entry() -> Dict[str, Any]:
    """Provides a sample weight tracking entry for testing."""
    return {
        "username": "matt",
        "weight": 80.0,
        "date": "2025-12-20",
        "notes": "Morning weight after workout"
    }


@pytest.fixture
def sample_nutrition_goals() -> Dict[str, Any]:
    """Provides sample nutrition goals for testing."""
    return {
        "user": "test_user",
        "dailyCalories": 2500,
        "dailyProtein": 150,
        "dailyCarbs": 250,
        "dailyFat": 83
    }


@pytest.fixture
def populated_db(mock_db, sample_recipe, sample_shopping_item, sample_inventory_item) -> MongoClient:
    """
    Provides a mock database pre-populated with test data.
    Useful for tests that need existing data.
    """
    # Add sample data
    mock_db["recipes"].insert_one(sample_recipe)
    mock_db["shopping_list"].insert_one(sample_shopping_item)
    mock_db["items_owned"].insert_one(sample_inventory_item)
    
    return mock_db


@pytest.fixture
def health_metrics() -> Dict[str, Any]:
    """Provides sample health metrics for testing calculations."""
    return {
        "male_metrics": {
            "weight": 80.0,  # kg
            "height": 180,   # cm
            "age": 30,
            "gender": "male"
        },
        "female_metrics": {
            "weight": 65.0,  # kg
            "height": 165,   # cm
            "age": 28,
            "gender": "female"
        }
    }


@pytest.fixture
def activity_levels() -> Dict[str, float]:
    """Provides activity level multipliers for testing."""
    return {
        "sedentary": 1.2,
        "lightly_active": 1.375,
        "moderately_active": 1.55,
        "very_active": 1.725,
        "extremely_active": 1.9
    }


# Helper function for tests
def create_test_recipe(client: TestClient, recipe_data: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to create a recipe and return the response."""
    response = client.post("/recipes", json=recipe_data)
    return response.json()


def create_test_account(client: TestClient, account_data: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to create a user account and return the response."""
    response = client.post("/accounts/create", json=account_data)
    return response.json()
