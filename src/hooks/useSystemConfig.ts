import { useState, useEffect } from 'react';
import { systemConfigService, SystemIdentityConfig } from '@/lib/system-config.service';

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemIdentityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const systemConfig = await systemConfigService.getSystemConfig();
      setConfig(systemConfig);
      
      // Atualiza o título da página se a configuração existir
      if (systemConfig?.system_name) {
        systemConfigService.updatePageTitle(systemConfig.system_name);
      }
    } catch (err) {
      console.error('Erro ao carregar configuração do sistema:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<SystemIdentityConfig>) => {
    try {
      const success = await systemConfigService.setSystemConfig(newConfig);
      
      if (success) {
        // Recarrega a configuração
        await loadConfig();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Erro ao atualizar configuração:', err);
      setError('Erro ao atualizar configurações');
      return false;
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    error,
    loadConfig,
    updateConfig
  };
}
