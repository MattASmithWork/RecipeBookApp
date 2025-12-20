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
  GutHealthLog,
  GutHealthSummary,
  AIAnalysis,
  logGutHealth,
  getGutHealthSummary,
  analyzeGutHealth,
} from '../services/api';

/**
 * GutHealthScreen - AI-powered gut health tracking
 * 
 * Features:
 * - Log digestive symptoms with severity ratings
 * - Track bowel movements (Bristol Stool Scale)
 * - View gut health score and trends
 * - Get AI-powered recommendations (Google Gemini)
 * - Identify trigger foods automatically
 */
const GutHealthScreen: React.FC = () => {
  // Form state
  const [symptomType, setSymptomType] = useState('bloating');
  const [severity, setSeverity] = useState(5);
  const [bristolScale, setBristolScale] = useState<number | null>(null);
  const [mood, setMood] = useState('');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [notes, setNotes] = useState('');
  const [triggers, setTriggers] = useState('');

  // App state
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'log' | 'summary' | 'insights'>('log');
  const [selectedUser, setSelectedUser] = useState<'matt' | 'niccy' | null>(null);
  const [summary, setSummary] = useState<GutHealthSummary | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzingDays, setAnalyzingDays] = useState(7);

  // Symptom options
  const symptomOptions = [
    'bloating',
    'cramps',
    'gas',
    'diarrhea',
    'constipation',
    'nausea',
    'heartburn',
    'indigestion',
    'stomach_pain',
    'reflux',
  ];

  /**
   * Log a gut health entry
   */
  const handleLogSymptom = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user first');
      return;
    }

    if (!symptomType || severity < 1 || severity > 10) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const entry = {
        username: selectedUser,
        date: new Date().toISOString(),
        symptom_type: symptomType,
        severity: severity,
        bristol_scale: bristolScale || undefined,
        mood: mood || undefined,
        energy_level: energyLevel,
        notes: notes || undefined,
        potential_triggers: triggers ? triggers.split(',').map(t => t.trim()) : undefined,
      };

      await logGutHealth(entry);

      Alert.alert('Success', 'Symptom logged successfully');

      // Reset form
      setSymptomType('bloating');
      setSeverity(5);
      setBristolScale(null);
      setMood('');
      setEnergyLevel(5);
      setNotes('');
      setTriggers('');

      // Refresh summary if on that view
      if (view === 'summary') {
        loadSummary();
      }
    } catch (error) {
      console.error('Error logging symptom:', error);
      Alert.alert('Error', 'Failed to log symptom');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load gut health summary
   */
  const loadSummary = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const summaryData = await getGutHealthSummary(selectedUser, analyzingDays);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
      Alert.alert('Error', 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get AI-powered analysis and recommendations
   */
  const getAIInsights = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user first');
      return;
    }

    try {
      setLoading(true);
      Alert.alert('Analyzing...', 'AI is analyzing your gut health data. This may take a few seconds.');

      const analysis = await analyzeGutHealth(selectedUser, analyzingDays);
      setAIAnalysis(analysis);

      Alert.alert('Analysis Complete', 'AI recommendations are ready!');
    } catch (error) {
      console.error('Error getting AI insights:', error);
      Alert.alert('Error', 'Failed to get AI insights. Make sure you have logged some symptoms and meals, and check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load data when view changes
   */
  useEffect(() => {
    if (selectedUser) {
      if (view === 'summary') {
        loadSummary();
      }
    }
  }, [selectedUser, view, analyzingDays]);

  /**
   * Get color for gut health score
   */
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#8BC34A'; // Light green
    if (score >= 40) return '#FFC107'; // Orange
    return '#F44336'; // Red
  };

  /**
   * Render user selection
   */
  if (!selectedUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Gut Health Tracker 🌱</Text>
        <Text style={styles.subtitle}>Select a user to continue</Text>
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
    );
  }

  /**
   * Render view tabs
   */
  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, view === 'log' && styles.activeTab]}
        onPress={() => setView('log')}
      >
        <Text style={[styles.tabText, view === 'log' && styles.activeTabText]}>Log</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, view === 'summary' && styles.activeTab]}
        onPress={() => setView('summary')}
      >
        <Text style={[styles.tabText, view === 'summary' && styles.activeTabText]}>
          Summary
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, view === 'insights' && styles.activeTab]}
        onPress={() => setView('insights')}
      >
        <Text style={[styles.tabText, view === 'insights' && styles.activeTabText]}>
          AI Insights
        </Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render logging form
   */
  const renderLogForm = () => (
    <ScrollView style={styles.form}>
      <Text style={styles.sectionTitle}>Log Symptom</Text>

      <Text style={styles.label}>Symptom Type *</Text>
      <View style={styles.pickerContainer}>
        {symptomOptions.map((symptom) => (
          <TouchableOpacity
            key={symptom}
            style={[
              styles.symptomButton,
              symptomType === symptom && styles.symptomButtonActive,
            ]}
            onPress={() => setSymptomType(symptom)}
          >
            <Text
              style={[
                styles.symptomButtonText,
                symptomType === symptom && styles.symptomButtonTextActive,
              ]}
            >
              {symptom.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Severity * (1=mild, 10=severe)</Text>
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderValue}>{severity}</Text>
        <View style={styles.sliderButtons}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.sliderButton,
                severity === val && styles.sliderButtonActive,
              ]}
              onPress={() => setSeverity(val)}
            >
              <Text
                style={[
                  styles.sliderButtonText,
                  severity === val && styles.sliderButtonTextActive,
                ]}
              >
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.label}>Bristol Stool Scale (1-7, optional)</Text>
      <View style={styles.sliderButtons}>
        {[null, 1, 2, 3, 4, 5, 6, 7].map((val) => (
          <TouchableOpacity
            key={val === null ? 'none' : val}
            style={[
              styles.sliderButton,
              bristolScale === val && styles.sliderButtonActive,
            ]}
            onPress={() => setBristolScale(val)}
          >
            <Text
              style={[
                styles.sliderButtonText,
                bristolScale === val && styles.sliderButtonTextActive,
              ]}
            >
              {val === null ? 'N/A' : val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Mood (optional)</Text>
      <TextInput
        style={styles.input}
        value={mood}
        onChangeText={setMood}
        placeholder="e.g., happy, anxious, stressed..."
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Energy Level (1-10, optional)</Text>
      <View style={styles.sliderButtons}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
          <TouchableOpacity
            key={val}
            style={[
              styles.sliderButton,
              energyLevel === val && styles.sliderButtonActive,
            ]}
            onPress={() => setEnergyLevel(val)}
          >
            <Text
              style={[
                styles.sliderButtonText,
                energyLevel === val && styles.sliderButtonTextActive,
              ]}
            >
              {val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Potential Triggers (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={triggers}
        onChangeText={setTriggers}
        placeholder="e.g., milk, bread, stress"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Additional context or observations..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogSymptom}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log Symptom</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setSelectedUser(null)}
      >
        <Text style={styles.backButtonText}>Change User</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  /**
   * Render summary view
   */
  const renderSummary = () => (
    <ScrollView style={styles.content}>
      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      ) : summary ? (
        <>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Gut Health Score</Text>
            <Text
              style={[
                styles.scoreNumber,
                { color: getScoreColor(summary.gut_health_score) },
              ]}
            >
              {summary.gut_health_score}
            </Text>
            <Text style={styles.scoreRating}>{summary.rating}</Text>
            <Text style={styles.scoreMessage}>{summary.message}</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Summary (Last {analyzingDays} Days)</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Symptoms:</Text>
              <Text style={styles.statValue}>{summary.total_logs}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Average Severity:</Text>
              <Text style={styles.statValue}>
                {summary.average_severity}/10
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Most Common:</Text>
              <Text style={styles.statValue}>
                {summary.most_common_symptom || 'None'}
              </Text>
            </View>
          </View>

          <View style={styles.daysSelector}>
            <Text style={styles.label}>Analysis Period:</Text>
            <View style={styles.dayButtons}>
              {[7, 14, 30].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.dayButton,
                    analyzingDays === days && styles.dayButtonActive,
                  ]}
                  onPress={() => setAnalyzingDays(days)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      analyzingDays === days && styles.dayButtonTextActive,
                    ]}
                  >
                    {days}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>
          No gut health data yet. Start logging symptoms!
        </Text>
      )}
    </ScrollView>
  );

  /**
   * Render AI insights view
   */
  const renderInsights = () => (
    <ScrollView style={styles.content}>
      {!aiAnalysis ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Get AI-Powered Insights 🤖</Text>
          <Text style={styles.emptyText}>
            Our AI will analyze your gut health data and provide personalized recommendations.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={getAIInsights}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Analyze with AI</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.aiCard}>
            <Text style={styles.cardTitle}>🎯 Recommendations</Text>
            {aiAnalysis.ai_recommendations.recommendations.map((rec, idx) => (
              <Text key={idx} style={styles.recommendation}>
                • {rec}
              </Text>
            ))}
          </View>

          {aiAnalysis.ai_recommendations.trigger_foods.length > 0 && (
            <View style={styles.aiCard}>
              <Text style={styles.cardTitle}>⚠️ Potential Trigger Foods</Text>
              {aiAnalysis.ai_recommendations.trigger_foods.map((food, idx) => (
                <Text key={idx} style={styles.triggerFood}>
                  • {food}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.aiCard}>
            <Text style={styles.cardTitle}>✅ Beneficial Foods</Text>
            {aiAnalysis.ai_recommendations.beneficial_foods.map((food, idx) => (
              <Text key={idx} style={styles.beneficialFood}>
                • {food}
              </Text>
            ))}
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={getAIInsights}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>Refresh Analysis</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Gut Health Tracker 🌱 - {selectedUser === 'matt' ? 'Matt' : 'Niccy'}
      </Text>
      {renderTabs()}
      {view === 'log' && renderLogForm()}
      {view === 'summary' && renderSummary()}
      {view === 'insights' && renderInsights()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: '#4CAF50',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    margin: 20,
  },
  userButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  userButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
    color: '#333',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  symptomButton: {
    backgroundColor: '#fff',
    padding: 10,
    margin: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  symptomButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  symptomButtonText: {
    fontSize: 12,
    color: '#666',
  },
  symptomButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sliderContainer: {
    marginBottom: 10,
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#4CAF50',
  },
  sliderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sliderButton: {
    width: '18%',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginBottom: 5,
  },
  sliderButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sliderButtonText: {
    fontSize: 12,
    color: '#666',
  },
  sliderButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  loader: {
    marginTop: 50,
  },
  scoreCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  scoreNumber: {
    fontSize: 50,
    fontWeight: 'bold',
  },
  scoreRating: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#333',
  },
  scoreMessage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  daysSelector: {
    marginTop: 20,
  },
  dayButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  dayButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#666',
  },
  dayButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  aiCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  recommendation: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  triggerFood: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 8,
    fontWeight: '600',
  },
  beneficialFood: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginTop: 10,
  },
  refreshButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default GutHealthScreen;
