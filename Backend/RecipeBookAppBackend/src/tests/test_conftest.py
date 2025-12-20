"""
Test conftest.py fixtures and helper functions
"""

import pytest
from tests.conftest import create_test_recipe, create_test_account


class TestConftestHelpers:
    """Test helper functions from conftest.py"""
    
    def test_create_test_recipe_helper(self, test_client, sample_recipe, mock_db):
        """Test create_test_recipe helper function"""
        result = create_test_recipe(test_client, sample_recipe)
        
        assert "id" in result
        assert "message" in result
        assert result["message"] == "Recipe added successfully!"
    
    def test_create_test_account_helper(self, test_client, sample_user_account, mock_db):
        """Test create_test_account helper function"""
        result = create_test_account(test_client, sample_user_account)
        
        assert "id" in result
        assert "username" in result
        assert result["username"] == sample_user_account["username"]
        assert "bmr" in result
        assert "bmi" in result
        assert "bmiCategory" in result
        assert "recommendedDailyCalories" in result  # Actual key name


class TestFixtures:
    """Test that fixtures provide correct data structures"""
    
    def test_sample_recipe_fixture(self, sample_recipe):
        """Test sample_recipe fixture structure"""
        assert "name" in sample_recipe
        assert "ingredients" in sample_recipe
        assert "instructions" in sample_recipe
        assert "prep_time" in sample_recipe
        assert "cook_time" in sample_recipe
        assert "servings" in sample_recipe
        assert "user" in sample_recipe
        assert isinstance(sample_recipe["ingredients"], list)
        assert isinstance(sample_recipe["instructions"], list)
    
    def test_sample_shopping_item_fixture(self, sample_shopping_item):
        """Test sample_shopping_item fixture structure"""
        assert "name" in sample_shopping_item
        assert "amount" in sample_shopping_item
        assert "unit" in sample_shopping_item
        assert "category" in sample_shopping_item
        assert sample_shopping_item["bought"] is False
    
    def test_sample_inventory_item_fixture(self, sample_inventory_item):
        """Test sample_inventory_item fixture structure"""
        assert "name" in sample_inventory_item
        assert "amount" in sample_inventory_item
        assert "unit" in sample_inventory_item
        assert "category" in sample_inventory_item
        assert "user" in sample_inventory_item
    
    def test_sample_nutrition_log_fixture(self, sample_nutrition_log):
        """Test sample_nutrition_log fixture structure"""
        assert "user" in sample_nutrition_log
        assert "mealType" in sample_nutrition_log
        assert "mealName" in sample_nutrition_log
        assert "date" in sample_nutrition_log
        assert "nutrition" in sample_nutrition_log
        assert "calories" in sample_nutrition_log["nutrition"]
    
    def test_sample_user_account_fixture(self, sample_user_account):
        """Test sample_user_account fixture structure"""
        assert "username" in sample_user_account
        assert "age" in sample_user_account
        assert "gender" in sample_user_account
        assert "weight" in sample_user_account
        assert "height" in sample_user_account
        assert "activityLevel" in sample_user_account
    
    def test_sample_weight_entry_fixture(self, sample_weight_entry):
        """Test sample_weight_entry fixture structure"""
        assert "username" in sample_weight_entry
        assert "weight" in sample_weight_entry
        assert "date" in sample_weight_entry
    
    def test_sample_nutrition_goals_fixture(self, sample_nutrition_goals):
        """Test sample_nutrition_goals fixture structure"""
        assert "user" in sample_nutrition_goals
        assert "dailyCalories" in sample_nutrition_goals
        assert "dailyProtein" in sample_nutrition_goals
        assert "dailyCarbs" in sample_nutrition_goals
        assert "dailyFat" in sample_nutrition_goals
    
    def test_health_metrics_fixture(self, health_metrics):
        """Test health_metrics fixture structure"""
        assert "male_metrics" in health_metrics
        assert "female_metrics" in health_metrics
        assert "weight" in health_metrics["male_metrics"]
        assert "height" in health_metrics["male_metrics"]
    
    def test_activity_levels_fixture(self, activity_levels):
        """Test activity_levels fixture structure"""
        assert "sedentary" in activity_levels
        assert "lightly_active" in activity_levels
        assert "moderately_active" in activity_levels
        assert "very_active" in activity_levels
        assert "extremely_active" in activity_levels
        assert activity_levels["sedentary"] == 1.2
        assert activity_levels["lightly_active"] == 1.375
    
    def test_populated_db_fixture(self, populated_db):
        """Test populated_db fixture has data"""
        # Check that collections have data
        assert populated_db["recipes"].count_documents({}) > 0
        assert populated_db["shopping_list"].count_documents({}) > 0
        assert populated_db["items_owned"].count_documents({}) > 0
    
    def test_test_client_fixture(self, test_client):
        """Test that test_client fixture is properly configured"""
        # Test client should have rate limiting disabled
        response = test_client.get("/health")
        assert response.status_code == 200
    
    def test_mock_db_fixture(self, mock_db):
        """Test that mock_db fixture provides working database"""
        # Test inserting and querying
        test_doc = {"test": "data"}
        result = mock_db["test_collection"].insert_one(test_doc)
        assert result.inserted_id is not None
        
        found = mock_db["test_collection"].find_one({"test": "data"})
        assert found is not None
        assert found["test"] == "data"
