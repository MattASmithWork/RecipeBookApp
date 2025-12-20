"""
Integration tests for User Account API endpoints.
Tests: Account creation, retrieval, updates, deletion with health metrics
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId


class TestUserAccountEndpoints:
    """Tests for user account management endpoints."""
    
    @pytest.mark.integration
    def test_create_account_success(self, test_client, mock_db, sample_user_account):
        """Test successfully creating a user account."""
        response = test_client.post("/accounts/create", json=sample_user_account)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["username"] == sample_user_account["username"]
        assert "bmr" in data
        assert "bmi" in data
        assert "bmiCategory" in data
        assert "recommendedDailyCalories" in data
        assert data["message"] == "Account created successfully!"
        
        # Verify health metrics are calculated
        assert data["bmr"] > 0
        assert data["bmi"] > 0
        assert data["recommendedDailyCalories"] > 0
        
        # Verify in database
        account = mock_db["user_accounts"].find_one({"username": sample_user_account["username"]})
        assert account is not None
        assert account["age"] == sample_user_account["age"]
    
    @pytest.mark.integration
    def test_create_account_calculates_bmr_correctly(self, test_client, mock_db):
        """Test that account creation calculates BMR correctly."""
        account_data = {
            "username": "test_bmr",
            "displayName": "Test",
            "age": 30,
            "gender": "male",
            "weight": 80.0,
            "height": 180,
            "activityLevel": "moderately_active"
        }
        
        response = test_client.post("/accounts/create", json=account_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Expected BMR: (10 × 80) + (6.25 × 180) - (5 × 30) + 5 = 1780
        assert data["bmr"] == 1780.0
        
        # Expected BMI: 80 / (1.8)^2 = 24.69
        assert round(data["bmi"], 2) == 24.69
        assert data["bmiCategory"] == "Normal weight"
        
        # Expected calories: 1780 * 1.55 = 2759
        assert data["recommendedDailyCalories"] == 2759.0
    
    @pytest.mark.integration
    def test_create_account_female_metrics(self, test_client, mock_db):
        """Test account creation for female with correct BMR calculation."""
        account_data = {
            "username": "niccy",
            "displayName": "Niccy",
            "age": 28,
            "gender": "female",
            "weight": 65.0,
            "height": 165,
            "activityLevel": "lightly_active"
        }
        
        response = test_client.post("/accounts/create", json=account_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Expected BMR: (10 × 65) + (6.25 × 165) - (5 × 28) - 161 = 1380.25
        assert data["bmr"] == 1380.25
        assert round(data["recommendedDailyCalories"], 2) == 1897.84
    
    @pytest.mark.integration
    def test_create_account_creates_nutrition_goals(self, test_client, mock_db, sample_user_account):
        """Test that creating account also creates nutrition goals."""
        response = test_client.post("/accounts/create", json=sample_user_account)
        
        assert response.status_code == 200
        
        # Check nutrition goals were created
        goals = mock_db["user_nutrition_goals"].find_one({"user": sample_user_account["username"]})
        assert goals is not None
        assert "dailyCalories" in goals
        assert "dailyProtein" in goals
        assert "dailyCarbs" in goals
        assert "dailyFat" in goals
    
    @pytest.mark.integration
    def test_create_account_creates_initial_weight_entry(self, test_client, mock_db, sample_user_account):
        """Test that creating account creates initial weight tracking entry."""
        response = test_client.post("/accounts/create", json=sample_user_account)
        
        assert response.status_code == 200
        
        # Check weight entry was created
        weight_entry = mock_db["weight_tracking"].find_one({"username": sample_user_account["username"]})
        assert weight_entry is not None
        assert weight_entry["weight"] == sample_user_account["weight"]
    
    @pytest.mark.integration
    def test_create_account_duplicate_username(self, test_client, mock_db, sample_user_account):
        """Test creating account with duplicate username."""
        # Create first account
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Try to create duplicate
        response = test_client.post("/accounts/create", json=sample_user_account)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_create_account_missing_fields(self, test_client):
        """Test creating account with missing required fields."""
        incomplete_data = {
            "username": "test",
            "age": 30
            # Missing gender, weight, height, activityLevel
        }
        
        response = test_client.post("/accounts/create", json=incomplete_data)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.integration
    def test_create_account_invalid_activity_level(self, test_client, sample_user_account):
        """Test creating account with invalid activity level."""
        sample_user_account["activityLevel"] = "super_duper_active"  # Invalid
        
        response = test_client.post("/accounts/create", json=sample_user_account)
        assert response.status_code == 400
        assert "Invalid activity level" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_get_account_success(self, test_client, mock_db, sample_user_account):
        """Test successfully retrieving a user account."""
        # Create account first
        create_response = test_client.post("/accounts/create", json=sample_user_account)
        assert create_response.status_code == 200
        
        # Get account
        response = test_client.get(f"/accounts/{sample_user_account['username']}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == sample_user_account["username"]
        assert data["age"] == sample_user_account["age"]
        assert "bmr" in data
        assert "bmi" in data
        assert "recommendedDailyCalories" in data
    
    @pytest.mark.integration
    def test_get_account_not_found(self, test_client):
        """Test getting non-existent account."""
        response = test_client.get("/accounts/nonexistent_user")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_update_account_success(self, test_client, mock_db, sample_user_account):
        """Test successfully updating account information."""
        # Create account
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Update account
        update_data = {
            "weight": 75.0,  # Changed from 80.0
            "activityLevel": "very_active"  # Changed from moderately_active
        }
        
        response = test_client.put(f"/accounts/{sample_user_account['username']}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Account updated successfully!"
        assert "bmr" in data  # Should recalculate
        assert "bmi" in data
        assert "recommendedDailyCalories" in data
        
        # Verify in database
        account = mock_db["user_accounts"].find_one({"username": sample_user_account["username"]})
        assert account["weight"] == 75.0
        assert account["activityLevel"] == "very_active"
    
    @pytest.mark.integration
    def test_update_account_recalculates_metrics(self, test_client, mock_db, sample_user_account):
        """Test that updating account recalculates health metrics."""
        # Create account
        create_response = test_client.post("/accounts/create", json=sample_user_account)
        original_bmr = create_response.json()["bmr"]
        original_calories = create_response.json()["recommendedDailyCalories"]
        
        # Update weight and activity
        update_data = {"weight": 85.0, "activityLevel": "very_active"}
        update_response = test_client.put(f"/accounts/{sample_user_account['username']}", json=update_data)
        
        assert update_response.status_code == 200
        new_data = update_response.json()
        
        # BMR should increase with weight
        assert new_data["bmr"] > original_bmr
        # Calories should increase significantly with very_active
        assert new_data["recommendedDailyCalories"] > original_calories
    
    @pytest.mark.integration
    def test_update_account_not_found(self, test_client):
        """Test updating non-existent account."""
        update_data = {"weight": 75.0}
        response = test_client.put("/accounts/nonexistent_user", json=update_data)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_delete_account_success(self, test_client, mock_db, sample_user_account):
        """Test successfully deleting a user account."""
        # Create account
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Delete account
        response = test_client.delete(f"/accounts/{sample_user_account['username']}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify deletion
        account = mock_db["user_accounts"].find_one({"username": sample_user_account["username"]})
        assert account is None
    
    @pytest.mark.integration
    def test_delete_account_cascades_to_related_data(self, test_client, mock_db, sample_user_account):
        """Test that deleting account also deletes related data."""
        # Create account (creates nutrition goals and weight entry)
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Add some additional data
        mock_db["nutrition_logs"].insert_one({
            "user": sample_user_account["username"],
            "mealType": "lunch",
            "date": "2025-12-20"
        })
        
        # Delete account
        response = test_client.delete(f"/accounts/{sample_user_account['username']}")
        assert response.status_code == 200
        
        # Verify all related data is deleted
        assert mock_db["user_accounts"].find_one({"username": sample_user_account["username"]}) is None
        assert mock_db["weight_tracking"].find_one({"username": sample_user_account["username"]}) is None
        assert mock_db["nutrition_logs"].find_one({"user": sample_user_account["username"]}) is None
        assert mock_db["user_nutrition_goals"].find_one({"user": sample_user_account["username"]}) is None
    
    @pytest.mark.integration
    def test_delete_account_not_found(self, test_client):
        """Test deleting non-existent account."""
        response = test_client.delete("/accounts/nonexistent_user")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]


class TestActivityLevels:
    """Tests for different activity levels and their calorie calculations."""
    
    @pytest.mark.integration
    @pytest.mark.parametrize("activity_level,expected_multiplier", [
        ("sedentary", 1.2),
        ("lightly_active", 1.375),
        ("moderately_active", 1.55),
        ("very_active", 1.725),
        ("extremely_active", 1.9),
    ])
    def test_activity_levels(self, test_client, mock_db, activity_level, expected_multiplier):
        """Test that each activity level produces correct calorie recommendations."""
        account_data = {
            "username": f"test_{activity_level}",
            "displayName": "Test",
            "age": 30,
            "gender": "male",
            "weight": 80.0,
            "height": 180,
            "activityLevel": activity_level
        }
        
        response = test_client.post("/accounts/create", json=account_data)
        
        assert response.status_code == 200
        data = response.json()
        
        expected_bmr = 1780.0  # For these stats
        expected_calories = expected_bmr * expected_multiplier
        
        assert data["recommendedDailyCalories"] == expected_calories
