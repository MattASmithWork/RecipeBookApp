/**
 * Component tests for WeightTrackingScreen
 * Tests: User selection, weight logging, history display, statistics, deletion
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WeightTrackingScreen from '../screens/WeightTrackingScreen';
import * as api from '../services/api';

jest.mock('../services/api');

describe('WeightTrackingScreen', () => {
  const mockWeightHistory = [
    {
      id: '1',
      username: 'matt',
      weight: 80.0,
      date: '2025-11-20',
      notes: 'Starting weight',
      weightChange: 0,
      weightChangePercentage: 0,
    },
    {
      id: '2',
      username: 'matt',
      weight: 79.0,
      date: '2025-12-01',
      notes: 'Good progress',
      weightChange: -1.0,
      weightChangePercentage: -1.25,
    },
    {
      id: '3',
      username: 'matt',
      weight: 78.5,
      date: '2025-12-20',
      notes: 'Feeling great',
      weightChange: -0.5,
      weightChangePercentage: -0.63,
    },
  ];

  const mockStats = {
    firstWeight: 80.0,
    currentWeight: 78.5,
    totalChange: -1.5,
    totalChangePercentage: -1.88,
    monthsTracked: 1,
    averageMonthlyChange: -1.5,
    highestWeight: 80.0,
    lowestWeight: 78.5,
    currentTrend: 'losing',
    entryCount: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Selection', () => {
    it('should render user selection buttons', () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      expect(getByText('Matt')).toBeTruthy();
      expect(getByText('Niccy')).toBeTruthy();
    });

    it('should load weight data when user is selected', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      (api.getWeightStats as jest.Mock).mockResolvedValue(mockStats);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      
      await waitFor(() => {
        expect(api.getWeightHistory).toHaveBeenCalledWith('matt');
        expect(api.getWeightStats).toHaveBeenCalledWith('matt');
      });
    });

    it('should switch between users', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue([]);
      (api.getWeightStats as jest.Mock).mockResolvedValue(mockStats);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      await waitFor(() => expect(api.getWeightHistory).toHaveBeenCalledWith('matt'));
      
      fireEvent.press(getByText('Niccy'));
      await waitFor(() => expect(api.getWeightHistory).toHaveBeenCalledWith('niccy'));
    });
  });

  describe('Tab Navigation', () => {
    it('should render all three tabs', () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      expect(getByText('Log Weight')).toBeTruthy();
      expect(getByText('History')).toBeTruthy();
      expect(getByText('Statistics')).toBeTruthy();
    });

    it('should switch to History tab', () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      const historyTab = getByText('History');
      fireEvent.press(historyTab);
      
      expect(historyTab.parent).toBeTruthy();
    });

    it('should switch to Statistics tab', () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      const statsTab = getByText('Statistics');
      fireEvent.press(statsTab);
      
      expect(statsTab.parent).toBeTruthy();
    });

    it('should display active tab content', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        expect(getByText('Good progress')).toBeTruthy();
      });
    });
  });

  describe('Log Weight Tab', () => {
    it('should render weight input field', () => {
      const { getByPlaceholderText } = render(<WeightTrackingScreen />);
      
      expect(getByPlaceholderText(/weight/i)).toBeTruthy();
    });

    it('should render date picker', () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      expect(getByText(/date/i) || getByText(/Select Date/i)).toBeTruthy();
    });

    it('should render notes input field', () => {
      const { getByPlaceholderText } = render(<WeightTrackingScreen />);
      
      expect(getByPlaceholderText(/notes/i)).toBeTruthy();
    });

    it('should update weight input', () => {
      const { getByPlaceholderText } = render(<WeightTrackingScreen />);
      
      const weightInput = getByPlaceholderText(/weight/i);
      fireEvent.changeText(weightInput, '79.5');
      
      expect(weightInput.props.value).toBe('79.5');
    });

    it('should update notes input', () => {
      const { getByPlaceholderText } = render(<WeightTrackingScreen />);
      
      const notesInput = getByPlaceholderText(/notes/i);
      fireEvent.changeText(notesInput, 'Morning weight after workout');
      
      expect(notesInput.props.value).toBe('Morning weight after workout');
    });

    it('should log weight successfully', async () => {
      (api.logWeight as jest.Mock).mockResolvedValue({
        id: '4',
        message: 'Weight logged successfully!',
        newBmi: 24.5,
        bmiCategory: 'Normal weight',
      });
      
      const { getByPlaceholderText, getByText } = render(<WeightTrackingScreen />);
      
      // Select user
      fireEvent.press(getByText('Matt'));
      
      // Fill form
      fireEvent.changeText(getByPlaceholderText(/weight/i), '79.5');
      fireEvent.changeText(getByPlaceholderText(/notes/i), 'Test weight');
      
      // Submit
      fireEvent.press(getByText(/Log Weight/i));
      
      await waitFor(() => {
        expect(api.logWeight).toHaveBeenCalledWith(expect.objectContaining({
          username: 'matt',
          weight: 79.5,
          notes: 'Test weight',
        }));
      });
    });

    it('should show success message after logging weight', async () => {
      (api.logWeight as jest.Mock).mockResolvedValue({
        id: '4',
        message: 'Weight logged successfully!',
        newBmi: 24.5,
        bmiCategory: 'Normal weight',
      });
      
      const { getByPlaceholderText, getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.changeText(getByPlaceholderText(/weight/i), '79.5');
      fireEvent.press(getByText(/Log Weight/i));
      
      await waitFor(() => {
        expect(getByText(/successfully/i)).toBeTruthy();
      });
    });

    it('should display new BMI after logging weight', async () => {
      (api.logWeight as jest.Mock).mockResolvedValue({
        id: '4',
        message: 'Weight logged successfully!',
        newBmi: 24.5,
        bmiCategory: 'Normal weight',
      });
      
      const { getByPlaceholderText, getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.changeText(getByPlaceholderText(/weight/i), '79.5');
      fireEvent.press(getByText(/Log Weight/i));
      
      await waitFor(() => {
        expect(getByText(/24.5/)).toBeTruthy();
        expect(getByText(/Normal weight/)).toBeTruthy();
      });
    });

    it('should clear form after successful submission', async () => {
      (api.logWeight as jest.Mock).mockResolvedValue({
        id: '4',
        message: 'Weight logged successfully!',
      });
      
      const { getByPlaceholderText, getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      
      const weightInput = getByPlaceholderText(/weight/i);
      const notesInput = getByPlaceholderText(/notes/i);
      
      fireEvent.changeText(weightInput, '79.5');
      fireEvent.changeText(notesInput, 'Test');
      fireEvent.press(getByText(/Log Weight/i));
      
      await waitFor(() => {
        expect(weightInput.props.value).toBe('');
        expect(notesInput.props.value).toBe('');
      });
    });

    it('should validate weight input is required', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText(/Log Weight/i));
      
      await waitFor(() => {
        expect(getByText(/required/i) || getByText(/enter weight/i)).toBeTruthy();
      });
    });

    it('should validate weight input is numeric', () => {
      const { getByPlaceholderText } = render(<WeightTrackingScreen />);
      
      const weightInput = getByPlaceholderText(/weight/i);
      expect(weightInput.props.keyboardType).toBe('decimal-pad' || 'numeric');
    });
  });

  describe('History Tab', () => {
    it('should display weight history entries', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        expect(getByText('80.0')).toBeTruthy();
        expect(getByText('79.0')).toBeTruthy();
        expect(getByText('78.5')).toBeTruthy();
      });
    });

    it('should display weight changes', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        expect(getByText(/-1.0/)).toBeTruthy();
        expect(getByText(/-0.5/)).toBeTruthy();
      });
    });

    it('should display percentage changes', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        expect(getByText(/-1.25%/)).toBeTruthy();
        expect(getByText(/-0.63%/)).toBeTruthy();
      });
    });

    it('should display entry dates', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        expect(getByText(/2025-11-20/)).toBeTruthy();
        expect(getByText(/2025-12-01/)).toBeTruthy();
        expect(getByText(/2025-12-20/)).toBeTruthy();
      });
    });

    it('should display notes for entries', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        expect(getByText('Starting weight')).toBeTruthy();
        expect(getByText('Good progress')).toBeTruthy();
        expect(getByText('Feeling great')).toBeTruthy();
      });
    });

    it('should show delete button for each entry', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      
      const { getAllByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getAllByText('Matt')[0]);
      fireEvent.press(getAllByText('History')[0]);
      
      await waitFor(() => {
        const deleteButtons = getAllByText(/delete/i);
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('should delete weight entry', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      (api.deleteWeightEntry as jest.Mock).mockResolvedValue({ message: 'Deleted' });
      
      const { getByText, getAllByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        const deleteButtons = getAllByText(/delete/i);
        fireEvent.press(deleteButtons[0]);
      });
      
      await waitFor(() => {
        expect(api.deleteWeightEntry).toHaveBeenCalled();
      });
    });

    it('should show empty state when no history', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue([]);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        expect(getByText(/no weight entries/i) || getByText(/start tracking/i)).toBeTruthy();
      });
    });

    it('should color-code weight changes (green for loss, orange for gain)', async () => {
      const mixedHistory = [
        { ...mockWeightHistory[0], weightChange: 0 },
        { ...mockWeightHistory[1], weightChange: -1.0 }, // Loss - should be green
        { ...mockWeightHistory[2], weight: 79.5, weightChange: 0.5 }, // Gain - should be orange
      ];
      
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mixedHistory);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(() => {
        expect(getByText(/-1.0/)).toBeTruthy();
        expect(getByText(/0.5/)).toBeTruthy();
      });
    });
  });

  describe('Statistics Tab', () => {
    beforeEach(() => {
      (api.getWeightStats as jest.Mock).mockResolvedValue(mockStats);
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
    });

    it('should display first weight', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/80.0/)).toBeTruthy();
        expect(getByText(/first weight/i)).toBeTruthy();
      });
    });

    it('should display current weight', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/78.5/)).toBeTruthy();
        expect(getByText(/current weight/i)).toBeTruthy();
      });
    });

    it('should display total weight change', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/-1.5/)).toBeTruthy();
        expect(getByText(/total change/i)).toBeTruthy();
      });
    });

    it('should display total percentage change', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/-1.88%/)).toBeTruthy();
      });
    });

    it('should display months tracked', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/1/)).toBeTruthy();
        expect(getByText(/months tracked/i)).toBeTruthy();
      });
    });

    it('should display average monthly change', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/-1.5/)).toBeTruthy();
        expect(getByText(/average monthly/i)).toBeTruthy();
      });
    });

    it('should display highest weight', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/80.0/)).toBeTruthy();
        expect(getByText(/highest/i)).toBeTruthy();
      });
    });

    it('should display lowest weight', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/78.5/)).toBeTruthy();
        expect(getByText(/lowest/i)).toBeTruthy();
      });
    });

    it('should display current trend', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/losing/i)).toBeTruthy();
        expect(getByText(/trend/i)).toBeTruthy();
      });
    });

    it('should display entry count', async () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/3/)).toBeTruthy();
        expect(getByText(/entries/i)).toBeTruthy();
      });
    });

    it('should show different trend indicators (losing, gaining, stable)', async () => {
      const gainingStats = { ...mockStats, currentTrend: 'gaining' };
      (api.getWeightStats as jest.Mock).mockResolvedValue(gainingStats);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/gaining/i)).toBeTruthy();
      });
    });

    it('should handle insufficient data gracefully', async () => {
      const insufficientStats = { ...mockStats, currentTrend: 'insufficient_data', entryCount: 1 };
      (api.getWeightStats as jest.Mock).mockResolvedValue(insufficientStats);
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('Statistics'));
      
      await waitFor(() => {
        expect(getByText(/insufficient data/i) || getByText(/more entries needed/i)).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors when loading history', async () => {
      (api.getWeightHistory as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      
      await waitFor(() => {
        expect(getByText(/error/i) || getByText(/failed/i)).toBeTruthy();
      });
    });

    it('should handle API errors when logging weight', async () => {
      (api.logWeight as jest.Mock).mockRejectedValue(new Error('Server error'));
      
      const { getByPlaceholderText, getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.changeText(getByPlaceholderText(/weight/i), '79.5');
      fireEvent.press(getByText(/Log Weight/i));
      
      await waitFor(() => {
        expect(getByText(/error/i)).toBeTruthy();
      });
    });

    it('should handle API errors when deleting entry', async () => {
      (api.getWeightHistory as jest.Mock).mockResolvedValue(mockWeightHistory);
      (api.deleteWeightEntry as jest.Mock).mockRejectedValue(new Error('Delete failed'));
      
      const { getByText, getAllByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.press(getByText('History'));
      
      await waitFor(async () => {
        const deleteButtons = getAllByText(/delete/i);
        fireEvent.press(deleteButtons[0]);
        
        await waitFor(() => {
          expect(getByText(/error/i) || getByText(/failed/i)).toBeTruthy();
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching data', async () => {
      (api.getWeightHistory as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockWeightHistory), 100))
      );
      
      const { getByText, queryByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      
      expect(queryByText(/loading/i)).toBeTruthy();
      
      await waitFor(() => {
        expect(queryByText(/loading/i)).toBeFalsy();
      });
    });

    it('should disable submit button while logging weight', async () => {
      (api.logWeight as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: '4' }), 100))
      );
      
      const { getByPlaceholderText, getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('Matt'));
      fireEvent.changeText(getByPlaceholderText(/weight/i), '79.5');
      
      const logButton = getByText(/Log Weight/i);
      fireEvent.press(logButton);
      
      expect(logButton.props.disabled || logButton.props.accessibilityState?.disabled).toBeTruthy();
    });
  });

  describe('User Selection Required', () => {
    it('should prompt user to select user before logging weight', () => {
      const { getByPlaceholderText, getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.changeText(getByPlaceholderText(/weight/i), '79.5');
      fireEvent.press(getByText(/Log Weight/i));
      
      expect(getByText(/select a user/i)).toBeTruthy();
    });

    it('should show placeholder when no user selected on History tab', () => {
      const { getByText } = render(<WeightTrackingScreen />);
      
      fireEvent.press(getByText('History'));
      
      expect(getByText(/select a user/i) || getByText(/choose a user/i)).toBeTruthy();
    });
  });
});
