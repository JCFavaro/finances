import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Currency } from '../../types';

interface UserSettings {
  defaultCurrency: Currency;
}

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('default_currency')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setSettings({ defaultCurrency: data.default_currency as Currency });
      } else {
        // Default settings if not found
        setSettings({ defaultCurrency: 'ARS' });
      }
    };

    fetchSettings();
  }, [user]);

  return settings;
}

export async function updateDefaultCurrency(userId: string, currency: Currency): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      default_currency: currency,
    });

  if (error) {
    console.error('Error updating currency:', error);
  }
}
