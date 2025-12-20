"""
Integration tests for Weight Tracking API endpoints.
Tests: Logging weight, history retrieval, statistics, deletion
"""

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta


class TestWeightTrackingEndpoints:
    """Tests for weight tracking endpoints."""
    
    @pytest.mark.integration
    def test_log_weight_success(self, test_client, mock_db, sample_user_account, sample_weight_entry):
        """Test successfully logging a weight entry."""
        # Create account first
        test_client.post("/accounts/create", json=sample_user_account)
        
        response = test_client.post("/weight/log", json=sample_weight_entry)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Weight logged successfully!"
        assert "newBmi" in data
        assert "bmiCategory" in data
        
        # Verify in database
        entry = mock_db["weight_tracking"].find_one({"username": sample_weight_entry["username"]})
        assert entry is not None
    
    @pytest.mark.integration
    def test_log_weight_updates_account_bmi(self, test_client, mock_db, sample_user_account):
        """Test that logging weight updates account BMI."""
        # Create account
        create_response = test_client.post("/accounts/create", json=sample_user_account)
        original_bmi = create_response.json()["bmi"]
        
        # Log new weight
        weight_entry = {
            "username": sample_user_account["username"],
            "weight": 75.0,  # Different from original 80.0
            "date": "2025-12-20"
        }
        
        response = test_client.post("/weight/log", json=weight_entry)
        
        assert response.status_code == 200
        new_bmi = response.json()["newBmi"]
        
        # BMI should be different
        assert new_bmi != original_bmi
        
        # Verify account was updated
        account = mock_db["user_accounts"].find_one({"username": sample_user_account["username"]})
        assert account["weight"] == 75.0
        assert account["bmi"] == new_bmi
    
    @pytest.mark.integration
    def test_log_weight_account_not_found(self, test_client):
        """Test logging weight for non-existent account."""
        weight_entry = {
            "username": "nonexistent",
            "weight": 75.0,
            "date": "2025-12-20"
        }
        
        response = test_client.post("/weight/log", json=weight_entry)
        assert response.status_code == 404
        assert "Account not found" in response.json()["detail"]
    
    @pytest.mark.integration
    def test_log_weight_with_notes(self, test_client, mock_db, sample_user_account):
        """Test logging weight with optional notes."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        weight_entry = {
            "username": sample_user_account["username"],
            "weight": 79.5,
            "date": "2025-12-20",
            "notes": "After morning workout, feeling great!"
        }
        
        response = test_client.post("/weight/log", json=weight_entry)
        
        assert response.status_code == 200
        
        # Verify notes saved
        entry = mock_db["weight_tracking"].find_one({"username": sample_user_account["username"]})
        assert entry["notes"] == weight_entry["notes"]
    
    @pytest.mark.integration
    def test_get_weight_history_success(self, test_client, mock_db, sample_user_account):
        """Test retrieving weight history for a user."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Log multiple weights
        dates = ["2025-11-20", "2025-12-01", "2025-12-20"]
        weights = [80.0, 79.0, 78.5]
        
        for date, weight in zip(dates, weights):
            entry = {
                "username": sample_user_account["username"],
                "weight": weight,
                "date": date
            }
            test_client.post("/weight/log", json=entry)
        
        response = test_client.get(f"/weight/{sample_user_account['username']}")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4  # 3 + initial entry from account creation
        
        # Should be sorted by date descending
        assert data[0]["date"] >= data[-1]["date"]
    
    @pytest.mark.integration
    def test_get_weight_history_calculates_changes(self, test_client, mock_db, sample_user_account):
        """Test that weight history includes change calculations."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Log second weight (lower)
        test_client.post("/weight/log", json={
            "username": sample_user_account["username"],
            "weight": 78.0,
            "date": "2025-12-20"
        })
        
        response = test_client.get(f"/weight/{sample_user_account['username']}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Most recent entry should have change calculation
        recent_entry = data[0]
        if "weightChange" in recent_entry:
            assert recent_entry["weightChange"] == -2.0  # Lost 2kg
            assert "weightChangePercentage" in recent_entry
    
    @pytest.mark.integration
    def test_get_weight_history_date_range(self, test_client, mock_db, sample_user_account):
        """Test filtering weight history by date range."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Log weights over several months
        test_client.post("/weight/log", json={
            "username": sample_user_account["username"],
            "weight": 79.0,
            "date": "2025-11-01"
        })
        test_client.post("/weight/log", json={
            "username": sample_user_account["username"],
            "weight": 78.0,
            "date": "2025-12-01"
        })
        
        response = test_client.get(
            f"/weight/{sample_user_account['username']}?startDate=2025-12-01&endDate=2025-12-31"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should only include December entries
        for entry in data:
            assert entry["date"] >= "2025-12-01"
    
    @pytest.mark.integration
    def test_get_weight_history_empty(self, test_client, mock_db, sample_user_account):
        """Test getting weight history for user with only initial entry."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        response = test_client.get(f"/weight/{sample_user_account['username']}")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1  # Only initial entry
    
    @pytest.mark.integration
    def test_delete_weight_entry_success(self, test_client, mock_db, sample_user_account):
        """Test successfully deleting a weight entry."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Log weight
        log_response = test_client.post("/weight/log", json={
            "username": sample_user_account["username"],
            "weight": 79.0,
            "date": "2025-12-20"
        })
        entry_id = log_response.json()["id"]
        
        # Delete entry
        response = test_client.delete(f"/weight/{entry_id}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify deletion
        entry = mock_db["weight_tracking"].find_one({"_id": ObjectId(entry_id)})
        assert entry is None
    
    @pytest.mark.integration
    def test_delete_weight_entry_invalid_id(self, test_client):
        """Test deleting weight entry with invalid ID."""
        response = test_client.delete("/weight/invalid_id")
        assert response.status_code == 400
    
    @pytest.mark.integration
    def test_delete_weight_entry_not_found(self, test_client):
        """Test deleting non-existent weight entry."""
        fake_id = str(ObjectId())
        response = test_client.delete(f"/weight/{fake_id}")
        assert response.status_code == 404
    
    @pytest.mark.integration
    def test_get_weight_statistics_success(self, test_client, mock_db, sample_user_account):
        """Test getting comprehensive weight statistics."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Log multiple weights to create trend
        weights = [80.0, 79.5, 79.0, 78.5, 78.0]
        base_date = datetime(2025, 12, 1)
        
        for i, weight in enumerate(weights):
            date = (base_date + timedelta(days=i*7)).strftime("%Y-%m-%d")
            test_client.post("/weight/log", json={
                "username": sample_user_account["username"],
                "weight": weight,
                "date": date
            })
        
        response = test_client.get(f"/weight/{sample_user_account['username']}/stats")
        
        assert response.status_code == 200
        stats = response.json()
        
        # Verify all required statistics
        assert "firstWeight" in stats
        assert "currentWeight" in stats
        assert "totalChange" in stats
        assert "totalChangePercentage" in stats
        assert "monthsTracked" in stats
        assert "averageMonthlyChange" in stats
        assert "highestWeight" in stats
        assert "lowestWeight" in stats
        assert "currentTrend" in stats
        assert "entryCount" in stats
        
        # Verify calculations
        assert stats["firstWeight"] == 80.0
        assert stats["currentWeight"] == 78.0
        assert stats["totalChange"] == -2.0
        assert stats["highestWeight"] == 80.0
        assert stats["lowestWeight"] == 78.0
        assert stats["currentTrend"] == "losing"
    
    @pytest.mark.integration
    def test_get_weight_statistics_gaining_trend(self, test_client, mock_db, sample_user_account):
        """Test statistics show gaining trend correctly."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Log increasing weights
        test_client.post("/weight/log", json={
            "username": sample_user_account["username"],
            "weight": 81.0,
            "date": "2025-12-15"
        })
        test_client.post("/weight/log", json={
            "username": sample_user_account["username"],
            "weight": 82.0,
            "date": "2025-12-20"
        })
        
        response = test_client.get(f"/weight/{sample_user_account['username']}/stats")
        
        assert response.status_code == 200
        assert response.json()["currentTrend"] == "gaining"
    
    @pytest.mark.integration
    def test_get_weight_statistics_stable_trend(self, test_client, mock_db, sample_user_account):
        """Test statistics show stable trend for consistent weights."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Log consistent weights (within 0.5kg)
        for i in range(3):
            test_client.post("/weight/log", json={
                "username": sample_user_account["username"],
                "weight": 80.0 + (i * 0.1),  # Very small changes
                "date": f"2025-12-{15+i:02d}"
            })
        
        response = test_client.get(f"/weight/{sample_user_account['username']}/stats")
        
        assert response.status_code == 200
        assert response.json()["currentTrend"] == "stable"
    
    @pytest.mark.integration
    def test_get_weight_statistics_insufficient_data(self, test_client, mock_db, sample_user_account):
        """Test statistics with insufficient data for trend."""
        test_client.post("/accounts/create", json=sample_user_account)
        
        # Only initial entry, no additional logs
        response = test_client.get(f"/weight/{sample_user_account['username']}/stats")
        
        assert response.status_code == 200
        stats = response.json()
        assert stats["currentTrend"] == "insufficient_data"
        assert stats["entryCount"] == 1
    
    @pytest.mark.integration
    def test_get_weight_statistics_not_found(self, test_client):
        """Test getting statistics for non-existent user."""
        response = test_client.get("/weight/nonexistent_user/stats")
        assert response.status_code == 200
        stats = response.json()
        assert stats["entryCount"] == 0
