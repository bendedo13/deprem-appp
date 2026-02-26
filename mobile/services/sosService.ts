/**
 * S.O.S Voice Alert API Service
 * Handles voice recording upload and status checking
 */

import { api } from '../src/services/api';

export interface SOSAnalyzeResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface SOSStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data?: {
    sos_id: string;
    durum: string;
    kisi_sayisi: number;
    aciliyet: string;
    lokasyon: string;
    orijinal_metin: string;
  };
  error_message?: string;
}

/**
 * Upload S.O.S voice recording to backend
 */
export async function uploadSOSRecording(
  audioUri: string,
  latitude: number,
  longitude: number
): Promise<SOSAnalyzeResponse> {
  const formData = new FormData();

  // Add audio file
  formData.append('audio_file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'sos_audio.m4a',
  } as any);

  // Add metadata
  formData.append('timestamp', new Date().toISOString());
  formData.append('latitude', latitude.toString());
  formData.append('longitude', longitude.toString());

  const response = await api.post<SOSAnalyzeResponse>(
    '/api/v1/sos/analyze',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }
  );

  return response.data;
}

/**
 * Check S.O.S processing status
 */
export async function checkSOSStatus(taskId: string): Promise<SOSStatusResponse> {
  const response = await api.get<SOSStatusResponse>(
    `/api/v1/sos/status/${taskId}`
  );

  return response.data;
}

/**
 * Poll S.O.S status until completed or failed
 */
export async function pollSOSStatus(
  taskId: string,
  onUpdate?: (status: SOSStatusResponse) => void,
  maxAttempts: number = 30
): Promise<SOSStatusResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkSOSStatus(taskId);
    
    if (onUpdate) {
      onUpdate(status);
    }

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('S.O.S processing timeout');
}
