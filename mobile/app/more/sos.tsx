/**
 * S.O.S Voice Alert Screen
 * Emergency voice message recording and sending
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import SOSVoiceRecorder from '../../components/SOSVoiceRecorder';

export default function SOSScreen() {
  const handleSuccess = () => {
    // Navigate back after successful S.O.S
    setTimeout(() => {
      router.back();
    }, 2000);
  };

  const handleError = (error: Error) => {
    console.error('S.O.S Error:', error);
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Acil Arama',
      'Acil servisleri aramak istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: '112 Ara',
          onPress: async () => {
            try {
              await Linking.openURL('tel:112');
            } catch (error) {
              Alert.alert('Hata', '112 numarası aranmadı. Lütfen telefonunuzdan arayın.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🆘 Acil Durum</Text>
        <Text style={styles.headerSubtitle}>
          Sesli mesajınız AI ile analiz edilip acil kişilerinize gönderilecek
        </Text>
      </View>

      <View style={styles.content}>
        <SOSVoiceRecorder onSuccess={handleSuccess} onError={handleError} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.emergencyCallButton}
          onPress={handleEmergencyCall}
        >
          <Text style={styles.emergencyCallText}>📞 112 Acil Servisi Ara</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Nasıl Çalışır?</Text>
          <Text style={styles.infoText}>
            1. Mikrofon butonuna basılı tutun{'\n'}
            2. Durumunuzu net bir şekilde anlatın{'\n'}
            3. Butonu bırakın{'\n'}
            4. AI mesajınızı analiz edip acil kişilerinize gönderir
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Bu özellik acil durumlarda kullanılmalıdır. Gerçek bir acil durum
            varsa 112'yi arayın.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#DC2626',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
  },
  emergencyCallButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  emergencyCallText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
});
