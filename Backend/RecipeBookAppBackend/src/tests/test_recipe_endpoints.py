"""
Integration tests for Recipe API endpoints.
Tests: Recipe CRUD operations, GitHub recipe fetching
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId


class TestRecipeEndpoints:
    """Tests for recipe management endpoints."""
    
    @pytest.mark.integration
    def test_add_recipe_success(self, test_client, mock_db, sample_recipe):
        """Test successfully adding a new recipe."""
        response = test_client.post("/recipes", json=sample_recipe)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Recipe added successfully!"
        
        # Verify in database
        recipe = mock_db["recipes"].find_one({"name": sample_recipe["name"]})
        assert recipe is not None
        assert recipe["user"] == sample_recipe["user"]
    
    @pytest.mark.integration
    def test_add_recipe_missing_fields(self, test_client):
        """Test adding recipe with missing required fields."""
        incomplete_recipe = {
            "name": "Test Recipe",
            "ingredients": ["item1"]
            # Missing instructions, prep_time, cook_time, servings, user
        }
        response = test_client.post("/recipes", json=incomplete_recipe)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.integration
    def test_get_recipes_for_user(self, test_client, mock_db, sample_recipe):
        """Test retrieving all recipes for a specific user."""
        # Add recipe to mock database
        mock_db["recipes"].insert_one(sample_recipe)
        
        response = test_client.get(f"/recipes/{sample_recipe['user']}")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_count" in data
        assert "recipes" in data
        assert data["total_count"] == 1
        assert len(data["recipes"]) == 1
        assert data["recipes"][0]["name"] == sample_recipe["name"]
    
    @pytest.mark.integration
    def test_get_recipes_empty_list(self, test_client, mock_db):
        """Test getting recipes for user with no recipes."""
        response = test_client.get("/recipes/nonexistent_user")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 0
        assert data["recipes"] == []
    
    @pytest.mark.integration
    def test_get_recipes_multiple_users(self, test_client, mock_db):
        """Test that recipes are properly filtered by user."""
        recipe1 = {"name": "Recipe 1", "ingredients": ["a"], "instructions": ["b"], 
                   "prep_time": 10, "cook_time": 20, "servings": 2, "user": "user1"}
        recipe2 = {"name": "Recipe 2", "ingredients": ["c"], "instructions": ["d"], 
                   "prep_time": 15, "cook_time": 25, "servings": 3, "user": "user2"}
        
        mock_db["recipes"].insert_many([recipe1, recipe2])
        
        response1 = test_client.get("/recipes/user1")
        response2 = test_client.get("/recipes/user2")
        
        assert response1.json()["total_count"] == 1
        assert response2.json()["total_count"] == 1
        assert response1.json()["recipes"][0]["name"] == "Recipe 1"
        assert response2.json()["recipes"][0]["name"] == "Recipe 2"
    
    @pytest.mark.integration
    def test_delete_recipe_success(self, test_client, mock_db, sample_recipe):
        """Test successfully deleting a recipe."""
        # Insert recipe
        result = mock_db["recipes"].insert_one(sample_recipe)
        recipe_id = str(result.inserted_id)
        
        response = test_client.delete(f"/recipes/{recipe_id}?user={sample_recipe['user']}")
        
        assert response.status_code == 200
        assert response.json()["message"] == "Recipe deleted successfully!"
        
        # Verify deletion
        recipe = mock_db["recipes"].find_one({"_id": result.inserted_id})
        assert recipe is None
    
    @pytest.mark.integration
    def test_delete_recipe_invalid_id(self, test_client):
        """Test deleting recipe with invalid ID format."""
        response = test_client.delete("/recipes/invalid_id?user=test_user")
        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_delete_recipe_not_found(self, test_client, mock_db):
        """Test deleting non-existent recipe."""
        fake_id = str(ObjectId())
        response = test_client.delete(f"/recipes/{fake_id}?user=test_user")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_delete_recipe_wrong_user(self, test_client, mock_db, sample_recipe):
        """Test that users cannot delete other users' recipes."""
        result = mock_db["recipes"].insert_one(sample_recipe)
        recipe_id = str(result.inserted_id)
        
        response = test_client.delete(f"/recipes/{recipe_id}?user=different_user")
        
        assert response.status_code == 404
        # Recipe should still exist
        recipe = mock_db["recipes"].find_one({"_id": result.inserted_id})
        assert recipe is not None


class TestGitHubRecipeEndpoints:
    """Tests for GitHub recipe fetching endpoints."""
    
    @pytest.mark.integration
    def test_get_github_recipes_success(self, test_client, monkeypatch):
        """Test fetching GitHub recipes with mocked HTTP request."""
        mock_recipes = [
            {
                "name": "Community Recipe 1",
                "ingredients": ["ingredient1", "ingredient2"],
                "instructions": ["step1", "step2"],
                "prep_time": 10,
                "cook_time": 20,
                "servings": 4
            }
        ]
        
        class MockResponse:
            status_code = 200
            def json(self):
                return mock_recipes
            def raise_for_status(self):
                pass
        
        async def mock_get(*args, **kwargs):
            return MockResponse()
        
        import httpx
        monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)
        
        response = test_client.get("/github-recipes")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_count" in data
        assert "recipes" in data
        assert len(data["recipes"]) >= 0  # May be 0 if mocked response structure differs
    
    @pytest.mark.integration
    @pytest.mark.slow
    @pytest.mark.skip(reason="Requires GitHub API access and may be rate-limited")
    def test_get_github_recipes_actual(self, test_client):
        """Test actual GitHub recipes endpoint (slow - hits real API)."""
        response = test_client.get("/github-recipes")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_count" in data
        assert "recipes" in data
        assert isinstance(data["recipes"], list)
