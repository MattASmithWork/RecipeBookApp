/**
 * Barcode Scanner Modal Component
 * 
 * Provides barcode scanning functionality using device camera.
 * Integrates with Open Food Facts API to fetch product nutrition data.
 * 
 * Features:
 * - Camera-based barcode scanning
 * - Automatic product lookup
 * - Nutrition data display
 * - Manual barcode entry option
 * - Permission handling
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';

interface Product {
  name: string;
  brand: string;
  barcode: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  imageUrl: string;
  category: string;
}

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
  apiUrl: string;
}

export default function BarcodeScannerModal({
  visible,
  onClose,
  onProductFound,
  apiUrl,
}: BarcodeScannerModalProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  // Request camera permission when modal opens
  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/barcode/${barcode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to lookup barcode');
      }

      if (data.found && data.product) {
        onProductFound(data.product);
        onClose();
      } else {
        Alert.alert(
          'Product Not Found',
          'This product is not in our database. You can add it manually.',
          [
            { text: 'Try Again', onPress: () => setScanned(false) },
            { text: 'Manual Entry', onPress: () => onClose() },
          ]
        );
        setScanned(false);
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Alert.alert(
        'Lookup Failed',
        'Could not look up product information. Please try again or enter manually.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      handleBarcodeScan(manualBarcode.trim());
    }
  };

  const renderManualEntry = () => (
    <View style={styles.manualContainer}>
      <Text style={styles.title}>Enter Barcode Manually</Text>
      <Text style={styles.subtitle}>Enter the product barcode number</Text>
      
      <TextInput
        style={styles.input}
        placeholder="e.g., 737628064502"
        value={manualBarcode}
        onChangeText={setManualBarcode}
        keyboardType="numeric"
        maxLength={13}
      />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleManualSubmit}
        disabled={loading || !manualBarcode.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Lookup Product</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => setManualMode(false)}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>Use Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCameraView = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.statusText}>Requesting camera permission...</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No access to camera</Text>
          <Text style={styles.subtitle}>
            Please enable camera permissions in your device settings
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setManualMode(true)}
          >
            <Text style={styles.buttonText}>Enter Manually Instead</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : ({ data }) => handleBarcodeScan(data)}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
        />

        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              {loading ? 'Looking up product...' : 'Point camera at barcode'}
            </Text>
            {loading && <ActivityIndicator color="#FFF" size="large" />}
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setManualMode(true)}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Enter Manually</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        {manualMode ? renderManualEntry() : renderCameraView()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  controlsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 10,
  },
  manualContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
  },
});
