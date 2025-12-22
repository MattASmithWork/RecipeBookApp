"""
Comprehensive tests for AI-powered gut health analysis system.

Tests cover:
- GutHealthAnalyzer business logic
- Food-symptom correlation algorithm
- Gut health score calculation
- Trend analysis
- Google Gemini service integration (mocked)
- API endpoints for gut health
- Error handling and edge cases

Note: OpenAI tests are in separate file (test_gut_health_openai.py) 
and are skipped by default to avoid API costs.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app_api import app
from ai_services.gut_health_analyzer import GutHealthAnalyzer
from ai_services.gemini_service import GeminiService


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def analyzer():
    """Provides a GutHealthAnalyzer instance."""
    return GutHealthAnalyzer()


@pytest.fixture
def sample_symptoms():
    """Sample symptom data for testing."""
    base_date = datetime.now(timezone.utc)
    return [
        {
            "date": base_date - timedelta(hours=2),
            "type": "bloating",
            "severity": 7,
            "bristol_scale": 3,
            "mood": "anxious",
            "notes": "After lunch"
        },
        {
            "date": base_date - timedelta(days=1),
            "type": "cramps",
            "severity": 5,
            "bristol_scale": 2,
            "mood": "stressed"
        },
        {
            "date": base_date - timedelta(days=2),
            "type": "bloating",
            "severity": 6,
            "bristol_scale": 3
        },
        {
            "date": base_date - timedelta(days=3),
            "type": "gas",
            "severity": 4
        }
    ]


@pytest.fixture
def sample_foods():
    """Sample food data for testing."""
    base_date = datetime.now(timezone.utc)
    return [
        {
            "date": base_date - timedelta(hours=8),
            "name": "Milk",
            "calories": 150,
            "protein": 8,
            "carbs": 12,
            "fat": 8
        },
        {
            "date": base_date - timedelta(days=1, hours=8),
            "name": "Cheese sandwich",
            "calories": 450,
            "protein": 20,
            "carbs": 45,
            "fat": 18
        },
        {
            "date": base_date - timedelta(days=2, hours=10),
            "name": "Milk",
            "calories": 150,
            "protein": 8,
            "carbs": 12,
            "fat": 8
        },
        {
            "date": base_date - timedelta(days=3, hours=6),
            "name": "Orange juice",
            "calories": 110,
            "protein": 2,
            "carbs": 26,
            "fat": 0
        }
    ]


@pytest.fixture
def sample_user_profile():
    """Sample user profile for testing."""
    return {
        "age": 32,
        "gender": "male",
        "weight": 78,
        "height": 175,
        "bmi": 25.5,
        "bmr": 1750,
        "activity_level": "moderately_active",
        "goals": "Improve gut health"
    }


@pytest.fixture
def mock_gemini_response():
    """Mock response from Gemini AI."""
    return {
        "recommendations": [
            "Try eliminating dairy for 2 weeks to test lactose intolerance",
            "Increase fiber intake to 25-30g per day gradually",
            "Stay hydrated with 8+ glasses of water daily"
        ],
        "trigger_foods": [
            "Milk - strong correlation with bloating",
            "Cheese - may indicate lactose sensitivity"
        ],
        "beneficial_foods": [
            "Oats - soluble fiber supports digestive health",
            "Bananas - prebiotic fiber and easy to digest",
            "Ginger tea - natural anti-inflammatory"
        ],
        "probiotic_suggestions": [
            "Lactose-free Greek yogurt",
            "Kefir",
            "Sauerkraut",
            "Kombucha"
        ],
        "lifestyle_tips": [
            "Eat slowly and chew thoroughly",
            "Exercise 30 minutes daily",
            "Manage stress through meditation"
        ],
        "confidence_score": 85,
        "reasoning": "Strong correlation between dairy and bloating symptoms. Recommend elimination diet."
    }


# ============================================================================
# CORRELATION ANALYSIS TESTS
# ============================================================================

class TestCorrelationAnalysis:
    """Tests for food-symptom correlation algorithm."""
    
    def test_basic_correlation_detection(self, analyzer, sample_symptoms, sample_foods):
        """Test that correlations are correctly identified within 2-24h window."""
        correlations = analyzer._find_food_symptom_correlations(
            sample_symptoms, sample_foods
        )
        
        # Milk should be correlated (appears multiple times 2-24h before symptoms)
        milk_correlations = [c for c in correlations if c["food"] == "Milk"]
        assert len(milk_correlations) > 0
        assert milk_correlations[0]["correlation_count"] >= 2
        assert "bloating" in milk_correlations[0]["associated_symptoms"]
    
    def test_correlation_time_window(self, analyzer):
        """Test that only foods within 2-24h window are correlated."""
        base_date = datetime.now(timezone.utc)
        
        symptoms = [
            {"date": base_date, "type": "bloating", "severity": 7}
        ]
        
        foods = [
            {"date": base_date - timedelta(hours=1), "name": "Food_1h_ago"},  # Too recent (< 2h)
            {"date": base_date - timedelta(hours=3), "name": "Food_3h_ago"},  # Within window
            {"date": base_date - timedelta(hours=12), "name": "Food_12h_ago"},  # Within window
            {"date": base_date - timedelta(hours=25), "name": "Food_25h_ago"}  # Too old (> 24h)
        ]
        
        correlations = analyzer._find_food_symptom_correlations(symptoms, foods)
        
        # Only foods within 2-24h window should appear
        correlated_foods = [c["food"] for c in correlations]
        assert "Food_1h_ago" not in correlated_foods
        assert "Food_25h_ago" not in correlated_foods
    
    def test_correlation_confidence_scoring(self, analyzer):
        """Test confidence score calculation (20 points per occurrence, max 100)."""
        base_date = datetime.now(timezone.utc)
        
        # Create 5 symptoms and 5 instances of the same food
        symptoms = [
            {"date": base_date - timedelta(days=i), "type": "bloating", "severity": 6}
            for i in range(5)
        ]
        
        foods = [
            {"date": base_date - timedelta(days=i, hours=12), "name": "Trigger_food"}
            for i in range(5)
        ]
        
        correlations = analyzer._find_food_symptom_correlations(symptoms, foods)
        
        # Should have 5 correlations with 100% confidence
        assert len(correlations) > 0
        assert correlations[0]["correlation_count"] == 5
        assert correlations[0]["confidence"] == 100
    
    def test_correlation_requires_minimum_occurrences(self, analyzer):
        """Test that foods must correlate at least 2 times to be flagged."""
        base_date = datetime.now(timezone.utc)
        
        # Only 1 correlation (below threshold)
        symptoms = [
            {"date": base_date, "type": "bloating", "severity": 6}
        ]
        
        foods = [
            {"date": base_date - timedelta(hours=6), "name": "Single_occurrence"}
        ]
        
        correlations = analyzer._find_food_symptom_correlations(symptoms, foods)
        
        # Should not flag foods with only 1 occurrence
        assert len(correlations) == 0
    
    def test_correlation_with_no_data(self, analyzer):
        """Test correlation analysis with empty data."""
        correlations = analyzer._find_food_symptom_correlations([], [])
        assert correlations == []
    
    def test_correlation_aggregates_symptoms(self, analyzer):
        """Test that multiple symptom types are aggregated for each food."""
        base_date = datetime.now(timezone.utc)
        
        symptoms = [
            {"date": base_date - timedelta(days=0), "type": "bloating", "severity": 7},
            {"date": base_date - timedelta(days=0, hours=2), "type": "cramps", "severity": 5},
            {"date": base_date - timedelta(days=1), "type": "gas", "severity": 4}
        ]
        
        foods = [
            {"date": base_date - timedelta(hours=6), "name": "Dairy"},
            {"date": base_date - timedelta(hours=8), "name": "Dairy"},
            {"date": base_date - timedelta(days=1, hours=6), "name": "Dairy"}
        ]
        
        correlations = analyzer._find_food_symptom_correlations(symptoms, foods)
        
        # Dairy should correlate with multiple symptoms
        assert len(correlations) > 0
        assert len(correlations[0]["associated_symptoms"]) >= 2


# ============================================================================
# GUT HEALTH SCORE TESTS
# ============================================================================

class TestGutHealthScore:
    """Tests for gut health score calculation."""
    
    def test_perfect_score_no_symptoms(self, analyzer):
        """Test that no symptoms = 100 score."""
        result = analyzer.calculate_gut_health_score([])
        
        assert result["score"] == 100
        assert result["rating"] == "Excellent"
        assert "No symptoms" in result["message"]
    
    def test_score_with_mild_symptoms(self, analyzer):
        """Test score calculation with mild symptoms."""
        symptoms = [
            {"severity": 3},
            {"severity": 2},
            {"severity": 4}
        ]
        
        result = analyzer.calculate_gut_health_score(symptoms)
        
        # Avg severity: 3, Score formula: (100 - 3*10) * 0.6 + (100 - 3*10) * 0.4 = 70
        assert result["score"] >= 60
        assert result["rating"] in ["Good", "Excellent"]
    
    def test_score_with_severe_symptoms(self, analyzer):
        """Test score calculation with severe symptoms."""
        symptoms = [
            {"severity": 8},
            {"severity": 9},
            {"severity": 7},
            {"severity": 8}
        ]
        
        result = analyzer.calculate_gut_health_score(symptoms)
        
        # Avg severity: 8, many symptoms = low score
        assert result["score"] < 40
        assert result["rating"] == "Needs Attention"
    
    def test_score_rating_boundaries(self, analyzer):
        """Test rating assignment at boundary scores."""
        test_cases = [
            (85, "Excellent"),
            (75, "Good"),
            (55, "Fair"),
            (25, "Needs Attention")
        ]
        
        for target_score, expected_rating in test_cases:
            # Create symptoms to approximate target score
            # Simple case: use severity to control score
            severity = int((100 - target_score) / 10)
            symptoms = [{"severity": severity}]
            
            result = analyzer.calculate_gut_health_score(symptoms)
            assert result["rating"] == expected_rating
    
    def test_score_components(self, analyzer):
        """Test that severity and frequency components are calculated."""
        symptoms = [
            {"severity": 5},
            {"severity": 6}
        ]
        
        result = analyzer.calculate_gut_health_score(symptoms)
        
        assert "severity_component" in result
        assert "frequency_component" in result
        assert isinstance(result["severity_component"], (int, float))
        assert isinstance(result["frequency_component"], (int, float))


# ============================================================================
# TREND ANALYSIS TESTS
# ============================================================================

class TestTrendAnalysis:
    """Tests for gut health trend analysis."""
    
    def test_improving_trend(self, analyzer):
        """Test detection of improving trend."""
        base_date = datetime.now(timezone.utc)
        
        # Start with severe, end with mild
        logs = [
            {"date": base_date - timedelta(days=6), "severity": 8},
            {"date": base_date - timedelta(days=5), "severity": 7},
            {"date": base_date - timedelta(days=4), "severity": 6},
            {"date": base_date - timedelta(days=3), "severity": 4},
            {"date": base_date - timedelta(days=2), "severity": 3},
            {"date": base_date - timedelta(days=1), "severity": 2}
        ]
        
        result = analyzer._analyze_trends(logs, 7)
        
        assert result["trend"] == "improving"
        assert "improving" in result["message"].lower()
    
    def test_worsening_trend(self, analyzer):
        """Test detection of worsening trend."""
        base_date = datetime.now(timezone.utc)
        
        # Start with mild, end with severe
        logs = [
            {"date": base_date - timedelta(days=6), "severity": 2},
            {"date": base_date - timedelta(days=5), "severity": 3},
            {"date": base_date - timedelta(days=4), "severity": 4},
            {"date": base_date - timedelta(days=3), "severity": 6},
            {"date": base_date - timedelta(days=2), "severity": 7},
            {"date": base_date - timedelta(days=1), "severity": 8}
        ]
        
        result = analyzer._analyze_trends(logs, 7)
        
        assert result["trend"] == "worsening"
        assert "worsening" in result["message"].lower()
    
    def test_stable_trend(self, analyzer):
        """Test detection of stable trend."""
        base_date = datetime.now(timezone.utc)
        
        # Consistent severity
        logs = [
            {"date": base_date - timedelta(days=i), "severity": 5}
            for i in range(6)
        ]
        
        result = analyzer._analyze_trends(logs, 7)
        
        assert result["trend"] == "stable"
    
    def test_insufficient_data_for_trend(self, analyzer):
        """Test trend analysis with insufficient data."""
        logs = [{"date": datetime.now(timezone.utc), "severity": 5}]
        
        result = analyzer._analyze_trends(logs, 7)
        
        assert result["trend"] == "insufficient_data"


# ============================================================================
# SYMPTOM SUMMARY TESTS
# ============================================================================

class TestSymptomSummary:
    """Tests for symptom summarization."""
    
    def test_summary_with_symptoms(self, analyzer):
        """Test summary generation with symptom data."""
        symptoms = [
            {"type": "bloating", "severity": 7},
            {"type": "bloating", "severity": 6},
            {"type": "cramps", "severity": 5},
            {"type": "gas", "severity": 4},
            {"type": "bloating", "severity": 8}
        ]
        
        result = analyzer._summarize_symptoms(symptoms)
        
        assert result["total_symptoms"] == 5
        assert result["most_common"] == "bloating"
        assert result["most_common_count"] == 3
        assert result["average_severity"] > 0
        assert "bloating" in result["symptom_breakdown"]
        assert result["symptom_breakdown"]["bloating"] == 3
    
    def test_summary_empty_symptoms(self, analyzer):
        """Test summary with no symptoms."""
        result = analyzer._summarize_symptoms([])
        
        assert result["total_symptoms"] == 0
        assert result["most_common"] is None
        assert result["average_severity"] == 0
        assert result["symptom_breakdown"] == {}


# ============================================================================
# GEMINI SERVICE TESTS (MOCKED)
# ============================================================================

class TestGeminiService:
    """Tests for Google Gemini service integration (mocked to avoid API calls)."""
    
    @pytest.mark.asyncio
    async def test_gemini_service_initialization(self):
        """Test that Gemini service initializes with API key."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            service = GeminiService()
            assert service.api_key == "test_key"
            assert service.model == "gemini-1.5-flash"
    
    @pytest.mark.asyncio
    async def test_gemini_service_missing_api_key(self):
        """Test that service fails without API key."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
                GeminiService()
    
    @pytest.mark.asyncio
    async def test_analyze_gut_health_success(self, sample_symptoms, sample_foods, 
                                              sample_user_profile, mock_gemini_response):
        """Test successful gut health analysis."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            service = GeminiService()
            
            # Mock the HTTP client
            mock_response = Mock()
            mock_response.json.return_value = {
                "candidates": [{
                    "content": {
                        "parts": [{
                            "text": str(mock_gemini_response)
                        }]
                    }
                }]
            }
            mock_response.raise_for_status = Mock()
            
            with patch('httpx.AsyncClient') as mock_client:
                mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                    return_value=mock_response
                )
                
                result = await service.analyze_gut_health(
                    symptoms=sample_symptoms,
                    foods_consumed=sample_foods,
                    user_profile=sample_user_profile,
                    historical_patterns=[]
                )
                
                assert "recommendations" in result
                assert "trigger_foods" in result
                assert "beneficial_foods" in result
                assert len(result["recommendations"]) > 0
    
    @pytest.mark.asyncio
    async def test_analyze_gut_health_api_failure(self, sample_symptoms, sample_foods, 
                                                   sample_user_profile):
        """Test fallback when API fails."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            service = GeminiService()
            
            # Mock API failure
            with patch('httpx.AsyncClient') as mock_client:
                mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                    side_effect=Exception("API Error")
                )
                
                result = await service.analyze_gut_health(
                    symptoms=sample_symptoms,
                    foods_consumed=sample_foods,
                    user_profile=sample_user_profile
                )
                
                # Should return fallback response
                assert result["confidence_score"] == 60
                assert "general" in result["reasoning"].lower()
    
    @pytest.mark.asyncio
    async def test_build_analysis_prompt(self, sample_symptoms, sample_foods, 
                                         sample_user_profile):
        """Test that analysis prompt is properly constructed."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            service = GeminiService()
            
            prompt = service._build_analysis_prompt(
                sample_symptoms, sample_foods, sample_user_profile, []
            )
            
            # Verify prompt includes key information
            assert "USER PROFILE" in prompt
            assert str(sample_user_profile["age"]) in prompt
            assert "RECENT SYMPTOMS" in prompt
            assert "bloating" in prompt.lower()
            assert "FOODS CONSUMED" in prompt
            assert "JSON" in prompt


# ============================================================================
# GUT HEALTH ANALYZER INTEGRATION TESTS
# ============================================================================

class TestGutHealthAnalyzerIntegration:
    """Integration tests for complete analysis workflow."""
    
    @pytest.mark.asyncio
    async def test_full_analysis_workflow(self, analyzer, sample_symptoms, sample_foods,
                                          sample_user_profile, mock_gemini_response):
        """Test complete analysis from data to recommendations."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            # Mock AI service
            with patch.object(analyzer.ai_service, 'analyze_gut_health', 
                            new_callable=AsyncMock) as mock_analyze:
                mock_analyze.return_value = mock_gemini_response
                
                result = await analyzer.analyze_and_recommend(
                    user_id="testuser",
                    gut_health_logs=sample_symptoms,
                    nutrition_logs=sample_foods,
                    user_profile=sample_user_profile,
                    days_to_analyze=7
                )
                
                # Verify all components are present
                assert "ai_recommendations" in result
                assert "correlations" in result
                assert "symptom_summary" in result
                assert "trends" in result
                assert result["analysis_period_days"] == 7
                assert result["total_symptoms_logged"] == len(sample_symptoms)
                assert result["total_meals_logged"] == len(sample_foods)
    
    @pytest.mark.asyncio
    async def test_analysis_with_empty_data(self, analyzer, sample_user_profile):
        """Test analysis handles empty data gracefully."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            with patch.object(analyzer.ai_service, 'analyze_gut_health',
                            new_callable=AsyncMock) as mock_analyze:
                mock_analyze.return_value = {
                    "recommendations": ["Log more data for better insights"],
                    "trigger_foods": [],
                    "beneficial_foods": [],
                    "probiotic_suggestions": [],
                    "lifestyle_tips": [],
                    "confidence_score": 50,
                    "reasoning": "Insufficient data"
                }
                
                result = await analyzer.analyze_and_recommend(
                    user_id="testuser",
                    gut_health_logs=[],
                    nutrition_logs=[],
                    user_profile=sample_user_profile,
                    days_to_analyze=7
                )
                
                assert result["total_symptoms_logged"] == 0
                assert result["total_meals_logged"] == 0


# ============================================================================
# API ENDPOINT TESTS
# ============================================================================

class TestGutHealthEndpoints:
    """Tests for gut health API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Test client with rate limiting disabled."""
        app.state.limiter.enabled = False
        return TestClient(app)
    
    @pytest.fixture
    def mock_db(self, monkeypatch):
        """Mock database for testing."""
        from mongomock import MongoClient
        mock_client = MongoClient()
        mock_database = mock_client.test_db
        
        from app_api import (
            gut_health_logs, user_accounts, nutrition_logs, db
        )
        
        monkeypatch.setattr("app_api.gut_health_logs", mock_database["gut_health_logs"])
        monkeypatch.setattr("app_api.user_accounts", mock_database["user_accounts"])
        monkeypatch.setattr("app_api.nutrition_logs", mock_database["nutrition_logs"])
        
        return mock_database
    
    def test_log_gut_health_success(self, client, mock_db):
        """Test successful gut health logging."""
        data = {
            "username": "testuser",
            "date": datetime.now().isoformat(),
            "symptom_type": "bloating",
            "severity": 7,
            "bristol_scale": 4,
            "mood": "anxious",
            "energy_level": 5,
            "notes": "After lunch",
            "potential_triggers": ["dairy", "bread"]
        }
        
        response = client.post("/gut-health/log", json=data)
        
        assert response.status_code == 200
        result = response.json()
        assert "_id" in result
        assert result["symptom_type"] == "bloating"
    
    def test_log_gut_health_invalid_severity(self, client):
        """Test validation fails for invalid severity."""
        data = {
            "username": "testuser",
            "date": datetime.now().isoformat(),
            "symptom_type": "bloating",
            "severity": 15,  # Invalid (must be 1-10)
        }
        
        response = client.post("/gut-health/log", json=data)
        assert response.status_code == 422  # Validation error
    
    def test_get_gut_health_logs(self, client, mock_db):
        """Test retrieving gut health logs."""
        # Insert test data
        mock_db["gut_health_logs"].insert_many([
            {
                "username": "testuser",
                "date": datetime.now(timezone.utc),
                "symptom_type": "bloating",
                "severity": 7
            },
            {
                "username": "testuser",
                "date": datetime.now(timezone.utc) - timedelta(days=1),
                "symptom_type": "cramps",
                "severity": 5
            }
        ])
        
        response = client.get("/gut-health/testuser?days=7")
        
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) == 2
    
    def test_delete_gut_health_log(self, client, mock_db):
        """Test deleting a gut health log."""
        # Insert test log
        result = mock_db["gut_health_logs"].insert_one({
            "username": "testuser",
            "symptom_type": "bloating",
            "severity": 7
        })
        log_id = str(result.inserted_id)
        
        response = client.delete(f"/gut-health/{log_id}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
    
    def test_get_gut_health_summary(self, client, mock_db):
        """Test gut health summary endpoint."""
        # Insert test data
        mock_db["gut_health_logs"].insert_many([
            {
                "username": "testuser",
                "date": datetime.now(timezone.utc),
                "symptom_type": "bloating",
                "severity": 7
            },
            {
                "username": "testuser",
                "date": datetime.now(timezone.utc),
                "symptom_type": "bloating",
                "severity": 6
            }
        ])
        
        response = client.get("/gut-health/testuser/summary?days=7")
        
        assert response.status_code == 200
        summary = response.json()
        assert "gut_health_score" in summary
        assert "rating" in summary
        assert summary["total_logs"] == 2


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling."""
    
    def test_correlation_with_missing_dates(self, analyzer):
        """Test correlation handles missing date fields."""
        symptoms = [
            {"type": "bloating", "severity": 7},  # Missing date
            {"date": datetime.now(timezone.utc), "type": "cramps", "severity": 5}
        ]
        
        foods = [
            {"name": "Milk", "calories": 150},  # Missing date
            {"date": datetime.now(timezone.utc) - timedelta(hours=6), "name": "Cheese"}
        ]
        
        # Should not crash, just skip invalid entries
        correlations = analyzer._find_food_symptom_correlations(symptoms, foods)
        assert isinstance(correlations, list)
    
    def test_score_with_missing_severity(self, analyzer):
        """Test score calculation handles missing severity values."""
        symptoms = [
            {"type": "bloating"},  # Missing severity
            {"type": "cramps", "severity": 5}
        ]
        
        result = analyzer.calculate_gut_health_score(symptoms)
        
        # Should use default value and not crash
        assert "score" in result
        assert isinstance(result["score"], (int, float))
    
    def test_trend_analysis_with_unsorted_data(self, analyzer):
        """Test trend analysis handles unsorted dates."""
        base_date = datetime.now(timezone.utc)
        
        # Deliberately unsorted
        logs = [
            {"date": base_date - timedelta(days=2), "severity": 5},
            {"date": base_date - timedelta(days=0), "severity": 3},
            {"date": base_date - timedelta(days=4), "severity": 7},
            {"date": base_date - timedelta(days=1), "severity": 4}
        ]
        
        # Should sort internally and analyze correctly
        result = analyzer._analyze_trends(logs, 7)
        assert result["trend"] in ["improving", "worsening", "stable"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
