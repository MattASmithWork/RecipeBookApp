"""
Integration tests for Nutrition Tracking API endpoints.
Tests: Meal logging, nutrition goals, daily/weekly summaries
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta


class TestNutritionLoggingEndpoints:
    """Tests for nutrition logging endpoints."""
    
    @pytest.mark.integration
    def test_log_meal_success(self, test_client, mock_db, sample_nutrition_log):
        """Test successfully logging a meal."""
        response = test_client.post("/nutrition/log", json=sample_nutrition_log)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Meal logged successfully!"
        
        # Verify in database
        log = mock_db["nutrition_logs"].find_one({"user": sample_nutrition_log["user"]})
        assert log is not None
        assert log["mealType"] == "lunch"
    
    @pytest.mark.integration
    def test_log_meal_all_meal_types(self, test_client, mock_db):
        """Test logging different meal types."""
        meal_types = ["breakfast", "lunch", "dinner", "snack"]
        
        for meal_type in meal_types:
            meal_data = {
                "user": "test_user",
                "mealType": meal_type,
                "mealName": f"Test {meal_type}",
                "date": "2025-12-20",
                "nutrition": {
                    "calories": 300,
                    "protein": 20,
                    "carbs": 30,
                    "fat": 10
                },
                "servings": 1
            }
            
            response = test_client.post("/nutrition/log", json=meal_data)
            assert response.status_code == 200
        
        # Verify all logged
        logs = list(mock_db["nutrition_logs"].find({"user": "test_user"}))
        assert len(logs) == 4
    
    @pytest.mark.integration
    def test_log_meal_with_optional_nutrition(self, test_client, mock_db):
        """Test logging meal with optional nutrition fields."""
        meal_data = {
            "user": "test_user",
            "mealType": "breakfast",
            "mealName": "Oatmeal with berries",
            "date": "2025-12-20",
            "nutrition": {
                "calories": 350,
                "protein": 12,
                "carbs": 58,
                "fat": 8,
                "fiber": 10,  # Optional
                "sugar": 15,  # Optional
                "sodium": 150  # Optional
            },
            "servings": 1
        }
        
        response = test_client.post("/nutrition/log", json=meal_data)
        
        assert response.status_code == 200
        
        # Verify optional fields saved
        log = mock_db["nutrition_logs"].find_one({"user": "test_user"})
        assert log["nutrition"]["fiber"] == 10
        assert log["nutrition"]["sugar"] == 15
        assert log["nutrition"]["sodium"] == 150
    
    @pytest.mark.integration
    def test_log_meal_with_recipe_reference(self, test_client, mock_db, sample_recipe):
        """Test logging meal linked to a recipe."""
        # Create recipe
        recipe_result = mock_db["recipes"].insert_one(sample_recipe)
        
        meal_data = {
            "user": "test_user",
            "mealType": "dinner",
            "mealName": sample_recipe["name"],
            "date": "2025-12-20",
            "nutrition": {
                "calories": 650,
                "protein": 35,
                "carbs": 75,
                "fat": 22
            },
            "servings": 1,
            "recipeId": str(recipe_result.inserted_id)
        }
        
        response = test_client.post("/nutrition/log", json=meal_data)
        
        assert response.status_code == 200
        
        # Verify recipe link
        log = mock_db["nutrition_logs"].find_one({"user": "test_user"})
        assert "recipeId" in log
    
    @pytest.mark.integration
    def test_get_meal_logs_by_date(self, test_client, mock_db):
        """Test retrieving meal logs for specific date."""
        # Log multiple meals
        dates = ["2025-12-19", "2025-12-20", "2025-12-21"]
        
        for date in dates:
            meal_data = {
                "user": "test_user",
                "mealType": "lunch",
                "mealName": f"Meal on {date}",
                "date": date,
                "nutrition": {
                    "calories": 400,
                    "protein": 25,
                    "carbs": 40,
                    "fat": 15
                },
                "servings": 1
            }
            test_client.post("/nutrition/log", json=meal_data)
        
        # Get logs for specific date
        response = test_client.get("/nutrition/logs/test_user?date=2025-12-20")
        
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) == 1
        assert logs[0]["date"] == "2025-12-20"
    
    @pytest.mark.integration
    def test_get_meal_logs_date_range(self, test_client, mock_db):
        """Test retrieving meal logs for date range."""
        # Log meals over several days
        base_date = datetime(2025, 12, 15)
        
        for i in range(7):
            date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
            meal_data = {
                "user": "test_user",
                "mealType": "breakfast",
                "mealName": "Daily breakfast",
                "date": date,
                "nutrition": {
                    "calories": 350,
                    "protein": 15,
                    "carbs": 45,
                    "fat": 12
                },
                "servings": 1
            }
            test_client.post("/nutrition/log", json=meal_data)
        
        # Get logs for date range
        response = test_client.get(
            "/nutrition/logs/test_user?startDate=2025-12-17&endDate=2025-12-19"
        )
        
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) == 3  # 17th, 18th, 19th
    
    @pytest.mark.integration
    def test_update_meal_log(self, test_client, mock_db, sample_nutrition_log):
        """Test updating an existing meal log."""
        # Create log
        create_response = test_client.post("/nutrition/log", json=sample_nutrition_log)
        log_id = create_response.json()["id"]
        
        # Update log
        update_data = {
            "nutrition": {
                "calories": 500,  # Changed
                "protein": 40,  # Changed
                "carbs": 25,
                "fat": 20
            },
            "notes": "Updated portion size"
        }
        
        response = test_client.put(f"/nutrition/log/{log_id}", json=update_data)
        
        assert response.status_code == 200
        assert "updated successfully" in response.json()["message"]
        
        # Verify update
        from bson import ObjectId
        log = mock_db["nutrition_logs"].find_one({"_id": ObjectId(log_id)})
        assert log["nutrition"]["calories"] == 500
        assert log["notes"] == "Updated portion size"
    
    @pytest.mark.integration
    def test_delete_meal_log(self, test_client, mock_db, sample_nutrition_log):
        """Test deleting a meal log."""
        # Create log
        create_response = test_client.post("/nutrition/log", json=sample_nutrition_log)
        log_id = create_response.json()["id"]
        
        # Delete log
        response = test_client.delete(f"/nutrition/log/{log_id}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify deletion
        from bson import ObjectId
        log = mock_db["nutrition_logs"].find_one({"_id": ObjectId(log_id)})
        assert log is None


class TestNutritionGoalsEndpoints:
    """Tests for nutrition goals endpoints."""
    
    @pytest.mark.integration
    def test_set_nutrition_goals_success(self, test_client, mock_db, sample_nutrition_goals):
        """Test setting nutrition goals for a user."""
        response = test_client.post("/nutrition/goals", json=sample_nutrition_goals)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Nutrition goals set successfully!"
        
        # Verify in database
        goals = mock_db["user_nutrition_goals"].find_one({"user": sample_nutrition_goals["user"]})
        assert goals is not None
        assert goals["dailyCalories"] == sample_nutrition_goals["dailyCalories"]
    
    @pytest.mark.integration
    def test_set_nutrition_goals_updates_existing(self, test_client, mock_db):
        """Test that setting goals again updates existing goals."""
        goals_data = {
            "user": "test_user",
            "dailyCalories": 2000,
            "dailyProtein": 150,
            "dailyCarbs": 200,
            "dailyFat": 65
        }
        
        # Set initial goals
        test_client.post("/nutrition/goals", json=goals_data)
        
        # Update goals
        updated_goals = {
            "user": "test_user",
            "dailyCalories": 2200,
            "dailyProtein": 160,
            "dailyCarbs": 220,
            "dailyFat": 70
        }
        
        response = test_client.post("/nutrition/goals", json=updated_goals)
        
        assert response.status_code == 200
        
        # Verify only one set of goals exists (updated)
        goals = list(mock_db["user_nutrition_goals"].find({"user": "test_user"}))
        assert len(goals) == 1
        assert goals[0]["dailyCalories"] == 2200
    
    @pytest.mark.integration
    def test_get_nutrition_goals(self, test_client, mock_db, sample_nutrition_goals):
        """Test retrieving nutrition goals for a user."""
        mock_db["user_nutrition_goals"].insert_one(sample_nutrition_goals)
        
        response = test_client.get(f"/nutrition/goals/{sample_nutrition_goals['user']}")
        
        assert response.status_code == 200
        goals = response.json()
        assert goals["dailyCalories"] == sample_nutrition_goals["dailyCalories"]
    
    @pytest.mark.integration
    def test_get_nutrition_goals_not_found(self, test_client):
        """Test getting goals for user without goals set."""
        response = test_client.get("/nutrition/goals/nonexistent_user")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]


class TestNutritionSummaryEndpoints:
    """Tests for daily and weekly nutrition summaries."""
    
    @pytest.mark.integration
    def test_get_daily_summary(self, test_client, mock_db):
        """Test getting daily nutrition summary."""
        user = "test_user"
        date = "2025-12-20"
        
        # Set nutrition goals
        goals = {
            "user": user,
            "dailyCalories": 2500,
            "dailyProtein": 150,
            "dailyCarbs": 250,
            "dailyFat": 83
        }
        test_client.post("/nutrition/goals", json=goals)
        
        # Log some meals
        meals = [
            {"mealType": "breakfast", "calories": 500, "protein": 25, "carbs": 60, "fat": 15},
            {"mealType": "lunch", "calories": 700, "protein": 45, "carbs": 70, "fat": 25},
            {"mealType": "dinner", "calories": 650, "protein": 50, "carbs": 60, "fat": 22}
        ]
        
        for meal in meals:
            meal_data = {
                "user": user,
                "mealType": meal["mealType"],
                "mealName": f"Test {meal['mealType']}",
                "date": date,
                "nutrition": {
                    "calories": meal["calories"],
                    "protein": meal["protein"],
                    "carbs": meal["carbs"],
                    "fat": meal["fat"]
                },
                "servings": 1
            }
            test_client.post("/nutrition/log", json=meal_data)
        
        # Get daily summary
        response = test_client.get(f"/nutrition/daily-summary/{user}/{date}")
        
        assert response.status_code == 200
        summary = response.json()
        
        assert summary["date"] == date
        assert len(summary["meals"]) == 3
        assert summary["totalCalories"] == 1850
        assert summary["totalProtein"] == 120
        assert summary["totalCarbs"] == 190
        assert summary["totalFat"] == 62
        
        # Check progress calculations
        assert "progress" in summary
        assert "remaining" in summary
    
    @pytest.mark.integration
    def test_get_daily_summary_no_goals(self, test_client, mock_db):
        """Test daily summary when user has no goals set."""
        user = "test_user"
        date = "2025-12-20"
        
        # Log a meal
        meal_data = {
            "user": user,
            "mealType": "lunch",
            "mealName": "Test meal",
            "date": date,
            "nutrition": {
                "calories": 500,
                "protein": 30,
                "carbs": 50,
                "fat": 15
            },
            "servings": 1
        }
        test_client.post("/nutrition/log", json=meal_data)
        
        # Get summary
        response = test_client.get(f"/nutrition/daily-summary/{user}/{date}")
        
        assert response.status_code == 200
        summary = response.json()
        assert summary["totalCalories"] == 500
        # Goals should be None or empty
    
    @pytest.mark.integration
    def test_get_weekly_summary(self, test_client, mock_db):
        """Test getting weekly nutrition summary."""
        user = "test_user"
        
        # Set goals
        goals = {
            "user": user,
            "dailyCalories": 2500,
            "dailyProtein": 150,
            "dailyCarbs": 250,
            "dailyFat": 83
        }
        test_client.post("/nutrition/goals", json=goals)
        
        # Log meals for a week
        base_date = datetime(2025, 12, 14)  # Sunday
        
        for day in range(7):
            date = (base_date + timedelta(days=day)).strftime("%Y-%m-%d")
            meal_data = {
                "user": user,
                "mealType": "lunch",
                "mealName": "Daily lunch",
                "date": date,
                "nutrition": {
                    "calories": 600,
                    "protein": 40,
                    "carbs": 60,
                    "fat": 20
                },
                "servings": 1
            }
            test_client.post("/nutrition/log", json=meal_data)
        
        # Get weekly summary (ending on 2025-12-20)
        response = test_client.get(f"/nutrition/weekly-summary/{user}?endDate=2025-12-20")
        
        assert response.status_code == 200
        summary = response.json()
        
        assert "weekStart" in summary
        assert "weekEnd" in summary
        assert "dailySummaries" in summary
        assert "weeklyAverages" in summary
        assert "weeklyTotals" in summary
        
        # Should have 7 days of summaries
        assert len(summary["dailySummaries"]) == 7
    
    @pytest.mark.integration
    def test_get_weekly_summary_partial_week(self, test_client, mock_db):
        """Test weekly summary with partial data."""
        user = "test_user"
        
        # Log meals for only 3 days
        dates = ["2025-12-18", "2025-12-19", "2025-12-20"]
        
        for date in dates:
            meal_data = {
                "user": user,
                "mealType": "breakfast",
                "mealName": "Morning meal",
                "date": date,
                "nutrition": {
                    "calories": 400,
                    "protein": 20,
                    "carbs": 45,
                    "fat": 15
                },
                "servings": 1
            }
            test_client.post("/nutrition/log", json=meal_data)
        
        response = test_client.get(f"/nutrition/weekly-summary/{user}?endDate=2025-12-20")
        
        assert response.status_code == 200
        summary = response.json()
        
        # Should still return 7-day structure but some days will be empty
        assert len(summary["dailySummaries"]) == 7
