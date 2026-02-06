import { useCallback, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { RecognitionResult } from '../types/inference';
import { analyzeMealFromUri } from '../services/mealRecognition';

export type RecognitionStatus = 'idle' | 'capturing' | 'analyzing' | 'error';

export interface UseFoodRecognitionReturn {
  status: RecognitionStatus;
  result: RecognitionResult | null;
  error: string | null;
  captureAndRecognize: () => Promise<RecognitionResult | null>;
  reset: () => void;
}

const compressForInference = async (uri: string): Promise<string> => {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  return manipulated.uri;
};

export const useFoodRecognition = (): UseFoodRecognitionReturn => {
  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  const captureAndRecognize = useCallback(async () => {
    setError(null);
    setStatus('capturing');

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
      setStatus('error');
      setError('Для распознавания требуется доступ к камере.');
      return null;
    }

    const capture = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      base64: false,
      quality: 1,
      exif: false,
    });

    if (capture.canceled || !capture.assets?.length) {
      setStatus('idle');
      return null;
    }

    try {
      setStatus('analyzing');
      const asset = capture.assets[0];
      const optimizedUri = await compressForInference(asset.uri);
      const recognition = await analyzeMealFromUri(optimizedUri);
      setResult(recognition);
      setStatus('idle');
      return recognition;
    } catch (recognitionError) {
      setStatus('error');
      setError(
        recognitionError instanceof Error
          ? recognitionError.message
          : 'Не удалось распознать блюдо. Попробуйте еще раз.'
      );
      return null;
    }
  }, []);

  return {
    status,
    result,
    error,
    captureAndRecognize,
    reset,
  };
};
