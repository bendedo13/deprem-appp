/**
 * S.O.S Voice Recorder Component
 * Records voice message and uploads to backend for AI processing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { uploadSOSRecording, pollSOSStatus, SOSStatusResponse } from '../src/services/sosService';

interface SOSVoiceRecorderProps {
  onSuccess?: (data: SOSStatusResponse) => void;
  onError?: (error: Error) => void;
}

export default function SOSVoiceRecorder({ onSuccess, onError }: SOSVoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Request audio permissions on mount
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Ses kaydı için mikrofon izni gereklidir.');
      }
    })();
  }, []);

  useEffect(() => {
    // Pulse animation when recording
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    // Update recording duration
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Hata', 'Ses kaydı başlatılamadı.');
      if (onError) onError(error as Error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('Recording URI not found');
      }

      // Upload and process
      await uploadAndProcess(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Hata', 'Ses kaydı durdurulamadı.');
      if (onError) onError(error as Error);
    } finally {
      setRecording(null);
    }
  };

  const uploadAndProcess = async (audioUri: string) => {
    setIsProcessing(true);
    setProcessingStatus('Konum alınıyor...');

    try {
      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({});
      setProcessingStatus('Ses kaydı yükleniyor...');

      // Upload recording
      const uploadResponse = await uploadSOSRecording(
        audioUri,
        location.coords.latitude,
        location.coords.longitude
      );

      setProcessingStatus('S.O.S mesajınız işleniyor...');

      // Poll for status
      const finalStatus = await pollSOSStatus(
        uploadResponse.task_id,
        (status) => {
          if (status.status === 'processing') {
            setProcessingStatus('AI analiz ediyor...');
          }
        }
      );

      if (finalStatus.status === 'completed') {
        Alert.alert(
          'S.O.S Gönderildi',
          `Acil kişilerinize bildirim gönderildi.\n\nDurum: ${finalStatus.extracted_data?.durum}\nAciliyet: ${finalStatus.extracted_data?.aciliyet}`,
          [{ text: 'Tamam' }]
        );
        if (onSuccess) onSuccess(finalStatus);
      } else {
        throw new Error(finalStatus.error_message || 'Processing failed');
      }
    } catch (error) {
      console.error('Failed to upload and process:', error);
      Alert.alert(
        'Hata',
        'S.O.S mesajınız gönderilemedi. Lütfen tekrar deneyin veya acil servisleri arayın.'
      );
      if (onError) onError(error as Error);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.processingText}>{processingStatus}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🆘 S.O.S Sesli Mesaj</Text>
      <Text style={styles.subtitle}>
        {isRecording
          ? 'Durumunuzu anlatın (maks. 60 saniye)'
          : 'Butona basılı tutarak konuşun'}
      </Text>

      {isRecording && (
        <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessing}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? '🎤 Kaydediliyor...' : '🎤 Basılı Tut'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.hint}>
        💡 İpucu: "Enkaz altındayım, 3 kişiyiz, Atatürk Mahallesi 15. bina" gibi net bilgi verin.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 16,
  },
  duration: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  recordButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#DC2626',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: '#7F1D1D',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
});
