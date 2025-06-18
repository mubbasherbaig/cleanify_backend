import { useEffect, useState } from 'react';
import settingsService from '@/services/settingsService';

export default function useSettings() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    settingsService.getAllSettings().then((res) => {
      if (res.success) setSettings(res.data);
    });
  }, []);

  return settings;
}