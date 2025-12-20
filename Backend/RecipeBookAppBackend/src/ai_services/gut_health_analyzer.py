"""
Gut Health Analyzer

This module provides high-level business logic for gut health analysis.
It coordinates between AI services and data processing to provide insights.

Features:
- Analyzes correlations between foods and symptoms
- Generates personalized dietary recommendations
- Tracks gut health trends over time
- Identifies potential trigger foods
- Suggests gut-friendly meals

The analyzer uses the active AI service (Gemini by default, OpenAI when enabled).
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import os

# Import AI services
from .gemini_service import GeminiService
from .openai_service import OpenAIService


class GutHealthAnalyzer:
    """
    High-level analyzer that coordinates AI services and data processing.
    """
    
    def __init__(self):
        """
        Initialize analyzer with the appropriate AI service.
        
        Uses Gemini by default (free), switches to OpenAI if AI_PROVIDER=openai
        """
        ai_provider = os.getenv("AI_PROVIDER", "gemini").lower()
        
        if ai_provider == "openai":
            self.ai_service = OpenAIService()
            print("Using OpenAI for gut health analysis")
        else:
            self.ai_service = GeminiService()
            print("Using Gemini for gut health analysis")
    
    async def analyze_and_recommend(
        self,
        user_id: str,
        gut_health_logs: List[Dict],
        nutrition_logs: List[Dict],
        user_profile: Dict,
        days_to_analyze: int = 7
    ) -> Dict:
        """
        Comprehensive gut health analysis with AI-powered recommendations.
        
        Args:
            user_id: User identifier
            gut_health_logs: Recent gut health entries (symptoms, bowel movements, etc.)
            nutrition_logs: Recent meals and food intake
            user_profile: User's health metrics and goals
            days_to_analyze: Number of days to look back (default: 7)
        
        Returns:
            Dict containing:
                - ai_recommendations: AI-generated dietary suggestions
                - correlations: Food-symptom correlations found in data
                - symptom_summary: Summary of recent symptoms
                - trigger_analysis: Potential trigger foods identified
                - trends: Gut health trends over time
        """
        # Filter data to analysis window
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_analyze)
        
        recent_symptoms = [
            log for log in gut_health_logs
            if log.get('date') and log['date'] >= cutoff_date
        ]
        
        recent_foods = [
            log for log in nutrition_logs
            if log.get('date') and log['date'] >= cutoff_date
        ]
        
        # Analyze correlations between foods and symptoms
        correlations = self._find_food_symptom_correlations(
            recent_symptoms, recent_foods
        )
        
        # Get AI recommendations
        ai_recommendations = await self.ai_service.analyze_gut_health(
            symptoms=recent_symptoms,
            foods_consumed=recent_foods,
            user_profile=user_profile,
            historical_patterns=correlations
        )
        
        # Calculate symptom summary
        symptom_summary = self._summarize_symptoms(recent_symptoms)
        
        # Analyze trends
        trends = self._analyze_trends(gut_health_logs, days_to_analyze)
        
        return {
            "ai_recommendations": ai_recommendations,
            "correlations": correlations,
            "symptom_summary": symptom_summary,
            "trends": trends,
            "analysis_period_days": days_to_analyze,
            "total_symptoms_logged": len(recent_symptoms),
            "total_meals_logged": len(recent_foods)
        }
    
    def _find_food_symptom_correlations(
        self,
        symptoms: List[Dict],
        foods: List[Dict]
    ) -> List[Dict]:
        """
        Identify correlations between consumed foods and symptoms.
        
        Looks for patterns where symptoms occur within 2-24 hours of eating certain foods.
        
        Args:
            symptoms: List of symptom logs with timestamps
            foods: List of food logs with timestamps
        
        Returns:
            List of potential correlations with confidence scores
        """
        correlations: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "symptoms": []})
        
        for symptom in symptoms:
            symptom_date = symptom.get('date')
            if not symptom_date:
                continue
            
            # Look for foods consumed 2-24 hours before symptom
            for food in foods:
                food_date = food.get('date')
                if not food_date:
                    continue
                
                time_diff = (symptom_date - food_date).total_seconds() / 3600  # hours
                
                if 2 <= time_diff <= 24:  # Symptom occurred 2-24 hours after eating
                    food_name = food.get('name', 'Unknown food')
                    correlations[food_name]["count"] += 1
                    correlations[food_name]["symptoms"].append(symptom.get('type', 'Unknown'))
        
        # Convert to list and sort by frequency
        result = []
        for food, data in correlations.items():
            count: int = data["count"]  # type: ignore
            if count >= 2:  # Only include if happened at least twice
                result.append({
                    "food": food,
                    "correlation_count": data["count"],
                    "associated_symptoms": list(set(data["symptoms"])),
                    "confidence": min(data["count"] * 20, 100)  # Simple confidence score
                })
        
        return sorted(result, key=lambda x: x["correlation_count"], reverse=True)
    
    def _summarize_symptoms(self, symptoms: List[Dict]) -> Dict:
        """
        Create a summary of symptoms for the analysis period.
        
        Args:
            symptoms: List of symptom logs
        
        Returns:
            Dict with symptom frequencies, average severity, most common types
        """
        if not symptoms:
            return {
                "total_symptoms": 0,
                "most_common": None,
                "average_severity": 0,
                "symptom_breakdown": {}
            }
        
        symptom_counts = defaultdict(int)
        total_severity = 0
        severity_count = 0
        
        for symptom in symptoms:
            symptom_type = symptom.get('type', 'Unknown')
            symptom_counts[symptom_type] += 1
            
            if 'severity' in symptom:
                total_severity += symptom['severity']
                severity_count += 1
        
        avg_severity = total_severity / severity_count if severity_count > 0 else 0
        most_common = max(symptom_counts.items(), key=lambda x: x[1]) if symptom_counts else None
        
        return {
            "total_symptoms": len(symptoms),
            "most_common": most_common[0] if most_common else None,
            "most_common_count": most_common[1] if most_common else 0,
            "average_severity": round(avg_severity, 1),
            "symptom_breakdown": dict(symptom_counts)
        }
    
    def _analyze_trends(self, all_logs: List[Dict], days: int) -> Dict:
        """
        Analyze gut health trends over the specified period.
        
        Args:
            all_logs: Complete gut health log history
            days: Number of days to analyze
        
        Returns:
            Dict with trend information (improving/worsening/stable)
        """
        if len(all_logs) < 2:
            return {"trend": "insufficient_data", "message": "Need more logs to identify trends"}
        
        # Sort by date
        sorted_logs = sorted(
            [log for log in all_logs if log.get('date')],
            key=lambda x: x['date']
        )
        
        # Split into first half and second half of analysis period
        midpoint = len(sorted_logs) // 2
        first_half = sorted_logs[:midpoint]
        second_half = sorted_logs[midpoint:]
        
        # Calculate average severity for each half
        def avg_severity(logs):
            severities = [log.get('severity', 0) for log in logs if 'severity' in log]
            return sum(severities) / len(severities) if severities else 0
        
        first_avg = avg_severity(first_half)
        second_avg = avg_severity(second_half)
        
        # Determine trend
        if first_avg == 0 or second_avg == 0:
            trend = "insufficient_data"
            message = "Need severity ratings to determine trends"
        elif second_avg < first_avg * 0.8:  # 20% improvement
            trend = "improving"
            message = f"Symptoms improving (avg severity: {first_avg:.1f} → {second_avg:.1f})"
        elif second_avg > first_avg * 1.2:  # 20% worsening
            trend = "worsening"
            message = f"Symptoms worsening (avg severity: {first_avg:.1f} → {second_avg:.1f})"
        else:
            trend = "stable"
            message = f"Symptoms stable (avg severity: {first_avg:.1f} → {second_avg:.1f})"
        
        return {
            "trend": trend,
            "message": message,
            "first_period_avg": round(first_avg, 1),
            "second_period_avg": round(second_avg, 1),
            "change_percentage": round(((second_avg - first_avg) / first_avg * 100), 1) if first_avg > 0 else 0
        }
    
    async def get_personalized_meal_plan(
        self,
        user_profile: Dict,
        dietary_restrictions: List[str],
        gut_health_goals: List[str],
        available_ingredients: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Generate gut-friendly meal suggestions using AI.
        
        Args:
            user_profile: User's health information
            dietary_restrictions: List of restrictions (e.g., "lactose-free", "gluten-free")
            gut_health_goals: Goals like "reduce bloating", "improve regularity"
            available_ingredients: Optional list of ingredients user has
        
        Returns:
            List of meal suggestions with recipes and nutritional info
        """
        return await self.ai_service.get_meal_suggestions(
            dietary_restrictions=dietary_restrictions,
            health_goals=gut_health_goals,
            available_ingredients=available_ingredients or []
        )
    
    def calculate_gut_health_score(
        self,
        recent_symptoms: List[Dict],
        symptom_severity_weight: float = 0.6,
        frequency_weight: float = 0.4
    ) -> Dict:
        """
        Calculate an overall gut health score (0-100).
        
        Higher score = better gut health (fewer/less severe symptoms).
        
        Args:
            recent_symptoms: Symptoms from recent period (e.g., last 7 days)
            symptom_severity_weight: How much to weight severity vs frequency
            frequency_weight: How much to weight frequency vs severity
        
        Returns:
            Dict with score, rating, and explanation
        """
        if not recent_symptoms:
            return {
                "score": 100,
                "rating": "Excellent",
                "message": "No symptoms reported - gut health appears excellent!"
            }
        
        # Calculate severity score (inverted: lower severity = higher score)
        severities = [s.get('severity', 5) for s in recent_symptoms if 'severity' in s]
        avg_severity = sum(severities) / len(severities) if severities else 5
        severity_score = max(0, 100 - (avg_severity * 10))  # Scale to 0-100
        
        # Calculate frequency score (fewer symptoms = higher score)
        # Normalize to 7-day period
        frequency_score = max(0, 100 - (len(recent_symptoms) * 10))
        
        # Weighted final score
        final_score = (
            severity_score * symptom_severity_weight +
            frequency_score * frequency_weight
        )
        
        # Determine rating
        if final_score >= 80:
            rating = "Excellent"
            message = "Your gut health is in great shape!"
        elif final_score >= 60:
            rating = "Good"
            message = "Your gut health is generally good, with minor issues."
        elif final_score >= 40:
            rating = "Fair"
            message = "Some gut health concerns. Consider dietary adjustments."
        else:
            rating = "Needs Attention"
            message = "Significant gut health issues. Consult a healthcare provider."
        
        return {
            "score": round(final_score, 1),
            "rating": rating,
            "message": message,
            "severity_component": round(severity_score, 1),
            "frequency_component": round(frequency_score, 1)
        }
