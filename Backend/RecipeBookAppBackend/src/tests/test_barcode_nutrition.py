"""
Integration tests for Barcode Scanning and Nutrition Tracking features.
Tests: Barcode lookup, nutrition data storage, shopping to inventory with nutrition
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import httpx


class TestBarcodeLookupEndpoint:
    """Tests for barcode lookup endpoint using Open Food Facts API."""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_barcode_lookup_success(self, test_client):
        """Test successful barcode lookup with valid product."""
        # Mock httpx response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": 1,
            "product": {
                "product_name": "Coca-Cola",
                "brands": "Coca-Cola",
                "nutriments": {
                    "energy-kcal_100g": 42,
                    "proteins_100g": 0,
                    "carbohydrates_100g": 10.6,
                    "fat_100g": 0
                },
                "serving_size": "100ml",
                "image_url": "https://example.com/image.jpg",
                "categories": "Beverages"
            }
        }
        
        with patch('app_api.httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            response = test_client.get("/barcode/737628064502")
            
            assert response.status_code == 200
            data = response.json()
            assert data["found"] == True
            assert data["product"]["name"] == "Coca-Cola"
            assert data["product"]["brand"] == "Coca-Cola"
            assert data["product"]["barcode"] == "737628064502"
            assert data["product"]["calories"] == 42
            assert data["product"]["protein"] == 0
            assert data["product"]["carbs"] == 10.6
            assert data["product"]["fat"] == 0
            assert data["product"]["servingSize"] == "100ml"
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_barcode_lookup_not_found(self, test_client):
        """Test barcode lookup when product doesn't exist."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": 0
        }
        
        with patch('app_api.httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            response = test_client.get("/barcode/0000000000000")
            
            assert response.status_code == 200
            data = response.json()
            assert data["found"] == False
            assert "not found" in data["message"].lower()
    
    @pytest.mark.integration
    def test_barcode_lookup_invalid_format_short(self, test_client):
        """Test barcode lookup with invalid barcode (too short)."""
        response = test_client.get("/barcode/123")
        
        assert response.status_code == 400
        assert "Invalid barcode format" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_barcode_lookup_invalid_format_long(self, test_client):
        """Test barcode lookup with invalid barcode (too long)."""
        response = test_client.get("/barcode/12345678901234")
        
        assert response.status_code == 400
        assert "Invalid barcode format" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_barcode_lookup_invalid_format_non_numeric(self, test_client):
        """Test barcode lookup with non-numeric barcode."""
        response = test_client.get("/barcode/abc123defgh")
        
        assert response.status_code == 400
        assert "Invalid barcode format" in response.json()["detail"]
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_barcode_lookup_api_timeout(self, test_client):
        """Test barcode lookup when Open Food Facts API times out."""
        with patch('app_api.httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.TimeoutException("Timeout")
            )
            
            response = test_client.get("/barcode/737628064502")
            
            assert response.status_code == 504
            assert "timeout" in response.json()["detail"].lower()
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_barcode_lookup_api_connection_error(self, test_client):
        """Test barcode lookup when API connection fails."""
        with patch('app_api.httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.RequestError("Connection failed")
            )
            
            response = test_client.get("/barcode/737628064502")
            
            assert response.status_code == 503
            assert "Failed to connect" in response.json()["detail"]
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_barcode_lookup_missing_nutrition_data(self, test_client):
        """Test barcode lookup with product missing some nutrition data."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": 1,
            "product": {
                "product_name": "Test Product",
                "brands": "Test Brand",
                "nutriments": {},  # Empty nutrition data
                "serving_size": "",
                "image_url": "",
                "categories": ""
            }
        }
        
        with patch('app_api.httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            response = test_client.get("/barcode/123456789012")
            
            assert response.status_code == 200
            data = response.json()
            assert data["found"] == True
            # Should default to 0 for missing nutrition
            assert data["product"]["calories"] == 0
            assert data["product"]["protein"] == 0
            assert data["product"]["carbs"] == 0
            assert data["product"]["fat"] == 0


class TestShoppingListWithNutrition:
    """Tests for shopping list with nutrition data."""
    
    @pytest.fixture
    def shopping_item_with_nutrition(self):
        """Shopping item with barcode and nutrition data."""
        return {
            "name": "Coca-Cola",
            "amount": 1,
            "unit": "unit",
            "estimatedPrice": 1.50,
            "category": "beverages",
            "addedBy": "test_user",
            "barcode": "737628064502",
            "calories": 42,
            "protein": 0,
            "carbs": 10.6,
            "fat": 0,
            "servingSize": "100ml"
        }
    
    @pytest.mark.integration
    def test_add_shopping_item_with_nutrition(self, test_client, mock_db, shopping_item_with_nutrition):
        """Test adding shopping item with nutrition data."""
        response = test_client.post("/shopping-list", json=shopping_item_with_nutrition)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Verify nutrition data stored
        item = mock_db["shopping_list"].find_one({"name": shopping_item_with_nutrition["name"]})
        assert item is not None
        assert item["barcode"] == "737628064502"
        assert item["calories"] == 42
        assert item["protein"] == 0
        assert item["carbs"] == 10.6
        assert item["fat"] == 0
        assert item["servingSize"] == "100ml"
    
    @pytest.mark.integration
    def test_add_shopping_item_without_nutrition(self, test_client, mock_db):
        """Test adding shopping item without nutrition data (backward compatibility)."""
        item_without_nutrition = {
            "name": "Tomatoes",
            "amount": 5,
            "unit": "unit",
            "estimatedPrice": 3.50,
            "category": "vegetables",
            "addedBy": "test_user"
        }
        
        response = test_client.post("/shopping-list", json=item_without_nutrition)
        
        assert response.status_code == 200
        
        # Verify item added without nutrition fields
        item = mock_db["shopping_list"].find_one({"name": "Tomatoes"})
        assert item is not None
        assert "barcode" not in item or item.get("barcode") is None
        assert "calories" not in item or item.get("calories") is None
    
    @pytest.mark.integration
    def test_mark_bought_preserves_nutrition(self, test_client, mock_db, shopping_item_with_nutrition):
        """Test that marking item as bought preserves nutrition data in inventory."""
        # Add item to shopping list
        result = mock_db["shopping_list"].insert_one(shopping_item_with_nutrition)
        item_id = str(result.inserted_id)
        
        # Mark as bought (transaction mock is set up in conftest.py fixture)
        response = test_client.put(
            f"/shopping-list/{item_id}/mark-bought",
            params={"user": "test_user", "purchasedBy": "test_user"}
        )
        
        assert response.status_code == 200
        
        # Verify item removed from shopping list
        shopping_item = mock_db["shopping_list"].find_one({"_id": result.inserted_id})
        assert shopping_item is None
        
        # Verify item in inventory with nutrition data
        inventory_item = mock_db["items_owned"].find_one({"name": "Coca-Cola"})
        assert inventory_item is not None
        assert inventory_item["barcode"] == "737628064502"
        assert inventory_item["calories"] == 42
        assert inventory_item["protein"] == 0
        assert inventory_item["carbs"] == 10.6
        assert inventory_item["fat"] == 0
        assert inventory_item["servingSize"] == "100ml"
        assert inventory_item["purchasedBy"] == "test_user"
        assert "purchasedAt" in inventory_item



class TestInventoryWithNutrition:
    """Tests for inventory with nutrition tracking."""
    
    @pytest.fixture
    def inventory_item_with_nutrition(self):
        """Inventory item with nutrition data."""
        return {
            "name": "Greek Yogurt",
            "amount": 500,
            "unit": "g",
            "category": "dairy",
            "user": "test_user",
            "barcode": "1234567890123",
            "calories": 59,
            "protein": 10.3,
            "carbs": 3.6,
            "fat": 0.4,
            "servingSize": "100g"
        }
    
    @pytest.mark.integration
    def test_add_inventory_item_with_nutrition(self, test_client, mock_db, inventory_item_with_nutrition):
        """Test adding inventory item with nutrition data."""
        response = test_client.post("/inventory", json=inventory_item_with_nutrition)
        
        assert response.status_code == 200
        
        # Verify nutrition data stored
        item = mock_db["items_owned"].find_one({"name": "Greek Yogurt"})
        assert item is not None
        assert item["barcode"] == "1234567890123"
        assert item["calories"] == 59
        assert item["protein"] == 10.3
        assert item["carbs"] == 3.6
        assert item["fat"] == 0.4
        assert item["servingSize"] == "100g"
    
    @pytest.mark.integration
    def test_get_inventory_includes_nutrition(self, test_client, mock_db, inventory_item_with_nutrition):
        """Test that getting inventory returns nutrition data."""
        mock_db["items_owned"].insert_one(inventory_item_with_nutrition)
        
        response = test_client.get(f"/inventory/{inventory_item_with_nutrition['user']}")
        
        assert response.status_code == 200
        data = response.json()
        items = data.get('items', data)
        
        assert len(items) > 0
        yogurt = next((item for item in items if item["name"] == "Greek Yogurt"), None)
        assert yogurt is not None
        assert yogurt["barcode"] == "1234567890123"
        assert yogurt["calories"] == 59
        assert yogurt["protein"] == 10.3


class TestNutritionDataValidation:
    """Tests for nutrition data validation in models."""
    
    @pytest.mark.integration
    def test_shopping_item_negative_calories_rejected(self, test_client):
        """Test that negative calories are rejected."""
        invalid_item = {
            "name": "Test Item",
            "amount": 1,
            "unit": "unit",
            "calories": -100  # Invalid
        }
        
        response = test_client.post("/shopping-list", json=invalid_item)
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.integration
    def test_shopping_item_excessive_calories_rejected(self, test_client):
        """Test that excessive calories are rejected."""
        invalid_item = {
            "name": "Test Item",
            "amount": 1,
            "unit": "unit",
            "calories": 20000  # Exceeds 10000 limit
        }
        
        response = test_client.post("/shopping-list", json=invalid_item)
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.integration
    def test_shopping_item_barcode_too_long(self, test_client):
        """Test that excessively long barcodes are rejected."""
        invalid_item = {
            "name": "Test Item",
            "amount": 1,
            "unit": "unit",
            "barcode": "1" * 60  # Exceeds 50 character limit
        }
        
        response = test_client.post("/shopping-list", json=invalid_item)
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.integration
    def test_inventory_item_negative_protein_rejected(self, test_client):
        """Test that negative protein values are rejected."""
        invalid_item = {
            "name": "Test Item",
            "amount": 1,
            "unit": "kg",
            "protein": -5  # Invalid
        }
        
        response = test_client.post("/inventory", json=invalid_item)
        
        assert response.status_code == 422  # Validation error


class TestBarcodeIntegrationWorkflow:
    """End-to-end tests for complete barcode scanning workflow."""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_complete_barcode_workflow(self, test_client, mock_db):
        """
        Test complete workflow: 
        1. Scan barcode
        2. Add to shopping list with nutrition
        3. Mark as bought
        4. Verify in inventory with nutrition
        """
        from unittest.mock import patch, MagicMock, AsyncMock
        
        # Step 1: Mock barcode lookup
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": 1,
            "product": {
                "product_name": "Red Bull",
                "brands": "Red Bull",
                "nutriments": {
                    "energy-kcal_100g": 45,
                    "proteins_100g": 0,
                    "carbohydrates_100g": 11,
                    "fat_100g": 0
                },
                "serving_size": "250ml",
                "image_url": "https://example.com/redbull.jpg",
                "categories": "Energy drinks"
            }
        }
        
        with patch('app_api.httpx.AsyncClient') as mock_client_http:
            mock_client_http.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            # Lookup barcode
            lookup_response = test_client.get("/barcode/8712566336470")
            assert lookup_response.status_code == 200
            product = lookup_response.json()["product"]
            
            # Step 2: Add to shopping list with nutrition data
            shopping_item = {
                "name": product["name"],
                "amount": 1,
                "unit": "unit",
                "estimatedPrice": 2.00,
                "category": "beverages",
                "addedBy": "test_user",
                "barcode": product["barcode"],
                "calories": product["calories"],
                "protein": product["protein"],
                "carbs": product["carbs"],
                "fat": product["fat"],
                "servingSize": product["servingSize"]
            }
            
            add_response = test_client.post("/shopping-list", json=shopping_item)
            assert add_response.status_code == 200
            item_id = add_response.json()["id"]
            
            # Step 3: Mark as bought (transaction mock is set up in conftest.py fixture)
            bought_response = test_client.put(
                f"/shopping-list/{item_id}/mark-bought",
                params={"user": "test_user", "purchasedBy": "test_user"}
            )
            assert bought_response.status_code == 200
            
            # Step 4: Verify in inventory with all nutrition data
            inventory_response = test_client.get("/inventory/test_user")
            assert inventory_response.status_code == 200
            
            inventory_data = inventory_response.json()
            inventory_items = inventory_data.get('items', inventory_data)
            redbull = next((item for item in inventory_items if item["name"] == "Red Bull"), None)
            
            assert redbull is not None
            assert redbull["barcode"] == "8712566336470"
            assert redbull["calories"] == 45
            assert redbull["protein"] == 0
            assert redbull["carbs"] == 11
            assert redbull["fat"] == 0
            assert redbull["servingSize"] == "250ml"
            assert redbull["purchasedBy"] == "test_user"
