"""
AI Services Package

This package contains AI/ML services for analyzing nutrition and gut health data.
It provides two implementations that can be easily swapped:

- gemini_service.py: Google Gemini API (active, free tier)
- openai_service.py: OpenAI GPT API (ready but inactive)

The gut_health_analyzer.py module uses the active service to provide recommendations.
"""

from .gemini_service import GeminiService
from .openai_service import OpenAIService
from .gut_health_analyzer import GutHealthAnalyzer

__all__ = ['GeminiService', 'OpenAIService', 'GutHealthAnalyzer']
