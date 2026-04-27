import { useRef, useState } from 'react';
import { scanNutritionLabel, ScannedNutritionResponse } from '../api';

interface UseNutritionLabelScannerReturn {
  triggerScan: () => void;
  isScanning: boolean;
  scanError: string | null;
  fileInputProps: {
    ref: React.RefObject<HTMLInputElement>;
    type: 'file';
    accept: 'image/*';
    capture: 'environment';
    style: { display: 'none' };
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  };
}

export function useNutritionLabelScanner(
  onResult: (data: ScannedNutritionResponse) => void
): UseNutritionLabelScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerScan = () => {
    setScanError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const result = await scanNutritionLabel(file);
      onResult(result);
    } catch {
      setScanError('Could not read the label. Try again with a clearer photo.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    triggerScan,
    isScanning,
    scanError,
    fileInputProps: {
      ref: fileInputRef,
      type: 'file',
      accept: 'image/*',
      capture: 'environment',
      style: { display: 'none' },
      onChange: handleFileChange,
    },
  };
}
