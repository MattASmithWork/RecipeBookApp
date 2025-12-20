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
  logMeal,
  getNutritionLogs,
  getDailyNutritionSummary,
  updateMealLog,
  deleteMealLog,
  setNutritionGoals,
  getNutritionGoals,
  getWeeklyNutritionSummary,
  MealLog,
  NutritionInfo,
  UserNutritionGoals,
  DailyNutritionSummary,
  WeeklyNutritionSummary,
} from '../services/api';

/**
 * NutritionTrackerScreen - Component for tracking meals and nutrition
 * Features:
 * - Log meals with calorie and macro information
 * - View daily nutrition summary with progress vs goals
 * - Set and update nutrition goals
 * - View weekly nutrition trends
 * - Edit and delete meal logs
 */
const NutritionTrackerScreen: React.FC = () => {
  // State for meal logging form
  const [user] = useState('testuser'); // In production, get from auth context
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [servings, setServings] = useState('1');
  const [notes, setNotes] = useState('');

  // State for displaying data
  const [dailySummary, setDailySummary] = useState<DailyNutritionSummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyNutritionSummary | null>(null);
  const [goals, setGoals] = useState<UserNutritionGoals | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'log' | 'daily' | 'weekly' | 'goals'>('log');

  // State for editing goals
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalCalories, setGoalCalories] = useState('2000');
  const [goalProtein, setGoalProtein] = useState('150');
  const [goalCarbs, setGoalCarbs] = useState('200');
  const [goalFat, setGoalFat] = useState('65');

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Load daily summary on mount and when view changes
  useEffect(() => {
    if (view === 'daily') {
      loadDailySummary();
    } else if (view === 'weekly') {
      loadWeeklySummary();
    } else if (view === 'goals') {
      loadGoals();
    }
  }, [view]);

  /**
   * Load daily nutrition summary for today
   */
  const loadDailySummary = async () => {
    try {
      setLoading(true);
      const summary = await getDailyNutritionSummary(user, getTodayDate());
      setDailySummary(summary);
    } catch (error) {
      console.error('Error loading daily summary:', error);
      Alert.alert('Error', 'Failed to load daily summary');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load weekly nutrition summary
   */
  const loadWeeklySummary = async () => {
    try {
      setLoading(true);
      const summary = await getWeeklyNutritionSummary(user);
      setWeeklySummary(summary);
    } catch (error) {
      console.error('Error loading weekly summary:', error);
      Alert.alert('Error', 'Failed to load weekly summary');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load user's nutrition goals
   */
  const loadGoals = async () => {
    try {
      setLoading(true);
      const userGoals = await getNutritionGoals(user);
      setGoals(userGoals);
      // Populate edit fields with current goals
      if (userGoals) {
        setGoalCalories(userGoals.dailyCalories.toString());
        setGoalProtein(userGoals.dailyProtein.toString());
        setGoalCarbs(userGoals.dailyCarbs.toString());
        setGoalFat(userGoals.dailyFat.toString());
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      // If no goals exist, that's okay - user can create them
      setGoals(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log a new meal
   */
  const handleLogMeal = async () => {
    // Validate required fields
    if (!mealName.trim()) {
      Alert.alert('Validation Error', 'Please enter a meal name');
      return;
    }
    if (!calories || parseFloat(calories) < 0) {
      Alert.alert('Validation Error', 'Please enter valid calories');
      return;
    }
    if (!protein || parseFloat(protein) < 0) {
      Alert.alert('Validation Error', 'Please enter valid protein amount');
      return;
    }
    if (!carbs || parseFloat(carbs) < 0) {
      Alert.alert('Validation Error', 'Please enter valid carbs amount');
      return;
    }
    if (!fat || parseFloat(fat) < 0) {
      Alert.alert('Validation Error', 'Please enter valid fat amount');
      return;
    }

    try {
      setLoading(true);

      // Build nutrition info
      const nutrition: NutritionInfo = {
        calories: parseFloat(calories),
        protein: parseFloat(protein),
        carbs: parseFloat(carbs),
        fat: parseFloat(fat),
      };

      // Add optional fields if provided
      if (fiber) nutrition.fiber = parseFloat(fiber);
      if (sugar) nutrition.sugar = parseFloat(sugar);
      if (sodium) nutrition.sodium = parseFloat(sodium);

      // Build meal log
      const meal: MealLog = {
        user,
        mealType,
        mealName: mealName.trim(),
        date: getTodayDate(),
        nutrition,
        servings: parseFloat(servings),
        notes: notes.trim() || undefined,
      };

      await logMeal(meal);
      Alert.alert('Success', 'Meal logged successfully');

      // Clear form
      setMealName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setFiber('');
      setSugar('');
      setSodium('');
      setServings('1');
      setNotes('');
    } catch (error) {
      console.error('Error logging meal:', error);
      Alert.alert('Error', 'Failed to log meal');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save/update nutrition goals
   */
  const handleSaveGoals = async () => {
    // Validate goals
    if (!goalCalories || parseFloat(goalCalories) < 0) {
      Alert.alert('Validation Error', 'Please enter valid calorie goal');
      return;
    }
    if (!goalProtein || parseFloat(goalProtein) < 0) {
      Alert.alert('Validation Error', 'Please enter valid protein goal');
      return;
    }
    if (!goalCarbs || parseFloat(goalCarbs) < 0) {
      Alert.alert('Validation Error', 'Please enter valid carbs goal');
      return;
    }
    if (!goalFat || parseFloat(goalFat) < 0) {
      Alert.alert('Validation Error', 'Please enter valid fat goal');
      return;
    }

    try {
      setLoading(true);

      const newGoals: UserNutritionGoals = {
        user,
        dailyCalories: parseFloat(goalCalories),
        dailyProtein: parseFloat(goalProtein),
        dailyCarbs: parseFloat(goalCarbs),
        dailyFat: parseFloat(goalFat),
      };

      await setNutritionGoals(newGoals);
      Alert.alert('Success', 'Nutrition goals updated successfully');
      setEditingGoals(false);
      await loadGoals();
    } catch (error) {
      console.error('Error saving goals:', error);
      Alert.alert('Error', 'Failed to save nutrition goals');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a meal log
   */
  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteMealLog(mealId);
              Alert.alert('Success', 'Meal deleted successfully');
              await loadDailySummary();
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Render meal type selector buttons
   */
  const renderMealTypeSelector = () => (
    <View style={styles.mealTypeContainer}>
      {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.mealTypeButton,
            mealType === type && styles.mealTypeButtonActive,
          ]}
          onPress={() => setMealType(type as any)}
        >
          <Text
            style={[
              styles.mealTypeText,
              mealType === type && styles.mealTypeTextActive,
            ]}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  /**
   * Render progress bar for a nutrition metric
   */
  const renderProgressBar = (
    label: string,
    current: number,
    goal: number,
    unit: string
  ) => {
    const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    const remaining = Math.max(goal - current, 0);
    const isOver = current > goal;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>
            {current.toFixed(1)} / {goal.toFixed(1)} {unit}
          </Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%` },
              isOver && styles.progressBarOverGoal,
            ]}
          />
        </View>
        <Text style={styles.progressRemaining}>
          {isOver ? `${(current - goal).toFixed(1)} over` : `${remaining.toFixed(1)} remaining`}
        </Text>
      </View>
    );
  };

  /**
   * Render meal logging form
   */
  const renderLogMealView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Log a Meal</Text>

      {renderMealTypeSelector()}

      <Text style={styles.label}>Meal Name *</Text>
      <TextInput
        style={styles.input}
        value={mealName}
        onChangeText={setMealName}
        placeholder="e.g., Grilled Chicken Salad"
        placeholderTextColor="#999"
      />

      <View style={styles.row}>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>Calories *</Text>
          <TextInput
            style={styles.input}
            value={calories}
            onChangeText={setCalories}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>Servings</Text>
          <TextInput
            style={styles.input}
            value={servings}
            onChangeText={setServings}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>Macronutrients (grams) *</Text>
      <View style={styles.row}>
        <View style={styles.thirdColumn}>
          <Text style={styles.label}>Protein</Text>
          <TextInput
            style={styles.input}
            value={protein}
            onChangeText={setProtein}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.thirdColumn}>
          <Text style={styles.label}>Carbs</Text>
          <TextInput
            style={styles.input}
            value={carbs}
            onChangeText={setCarbs}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.thirdColumn}>
          <Text style={styles.label}>Fat</Text>
          <TextInput
            style={styles.input}
            value={fat}
            onChangeText={setFat}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>Optional Details</Text>
      <View style={styles.row}>
        <View style={styles.thirdColumn}>
          <Text style={styles.label}>Fiber (g)</Text>
          <TextInput
            style={styles.input}
            value={fiber}
            onChangeText={setFiber}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.thirdColumn}>
          <Text style={styles.label}>Sugar (g)</Text>
          <TextInput
            style={styles.input}
            value={sugar}
            onChangeText={setSugar}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.thirdColumn}>
          <Text style={styles.label}>Sodium (mg)</Text>
          <TextInput
            style={styles.input}
            value={sodium}
            onChangeText={setSodium}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Additional notes (optional)"
        multiline
        numberOfLines={3}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogMeal}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log Meal</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  /**
   * Render daily nutrition summary
   */
  const renderDailySummaryView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Today's Nutrition</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6347" style={styles.loader} />
      ) : dailySummary ? (
        <>
          {/* Progress bars for main metrics */}
          {dailySummary.goals && (
            <View style={styles.progressSection}>
              {renderProgressBar(
                'Calories',
                dailySummary.totalCalories,
                dailySummary.goals.dailyCalories,
                'kcal'
              )}
              {renderProgressBar(
                'Protein',
                dailySummary.totalProtein,
                dailySummary.goals.dailyProtein,
                'g'
              )}
              {renderProgressBar(
                'Carbs',
                dailySummary.totalCarbs,
                dailySummary.goals.dailyCarbs,
                'g'
              )}
              {renderProgressBar(
                'Fat',
                dailySummary.totalFat,
                dailySummary.goals.dailyFat,
                'g'
              )}
            </View>
          )}

          {/* List of meals */}
          <Text style={styles.sectionSubtitle}>Today's Meals</Text>
          {dailySummary.meals && dailySummary.meals.length > 0 ? (
            dailySummary.meals.map((meal, index) => (
              <View key={index} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealType}>
                    {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => meal._id && handleDeleteMeal(meal._id)}
                  >
                    <Text style={styles.deleteButton}>Delete</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.mealName}>{meal.mealName}</Text>
                <View style={styles.mealNutrition}>
                  <Text style={styles.mealNutritionText}>
                    {meal.nutrition.calories} cal
                  </Text>
                  <Text style={styles.mealNutritionText}>
                    P: {meal.nutrition.protein}g
                  </Text>
                  <Text style={styles.mealNutritionText}>
                    C: {meal.nutrition.carbs}g
                  </Text>
                  <Text style={styles.mealNutritionText}>
                    F: {meal.nutrition.fat}g
                  </Text>
                </View>
                {meal.notes && <Text style={styles.mealNotes}>{meal.notes}</Text>}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No meals logged today</Text>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>No data available</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={loadDailySummary}>
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  /**
   * Render weekly nutrition summary
   */
  const renderWeeklySummaryView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Weekly Summary</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6347" style={styles.loader} />
      ) : weeklySummary ? (
        <>
          {/* Weekly averages */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>7-Day Averages</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Calories:</Text>
              <Text style={styles.summaryValue}>
                {weeklySummary.weeklyAverages.calories.toFixed(0)} kcal/day
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Protein:</Text>
              <Text style={styles.summaryValue}>
                {weeklySummary.weeklyAverages.protein.toFixed(1)} g/day
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Carbs:</Text>
              <Text style={styles.summaryValue}>
                {weeklySummary.weeklyAverages.carbs.toFixed(1)} g/day
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fat:</Text>
              <Text style={styles.summaryValue}>
                {weeklySummary.weeklyAverages.fat.toFixed(1)} g/day
              </Text>
            </View>
          </View>

          {/* Weekly totals */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>7-Day Totals</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Calories:</Text>
              <Text style={styles.summaryValue}>
                {weeklySummary.weeklyTotals.calories.toFixed(0)} kcal
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Protein:</Text>
              <Text style={styles.summaryValue}>
                {weeklySummary.weeklyTotals.protein.toFixed(1)} g
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Carbs:</Text>
              <Text style={styles.summaryValue}>
                {weeklySummary.weeklyTotals.carbs.toFixed(1)} g
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fat:</Text>
              <Text style={styles.summaryValue}>
                {weeklySummary.weeklyTotals.fat.toFixed(1)} g
              </Text>
            </View>
          </View>

          {/* Daily breakdown */}
          <Text style={styles.sectionSubtitle}>Daily Breakdown</Text>
          {weeklySummary.dailySummaries.map((day, index) => (
            <View key={index} style={styles.dayCard}>
              <Text style={styles.dayDate}>{day.date}</Text>
              <View style={styles.dayNutrition}>
                <Text style={styles.dayNutritionText}>
                  {day.calories.toFixed(0)} cal
                </Text>
                <Text style={styles.dayNutritionText}>
                  P: {day.protein.toFixed(1)}g
                </Text>
                <Text style={styles.dayNutritionText}>
                  C: {day.carbs.toFixed(1)}g
                </Text>
                <Text style={styles.dayNutritionText}>
                  F: {day.fat.toFixed(1)}g
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.emptyText}>No data available</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={loadWeeklySummary}>
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  /**
   * Render nutrition goals view
   */
  const renderGoalsView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Nutrition Goals</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6347" style={styles.loader} />
      ) : (
        <>
          {/* Current goals display */}
          {goals && !editingGoals && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Current Daily Goals</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Calories:</Text>
                <Text style={styles.summaryValue}>{goals.dailyCalories} kcal</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Protein:</Text>
                <Text style={styles.summaryValue}>{goals.dailyProtein} g</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Carbs:</Text>
                <Text style={styles.summaryValue}>{goals.dailyCarbs} g</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fat:</Text>
                <Text style={styles.summaryValue}>{goals.dailyFat} g</Text>
              </View>
            </View>
          )}

          {/* Edit goals form */}
          {editingGoals && (
            <>
              <Text style={styles.label}>Daily Calorie Goal (kcal)</Text>
              <TextInput
                style={styles.input}
                value={goalCalories}
                onChangeText={setGoalCalories}
                placeholder="2000"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Daily Protein Goal (g)</Text>
              <TextInput
                style={styles.input}
                value={goalProtein}
                onChangeText={setGoalProtein}
                placeholder="150"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Daily Carbs Goal (g)</Text>
              <TextInput
                style={styles.input}
                value={goalCarbs}
                onChangeText={setGoalCarbs}
                placeholder="200"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Daily Fat Goal (g)</Text>
              <TextInput
                style={styles.input}
                value={goalFat}
                onChangeText={setGoalFat}
                placeholder="65"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </>
          )}

          {/* Action buttons */}
          {editingGoals ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setEditingGoals(false);
                  // Reset to current goals
                  if (goals) {
                    setGoalCalories(goals.dailyCalories.toString());
                    setGoalProtein(goals.dailyProtein.toString());
                    setGoalCarbs(goals.dailyCarbs.toString());
                    setGoalFat(goals.dailyFat.toString());
                  }
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { flex: 1, marginLeft: 10 }]}
                onPress={handleSaveGoals}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save Goals</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setEditingGoals(true)}
            >
              <Text style={styles.buttonText}>
                {goals ? 'Edit Goals' : 'Set Goals'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.screen}>
      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, view === 'log' && styles.tabActive]}
          onPress={() => setView('log')}
        >
          <Text style={[styles.tabText, view === 'log' && styles.tabTextActive]}>
            Log Meal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'daily' && styles.tabActive]}
          onPress={() => setView('daily')}
        >
          <Text style={[styles.tabText, view === 'daily' && styles.tabTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'weekly' && styles.tabActive]}
          onPress={() => setView('weekly')}
        >
          <Text style={[styles.tabText, view === 'weekly' && styles.tabTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'goals' && styles.tabActive]}
          onPress={() => setView('goals')}
        >
          <Text style={[styles.tabText, view === 'goals' && styles.tabTextActive]}>
            Goals
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {view === 'log' && renderLogMealView()}
      {view === 'daily' && renderDailySummaryView()}
      {view === 'weekly' && renderWeeklySummaryView()}
      {view === 'goals' && renderGoalsView()}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF6347',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#FF6347',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#555',
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
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfColumn: {
    width: '48%',
  },
  thirdColumn: {
    width: '31%',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  mealTypeButtonActive: {
    backgroundColor: '#FF6347',
    borderColor: '#FF6347',
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  mealTypeTextActive: {
    color: '#fff',
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
  buttonSecondary: {
    backgroundColor: '#999',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 30,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressValue: {
    fontSize: 14,
    color: '#666',
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressBarOverGoal: {
    backgroundColor: '#FF9800',
  },
  progressRemaining: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  mealCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6347',
    textTransform: 'uppercase',
  },
  deleteButton: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  mealNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mealNutritionText: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
    marginBottom: 4,
  },
  mealNotes: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dayCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  dayNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayNutritionText: {
    fontSize: 13,
    color: '#666',
    marginRight: 12,
  },
});

export default NutritionTrackerScreen;
