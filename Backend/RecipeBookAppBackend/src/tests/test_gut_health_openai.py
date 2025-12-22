"""
OpenAI GPT Service Tests - SKIPPED BY DEFAULT

These tests are separated to avoid API costs. They test the OpenAI integration
but are marked with @pytest.mark.skip to prevent accidental execution.

To run these tests:
1. Set OPENAI_API_KEY in your environment
2. Set AI_PROVIDER=openai
3. Run: pytest test_gut_health_openai.py --run-openai

Note: Running these tests WILL incur OpenAI API costs (~$0.001-0.05 per test).
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ai_services.openai_service import OpenAIService


# Custom marker for OpenAI tests
def pytest_configure(config):
    """Register custom marker."""
    config.addinivalue_line(
        "markers", "openai: tests that use OpenAI API (skipped by default, cost money)"
    )


def pytest_collection_modifyitems(config, items):
    """Skip OpenAI tests unless --run-openai flag is provided."""
    if not config.getoption("--run-openai", default=False):
        skip_openai = pytest.mark.skip(reason="OpenAI tests skipped by default (use --run-openai to enable)")
        for item in items:
            if "openai" in item.keywords:
                item.add_marker(skip_openai)


def pytest_addoption(parser):
    """Add --run-openai command line option."""
    parser.addoption(
        "--run-openai",
        action="store_true",
        default=False,
        help="Run OpenAI tests (will incur API costs)"
    )


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def sample_symptoms():
    """Sample symptom data."""
    from datetime import datetime, timedelta, timezone
    base_date = datetime.now(timezone.utc)
    return [
        {
            "date": base_date - timedelta(hours=2),
            "type": "bloating",
            "severity": 7,
            "bristol_scale": 3,
            "mood": "anxious"
        },
        {
            "date": base_date - timedelta(days=1),
            "type": "cramps",
            "severity": 5
        }
    ]


@pytest.fixture
def sample_foods():
    """Sample food data."""
    from datetime import datetime, timedelta, timezone
    base_date = datetime.now(timezone.utc)
    return [
        {
            "date": base_date - timedelta(hours=8),
            "name": "Milk",
            "calories": 150,
            "protein": 8
        },
        {
            "date": base_date - timedelta(days=1, hours=8),
            "name": "Cheese sandwich",
            "calories": 450
        }
    ]


@pytest.fixture
def sample_user_profile():
    """Sample user profile."""
    return {
        "age": 32,
        "gender": "male",
        "weight": 78,
        "height": 175,
        "bmi": 25.5,
        "activity_level": "moderately_active"
    }


# ============================================================================
# OPENAI SERVICE TESTS (MOCKED - SAFE TO RUN)
# ============================================================================

class TestOpenAIServiceMocked:
    """Tests for OpenAI service with mocked API calls (safe, no costs)."""
    
    def test_openai_service_inactive_by_default(self):
        """Test that OpenAI service is inactive without configuration."""
        with patch.dict(os.environ, {}, clear=True):
            service = OpenAIService()
            assert service.enabled is False
            assert service.api_key is None
    
    def test_openai_service_returns_mock_when_inactive(self):
        """Test that inactive service returns mock data."""
        with patch.dict(os.environ, {}, clear=True):
            service = OpenAIService()
            
            # Should return mock response without making API call
            result = service._get_mock_response()
            
            assert result["confidence_score"] == 0
            assert "MOCK DATA" in result["recommendations"][0]
            assert "inactive" in result["reasoning"].lower()
    
    @pytest.mark.asyncio
    async def test_openai_inactive_service_analyze(self, sample_symptoms, sample_foods,
                                                    sample_user_profile):
        """Test that analyze_gut_health returns mock data when inactive."""
        with patch.dict(os.environ, {}, clear=True):
            service = OpenAIService()
            
            result = await service.analyze_gut_health(
                symptoms=sample_symptoms,
                foods_consumed=sample_foods,
                user_profile=sample_user_profile
            )
            
            # Should return mock data, not make API call
            assert result["confidence_score"] == 0
            assert "inactive" in result["reasoning"].lower()
    
    def test_openai_service_activation(self):
        """Test that service activates with proper environment variables."""
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "sk-test-key",
            "AI_PROVIDER": "openai"
        }):
            service = OpenAIService()
            
            assert service.enabled is True
            assert service.api_key == "sk-test-key"
    
    @pytest.mark.asyncio
    async def test_openai_api_call_mocked(self, sample_symptoms, sample_foods,
                                          sample_user_profile):
        """Test API call structure with mocked HTTP client."""
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "sk-test-key",
            "AI_PROVIDER": "openai"
        }):
            service = OpenAIService()
            
            # Mock successful API response
            mock_response = Mock()
            mock_response.json.return_value = {
                "choices": [{
                    "message": {
                        "content": '{"recommendations": ["Test recommendation"], "trigger_foods": [], "beneficial_foods": [], "probiotic_suggestions": [], "lifestyle_tips": [], "confidence_score": 75, "reasoning": "Test"}'
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
                    user_profile=sample_user_profile
                )
                
                assert "recommendations" in result
                assert result["confidence_score"] == 75
    
    def test_openai_model_configuration(self):
        """Test model configuration from environment."""
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "sk-test-key",
            "OPENAI_MODEL": "gpt-4",
            "AI_PROVIDER": "openai"
        }):
            service = OpenAIService()
            
            assert service.model == "gpt-4"
        
        # Test default model
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "sk-test-key",
            "AI_PROVIDER": "openai"
        }):
            service = OpenAIService()
            assert service.model == "gpt-3.5-turbo"


# ============================================================================
# OPENAI INTEGRATION TESTS (REAL API CALLS - SKIPPED BY DEFAULT)
# ============================================================================

@pytest.mark.openai
@pytest.mark.asyncio
class TestOpenAIIntegration:
    """
    Integration tests with real OpenAI API.
    
    ⚠️ WARNING: These tests make real API calls and incur costs!
    ⚠️ Only run with: pytest test_gut_health_openai.py --run-openai
    
    Requirements:
    - OPENAI_API_KEY environment variable
    - AI_PROVIDER=openai environment variable
    - OpenAI account with available credits
    """
    
    async def test_real_openai_analyze_gut_health(self, sample_symptoms, sample_foods,
                                                   sample_user_profile):
        """
        Test real OpenAI API call for gut health analysis.
        
        Cost: ~$0.001-0.05 depending on model
        """
        # Verify environment is configured
        assert os.getenv("OPENAI_API_KEY"), "OPENAI_API_KEY must be set"
        assert os.getenv("AI_PROVIDER") == "openai", "AI_PROVIDER must be 'openai'"
        
        service = OpenAIService()
        assert service.enabled, "OpenAI service should be enabled"
        
        result = await service.analyze_gut_health(
            symptoms=sample_symptoms,
            foods_consumed=sample_foods,
            user_profile=sample_user_profile
        )
        
        # Verify response structure
        assert "recommendations" in result
        assert "trigger_foods" in result
        assert "beneficial_foods" in result
        assert "confidence_score" in result
        assert isinstance(result["recommendations"], list)
        assert len(result["recommendations"]) > 0
        assert isinstance(result["confidence_score"], int)
        assert 0 <= result["confidence_score"] <= 100
    
    async def test_real_openai_with_gpt4(self, sample_symptoms, sample_foods,
                                         sample_user_profile):
        """
        Test with GPT-4 model (higher quality, higher cost).
        
        Cost: ~$0.03-0.05 per call
        """
        with patch.dict(os.environ, {"OPENAI_MODEL": "gpt-4"}):
            service = OpenAIService()
            
            result = await service.analyze_gut_health(
                symptoms=sample_symptoms,
                foods_consumed=sample_foods,
                user_profile=sample_user_profile
            )
            
            # GPT-4 should provide more detailed reasoning
            assert len(result["reasoning"]) > 50
            assert result["confidence_score"] > 0
    
    async def test_real_openai_error_handling(self):
        """Test error handling with invalid API key."""
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "sk-invalid-key",
            "AI_PROVIDER": "openai"
        }):
            service = OpenAIService()
            
            result = await service.analyze_gut_health(
                symptoms=[],
                foods_consumed=[],
                user_profile={}
            )
            
            # Should fallback gracefully
            assert "recommendations" in result
            assert result["confidence_score"] == 60  # Fallback score


# ============================================================================
# COST ESTIMATION TESTS
# ============================================================================

class TestCostEstimation:
    """Tests for estimating OpenAI API costs (no actual API calls)."""
    
    def test_estimate_token_count(self):
        """Estimate tokens for a typical analysis request."""
        # Typical prompt is ~500-1000 tokens
        # Typical response is ~300-500 tokens
        # Total: ~800-1500 tokens
        
        # GPT-3.5-turbo: $0.0015 per 1K input, $0.002 per 1K output
        typical_input_tokens = 800
        typical_output_tokens = 400
        
        cost_gpt35 = (
            (typical_input_tokens / 1000) * 0.0015 +
            (typical_output_tokens / 1000) * 0.002
        )
        
        # GPT-4: $0.03 per 1K input, $0.06 per 1K output
        cost_gpt4 = (
            (typical_input_tokens / 1000) * 0.03 +
            (typical_output_tokens / 1000) * 0.06
        )
        
        print(f"\nEstimated cost per request:")
        print(f"  GPT-3.5-turbo: ${cost_gpt35:.4f}")
        print(f"  GPT-4: ${cost_gpt4:.4f}")
        
        # For 100 users, 2 requests/week = 800 requests/month
        monthly_requests = 800
        print(f"\nEstimated monthly cost (800 requests):")
        print(f"  GPT-3.5-turbo: ${cost_gpt35 * monthly_requests:.2f}")
        print(f"  GPT-4: ${cost_gpt4 * monthly_requests:.2f}")
        
        # Verify costs are reasonable
        assert cost_gpt35 < 0.01  # Less than 1 cent per request
        assert cost_gpt4 < 0.10  # Less than 10 cents per request


if __name__ == "__main__":
    print("=" * 70)
    print("OpenAI Tests - SKIPPED BY DEFAULT")
    print("=" * 70)
    print("\n⚠️  These tests make REAL API calls and cost money!")
    print("⚠️  To run: pytest test_gut_health_openai.py --run-openai\n")
    print("By default, only mocked tests will run (no API calls, no costs).")
    print("=" * 70)
    
    pytest.main([__file__, "-v", "--tb=short", "-m", "not openai"])
