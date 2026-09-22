import { useEffect } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function CampusMartSplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    onFinish?.();
  }, [onFinish]);

  return null;
}
