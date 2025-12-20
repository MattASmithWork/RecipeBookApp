"""
Google Gemini AI Service

This service integrates with Google's Gemini API for nutrition and gut health analysis.
It's currently ACTIVE and uses the free tier (60 requests/minute).

Features:
- Analyzes gut health symptoms and dietary patterns
- Provides personalized nutrition recommendations
- Correlates food intake with digestive symptoms
- Suggests probiotic-rich foods and dietary changes

Environment Variables:
    GEMINI_API_KEY: Your Google Gemini API key (get from https://makersuite.google.com/app/apikey)
"""

import os
from typing import Dict, List, Optional
import httpx
from datetime import datetime


class GeminiService:
    """
    Service for interacting with Google Gemini API.
    Uses Gemini 1.5 Flash model (fast, accurate, free tier available).
    """
    
    def __init__(self):
        """
        Initialize Gemini service with API key from environment.
        
        Raises:
            RuntimeError: If GEMINI_API_KEY is not set
        """
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is required. "
                "Get your API key from https://makersuite.google.com/app/apikey"
            )
        
        # Gemini API endpoint
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.model = "gemini-1.5-flash"  # Fast model, good for real-time recommendations
        
    async def analyze_gut_health(
        self,
        symptoms: List[Dict],
        foods_consumed: List[Dict],
        user_profile: Dict,
        historical_patterns: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Analyze gut health data and provide personalized recommendations.
        
        Args:
            symptoms: List of recent symptoms (bloating, cramps, etc.)
            foods_consumed: Recent nutrition logs
            user_profile: User's health metrics (age, gender, activity level, goals)
            historical_patterns: Past correlations between foods and symptoms
        
        Returns:
            Dict containing:
                - recommendations: List of dietary suggestions
                - trigger_foods: Potential problem foods
                - beneficial_foods: Foods that may help
                - confidence_score: 0-100 indicating confidence in analysis
                - reasoning: Explanation of recommendations
        """
        # Build context prompt with all user data
        prompt = self._build_analysis_prompt(
            symptoms, foods_consumed, user_profile, historical_patterns
        )
        
        # Call Gemini API
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
                
                response = await client.post(
                    url,
                    json={
                        "contents": [{
                            "parts": [{"text": prompt}]
                        }],
                        "generationConfig": {
                            "temperature": 0.7,  # Balanced creativity/accuracy
                            "topK": 40,
                            "topP": 0.95,
                            "maxOutputTokens": 1024,
                        }
                    }
                )
                response.raise_for_status()
                
                result = response.json()
                
                # Extract and parse AI response
                if "candidates" in result and len(result["candidates"]) > 0:
                    ai_text = result["candidates"][0]["content"]["parts"][0]["text"]
                    return self._parse_ai_response(ai_text)
                else:
                    return self._get_fallback_response()
                    
            except httpx.HTTPError as e:
                print(f"Gemini API error: {e}")
                return self._get_fallback_response()
            except Exception as e:
                print(f"Unexpected error in Gemini service: {e}")
                return self._get_fallback_response()
    
    def _build_analysis_prompt(
        self,
        symptoms: List[Dict],
        foods_consumed: List[Dict],
        user_profile: Dict,
        historical_patterns: Optional[List[Dict]]
    ) -> str:
        """Build a comprehensive prompt for the AI with all relevant data."""
        
        prompt = f"""You are an expert nutritionist and gut health specialist. Analyze the following data and provide personalized recommendations.

USER PROFILE:
- Age: {user_profile.get('age', 'Unknown')}
- Gender: {user_profile.get('gender', 'Unknown')}
- Activity Level: {user_profile.get('activity_level', 'Unknown')}
- Health Goals: {user_profile.get('goals', 'General health')}
- Current Weight: {user_profile.get('weight', 'Unknown')} kg
- BMI: {user_profile.get('bmi', 'Unknown')}

RECENT SYMPTOMS (last 7 days):
"""
        
        # Add symptoms
        if symptoms:
            for symptom in symptoms:
                prompt += f"- {symptom.get('date', 'Recent')}: {symptom.get('type', 'Unknown')} "
                prompt += f"(severity: {symptom.get('severity', 'Unknown')}/10)\n"
                if symptom.get('notes'):
                    prompt += f"  Notes: {symptom['notes']}\n"
        else:
            prompt += "No symptoms recorded recently.\n"
        
        prompt += "\nFOODS CONSUMED (last 7 days):\n"
        
        # Add recent foods
        if foods_consumed:
            for food in foods_consumed[:20]:  # Limit to recent 20 meals
                prompt += f"- {food.get('date', 'Recent')}: {food.get('name', 'Unknown food')} "
                prompt += f"({food.get('calories', 0)} cal)\n"
        else:
            prompt += "No food logs available.\n"
        
        # Add historical patterns if available
        if historical_patterns:
            prompt += "\nHISTORICAL PATTERNS:\n"
            for pattern in historical_patterns:
                prompt += f"- {pattern.get('food', 'Unknown')} often correlates with {pattern.get('symptom', 'Unknown symptom')}\n"
        
        prompt += """

TASK:
Provide a comprehensive gut health analysis in the following JSON format:
{
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ],
  "trigger_foods": [
    "Food that may be causing issues",
    "Another potential trigger"
  ],
  "beneficial_foods": [
    "Food that may help (explain why)",
    "Another beneficial food (explain why)"
  ],
  "probiotic_suggestions": [
    "Specific probiotic-rich food 1",
    "Specific probiotic-rich food 2"
  ],
  "lifestyle_tips": [
    "Lifestyle suggestion 1",
    "Lifestyle suggestion 2"
  ],
  "confidence_score": 75,
  "reasoning": "Brief explanation of your analysis and why you made these recommendations"
}

Focus on:
1. Identifying potential trigger foods based on symptoms
2. Recommending gut-friendly foods (fermented foods, fiber-rich, etc.)
3. Suggesting dietary patterns that support digestive health
4. Providing evidence-based nutrition advice
5. Being cautious and recommending medical consultation if symptoms are severe

Return ONLY the JSON, no additional text.
"""
        
        return prompt
    
    def _parse_ai_response(self, ai_text: str) -> Dict:
        """
        Parse AI response and extract structured recommendations.
        
        Args:
            ai_text: Raw text response from Gemini
        
        Returns:
            Structured dict with recommendations
        """
        import json
        import re
        
        try:
            # Try to extract JSON from response (AI might add extra text)
            json_match = re.search(r'\{.*\}', ai_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                return parsed
            else:
                # Fallback: return text as a recommendation
                return {
                    "recommendations": [ai_text[:500]],
                    "trigger_foods": [],
                    "beneficial_foods": [],
                    "probiotic_suggestions": [],
                    "lifestyle_tips": [],
                    "confidence_score": 50,
                    "reasoning": "AI response could not be fully parsed"
                }
        except json.JSONDecodeError:
            return self._get_fallback_response()
    
    def _get_fallback_response(self) -> Dict:
        """Return generic recommendations if API fails."""
        return {
            "recommendations": [
                "Track your meals and symptoms daily for better insights",
                "Eat a diverse range of fiber-rich foods (fruits, vegetables, whole grains)",
                "Stay hydrated with 8+ glasses of water daily",
                "Consider adding fermented foods like yogurt, kefir, or sauerkraut"
            ],
            "trigger_foods": [],
            "beneficial_foods": [
                "Yogurt with live cultures (probiotics for gut health)",
                "Oats (soluble fiber for digestive regularity)",
                "Bananas (easy to digest, prebiotic fiber)",
                "Ginger (natural digestive aid)"
            ],
            "probiotic_suggestions": [
                "Plain Greek yogurt",
                "Kefir",
                "Kombucha",
                "Sauerkraut"
            ],
            "lifestyle_tips": [
                "Eat slowly and chew thoroughly",
                "Manage stress through exercise or meditation",
                "Get 7-9 hours of sleep per night",
                "Exercise regularly to support digestion"
            ],
            "confidence_score": 60,
            "reasoning": "These are general gut health recommendations. For personalized advice, please log more meals and symptoms."
        }
    
    async def get_meal_suggestions(
        self,
        dietary_restrictions: List[str],
        health_goals: List[str],
        available_ingredients: List[str]
    ) -> List[Dict]:
        """
        Get AI-powered meal suggestions based on user preferences and gut health needs.
        
        Args:
            dietary_restrictions: List of restrictions (e.g., "lactose-free", "gluten-free")
            health_goals: Goals like "improve digestion", "reduce bloating"
            available_ingredients: Ingredients user has on hand
        
        Returns:
            List of meal suggestions with recipes and nutritional benefits
        """
        prompt = f"""Suggest 3 gut-friendly meals based on:

DIETARY RESTRICTIONS: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
HEALTH GOALS: {', '.join(health_goals)}
AVAILABLE INGREDIENTS: {', '.join(available_ingredients)}

For each meal, provide:
1. Meal name
2. Simple recipe (3-5 steps)
3. Why it's good for gut health
4. Approximate calories

Return as JSON array.
"""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
                
                response = await client.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.8,
                            "maxOutputTokens": 1024,
                        }
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                if "candidates" in result:
                    ai_text = result["candidates"][0]["content"]["parts"][0]["text"]
                    # Parse and return meal suggestions
                    import json
                    import re
                    json_match = re.search(r'\[.*\]', ai_text, re.DOTALL)
                    if json_match:
                        return json.loads(json_match.group(0))
                
                return []
            except Exception as e:
                print(f"Error getting meal suggestions: {e}")
                return []
