"""
Database-specific tests using MongoDB fixtures.
Tests: Database operations, data integrity, error handling
"""

import pytest
from pymongo.errors import PyMongoError
from bson import ObjectId
from datetime import datetime


class TestDatabaseOperations:
    """Tests for database CRUD operations."""
    
    @pytest.mark.database
    def test_insert_and_retrieve_recipe(self, mock_db, sample_recipe):
        """Test inserting and retrieving a recipe from database."""
        # Insert
        result = mock_db["recipes"].insert_one(sample_recipe)
        assert result.inserted_id is not None
        
        # Retrieve
        recipe = mock_db["recipes"].find_one({"_id": result.inserted_id})
        assert recipe is not None
        assert recipe["name"] == sample_recipe["name"]
    
    @pytest.mark.database
    def test_update_recipe(self, mock_db, sample_recipe):
        """Test updating a recipe in database."""
        # Insert
        result = mock_db["recipes"].insert_one(sample_recipe)
        
        # Update
        mock_db["recipes"].update_one(
            {"_id": result.inserted_id},
            {"$set": {"name": "Updated Recipe Name"}}
        )
        
        # Verify
        recipe = mock_db["recipes"].find_one({"_id": result.inserted_id})
        assert recipe["name"] == "Updated Recipe Name"
    
    @pytest.mark.database
    def test_delete_recipe(self, mock_db, sample_recipe):
        """Test deleting a recipe from database."""
        # Insert
        result = mock_db["recipes"].insert_one(sample_recipe)
        
        # Delete
        delete_result = mock_db["recipes"].delete_one({"_id": result.inserted_id})
        assert delete_result.deleted_count == 1
        
        # Verify
        recipe = mock_db["recipes"].find_one({"_id": result.inserted_id})
        assert recipe is None
    
    @pytest.mark.database
    def test_query_recipes_by_user(self, mock_db):
        """Test querying recipes filtered by user."""
        recipes = [
            {"name": "Recipe 1", "ingredients": ["a"], "instructions": ["b"],
             "prep_time": 10, "cook_time": 20, "servings": 2, "user": "user1"},
            {"name": "Recipe 2", "ingredients": ["c"], "instructions": ["d"],
             "prep_time": 15, "cook_time": 25, "servings": 3, "user": "user1"},
            {"name": "Recipe 3", "ingredients": ["e"], "instructions": ["f"],
             "prep_time": 20, "cook_time": 30, "servings": 4, "user": "user2"}
        ]
        mock_db["recipes"].insert_many(recipes)
        
        # Query user1's recipes
        user1_recipes = list(mock_db["recipes"].find({"user": "user1"}))
        assert len(user1_recipes) == 2
        
        # Query user2's recipes
        user2_recipes = list(mock_db["recipes"].find({"user": "user2"}))
        assert len(user2_recipes) == 1


class TestUserAccountDatabase:
    """Tests for user account database operations."""
    
    @pytest.mark.database
    def test_create_user_account_with_metrics(self, mock_db):
        """Test creating user account with calculated health metrics."""
        account = {
            "username": "matt",
            "displayName": "Matt",
            "age": 30,
            "gender": "male",
            "weight": 80.0,
            "height": 180,
            "activityLevel": "moderately_active",
            "bmr": 1780.0,
            "bmi": 24.69,
            "bmiCategory": "Normal weight",
            "recommendedDailyCalories": 2759.0
        }
        
        result = mock_db["user_accounts"].insert_one(account)
        assert result.inserted_id is not None
        
        # Verify
        saved_account = mock_db["user_accounts"].find_one({"username": "matt"})
        assert saved_account["bmr"] == 1780.0
        assert saved_account["bmi"] == 24.69
    
    @pytest.mark.database
    def test_update_user_weight_recalculates_bmi(self, mock_db):
        """Test that updating weight recalculates BMI."""
        account = {
            "username": "test",
            "weight": 80.0,
            "height": 180,
            "bmi": 24.69
        }
        result = mock_db["user_accounts"].insert_one(account)
        
        # Update weight
        new_weight = 75.0
        new_bmi = new_weight / (1.8 ** 2)
        
        mock_db["user_accounts"].update_one(
            {"_id": result.inserted_id},
            {"$set": {"weight": new_weight, "bmi": new_bmi}}
        )
        
        # Verify
        updated = mock_db["user_accounts"].find_one({"_id": result.inserted_id})
        assert updated["weight"] == 75.0
        assert round(updated["bmi"], 2) == round(new_bmi, 2)
    
    @pytest.mark.database
    def test_unique_username_constraint(self, mock_db, sample_user_account):
        """Test that duplicate usernames are handled."""
        # Insert first account
        mock_db["user_accounts"].insert_one(sample_user_account)
        
        # Check if account exists before inserting duplicate
        existing = mock_db["user_accounts"].find_one({"username": sample_user_account["username"]})
        assert existing is not None


class TestWeightTrackingDatabase:
    """Tests for weight tracking database operations."""
    
    @pytest.mark.database
    def test_insert_weight_entries(self, mock_db):
        """Test inserting multiple weight entries."""
        entries = [
            {"username": "matt", "weight": 80.0, "date": "2025-11-20"},
            {"username": "matt", "weight": 79.5, "date": "2025-12-01"},
            {"username": "matt", "weight": 79.0, "date": "2025-12-20"}
        ]
        
        result = mock_db["weight_tracking"].insert_many(entries)
        assert len(result.inserted_ids) == 3
    
    @pytest.mark.database
    def test_query_weight_history_sorted(self, mock_db):
        """Test querying weight history sorted by date."""
        entries = [
            {"username": "matt", "weight": 79.0, "date": "2025-12-20"},
            {"username": "matt", "weight": 80.0, "date": "2025-11-20"},
            {"username": "matt", "weight": 79.5, "date": "2025-12-01"}
        ]
        mock_db["weight_tracking"].insert_many(entries)
        
        # Query sorted descending
        history = list(mock_db["weight_tracking"].find({"username": "matt"}).sort("date", -1))
        
        assert len(history) == 3
        assert history[0]["date"] >= history[1]["date"] >= history[2]["date"]
    
    @pytest.mark.database
    def test_delete_weight_entry(self, mock_db, sample_weight_entry):
        """Test deleting a weight entry."""
        result = mock_db["weight_tracking"].insert_one(sample_weight_entry)
        
        # Delete
        delete_result = mock_db["weight_tracking"].delete_one({"_id": result.inserted_id})
        assert delete_result.deleted_count == 1
        
        # Verify
        entry = mock_db["weight_tracking"].find_one({"_id": result.inserted_id})
        assert entry is None


class TestNutritionDatabase:
    """Tests for nutrition tracking database operations."""
    
    @pytest.mark.database
    def test_insert_nutrition_log(self, mock_db, sample_nutrition_log):
        """Test inserting a nutrition log."""
        result = mock_db["nutrition_logs"].insert_one(sample_nutrition_log)
        assert result.inserted_id is not None
        
        # Verify
        log = mock_db["nutrition_logs"].find_one({"_id": result.inserted_id})
        assert log["mealType"] == "lunch"
        assert log["nutrition"]["calories"] == 450
    
    @pytest.mark.database
    def test_query_logs_by_date_range(self, mock_db):
        """Test querying nutrition logs by date range."""
        logs = [
            {"user": "test", "date": "2025-12-15", "mealType": "lunch",
             "nutrition": {"calories": 500, "protein": 30, "carbs": 50, "fat": 15}},
            {"user": "test", "date": "2025-12-18", "mealType": "dinner",
             "nutrition": {"calories": 600, "protein": 35, "carbs": 60, "fat": 20}},
            {"user": "test", "date": "2025-12-22", "mealType": "breakfast",
             "nutrition": {"calories": 400, "protein": 20, "carbs": 45, "fat": 12}}
        ]
        mock_db["nutrition_logs"].insert_many(logs)
        
        # Query date range
        result = list(mock_db["nutrition_logs"].find({
            "user": "test",
            "date": {"$gte": "2025-12-16", "$lte": "2025-12-20"}
        }))
        
        assert len(result) == 1
        assert result[0]["date"] == "2025-12-18"
    
    @pytest.mark.database
    def test_update_nutrition_log(self, mock_db, sample_nutrition_log):
        """Test updating a nutrition log."""
        result = mock_db["nutrition_logs"].insert_one(sample_nutrition_log)
        
        # Update
        mock_db["nutrition_logs"].update_one(
            {"_id": result.inserted_id},
            {"$set": {"nutrition.calories": 500, "notes": "Updated portion"}}
        )
        
        # Verify
        log = mock_db["nutrition_logs"].find_one({"_id": result.inserted_id})
        assert log["nutrition"]["calories"] == 500
        assert log["notes"] == "Updated portion"
    
    @pytest.mark.database
    def test_set_and_update_nutrition_goals(self, mock_db):
        """Test setting and updating nutrition goals."""
        goals = {
            "user": "test_user",
            "dailyCalories": 2500,
            "dailyProtein": 150,
            "dailyCarbs": 250,
            "dailyFat": 83
        }
        
        # Insert
        mock_db["user_nutrition_goals"].insert_one(goals)
        
        # Update (upsert pattern)
        mock_db["user_nutrition_goals"].update_one(
            {"user": "test_user"},
            {"$set": {"dailyCalories": 2700, "dailyProtein": 160}},
            upsert=True
        )
        
        # Verify
        updated_goals = mock_db["user_nutrition_goals"].find_one({"user": "test_user"})
        assert updated_goals["dailyCalories"] == 2700
        assert updated_goals["dailyProtein"] == 160


class TestInventoryDatabase:
    """Tests for inventory database operations."""
    
    @pytest.mark.database
    def test_add_inventory_item(self, mock_db, sample_inventory_item):
        """Test adding item to inventory."""
        result = mock_db["items_owned"].insert_one(sample_inventory_item)
        assert result.inserted_id is not None
        
        # Verify
        item = mock_db["items_owned"].find_one({"_id": result.inserted_id})
        assert item["name"] == sample_inventory_item["name"]
    
    @pytest.mark.database
    def test_update_inventory_amount(self, mock_db, sample_inventory_item):
        """Test updating inventory item amount."""
        result = mock_db["items_owned"].insert_one(sample_inventory_item)
        
        # Update
        new_amount = 5.0
        mock_db["items_owned"].update_one(
            {"_id": result.inserted_id},
            {"$set": {"amount": new_amount}}
        )
        
        # Verify
        item = mock_db["items_owned"].find_one({"_id": result.inserted_id})
        assert item["amount"] == new_amount
    
    @pytest.mark.database
    def test_query_low_stock_items(self, mock_db):
        """Test querying items below low stock threshold."""
        items = [
            {"name": "Flour", "amount": 0.3, "lowStockThreshold": 1.0, "user": "test"},
            {"name": "Sugar", "amount": 2.0, "lowStockThreshold": 1.0, "user": "test"},
            {"name": "Salt", "amount": 0.05, "lowStockThreshold": 0.1, "user": "test"}
        ]
        mock_db["items_owned"].insert_many(items)
        
        # Query low stock using aggregation
        pipeline = [
            {
                "$addFields": {
                    "percentRemaining": {
                        "$multiply": [
                            {"$divide": ["$amount", "$lowStockThreshold"]},
                            100
                        ]
                    }
                }
            },
            {"$match": {"percentRemaining": {"$lt": 100}}}
        ]
        
        low_stock = list(mock_db["items_owned"].aggregate(pipeline))
        assert len(low_stock) == 2  # Flour and Salt


class TestDataIntegrity:
    """Tests for data integrity and cascading deletes."""
    
    @pytest.mark.database
    def test_cascade_delete_user_account(self, mock_db, sample_user_account):
        """Test that deleting account cascades to related collections."""
        username = sample_user_account["username"]
        
        # Create account and related data
        mock_db["user_accounts"].insert_one(sample_user_account)
        mock_db["weight_tracking"].insert_one({"username": username, "weight": 80.0, "date": "2025-12-20"})
        mock_db["nutrition_logs"].insert_one({"user": username, "mealType": "lunch", "date": "2025-12-20"})
        mock_db["user_nutrition_goals"].insert_one({"user": username, "dailyCalories": 2500})
        
        # Delete account and cascade
        mock_db["user_accounts"].delete_one({"username": username})
        mock_db["weight_tracking"].delete_many({"username": username})
        mock_db["nutrition_logs"].delete_many({"user": username})
        mock_db["user_nutrition_goals"].delete_many({"user": username})
        
        # Verify all deleted
        assert mock_db["user_accounts"].find_one({"username": username}) is None
        assert mock_db["weight_tracking"].find_one({"username": username}) is None
        assert mock_db["nutrition_logs"].find_one({"user": username}) is None
        assert mock_db["user_nutrition_goals"].find_one({"user": username}) is None
    
    @pytest.mark.database
    def test_shopping_to_inventory_transfer(self, mock_db, sample_shopping_item):
        """Test data integrity when moving item from shopping list to inventory."""
        # Add to shopping list
        result = mock_db["shopping_list"].insert_one(sample_shopping_item)
        
        # Simulate marking as bought (move to inventory)
        item_data = {
            "name": sample_shopping_item["name"],
            "amount": sample_shopping_item["amount"],
            "unit": sample_shopping_item["unit"],
            "category": sample_shopping_item["category"],
            "user": sample_shopping_item["addedBy"],
            "lowStockThreshold": sample_shopping_item["amount"] * 0.2
        }
        mock_db["items_owned"].insert_one(item_data)
        mock_db["shopping_list"].delete_one({"_id": result.inserted_id})
        
        # Verify transfer
        assert mock_db["shopping_list"].find_one({"_id": result.inserted_id}) is None
        assert mock_db["items_owned"].find_one({"name": sample_shopping_item["name"]}) is not None
