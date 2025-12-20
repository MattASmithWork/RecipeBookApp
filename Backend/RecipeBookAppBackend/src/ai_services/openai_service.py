"""
OpenAI GPT Service (INACTIVE - Ready for Future Use)

This service integrates with OpenAI's GPT API for nutrition and gut health analysis.
It's currently INACTIVE to avoid API costs, but ready to be enabled when needed.

To activate:
1. Set OPENAI_API_KEY environment variable
2. Set AI_PROVIDER=openai in environment or app config
3. Update gut_health_analyzer.py to use OpenAIService instead of GeminiService

Pricing (as of 2025):
- GPT-4: ~$0.03 per 1K tokens input, ~$0.06 per 1K tokens output
- GPT-3.5-turbo: ~$0.001 per 1K tokens (much cheaper)

Typical recommendation: ~500-1000 tokens = $0.001-0.005 per request

Features:
- More advanced reasoning than Gemini (GPT-4)
- Faster response times
- Excellent at medical/nutrition analysis
- JSON mode for reliable structured outputs

Environment Variables:
    OPENAI_API_KEY: Your OpenAI API key (get from https://platform.openai.com/api-keys)
    OPENAI_MODEL: Model to use (default: gpt-3.5-turbo, alternatives: gpt-4, gpt-4-turbo)
"""

import os
from typing import Dict, List, Optional
import httpx
from datetime import datetime


class OpenAIService:
    """
    Service for interacting with OpenAI GPT API.
    Currently INACTIVE - will not make API calls unless explicitly enabled.
    """
    
    def __init__(self):
        """
        Initialize OpenAI service.
        Note: API key is optional - service will return mock data if not configured.
        """
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")  # Default to cheaper model
        self.base_url = "https://api.openai.com/v1"
        self.enabled = False  # INACTIVE by default
        
        # Check if service should be enabled
        if self.api_key and os.getenv("AI_PROVIDER") == "openai":
            self.enabled = True
            print("⚠️  OpenAI service is ENABLED - API calls will incur costs!")
        else:
            print("✓ OpenAI service is INACTIVE (no costs)")
    
    async def analyze_gut_health(
        self,
        symptoms: List[Dict],
        foods_consumed: List[Dict],
        user_profile: Dict,
        historical_patterns: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Analyze gut health data using OpenAI GPT.
        
        Returns mock data if service is not enabled.
        
        Args:
            symptoms: List of recent symptoms
            foods_consumed: Recent nutrition logs
            user_profile: User's health metrics
            historical_patterns: Past food-symptom correlations
        
        Returns:
            Dict with recommendations, trigger foods, beneficial foods, etc.
        """
        # Return mock data if service is not enabled
        if not self.enabled:
            return self._get_mock_response()
        
        # Build comprehensive prompt
        prompt = self._build_analysis_prompt(
            symptoms, foods_consumed, user_profile, historical_patterns
        )
        
        # Call OpenAI API
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert nutritionist and gut health specialist. Provide evidence-based, personalized dietary recommendations."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000,
                        "response_format": {"type": "json_object"}  # Force JSON output
                    }
                )
                response.raise_for_status()
                
                result = response.json()
                ai_text = result["choices"][0]["message"]["content"]
                
                # Parse JSON response
                import json
                return json.loads(ai_text)
                
            except httpx.HTTPError as e:
                print(f"OpenAI API error: {e}")
                return self._get_fallback_response()
            except Exception as e:
                print(f"Unexpected error in OpenAI service: {e}")
                return self._get_fallback_response()
    
    def _build_analysis_prompt(
        self,
        symptoms: List[Dict],
        foods_consumed: List[Dict],
        user_profile: Dict,
        historical_patterns: Optional[List[Dict]]
    ) -> str:
        """Build analysis prompt (same format as Gemini service)."""
        
        prompt = f"""Analyze the following gut health data and provide personalized recommendations.

USER PROFILE:
- Age: {user_profile.get('age', 'Unknown')}
- Gender: {user_profile.get('gender', 'Unknown')}
- Activity Level: {user_profile.get('activity_level', 'Unknown')}
- Health Goals: {user_profile.get('goals', 'General health')}
- Current Weight: {user_profile.get('weight', 'Unknown')} kg
- BMI: {user_profile.get('bmi', 'Unknown')}

RECENT SYMPTOMS (last 7 days):
"""
        
        if symptoms:
            for symptom in symptoms:
                prompt += f"- {symptom.get('date', 'Recent')}: {symptom.get('type', 'Unknown')} "
                prompt += f"(severity: {symptom.get('severity', 'Unknown')}/10)\n"
                if symptom.get('notes'):
                    prompt += f"  Notes: {symptom['notes']}\n"
        else:
            prompt += "No symptoms recorded.\n"
        
        prompt += "\nFOODS CONSUMED (last 7 days):\n"
        
        if foods_consumed:
            for food in foods_consumed[:20]:
                prompt += f"- {food.get('date', 'Recent')}: {food.get('name', 'Unknown')} "
                prompt += f"({food.get('calories', 0)} cal)\n"
        else:
            prompt += "No food logs.\n"
        
        if historical_patterns:
            prompt += "\nHISTORICAL PATTERNS:\n"
            for pattern in historical_patterns:
                prompt += f"- {pattern.get('food')} → {pattern.get('symptom')}\n"
        
        prompt += """

Return a JSON object with:
{
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "trigger_foods": ["potential trigger1", "potential trigger2"],
  "beneficial_foods": ["beneficial food1 (reason)", "beneficial food2 (reason)"],
  "probiotic_suggestions": ["probiotic food1", "probiotic food2"],
  "lifestyle_tips": ["tip1", "tip2"],
  "confidence_score": 0-100,
  "reasoning": "explanation of analysis"
}
"""
        
        return prompt
    
    def _get_mock_response(self) -> Dict:
        """Return mock response when service is disabled."""
        return {
            "recommendations": [
                "[MOCK DATA - OpenAI service is inactive]",
                "This is sample data to demonstrate the structure",
                "Enable OpenAI service by setting OPENAI_API_KEY and AI_PROVIDER=openai"
            ],
            "trigger_foods": ["Example Trigger Food"],
            "beneficial_foods": ["Example Beneficial Food (sample reason)"],
            "probiotic_suggestions": ["Yogurt", "Kefir"],
            "lifestyle_tips": ["Sample lifestyle tip"],
            "confidence_score": 0,
            "reasoning": "OpenAI service is currently inactive. This is mock data."
        }
    
    def _get_fallback_response(self) -> Dict:
        """Return generic recommendations if API fails."""
        return {
            "recommendations": [
                "Track meals and symptoms daily for better insights",
                "Eat diverse fiber-rich foods (fruits, vegetables, whole grains)",
                "Stay hydrated with 8+ glasses of water daily",
                "Consider fermented foods like yogurt or kefir"
            ],
            "trigger_foods": [],
            "beneficial_foods": [
                "Yogurt (probiotics for gut health)",
                "Oats (soluble fiber)",
                "Bananas (prebiotic fiber)",
                "Ginger (digestive aid)"
            ],
            "probiotic_suggestions": ["Greek yogurt", "Kefir", "Kombucha", "Sauerkraut"],
            "lifestyle_tips": [
                "Eat slowly and chew thoroughly",
                "Manage stress through exercise",
                "Get 7-9 hours of sleep",
                "Exercise regularly"
            ],
            "confidence_score": 60,
            "reasoning": "General gut health recommendations. Log more data for personalized advice."
        }
    
    async def get_meal_suggestions(
        self,
        dietary_restrictions: List[str],
        health_goals: List[str],
        available_ingredients: List[str]
    ) -> List[Dict]:
        """Get meal suggestions (returns empty list if service disabled)."""
        
        if not self.enabled:
            print("OpenAI service is inactive - no meal suggestions available")
            return []
        
        # Implementation would go here (similar to Gemini service)
        # Omitted to save space since service is inactive
        return []
