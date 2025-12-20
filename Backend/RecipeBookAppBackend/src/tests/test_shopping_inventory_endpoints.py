"""
Integration tests for Shopping List and Inventory API endpoints.
Tests: Shopping list CRUD, inventory management, consumption tracking
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId


class TestShoppingListEndpoints:
    """Tests for shopping list endpoints."""
    
    @pytest.mark.integration
    def test_add_shopping_item_success(self, test_client, mock_db, sample_shopping_item):
        """Test successfully adding item to shopping list."""
        response = test_client.post("/shopping-list", json=sample_shopping_item)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Item added to shopping list!"
        
        # Verify in database
        item = mock_db["shopping_list"].find_one({"name": sample_shopping_item["name"]})
        assert item is not None
        assert item["bought"] == False
    
    @pytest.mark.integration
    def test_get_shopping_list(self, test_client, mock_db, sample_shopping_item):
        """Test retrieving shopping list for a user."""
        mock_db["shopping_list"].insert_one(sample_shopping_item)
        
        response = test_client.get(f"/shopping-list/{sample_shopping_item['addedBy']}")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_count" in data
        assert "items" in data
        assert data["total_count"] == 1
    
    @pytest.mark.integration
    def test_mark_item_as_bought(self, test_client, mock_db, sample_shopping_item):
        """Test marking shopping list item as bought (moves to inventory)."""
        result = mock_db["shopping_list"].insert_one(sample_shopping_item)
        item_id = str(result.inserted_id)
        
        response = test_client.put(f"/shopping-list/{item_id}/mark-bought?user={sample_shopping_item['addedBy']}")
        
        assert response.status_code == 200
        assert "moved to inventory" in response.json()["message"]
        
        # Verify item removed from shopping list
        assert mock_db["shopping_list"].find_one({"_id": result.inserted_id}) is None
        
        # Verify item added to inventory
        inventory_item = mock_db["items_owned"].find_one({"name": sample_shopping_item["name"]})
        assert inventory_item is not None
    
    @pytest.mark.integration
    def test_delete_shopping_item(self, test_client, mock_db, sample_shopping_item):
        """Test deleting item from shopping list."""
        result = mock_db["shopping_list"].insert_one(sample_shopping_item)
        item_id = str(result.inserted_id)
        
        response = test_client.delete(f"/shopping-list/{item_id}?user={sample_shopping_item['addedBy']}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify deletion
        assert mock_db["shopping_list"].find_one({"_id": result.inserted_id}) is None


class TestInventoryEndpoints:
    """Tests for inventory management endpoints."""
    
    @pytest.mark.integration
    def test_add_inventory_item_success(self, test_client, mock_db, sample_inventory_item):
        """Test successfully adding item to inventory."""
        response = test_client.post("/inventory", json=sample_inventory_item)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Item added to inventory!"
        
        # Verify in database
        item = mock_db["items_owned"].find_one({"name": sample_inventory_item["name"]})
        assert item is not None
    
    @pytest.mark.integration
    def test_get_inventory(self, test_client, mock_db, sample_inventory_item):
        """Test retrieving inventory for a user."""
        mock_db["items_owned"].insert_one(sample_inventory_item)
        
        response = test_client.get(f"/inventory/{sample_inventory_item['user']}")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_count" in data
        assert "items" in data
        assert data["total_count"] == 1
    
    @pytest.mark.integration
    def test_consume_ingredient_success(self, test_client, mock_db):
        """Test consuming ingredient from inventory."""
        # Add item to inventory
        inventory_item = {
            "name": "Flour",
            "amount": 5.0,
            "unit": "kg",
            "lowStockThreshold": 1.0,
            "category": "baking",
            "user": "test_user"
        }
        mock_db["items_owned"].insert_one(inventory_item)
        
        # Consume some
        consume_data = {
            "name": "Flour",
            "amount": 2.0,
            "unit": "kg"
        }
        
        response = test_client.post("/inventory/consume-ingredient", json=consume_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Ingredient consumed successfully!"
        assert data["newAmount"] == 3.0
        
        # Verify in database
        item = mock_db["items_owned"].find_one({"name": "Flour"})
        assert item["amount"] == 3.0
    
    @pytest.mark.integration
    def test_consume_ingredient_removes_when_empty(self, test_client, mock_db):
        """Test that ingredient is removed when fully consumed."""
        inventory_item = {
            "name": "Sugar",
            "amount": 1.0,
            "unit": "kg",
            "lowStockThreshold": 0.5,
            "category": "baking",
            "user": "test_user"
        }
        mock_db["items_owned"].insert_one(inventory_item)
        
        # Consume all
        consume_data = {"name": "Sugar", "amount": 1.0, "unit": "kg"}
        response = test_client.post("/inventory/consume-ingredient", json=consume_data)
        
        assert response.status_code == 200
        assert "removed" in response.json()["message"]
        
        # Verify removal
        assert mock_db["items_owned"].find_one({"name": "Sugar"}) is None
    
    @pytest.mark.integration
    def test_consume_ingredient_not_found(self, test_client):
        """Test consuming non-existent ingredient."""
        consume_data = {"name": "Nonexistent", "amount": 1.0, "unit": "kg"}
        response = test_client.post("/inventory/consume-ingredient", json=consume_data)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_consume_ingredient_insufficient_amount(self, test_client, mock_db):
        """Test consuming more than available."""
        inventory_item = {
            "name": "Salt",
            "amount": 0.5,
            "unit": "kg",
            "lowStockThreshold": 0.1,
            "category": "spices",
            "user": "test_user"
        }
        mock_db["items_owned"].insert_one(inventory_item)
        
        consume_data = {"name": "Salt", "amount": 1.0, "unit": "kg"}
        response = test_client.post("/inventory/consume-ingredient", json=consume_data)
        
        assert response.status_code == 400
        assert "Insufficient" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_get_low_stock_items(self, test_client, mock_db):
        """Test retrieving items below low stock threshold."""
        # Add items with varying stock levels
        items = [
            {"name": "Flour", "amount": 0.3, "unit": "kg", "lowStockThreshold": 1.0, 
             "category": "baking", "user": "test_user"},
            {"name": "Sugar", "amount": 2.0, "unit": "kg", "lowStockThreshold": 1.0,
             "category": "baking", "user": "test_user"},
            {"name": "Salt", "amount": 0.05, "unit": "kg", "lowStockThreshold": 0.1,
             "category": "spices", "user": "test_user"}
        ]
        mock_db["items_owned"].insert_many(items)
        
        response = test_client.get("/inventory/low-stock")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Flour and Salt are low
        
        # Check percentRemaining is calculated
        for item in data:
            assert "percentRemaining" in item
            assert item["percentRemaining"] < 100
    
    @pytest.mark.integration
    def test_update_item_amount(self, test_client, mock_db, sample_inventory_item):
        """Test updating inventory item amount."""
        result = mock_db["items_owned"].insert_one(sample_inventory_item)
        item_id = str(result.inserted_id)
        
        update_data = {"itemId": item_id, "amount": 5.0}
        response = test_client.put("/inventory/update-amount", json=update_data)
        
        assert response.status_code == 200
        assert "updated successfully" in response.json()["message"]
        
        # Verify update
        item = mock_db["items_owned"].find_one({"_id": result.inserted_id})
        assert item["amount"] == 5.0
    
    @pytest.mark.integration
    def test_delete_inventory_item(self, test_client, mock_db, sample_inventory_item):
        """Test deleting item from inventory."""
        result = mock_db["items_owned"].insert_one(sample_inventory_item)
        item_id = str(result.inserted_id)
        
        response = test_client.delete(f"/inventory/{item_id}?user={sample_inventory_item['user']}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify deletion
        assert mock_db["items_owned"].find_one({"_id": result.inserted_id}) is None


class TestRecipeConsumption:
    """Tests for consuming recipe ingredients from inventory."""
    
    @pytest.mark.integration
    def test_consume_recipe_success(self, test_client, mock_db):
        """Test consuming all ingredients for a recipe."""
        # Create recipe
        recipe = {
            "name": "Simple Pasta",
            "ingredients": ["pasta", "tomato sauce", "cheese"],
            "instructions": ["Cook pasta", "Add sauce", "Top with cheese"],
            "prep_time": 5,
            "cook_time": 15,
            "servings": 2,
            "user": "test_user"
        }
        recipe_result = mock_db["recipes"].insert_one(recipe)
        
        # Add ingredients to inventory
        inventory_items = [
            {"name": "pasta", "amount": 500, "unit": "g", "lowStockThreshold": 100,
             "category": "pasta", "user": "test_user"},
            {"name": "tomato sauce", "amount": 800, "unit": "ml", "lowStockThreshold": 200,
             "category": "sauces", "user": "test_user"},
            {"name": "cheese", "amount": 300, "unit": "g", "lowStockThreshold": 50,
             "category": "dairy", "user": "test_user"}
        ]
        mock_db["items_owned"].insert_many(inventory_items)
        
        # Consume recipe
        consume_data = {
            "recipeId": str(recipe_result.inserted_id),
            "servings": 1
        }
        
        response = test_client.post("/inventory/consume-recipe", json=consume_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "consumed" in data["message"]
    
    @pytest.mark.integration
    def test_consume_recipe_not_found(self, test_client):
        """Test consuming non-existent recipe."""
        fake_id = str(ObjectId())
        consume_data = {"recipeId": fake_id, "servings": 1}
        
        response = test_client.post("/inventory/consume-recipe", json=consume_data)
        assert response.status_code == 404
