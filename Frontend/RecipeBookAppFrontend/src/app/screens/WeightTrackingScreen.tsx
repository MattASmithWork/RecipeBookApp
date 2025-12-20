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
  logWeight,
  getWeightHistory,
  getWeightStats,
  deleteWeightEntry,
  WeightEntry,
  WeightStats,
} from '../services/api';

/**
 * WeightTrackingScreen - Component for tracking weight over time
 * Features:
 * - Log monthly weight measurements
 * - View weight history with changes
 * - See weight statistics (total change, trends, etc.)
 * - Delete weight entries
 * - Support for two users: Matt and Niccy
 */
const WeightTrackingScreen: React.FC = () => {
  // State for form inputs
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // State for app logic
  const [loading, setLoading] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [weightStats, setWeightStats] = useState<WeightStats | null>(null);
  const [view, setView] = useState<'log' | 'history' | 'stats'>('log');

  // State for user selection
  const [selectedUser, setSelectedUser] = useState<'matt' | 'niccy' | null>(null);

  /**
   * Get today's date in YYYY-MM-DD format
   */
  const getTodayDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  /**
   * Initialize selected date to today
   */
  useEffect(() => {
    setSelectedDate(getTodayDate());
  }, []);

  /**
   * Load data when user is selected or view changes
   */
  useEffect(() => {
    if (selectedUser) {
      if (view === 'history') {
        loadWeightHistory();
      } else if (view === 'stats') {
        loadWeightStats();
      }
    }
  }, [selectedUser, view]);

  /**
   * Load weight history for selected user
   */
  const loadWeightHistory = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const history = await getWeightHistory(selectedUser);
      setWeightHistory(history);
    } catch (error) {
      console.error('Error loading weight history:', error);
      Alert.alert('Error', 'Failed to load weight history');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load weight statistics for selected user
   */
  const loadWeightStats = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const stats = await getWeightStats(selectedUser);
      setWeightStats(stats);
    } catch (error: any) {
      console.error('Error loading weight stats:', error);
      if (error.response?.data?.message) {
        // Not enough data for stats
        setWeightStats(null);
      } else {
        Alert.alert('Error', 'Failed to load weight statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log a new weight measurement
   */
  const handleLogWeight = async () => {
    // Validate required fields
    if (!weight || parseFloat(weight) <= 0 || parseFloat(weight) > 500) {
      Alert.alert('Validation Error', 'Please enter a valid weight in kg (0-500)');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Validation Error', 'Please select a date');
      return;
    }

    try {
      setLoading(true);

      const entry: WeightEntry = {
        username: selectedUser!,
        weight: parseFloat(weight),
        date: selectedDate,
        notes: notes.trim() || undefined,
      };

      const result = await logWeight(entry);
      
      Alert.alert(
        'Success',
        `Weight logged successfully!\n\nNew BMI: ${result.newBmi.toFixed(1)}\nCategory: ${result.bmiCategory}`
      );

      // Clear form
      setWeight('');
      setNotes('');
      setSelectedDate(getTodayDate());

      // Reload history if on that view
      if (view === 'history') {
        await loadWeightHistory();
      }
    } catch (error: any) {
      console.error('Error logging weight:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to log weight';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a weight entry
   */
  const handleDeleteEntry = async (id: string) => {
    Alert.alert(
      'Delete Weight Entry',
      'Are you sure you want to delete this weight measurement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteWeightEntry(id);
              Alert.alert('Success', 'Weight entry deleted successfully');
              await loadWeightHistory();
            } catch (error) {
              console.error('Error deleting weight entry:', error);
              Alert.alert('Error', 'Failed to delete weight entry');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-GB', options);
  };

  /**
   * Render user selection buttons
   */
  const renderUserSelection = () => {
    if (selectedUser) return null;

    return (
      <View style={styles.userSelectionContainer}>
        <Text style={styles.mainTitle}>Weight Tracking</Text>
        <Text style={styles.subtitle}>Select User</Text>
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
   * Render log weight form
   */
  const renderLogWeightView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Log Weight Measurement</Text>

      <Text style={styles.label}>Weight (kg) *</Text>
      <TextInput
        style={styles.input}
        value={weight}
        onChangeText={setWeight}
        placeholder="e.g., 75.5"
        keyboardType="decimal-pad"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Date *</Text>
      <TextInput
        style={styles.input}
        value={selectedDate}
        onChangeText={setSelectedDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Notes (Optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g., After holiday, Before workout program"
        multiline
        numberOfLines={3}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogWeight}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log Weight</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.infoText}>
        💡 Tip: Weigh yourself at the same time each day for best accuracy (e.g., morning before breakfast)
      </Text>
    </ScrollView>
  );

  /**
   * Render weight history list
   */
  const renderHistoryView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Weight History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6347" style={styles.loader} />
      ) : weightHistory.length > 0 ? (
        <>
          {weightHistory.map((entry, index) => (
            <View key={entry._id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                  <Text style={styles.historyWeight}>{entry.weight} kg</Text>
                </View>
                <TouchableOpacity
                  onPress={() => entry._id && handleDeleteEntry(entry._id)}
                >
                  <Text style={styles.deleteButton}>Delete</Text>
                </TouchableOpacity>
              </View>

              {/* Show weight change from previous entry */}
              {index > 0 && entry.weightChange !== undefined && (
                <View style={styles.changeContainer}>
                  <Text
                    style={[
                      styles.changeText,
                      entry.weightChange > 0 ? styles.changeGain : styles.changeLoss,
                    ]}
                  >
                    {entry.weightChange > 0 ? '+' : ''}
                    {entry.weightChange.toFixed(2)} kg (
                    {entry.weightChangePercentage?.toFixed(1)}%)
                  </Text>
                  <Text style={styles.changeLabel}>
                    {entry.weightChange > 0 ? 'Gained' : 'Lost'} since last entry
                  </Text>
                </View>
              )}

              {entry.notes && (
                <Text style={styles.historyNotes}>{entry.notes}</Text>
              )}
            </View>
          ))}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No weight entries yet</Text>
          <Text style={styles.emptySubtext}>
            Start logging your weight to track your progress!
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={loadWeightHistory}>
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  /**
   * Render weight statistics
   */
  const renderStatsView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Weight Statistics</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6347" style={styles.loader} />
      ) : weightStats ? (
        <>
          {/* Overall Change */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Overall Progress</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Starting Weight:</Text>
              <Text style={styles.statsValue}>{weightStats.firstWeight} kg</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Current Weight:</Text>
              <Text style={styles.statsValue}>{weightStats.currentWeight} kg</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Total Change:</Text>
              <Text
                style={[
                  styles.statsValue,
                  styles.statsValueBold,
                  weightStats.totalChange < 0 ? styles.statsValueGreen : styles.statsValueRed,
                ]}
              >
                {weightStats.totalChange > 0 ? '+' : ''}
                {weightStats.totalChange.toFixed(2)} kg (
                {weightStats.totalChangePercentage.toFixed(1)}%)
              </Text>
            </View>
          </View>

          {/* Trends */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Trends</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Months Tracked:</Text>
              <Text style={styles.statsValue}>{weightStats.monthsTracked}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Average Monthly Change:</Text>
              <Text style={styles.statsValue}>
                {weightStats.averageMonthlyChange > 0 ? '+' : ''}
                {weightStats.averageMonthlyChange.toFixed(2)} kg/month
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Current Trend:</Text>
              <Text style={styles.statsValue}>
                {weightStats.currentTrend === 'gaining' && '📈 Gaining'}
                {weightStats.currentTrend === 'losing' && '📉 Losing'}
                {weightStats.currentTrend === 'stable' && '➡️ Stable'}
                {weightStats.currentTrend === 'insufficient_data' && '⏳ Not enough data'}
              </Text>
            </View>
          </View>

          {/* Records */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Records</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Highest Weight:</Text>
              <Text style={styles.statsValue}>{weightStats.highestWeight} kg</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Lowest Weight:</Text>
              <Text style={styles.statsValue}>{weightStats.lowestWeight} kg</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Total Entries:</Text>
              <Text style={styles.statsValue}>{weightStats.entryCount}</Text>
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Tracking Period</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>First Entry:</Text>
              <Text style={styles.statsValue}>{formatDate(weightStats.firstDate)}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Latest Entry:</Text>
              <Text style={styles.statsValue}>{formatDate(weightStats.lastDate)}</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Not enough data for statistics</Text>
          <Text style={styles.emptySubtext}>
            Log at least 2 weight measurements to see statistics
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={loadWeightStats}>
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (!selectedUser) {
    return (
      <View style={styles.screen}>
        {renderUserSelection()}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setSelectedUser(null);
            setWeight('');
            setNotes('');
            setWeightHistory([]);
            setWeightStats(null);
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Weight Tracking - {selectedUser.charAt(0).toUpperCase() + selectedUser.slice(1)}
        </Text>
      </View>

      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, view === 'log' && styles.tabActive]}
          onPress={() => setView('log')}
        >
          <Text style={[styles.tabText, view === 'log' && styles.tabTextActive]}>
            Log Weight
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'history' && styles.tabActive]}
          onPress={() => setView('history')}
        >
          <Text style={[styles.tabText, view === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'stats' && styles.tabActive]}
          onPress={() => setView('stats')}
        >
          <Text style={[styles.tabText, view === 'stats' && styles.tabTextActive]}>
            Statistics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {view === 'log' && renderLogWeightView()}
      {view === 'history' && renderHistoryView()}
      {view === 'stats' && renderStatsView()}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    marginBottom: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF6347',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
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
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#FF6347',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  loader: {
    marginTop: 50,
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyWeight: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  changeContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  changeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  changeGain: {
    color: '#FF9800',
  },
  changeLoss: {
    color: '#4CAF50',
  },
  changeLabel: {
    fontSize: 13,
    color: '#666',
  },
  historyNotes: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 15,
    color: '#666',
  },
  statsValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  statsValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsValueGreen: {
    color: '#4CAF50',
  },
  statsValueRed: {
    color: '#FF9800',
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

export default WeightTrackingScreen;
