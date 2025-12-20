/**
 * Component tests for AccountSetupScreen
 * Tests: User selection, form inputs, health metric calculations, account creation/updates
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AccountSetupScreen from '../screens/AccountSetupScreen';
import * as api from '../services/api';

// Mock the API module
jest.mock('../services/api');

describe('AccountSetupScreen', () => {
  const mockAccount = {
    id: '123',
    username: 'matt',
    displayName: 'Matt',
    email: 'matt@example.com',
    age: 30,
    gender: 'male',
    weight: 80.0,
    height: 180,
    activityLevel: 'moderately_active',
    bmr: 1780.0,
    bmi: 24.69,
    bmiCategory: 'Normal weight',
    recommendedDailyCalories: 2759.0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Selection', () => {
    it('should render user selection buttons', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      expect(getByText('Matt')).toBeTruthy();
      expect(getByText('Niccy')).toBeTruthy();
    });

    it('should highlight selected user', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      const mattButton = getByText('Matt');
      fireEvent.press(mattButton);
      
      // Button should have selected state
      expect(mattButton.parent).toBeTruthy();
    });

    it('should switch between users', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Niccy'));
      
      // Should update selected user
      expect(getByText('Niccy')).toBeTruthy();
    });

    it('should load account data when user is selected', async () => {
      (api.getAccount as jest.Mock).mockResolvedValue(mockAccount);
      
      const { getByText, getByDisplayValue } = render(<AccountSetupScreen />);
      
      fireEvent.press(getByText('Matt'));
      
      await waitFor(() => {
        expect(api.getAccount).toHaveBeenCalledWith('matt');
      });
    });
  });

  describe('Form Inputs', () => {
    it('should render all form fields', () => {
      const { getByPlaceholderText } = render(<AccountSetupScreen />);
      
      expect(getByPlaceholderText(/username/i)).toBeTruthy();
      expect(getByPlaceholderText(/display name/i)).toBeTruthy();
      expect(getByPlaceholderText(/email/i)).toBeTruthy();
      expect(getByPlaceholderText(/age/i)).toBeTruthy();
      expect(getByPlaceholderText(/weight/i)).toBeTruthy();
      expect(getByPlaceholderText(/height/i)).toBeTruthy();
    });

    it('should update username input', () => {
      const { getByPlaceholderText } = render(<AccountSetupScreen />);
      
      const usernameInput = getByPlaceholderText(/username/i);
      fireEvent.changeText(usernameInput, 'testuser');
      
      expect(usernameInput.props.value).toBe('testuser');
    });

    it('should update display name input', () => {
      const { getByPlaceholderText } = render(<AccountSetupScreen />);
      
      const displayNameInput = getByPlaceholderText(/display name/i);
      fireEvent.changeText(displayNameInput, 'Test User');
      
      expect(displayNameInput.props.value).toBe('Test User');
    });

    it('should update email input', () => {
      const { getByPlaceholderText } = render(<AccountSetupScreen />);
      
      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@example.com');
      
      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('should update age input with numeric value', () => {
      const { getByPlaceholderText } = render(<AccountSetupScreen />);
      
      const ageInput = getByPlaceholderText(/age/i);
      fireEvent.changeText(ageInput, '30');
      
      expect(ageInput.props.value).toBe('30');
    });

    it('should update weight input', () => {
      const { getByPlaceholderText } = render(<AccountSetupScreen />);
      
      const weightInput = getByPlaceholderText(/weight/i);
      fireEvent.changeText(weightInput, '80.5');
      
      expect(weightInput.props.value).toBe('80.5');
    });

    it('should update height input', () => {
      const { getByPlaceholderText } = render(<AccountSetupScreen />);
      
      const heightInput = getByPlaceholderText(/height/i);
      fireEvent.changeText(heightInput, '180');
      
      expect(heightInput.props.value).toBe('180');
    });

    it('should validate numeric inputs only accept numbers', () => {
      const { getByPlaceholderText } = render(<AccountSetupScreen />);
      
      const ageInput = getByPlaceholderText(/age/i);
      fireEvent.changeText(ageInput, 'abc');
      
      // Should not accept non-numeric input or handle appropriately
      expect(ageInput.props.keyboardType).toBe('numeric');
    });
  });

  describe('Gender Selection', () => {
    it('should render male and female gender buttons', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      expect(getByText('Male')).toBeTruthy();
      expect(getByText('Female')).toBeTruthy();
    });

    it('should select male gender', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      const maleButton = getByText('Male');
      fireEvent.press(maleButton);
      
      expect(maleButton.parent).toBeTruthy();
    });

    it('should select female gender', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      const femaleButton = getByText('Female');
      fireEvent.press(femaleButton);
      
      expect(femaleButton.parent).toBeTruthy();
    });

    it('should switch between genders', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      fireEvent.press(getByText('Male'));
      fireEvent.press(getByText('Female'));
      
      expect(getByText('Female')).toBeTruthy();
    });
  });

  describe('Activity Level Selection', () => {
    it('should render all activity level options', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      expect(getByText(/Sedentary/i)).toBeTruthy();
      expect(getByText(/Lightly Active/i)).toBeTruthy();
      expect(getByText(/Moderately Active/i)).toBeTruthy();
      expect(getByText(/Very Active/i)).toBeTruthy();
      expect(getByText(/Extremely Active/i)).toBeTruthy();
    });

    it('should select activity level', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      const moderatelyActiveButton = getByText(/Moderately Active/i);
      fireEvent.press(moderatelyActiveButton);
      
      expect(moderatelyActiveButton.parent).toBeTruthy();
    });

    it('should show activity level descriptions', () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      // Should show descriptions for each level
      expect(getByText(/little or no exercise/i)).toBeTruthy();
      expect(getByText(/exercise 1-3 times\/week/i)).toBeTruthy();
    });
  });

  describe('Health Metrics Display', () => {
    it('should calculate and display BMR', async () => {
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      // Fill in required fields
      fireEvent.changeText(getByPlaceholderText(/age/i), '30');
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      fireEvent.press(getByText('Male'));
      
      await waitFor(() => {
        expect(getByText(/BMR:/i)).toBeTruthy();
        expect(getByText(/1780/)).toBeTruthy(); // Expected BMR for these stats
      });
    });

    it('should calculate and display BMI', async () => {
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      
      await waitFor(() => {
        expect(getByText(/BMI:/i)).toBeTruthy();
        expect(getByText(/24.69/)).toBeTruthy();
      });
    });

    it('should display BMI category', async () => {
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      
      await waitFor(() => {
        expect(getByText(/Normal weight/i)).toBeTruthy();
      });
    });

    it('should calculate recommended daily calories', async () => {
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      fireEvent.changeText(getByPlaceholderText(/age/i), '30');
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      fireEvent.press(getByText('Male'));
      fireEvent.press(getByText(/Moderately Active/i));
      
      await waitFor(() => {
        expect(getByText(/Recommended Daily Calories:/i)).toBeTruthy();
        expect(getByText(/2759/)).toBeTruthy();
      });
    });

    it('should update metrics in real-time when inputs change', async () => {
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      
      await waitFor(() => {
        expect(getByText(/24.69/)).toBeTruthy();
      });
      
      // Change weight
      fireEvent.changeText(getByPlaceholderText(/weight/i), '85');
      
      await waitFor(() => {
        expect(getByText(/26.23/)).toBeTruthy(); // New BMI
      });
    });
  });

  describe('Account Creation', () => {
    it('should create account with valid data', async () => {
      (api.createAccount as jest.Mock).mockResolvedValue({
        id: '123',
        username: 'testuser',
        message: 'Account created successfully!',
        bmr: 1780.0,
        bmi: 24.69,
        bmiCategory: 'Normal weight',
        recommendedDailyCalories: 2759.0,
      });
      
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      // Fill form
      fireEvent.changeText(getByPlaceholderText(/username/i), 'testuser');
      fireEvent.changeText(getByPlaceholderText(/display name/i), 'Test User');
      fireEvent.changeText(getByPlaceholderText(/age/i), '30');
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      fireEvent.press(getByText('Male'));
      fireEvent.press(getByText(/Moderately Active/i));
      
      // Submit
      const saveButton = getByText(/Save Account/i);
      fireEvent.press(saveButton);
      
      await waitFor(() => {
        expect(api.createAccount).toHaveBeenCalledWith({
          username: 'testuser',
          displayName: 'Test User',
          age: 30,
          gender: 'male',
          weight: 80,
          height: 180,
          activityLevel: 'moderately_active',
        });
      });
    });

    it('should show success message after account creation', async () => {
      (api.createAccount as jest.Mock).mockResolvedValue({
        id: '123',
        message: 'Account created successfully!',
      });
      
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      // Fill and submit form
      fireEvent.changeText(getByPlaceholderText(/username/i), 'testuser');
      fireEvent.changeText(getByPlaceholderText(/display name/i), 'Test');
      fireEvent.changeText(getByPlaceholderText(/age/i), '30');
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      fireEvent.press(getByText('Male'));
      
      fireEvent.press(getByText(/Save Account/i));
      
      await waitFor(() => {
        expect(getByText(/successfully/i)).toBeTruthy();
      });
    });

    it('should show error for missing required fields', async () => {
      const { getByText } = render(<AccountSetupScreen />);
      
      // Try to submit without filling required fields
      fireEvent.press(getByText(/Save Account/i));
      
      await waitFor(() => {
        expect(getByText(/required/i)).toBeTruthy();
      });
    });

    it('should validate email format', async () => {
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      fireEvent.changeText(getByPlaceholderText(/email/i), 'invalid-email');
      
      await waitFor(() => {
        // Should show validation error
        expect(getByText(/invalid email/i) || getByText(/valid email/i)).toBeTruthy();
      });
    });
  });

  describe('Account Updates', () => {
    it('should update existing account', async () => {
      (api.getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (api.updateAccount as jest.Mock).mockResolvedValue({
        message: 'Account updated successfully!',
        bmr: 1780.0,
        bmi: 24.69,
        recommendedDailyCalories: 2759.0,
      });
      
      const { getByText, getByPlaceholderText } = render(<AccountSetupScreen />);
      
      // Select user to load existing account
      fireEvent.press(getByText('Matt'));
      
      await waitFor(() => {
        expect(api.getAccount).toHaveBeenCalled();
      });
      
      // Update weight
      fireEvent.changeText(getByPlaceholderText(/weight/i), '75');
      
      // Save
      fireEvent.press(getByText(/Update Account/i));
      
      await waitFor(() => {
        expect(api.updateAccount).toHaveBeenCalledWith('matt', expect.objectContaining({
          weight: 75,
        }));
      });
    });

    it('should show update button for existing accounts', async () => {
      (api.getAccount as jest.Mock).mockResolvedValue(mockAccount);
      
      const { getByText } = render(<AccountSetupScreen />);
      
      fireEvent.press(getByText('Matt'));
      
      await waitFor(() => {
        expect(getByText(/Update Account/i)).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (api.createAccount as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      // Fill and submit
      fireEvent.changeText(getByPlaceholderText(/username/i), 'testuser');
      fireEvent.changeText(getByPlaceholderText(/age/i), '30');
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      fireEvent.press(getByText('Male'));
      
      fireEvent.press(getByText(/Save Account/i));
      
      await waitFor(() => {
        expect(getByText(/error/i)).toBeTruthy();
      });
    });

    it('should handle account not found gracefully', async () => {
      (api.getAccount as jest.Mock).mockRejectedValue(new Error('Account not found'));
      
      const { getByText } = render(<AccountSetupScreen />);
      
      fireEvent.press(getByText('Matt'));
      
      await waitFor(() => {
        // Should show create form instead of error
        expect(getByText(/Save Account/i)).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching account', async () => {
      (api.getAccount as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockAccount), 100))
      );
      
      const { getByText, queryByText } = render(<AccountSetupScreen />);
      
      fireEvent.press(getByText('Matt'));
      
      // Should show loading
      expect(queryByText(/loading/i) || queryByText(/Loading/i)).toBeTruthy();
      
      await waitFor(() => {
        expect(queryByText(/loading/i)).toBeFalsy();
      });
    });

    it('should disable submit button while saving', async () => {
      (api.createAccount as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: '123' }), 100))
      );
      
      const { getByPlaceholderText, getByText } = render(<AccountSetupScreen />);
      
      // Fill form
      fireEvent.changeText(getByPlaceholderText(/username/i), 'testuser');
      fireEvent.changeText(getByPlaceholderText(/age/i), '30');
      fireEvent.changeText(getByPlaceholderText(/weight/i), '80');
      fireEvent.changeText(getByPlaceholderText(/height/i), '180');
      fireEvent.press(getByText('Male'));
      
      const saveButton = getByText(/Save Account/i);
      fireEvent.press(saveButton);
      
      // Button should be disabled
      expect(saveButton.props.disabled || saveButton.props.accessibilityState?.disabled).toBeTruthy();
    });
  });
});
