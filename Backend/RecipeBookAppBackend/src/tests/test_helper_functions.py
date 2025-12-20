"""
Unit tests for helper functions in app_api.py
Tests: BMR calculation, BMI calculation, calorie recommendations, BMI categories
"""

import pytest
from app_api import calculate_bmr, calculate_bmi, calculate_daily_calories, get_bmi_category


class TestBMRCalculation:
    """Tests for Basal Metabolic Rate (BMR) calculation using Mifflin-St Jeor equation."""
    
    @pytest.mark.unit
    def test_bmr_male_standard(self):
        """Test BMR calculation for a standard male profile."""
        # Male: 80kg, 180cm, 30 years
        # Formula: (10 × 80) + (6.25 × 180) - (5 × 30) + 5
        # = 800 + 1125 - 150 + 5 = 1780
        bmr = calculate_bmr(weight_kg=80.0, height_cm=180, age=30, gender="male")
        assert bmr == 1780.0
        assert isinstance(bmr, float)
    
    @pytest.mark.unit
    def test_bmr_female_standard(self):
        """Test BMR calculation for a standard female profile."""
        # Female: 65kg, 165cm, 28 years
        # Formula: (10 × 65) + (6.25 × 165) - (5 × 28) - 161
        # = 650 + 1031.25 - 140 - 161 = 1380.25
        bmr = calculate_bmr(weight_kg=65.0, height_cm=165, age=28, gender="female")
        assert bmr == 1380.25
        assert isinstance(bmr, float)
    
    @pytest.mark.unit
    def test_bmr_male_lightweight(self):
        """Test BMR for a lighter male."""
        # Male: 60kg, 170cm, 25 years
        bmr = calculate_bmr(weight_kg=60.0, height_cm=170, age=25, gender="male")
        expected = (10 * 60) + (6.25 * 170) - (5 * 25) + 5
        assert bmr == expected
    
    @pytest.mark.unit
    def test_bmr_female_heavyweight(self):
        """Test BMR for a heavier female."""
        # Female: 90kg, 175cm, 35 years
        bmr = calculate_bmr(weight_kg=90.0, height_cm=175, age=35, gender="female")
        expected = (10 * 90) + (6.25 * 175) - (5 * 35) - 161
        assert bmr == expected
    
    @pytest.mark.unit
    def test_bmr_older_male(self):
        """Test BMR for an older male (age affects BMR)."""
        # Male: 75kg, 175cm, 60 years
        bmr = calculate_bmr(weight_kg=75.0, height_cm=175, age=60, gender="male")
        expected = (10 * 75) + (6.25 * 175) - (5 * 60) + 5
        assert bmr == expected
    
    @pytest.mark.unit
    def test_bmr_gender_difference(self):
        """Test that male BMR is higher than female for same stats (due to gender constant)."""
        weight, height, age = 70.0, 170, 30
        male_bmr = calculate_bmr(weight, height, age, "male")
        female_bmr = calculate_bmr(weight, height, age, "female")
        
        # Male should have +166 calories (5 - (-161))
        assert male_bmr > female_bmr
        assert male_bmr - female_bmr == 166
    
    @pytest.mark.unit
    def test_bmr_decimal_weight(self):
        """Test BMR with decimal weight values."""
        bmr = calculate_bmr(weight_kg=72.5, height_cm=178, age=28, gender="male")
        expected = (10 * 72.5) + (6.25 * 178) - (5 * 28) + 5
        assert bmr == expected


class TestBMICalculation:
    """Tests for Body Mass Index (BMI) calculation."""
    
    @pytest.mark.unit
    def test_bmi_normal_weight(self):
        """Test BMI calculation for normal weight range."""
        # 70kg, 175cm -> BMI = 70 / (1.75)^2 = 22.86
        bmi = calculate_bmi(weight_kg=70.0, height_cm=175)
        assert round(bmi, 2) == 22.86
    
    @pytest.mark.unit
    def test_bmi_underweight(self):
        """Test BMI calculation for underweight range."""
        # 50kg, 175cm -> BMI = 50 / (1.75)^2 = 16.33
        bmi = calculate_bmi(weight_kg=50.0, height_cm=175)
        assert round(bmi, 2) == 16.33
    
    @pytest.mark.unit
    def test_bmi_overweight(self):
        """Test BMI calculation for overweight range."""
        # 85kg, 170cm -> BMI = 85 / (1.70)^2 = 29.41
        bmi = calculate_bmi(weight_kg=85.0, height_cm=170)
        assert round(bmi, 2) == 29.41
    
    @pytest.mark.unit
    def test_bmi_obese(self):
        """Test BMI calculation for obese range."""
        # 100kg, 170cm -> BMI = 100 / (1.70)^2 = 34.60
        bmi = calculate_bmi(weight_kg=100.0, height_cm=170)
        assert round(bmi, 2) == 34.6
    
    @pytest.mark.unit
    def test_bmi_precision(self):
        """Test that BMI returns proper float precision."""
        bmi = calculate_bmi(weight_kg=72.5, height_cm=178)
        assert isinstance(bmi, float)
        # Should have reasonable precision
        assert len(str(bmi).split('.')[-1]) >= 2
    
    @pytest.mark.unit
    def test_bmi_different_heights(self):
        """Test that BMI decreases with increased height (same weight)."""
        weight = 80.0
        bmi_short = calculate_bmi(weight, 160)
        bmi_medium = calculate_bmi(weight, 175)
        bmi_tall = calculate_bmi(weight, 190)
        
        assert bmi_short > bmi_medium > bmi_tall


class TestBMICategory:
    """Tests for BMI category classification."""
    
    @pytest.mark.unit
    def test_underweight_category(self):
        """Test underweight BMI category."""
        assert get_bmi_category(17.5) == "Underweight"
        assert get_bmi_category(18.4) == "Underweight"
    
    @pytest.mark.unit
    def test_normal_weight_category(self):
        """Test normal weight BMI category."""
        assert get_bmi_category(18.5) == "Normal weight"
        assert get_bmi_category(22.0) == "Normal weight"
        assert get_bmi_category(24.9) == "Normal weight"
    
    @pytest.mark.unit
    def test_overweight_category(self):
        """Test overweight BMI category."""
        assert get_bmi_category(25.0) == "Overweight"
        assert get_bmi_category(27.5) == "Overweight"
        assert get_bmi_category(29.9) == "Overweight"
    
    @pytest.mark.unit
    def test_obese_category(self):
        """Test obese BMI category."""
        assert get_bmi_category(30.0) == "Obese"
        assert get_bmi_category(35.0) == "Obese"
        assert get_bmi_category(40.0) == "Obese"
    
    @pytest.mark.unit
    def test_boundary_values(self):
        """Test BMI category boundaries."""
        assert get_bmi_category(18.49) == "Underweight"
        assert get_bmi_category(18.50) == "Normal weight"
        assert get_bmi_category(24.99) == "Normal weight"
        assert get_bmi_category(25.00) == "Overweight"
        assert get_bmi_category(29.99) == "Overweight"
        assert get_bmi_category(30.00) == "Obese"


class TestDailyCalorieCalculation:
    """Tests for daily calorie recommendations based on activity level."""
    
    @pytest.mark.unit
    def test_sedentary_calories(self):
        """Test calorie calculation for sedentary activity level."""
        bmr = 1800.0
        calories = calculate_daily_calories(bmr, "sedentary")
        assert calories == 1800.0 * 1.2
        assert calories == 2160.0
    
    @pytest.mark.unit
    def test_lightly_active_calories(self):
        """Test calorie calculation for lightly active level."""
        bmr = 1800.0
        calories = calculate_daily_calories(bmr, "lightly_active")
        assert calories == 1800.0 * 1.375
        assert calories == 2475.0
    
    @pytest.mark.unit
    def test_moderately_active_calories(self):
        """Test calorie calculation for moderately active level."""
        bmr = 1800.0
        calories = calculate_daily_calories(bmr, "moderately_active")
        assert calories == 1800.0 * 1.55
        assert calories == 2790.0
    
    @pytest.mark.unit
    def test_very_active_calories(self):
        """Test calorie calculation for very active level."""
        bmr = 1800.0
        calories = calculate_daily_calories(bmr, "very_active")
        assert calories == 1800.0 * 1.725
        assert calories == 3105.0
    
    @pytest.mark.unit
    def test_extremely_active_calories(self):
        """Test calorie calculation for extremely active level."""
        bmr = 1800.0
        calories = calculate_daily_calories(bmr, "extremely_active")
        assert calories == 1800.0 * 1.9
        assert calories == 3420.0
    
    @pytest.mark.unit
    def test_activity_level_comparison(self):
        """Test that higher activity levels result in more calories."""
        bmr = 2000.0
        sedentary = calculate_daily_calories(bmr, "sedentary")
        lightly = calculate_daily_calories(bmr, "lightly_active")
        moderately = calculate_daily_calories(bmr, "moderately_active")
        very = calculate_daily_calories(bmr, "very_active")
        extremely = calculate_daily_calories(bmr, "extremely_active")
        
        assert sedentary < lightly < moderately < very < extremely
    
    @pytest.mark.unit
    def test_calories_return_float(self):
        """Test that calorie calculation returns float."""
        calories = calculate_daily_calories(1850.5, "moderately_active")
        assert isinstance(calories, float)
    
    @pytest.mark.unit
    def test_low_bmr_calories(self):
        """Test calorie calculation with low BMR (e.g., smaller person)."""
        bmr = 1200.0
        calories = calculate_daily_calories(bmr, "sedentary")
        assert calories == 1440.0
    
    @pytest.mark.unit
    def test_high_bmr_calories(self):
        """Test calorie calculation with high BMR (e.g., larger/athletic person)."""
        bmr = 2500.0
        calories = calculate_daily_calories(bmr, "very_active")
        assert calories == 4312.5


class TestHelperFunctionsIntegration:
    """Integration tests for helper functions working together."""
    
    @pytest.mark.unit
    def test_complete_health_metrics_male(self):
        """Test complete health metric calculation for male user."""
        weight, height, age, gender = 80.0, 180, 30, "male"
        activity = "moderately_active"
        
        bmr = calculate_bmr(weight, height, age, gender)
        bmi = calculate_bmi(weight, height)
        category = get_bmi_category(bmi)
        calories = calculate_daily_calories(bmr, activity)
        
        assert bmr == 1780.0
        assert round(bmi, 2) == 24.69
        assert category == "Normal weight"
        assert calories == 2759.0
    
    @pytest.mark.unit
    def test_complete_health_metrics_female(self):
        """Test complete health metric calculation for female user."""
        weight, height, age, gender = 65.0, 165, 28, "female"
        activity = "lightly_active"
        
        bmr = calculate_bmr(weight, height, age, gender)
        bmi = calculate_bmi(weight, height)
        category = get_bmi_category(bmi)
        calories = calculate_daily_calories(bmr, activity)
        
        assert bmr == 1380.25
        assert round(bmi, 2) == 23.88
        assert category == "Normal weight"
        assert round(calories, 2) == 1897.84
    
    @pytest.mark.unit
    def test_overweight_user_metrics(self):
        """Test health metrics for overweight user."""
        weight, height, age, gender = 95.0, 175, 40, "male"
        
        bmi = calculate_bmi(weight, height)
        category = get_bmi_category(bmi)
        
        assert round(bmi, 2) == 31.02
        assert category == "Obese"
    
    @pytest.mark.unit
    def test_underweight_user_metrics(self):
        """Test health metrics for underweight user."""
        weight, height, age, gender = 50.0, 175, 22, "female"
        
        bmi = calculate_bmi(weight, height)
        category = get_bmi_category(bmi)
        
        assert round(bmi, 2) == 16.33
        assert category == "Underweight"
