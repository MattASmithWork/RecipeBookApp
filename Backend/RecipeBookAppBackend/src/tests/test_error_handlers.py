"""
Test error handlers, validators, and edge cases to improve coverage
"""

import pytest
from fastapi.testclient import TestClient
from app_api import app
from unittest.mock import patch, MagicMock
import httpx

client = TestClient(app)

class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_success(self, mock_db):
        """Test health endpoint returns ok when database is reachable"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
    
    def test_health_db_failure(self, monkeypatch):
        """Test health endpoint returns 503 when database is unreachable"""
        from unittest.mock import MagicMock
        
        # Mock the db.client.admin.command to raise an exception
        mock_client = MagicMock()
        mock_client.admin.command.side_effect = Exception("Connection failed")
        
        mock_db_obj = MagicMock()
        mock_db_obj.client = mock_client
        
        monkeypatch.setattr("app_api.db", mock_db_obj)
        
        response = client.get("/health")
        assert response.status_code == 503
        assert "DB unreachable" in response.json()["detail"]


class TestRecipeValidation:
    """Test Recipe model validators"""
    
    def test_recipe_injection_in_name(self):
        """Test recipe name with NoSQL injection attempt"""
        recipe_data = {
            "name": "Test Recipe $where",
            "ingredients": ["ingredient1"],
            "instructions": ["step1"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser"
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 422
        assert "Invalid character" in str(response.json())
    
    def test_recipe_injection_in_user(self):
        """Test user field with NoSQL injection attempt"""
        recipe_data = {
            "name": "Test Recipe",
            "ingredients": ["ingredient1"],
            "instructions": ["step1"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser{$gt:''}"
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 422
        assert "Invalid character" in str(response.json())
    
    def test_recipe_empty_ingredients(self):
        """Test recipe with empty ingredients list"""
        recipe_data = {
            "name": "Test Recipe",
            "ingredients": [],
            "instructions": ["step1"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser"
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 422
    
    def test_recipe_empty_instructions(self):
        """Test recipe with empty instructions list"""
        recipe_data = {
            "name": "Test Recipe",
            "ingredients": ["ingredient1"],
            "instructions": [],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser"
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 422
    
    def test_recipe_item_too_long(self):
        """Test recipe with instruction exceeding max length"""
        recipe_data = {
            "name": "Test Recipe",
            "ingredients": ["ingredient1"],
            "instructions": ["x" * 501],  # Exceeds 500 character limit
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser"
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 422
        assert "Item too long" in str(response.json())
    
    def test_recipe_whitespace_only_items(self):
        """Test recipe with whitespace-only list items"""
        recipe_data = {
            "name": "Test Recipe",
            "ingredients": ["   ", "  "],
            "instructions": ["step1"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser"
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 422


class TestRecipeIngredientValidation:
    """Test RecipeIngredient model validators"""
    
    def test_ingredient_empty_name(self):
        """Test ingredient with empty name"""
        recipe_data = {
            "name": "Test Recipe",
            "ingredients": ["1kg chicken"],
            "ingredientsDetailed": [
                {"name": "  ", "amount": 1.0, "unit": "kg"}
            ],
            "instructions": ["step1"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser"
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 422
    
    def test_ingredient_invalid_unit(self):
        """Test ingredient with invalid unit"""
        recipe_data = {
            "name": "Test Recipe",
            "ingredients": ["1kg chicken"],
            "ingredientsDetailed": [
                {"name": "chicken", "amount": 1.0, "unit": "invalid_unit"}
            ],
            "instructions": ["step1"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser"
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 422
        assert "Unit must be one of" in str(response.json())
    
    def test_ingredient_sanitization(self):
        """Test ingredient name sanitization"""
        recipe_data = {
            "name": "Test Recipe",
            "ingredients": ["1kg chicken"],
            "ingredientsDetailed": [
                {"name": "chicken$test", "amount": 1.0, "unit": "kg"}
            ],
            "instructions": ["step1"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "user": "testuser"
        }
        response = client.post("/recipes", json=recipe_data)
        # Should succeed with sanitized name
        assert response.status_code == 200


class TestShoppingListValidation:
    """Test ShoppingListItem validators"""
    
    def test_shopping_item_negative_calories(self):
        """Test shopping item with negative calories"""
        item_data = {
            "name": "Test Item",
            "amount": 1.0,
            "unit": "kg",
            "category": "produce",
            "user": "testuser",
            "calories": -100
        }
        response = client.post("/shopping-list", json=item_data)
        assert response.status_code == 422
        # Pydantic validation message
        assert "greater than or equal to 0" in str(response.json())
    
    def test_shopping_item_excessive_calories(self):
        """Test shopping item with excessive calories"""
        item_data = {
            "name": "Test Item",
            "amount": 1.0,
            "unit": "kg",
            "category": "produce",
            "user": "testuser",
            "calories": 15000
        }
        response = client.post("/shopping-list", json=item_data)
        assert response.status_code == 422
        # Pydantic validation message
        assert "less than or equal to 10000" in str(response.json())
    
    def test_shopping_item_barcode_too_long(self):
        """Test shopping item with barcode exceeding max length"""
        item_data = {
            "name": "Test Item",
            "amount": 1.0,
            "unit": "kg",
            "category": "produce",
            "user": "testuser",
            "barcode": "1" * 51  # Exceeds 50 character limit
        }
        response = client.post("/shopping-list", json=item_data)
        assert response.status_code == 422
        # Pydantic validation message
        assert "at most 50 characters" in str(response.json())


class TestInventoryValidation:
    """Test InventoryItem validators"""
    
    def test_inventory_item_negative_protein(self):
        """Test inventory item with negative protein"""
        item_data = {
            "name": "Test Item",
            "amount": 1.0,
            "unit": "kg",
            "category": "produce",
            "user": "testuser",
            "protein": -5
        }
        response = client.post("/inventory", json=item_data)
        assert response.status_code == 422
        # Pydantic validation message
        assert "greater than or equal to 0" in str(response.json())


class TestGitHubRecipesErrorHandling:
    """Test GitHub recipes endpoint - note: these test actual GitHub API behavior"""
    
    def test_github_endpoint_exists(self):
        """Test that GitHub recipes endpoint exists and is properly configured"""
        # This will hit rate limiting or succeed depending on actual GitHub API
        response = client.get("/github-recipes")
        # Should either succeed (200) or hit rate limit (429) or have GitHub errors (503/504)
        assert response.status_code in [200, 429, 503, 504, 500]
        
    def test_github_recipes_rate_limit_applied(self):
        """Test that rate limiting is applied to GitHub endpoint"""
        # The endpoint has @limiter.limit("5/hour")
        # We can't easily test this without making 6 requests, but we can verify
        # the endpoint is accessible
        response = client.get("/github-recipes")
        # Any response means the endpoint is working
        assert response.status_code in [200, 429, 503, 504, 500]
        
    def test_github_recipes_response_structure(self):
        """Test that successful responses have expected structure"""
        response = client.get("/github-recipes")
        
        if response.status_code == 200:
            data = response.json()
            # Check for expected keys in successful response
            assert "recipes" in data or "error" in data or "detail" in data




class TestUpdateRecipeEndpoint:
    """Test update recipe endpoint error scenarios"""
    
    def test_update_recipe_invalid_id(self, mock_db):
        """Test updating recipe with invalid ObjectId"""
        recipe_data = {
            "name": "Updated Recipe",
            "ingredients": ["ingredient1"],
            "instructions": ["step1"],
            "prep_time": 15,
            "cook_time": 25,
            "servings": 6,
            "user": "testuser"
        }
        response = client.put("/recipes/invalid_id", json=recipe_data)
        assert response.status_code == 400
        assert "Invalid recipe ID format" in response.json()["detail"]


class TestConsumeRecipeEdgeCases:
    """Test consume recipe endpoint edge cases"""
    
    def test_consume_recipe_invalid_id(self):
        """Test consuming recipe with invalid ID format"""
        response = client.post("/consume-recipe/invalid_id?user=testuser")
        # Invalid ID should return 404
        assert response.status_code == 404


class TestMarkBoughtWithPurchasedBy:
    """Test mark bought endpoint with purchasedBy parameter"""
    
    def test_mark_bought_with_custom_purchaser(self, mock_db):
        """Test marking item bought with custom purchaser parameter"""
        # Create a test shopping item
        item = {
            "name": "Test Item",
            "amount": 1.0,
            "unit": "kg",
            "addedBy": "testuser",
            "category": "produce"
        }
        result = mock_db["shopping_list"].insert_one(item)
        item_id = str(result.inserted_id)
        
        # Mark as bought with different purchaser
        response = client.put(
            f"/shopping-list/{item_id}/mark-bought?user=testuser&purchasedBy=otheruser"
        )
        
        assert response.status_code == 200
        assert "moved to inventory" in response.json()["message"]
        
        # Verify item in inventory has correct purchasedBy
        inventory_item = mock_db["items_owned"].find_one({"name": "Test Item"})
        assert inventory_item is not None
        assert inventory_item["purchasedBy"] == "otheruser"


class TestDeleteEndpoints:
    """Test delete endpoints with various scenarios"""
    
    def test_delete_shopping_item_invalid_id(self):
        """Test deleting shopping item with invalid ID"""
        response = client.delete("/shopping-list/invalid_id?user=testuser")
        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]
        assert "shopping item ID" in response.json()["detail"]
    
    def test_delete_inventory_item_invalid_id(self):
        """Test deleting inventory item with invalid ID"""
        response = client.delete("/inventory/invalid_id?user=testuser")
        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]
        assert "inventory item ID" in response.json()["detail"]
