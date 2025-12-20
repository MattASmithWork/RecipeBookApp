import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  createAccount,
  getAccount,
  updateAccount,
  UserAccount,
} from '../services/api';

/**
 * AccountSetupScreen - Component for creating and managing user accounts
 * Features:
 * - Create new user account with health metrics
 * - Edit existing account information
 * - Calculate BMR, BMI, and recommended daily calories
 * - Support for two users: Matt and Niccy
 */
const AccountSetupScreen: React.FC = () => {
  // State for form inputs
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
  >('moderately_active');

  // State for app logic
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [existingAccount, setExistingAccount] = useState<UserAccount | null>(null);
  const [calculatedMetrics, setCalculatedMetrics] = useState<{
    bmr: number;
    bmi: number;
    bmiCategory: string;
    recommendedDailyCalories: number;
  } | null>(null);

  // State for account selection
  const [selectedUser, setSelectedUser] = useState<'matt' | 'niccy' | null>(null);

  /**
   * Load account data if it exists
   */
  useEffect(() => {
    if (selectedUser) {
      loadAccountData(selectedUser);
    }
  }, [selectedUser]);

  /**
   * Load existing account data for a user
   */
  const loadAccountData = async (user: string) => {
    try {
      setLoading(true);
      const account = await getAccount(user);
      setExistingAccount(account);
      
      // Populate form with existing data
      setUsername(account.username);
      setDisplayName(account.displayName);
      setEmail(account.email || '');
      setAge(account.age.toString());
      setGender(account.gender);
      setWeight(account.weight.toString());
      setHeight(account.height.toString());
      setActivityLevel(account.activityLevel);
      
      // Set calculated metrics if available
      if (account.bmr && account.bmi) {
        setCalculatedMetrics({
          bmr: account.bmr,
          bmi: account.bmi,
          bmiCategory: account.bmiCategory || '',
          recommendedDailyCalories: account.recommendedDailyCalories || 0,
        });
      }
      
      setIsEditing(true);
    } catch (error: any) {
      // Account doesn't exist yet - that's okay, user can create it
      if (error.response?.status === 404) {
        setIsEditing(false);
        setExistingAccount(null);
        // Pre-fill username and display name for new account
        setUsername(user);
        setDisplayName(user.charAt(0).toUpperCase() + user.slice(1));
      } else {
        console.error('Error loading account:', error);
        Alert.alert('Error', 'Failed to load account data');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle account creation or update
   */
  const handleSaveAccount = async () => {
    // Validate required fields
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Please enter a username');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter a display name');
      return;
    }
    if (!age || parseInt(age) < 1 || parseInt(age) > 150) {
      Alert.alert('Validation Error', 'Please enter a valid age (1-150)');
      return;
    }
    if (!weight || parseFloat(weight) <= 0 || parseFloat(weight) > 500) {
      Alert.alert('Validation Error', 'Please enter a valid weight in kg (0-500)');
      return;
    }
    if (!height || parseFloat(height) <= 0 || parseFloat(height) > 300) {
      Alert.alert('Validation Error', 'Please enter a valid height in cm (0-300)');
      return;
    }

    try {
      setLoading(true);

      const accountData: UserAccount = {
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        email: email.trim() || undefined,
        age: parseInt(age),
        gender,
        weight: parseFloat(weight),
        height: parseFloat(height),
        activityLevel,
      };

      if (isEditing) {
        // Update existing account
        const result = await updateAccount(username.toLowerCase(), accountData);
        setCalculatedMetrics({
          bmr: result.bmr,
          bmi: result.bmi,
          bmiCategory: result.bmiCategory,
          recommendedDailyCalories: result.recommendedDailyCalories,
        });
        Alert.alert('Success', 'Account updated successfully');
      } else {
        // Create new account
        const result = await createAccount(accountData);
        setCalculatedMetrics({
          bmr: result.bmr,
          bmi: result.bmi,
          bmiCategory: result.bmiCategory,
          recommendedDailyCalories: result.recommendedDailyCalories,
        });
        setIsEditing(true);
        Alert.alert('Success', 'Account created successfully');
      }

      // Reload account data to get all updated fields
      await loadAccountData(username.toLowerCase());
    } catch (error: any) {
      console.error('Error saving account:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save account';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render user selection buttons
   */
  const renderUserSelection = () => {
    if (selectedUser) return null;

    return (
      <View style={styles.userSelectionContainer}>
        <Text style={styles.sectionTitle}>Select User</Text>
        <View style={styles.userButtonsRow}>
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => setSelectedUser('matt')}
          >
            <Text style={styles.userButtonText}>Matt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => setSelectedUser('niccy')}
          >
            <Text style={styles.userButtonText}>Niccy</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /**
   * Render gender selector buttons
   */
  const renderGenderSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.label}>Gender *</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.selectorButton, gender === 'male' && styles.selectorButtonActive]}
          onPress={() => setGender('male')}
        >
          <Text style={[styles.selectorText, gender === 'male' && styles.selectorTextActive]}>
            Male
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, gender === 'female' && styles.selectorButtonActive]}
          onPress={() => setGender('female')}
        >
          <Text style={[styles.selectorText, gender === 'female' && styles.selectorTextActive]}>
            Female
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Render activity level selector
   */
  const renderActivityLevelSelector = () => {
    const activityLevels = [
      { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
      { value: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
      { value: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
      { value: 'very_active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
      { value: 'extremely_active', label: 'Extremely Active', description: 'Very hard exercise & physical job' },
    ];

    return (
      <View style={styles.selectorContainer}>
        <Text style={styles.label}>Activity Level *</Text>
        {activityLevels.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.activityButton,
              activityLevel === level.value && styles.activityButtonActive,
            ]}
            onPress={() => setActivityLevel(level.value as any)}
          >
            <Text
              style={[
                styles.activityLabel,
                activityLevel === level.value && styles.activityLabelActive,
              ]}
            >
              {level.label}
            </Text>
            <Text
              style={[
                styles.activityDescription,
                activityLevel === level.value && styles.activityDescriptionActive,
              ]}
            >
              {level.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  /**
   * Render calculated metrics display
   */
  const renderCalculatedMetrics = () => {
    if (!calculatedMetrics) return null;

    return (
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Your Health Metrics</Text>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>BMR (Basal Metabolic Rate)</Text>
          <Text style={styles.metricValue}>{calculatedMetrics.bmr.toFixed(0)} cal/day</Text>
          <Text style={styles.metricDescription}>Calories burned at rest</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>BMI (Body Mass Index)</Text>
          <Text style={styles.metricValue}>
            {calculatedMetrics.bmi.toFixed(1)} - {calculatedMetrics.bmiCategory}
          </Text>
          <Text style={styles.metricDescription}>Weight category indicator</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardHighlight]}>
          <Text style={styles.metricLabel}>Recommended Daily Calories</Text>
          <Text style={[styles.metricValue, styles.metricValueHighlight]}>
            {calculatedMetrics.recommendedDailyCalories.toFixed(0)} cal/day
          </Text>
          <Text style={styles.metricDescription}>
            Based on your activity level
          </Text>
        </View>
      </View>
    );
  };

  if (!selectedUser) {
    return (
      <View style={styles.screen}>
        {renderUserSelection()}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setSelectedUser(null);
            setUsername('');
            setDisplayName('');
            setEmail('');
            setAge('');
            setWeight('');
            setHeight('');
            setCalculatedMetrics(null);
            setIsEditing(false);
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.mainTitle}>
          {isEditing ? 'Edit Account' : 'Create Account'} - {displayName}
        </Text>
      </View>

      {loading && !calculatedMetrics ? (
        <ActivityIndicator size="large" color="#FF6347" style={styles.loader} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={[styles.input, isEditing && styles.inputDisabled]}
            value={username}
            onChangeText={setUsername}
            placeholder="e.g., matt or niccy"
            placeholderTextColor="#999"
            autoCapitalize="none"
            editable={!isEditing}
          />

          <Text style={styles.label}>Display Name *</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g., Matt"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="e.g., matt@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.sectionTitle}>Health Information</Text>

          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder="e.g., 30"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          {renderGenderSelector()}

          <Text style={styles.label}>Current Weight (kg) *</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g., 75.5"
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Height (cm) *</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            placeholder="e.g., 175"
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />

          {renderActivityLevelSelector()}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveAccount}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isEditing ? 'Update Account' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {renderCalculatedMetrics()}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF6347',
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  selectorContainer: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectorButtonActive: {
    backgroundColor: '#FF6347',
    borderColor: '#FF6347',
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  selectorTextActive: {
    color: '#fff',
  },
  activityButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  activityButtonActive: {
    backgroundColor: '#FF6347',
    borderColor: '#FF6347',
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityLabelActive: {
    color: '#fff',
  },
  activityDescription: {
    fontSize: 13,
    color: '#666',
  },
  activityDescriptionActive: {
    color: '#fff',
    opacity: 0.9,
  },
  button: {
    backgroundColor: '#FF6347',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 50,
  },
  metricsContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  metricCardHighlight: {
    backgroundColor: '#fff5f3',
    borderColor: '#FF6347',
    borderWidth: 2,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  metricValueHighlight: {
    color: '#FF6347',
  },
  metricDescription: {
    fontSize: 13,
    color: '#999',
  },
  userSelectionContainer: {
    alignItems: 'center',
  },
  userButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  userButton: {
    backgroundColor: '#FF6347',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginHorizontal: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  userButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default AccountSetupScreen;
