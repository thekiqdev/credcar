import { useState, useEffect } from 'react';
import { generalSettingsService } from '@/lib/supabase';

export interface GeneralSettings {
  system_name: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_cnpj: string;
  logo_url: string;
  logo_file_path: string;
  logo_width?: number;
  logo_height?: number;
}

export function useGeneralSettings() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const generalSettings = await generalSettingsService.getSettings();
      setSettings(generalSettings);
      
      // Atualiza o título da página se a configuração existir
      if (generalSettings?.system_name) {
        document.title = generalSettings.system_name;
      }
    } catch (err) {
      console.error('Erro ao carregar configurações gerais:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<GeneralSettings>) => {
    try {
      const success = await generalSettingsService.updateSettings(newSettings);
      
      if (success) {
        // Recarrega as configurações
        await loadSettings();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Erro ao atualizar configurações:', err);
      setError('Erro ao atualizar configurações');
      return false;
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings
  };
}
