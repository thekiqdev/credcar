/**
 * SystemConfigService - Service for managing system configurations
 * Handles centralized configuration storage in the database
 */

import { supabase } from './supabase';

// Type definitions for system configurations
export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AsaasConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  webhookSecret: string;
  webhookUrl: string;
}

export interface PaymentConfig {
  defaultMethod: string;
  enablePix: boolean;
  enableBoleto: boolean;
  enableCreditCard: boolean;
  defaultDueDays: number;
  maxInstallments: number;
  autoGenerateBoletos: boolean;
}

export interface NotificationConfig {
  sendPaymentConfirmed: boolean;
  sendOverdue: boolean;
  daysBeforeDue: number;
}

export interface SystemInfo {
  name: string;
  version: string;
  maintenance: boolean;
}

class SystemConfigService {
  /**
   * Get a single configuration by key
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', key)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error(`Error fetching config ${key}:`, error);
        return null;
      }

      return data?.value || null;
    } catch (error) {
      console.error(`Exception in getConfig for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a configuration value
   */
  async setConfig(key: string, value: string, description?: string, category?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .upsert({
          key,
          value,
          description: description || null,
          category: category || 'general',
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        })
        .single();

      if (error) {
        console.error(`Error setting config ${key}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Exception in setConfig for ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple configurations by category
   */
  async getConfigsByCategory(category: string): Promise<SystemConfig[]> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('key');

      if (error) {
        console.error(`Error fetching configs for category ${category}:`, error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(`Exception in getConfigsByCategory for ${category}:`, error);
      return [];
    }
  }

  /**
   * Get all configurations
   */
  async getAllConfigs(): Promise<SystemConfig[]> {
    try {
      const { data: data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('is_active', true)
        .order('category, key');

      if (error) {
        console.error('Error fetching all configs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getAllConfigs:', error);
      return [];
    }
  }

  /**
   * Get Asaas configuration
   */
  async getAsaasConfig(): Promise<AsaasConfig> {
    try {
      const configs = await this.getConfigsByCategory('asaas');
      
      return {
        apiKey: configs.find(c => c.key === 'asaas.api.key')?.value || '',
        environment: (configs.find(c => c.key === 'asaas.environment')?.value || 'sandbox') as 'sandbox' | 'production',
        baseUrl: configs.find(c => c.key === 'asaas.base.url')?.value || 'https://www.asaas.com/api/v3',
        webhookSecret: configs.find(c => c.key === 'asaas.webhook.secret')?.value || '',
        webhookUrl: configs.find(c => c.key === 'asaas.webhook.url')?.value || '',
      };
    } catch (error) {
      console.error('Error getting Asaas config:', error);
      return {
        apiKey: '',
        environment: 'sandbox',
        baseUrl: 'https://www.asaas.com/api/v3',
        webhookSecret: '',
        webhookUrl: '',
      };
    }
  }

  /**
   * Set Asaas configuration
   */
  async setAsaasConfig(config: Partial<AsaasConfig>): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];

      if (config.apiKey !== undefined) {
        promises.push(this.setConfig('asaas.api.key', config.apiKey, 'Chave API do Asaas', 'asaas'));
      }
      if (config.environment !== undefined) {
        promises.push(this.setConfig('asaas.environment', config.environment, 'Ambiente do Asaas', 'asaas'));
      }
      if (config.baseUrl !== undefined) {
        promises.push(this.setConfig('asaas.base.url', config.baseUrl, 'URL base da API do Asaas', 'asaas'));
      }
      if (config.webhookSecret !== undefined) {
        promises.push(this.setConfig('asaas.webhook.secret', config.webhookSecret, 'Chave secreta do webhook', 'asaas'));
      }
      if (config.webhookUrl !== undefined) {
        promises.push(this.setConfig('asaas.webhook.url', config.webhookUrl, 'URL do webhook', 'asaas'));
      }

      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Error setting Asaas config:', error);
      return false;
    }
  }

  /**
   * Get Payment configuration
   */
  async getPaymentConfig(): Promise<PaymentConfig> {
    try {
      const configs = await this.getConfigsByCategory('payment');
      
      return {
        defaultMethod: configs.find(c => c.key === 'payment.default.method')?.value || 'PIX',
        enablePix: configs.find(c => c.key === 'payment.enable.pix')?.value === 'true',
        enableBoleto: configs.find(c => c.key === 'payment.enable.boleto')?.value === 'true',
        enableCreditCard: configs.find(c => c.key === 'payment.enable.credit.card')?.value === 'true',
        defaultDueDays: parseInt(configs.find(c => c.key === 'payment.default.due.days')?.value || '30'),
        maxInstallments: parseInt(configs.find(c => c.key === 'payment.max.installments')?.value || '12'),
        autoGenerateBoletos: configs.find(c => c.key === 'payment.auto.generate.boletos')?.value === 'true',
      };
    } catch (error) {
      console.error('Error getting Payment config:', error);
      return {
        defaultMethod: 'PIX',
        enablePix: true,
        enableBoleto: true,
        enableCreditCard: false,
        defaultDueDays: 30,
        maxInstallments: 12,
        autoGenerateBoletos: true,
      };
    }
  }

  /**
   * Set Payment configuration
   */
  async setPaymentConfig(config: Partial<PaymentConfig>): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];

      if (config.defaultMethod !== undefined) {
        promises.push(this.setConfig('payment.default.method', config.defaultMethod, 'Método de pagamento padrão', 'payment'));
      }
      if (config.enablePix !== undefined) {
        promises.push(this.setConfig('payment.enable.pix', config.enablePix.toString(), 'Habilitar PIX', 'payment'));
      }
      if (config.enableBoleto !== undefined) {
        promises.push(this.setConfig('payment.enable.boleto', config.enableBoleto.toString(), 'Habilitar Boleto', 'payment'));
      }
      if (config.enableCreditCard !== undefined) {
        promises.push(this.setConfig('payment.enable.credit.card', config.enableCreditCard.toString(), 'Habilitar Cartão', 'payment'));
      }
      if (config.defaultDueDays !== undefined) {
        promises.push(this.setConfig('payment.default.due.days', config.defaultDueDays.toString(), 'Dias para vencimento', 'payment'));
      }
      if (config.maxInstallments !== undefined) {
        promises.push(this.setConfig('payment.max.installments', config.maxInstallments.toString(), 'Máximo de parcelas', 'payment'));
      }
      if (config.autoGenerateBoletos !== undefined) {
        promises.push(this.setConfig('payment.auto.generate.boletos', config.autoGenerateBoletos.toString(), 'Geração automática de boletos', 'payment'));
      }

      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Error setting Payment config:', error);
      return false;
    }
  }

  /**
   * Get Notification configuration
   */
  async getNotificationConfig(): Promise<NotificationConfig> {
    try {
      const configs = await this.getConfigsByCategory('notification');
      
      return {
        sendPaymentConfirmed: configs.find(c => c.key === 'notification.send.payment.confirmed')?.value === 'true',
        sendOverdue: configs.find(c => c.key === 'notification.send.overdue')?.value === 'true',
        daysBeforeDue: parseInt(configs.find(c => c.key === 'notification.days.before.due')?.value || '7'),
      };
    } catch (error) {
      console.error('Error getting Notification config:', error);
      return {
        sendPaymentConfirmed: true,
        sendOverdue: true,
        daysBeforeDue: 7,
      };
    }
  }

  /**
   * Set Notification configuration
   */
  async setNotificationConfig(config: Partial<NotificationConfig>): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];

      if (config.sendPaymentConfirmed !== undefined) {
        promises.push(this.setConfig('notification.send.payment.confirmed', config.sendPaymentConfirmed.toString(), 'Notificações de pagamento confirmado', 'notification'));
      }
      if (config.sendOverdue !== undefined) {
        promises.push(this.setConfig('notification.send.overdue', config.sendOverdue.toString(), 'Notificações de inadimplência', 'notification'));
      }
      if (config.daysBeforeDue !== undefined) {
        promises.push(this.setConfig('notification.days.before.due', config.daysBeforeDue.toString(), 'Dias antes do vencimento para lembrete', 'notification'));
      }

      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Error setting Notification config:', error);
      return false;
    }
  }

  /**
   * Get System information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const configs = await this.getConfigsByCategory('system');
      
      return {
        name: configs.find(c => c.key === 'system.name')?.value || 'CredCar Finance',
        version: configs.find(c => c.key === 'system.version')?.value || '1.1.0',
        maintenance: configs.find(c => c.key === 'system.maintenance')?.value === 'true',
      };
    } catch (error) {
      console.error('Error getting System info:', error);
      return {
        name: 'CredCar Finance',
        version: '1.1.0',
        maintenance: false,
      };
    }
  }

  /**
   * Delete a configuration
   */
  async deleteConfig(key: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_config')
        .delete()
        .eq('key', key);

      if (error) {
        console.error(`Error deleting config ${key}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Exception in deleteConfig for ${key}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const systemConfigService = new SystemConfigService();

// Export utility functions
export const getConfig = (key: string) => systemConfigService.getConfig(key);
export const setConfig = (key: string, value: string, description?: string, category?: string) => 
  systemConfigService.setConfig(key, value, description, category);

// Export specialized getters
export const getAsaasConfig = () => systemConfigService.getAsaasConfig();
export const setAsaasConfig = (config: Partial<AsaasConfig>) => systemConfigService.setAsaasConfig(config);
export const getPaymentConfig = () => systemConfigService.getPaymentConfig();
export const setPaymentConfig = (config: Partial<PaymentConfig>) => systemConfigService.setPaymentConfig(config);
export const getNotificationConfig = () => systemConfigService.getNotificationConfig();
export const setNotificationConfig = (config: Partial<NotificationConfig>) => systemConfigService.setNotificationConfig(config);
export const getSystemInfo = () => systemConfigService.getSystemInfo();

// Default export
export default systemConfigService;
