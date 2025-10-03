/**
 * SystemConfigService - Service for managing system configurations
 */

import { supabase } from './supabase';

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

class SystemConfigService {
  async getAsaasConfig(): Promise<AsaasConfig> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['asaas.api.key', 'asaas.environment', 'asaas.base.url', 'asaas.webhook.secret', 'asaas.webhook.url']);

      if (error) {
        console.error('Error loading Asaas config:', error);
        return {
          apiKey: '',
          environment: 'sandbox',
          baseUrl: 'https://sandbox.asaas.com/api/v3',
          webhookSecret: '',
          webhookUrl: ''
        };
      }

      const configs = data || [];
      const getValue = (key: string) => configs.find(c => c.key === key)?.value || '';

      return {
        apiKey: getValue('asaas.api.key'),
        environment: (getValue('asaas.environment') || 'sandbox') as 'sandbox' | 'production',
        baseUrl: getValue('asaas.base.url') || 'https://sandbox.asaas.com/api/v3',
        webhookSecret: getValue('asaas.webhook.secret'),
        webhookUrl: getValue('asaas.webhook.url')
      };
    } catch (error) {
      console.error('Error in getAsaasConfig:', error);
      return {
        apiKey: '',
        environment: 'sandbox',
        baseUrl: 'https://sandbox.asaas.com/api/v3',
        webhookSecret: '',
        webhookUrl: ''
      };
    }
  }

  async getPaymentConfig(): Promise<PaymentConfig> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['payment.default.method', 'payment.enable.pix', 'payment.enable.boleto', 'payment.enable.credit.card', 'payment.default.due.days', 'payment.max.installments', 'payment.auto.generate.boletos']);

      if (error) {
        console.error('Error loading Payment config:', error);
        return {
          defaultMethod: 'PIX',
          enablePix: true,
          enableBoleto: true,
          enableCreditCard: false,
          defaultDueDays: 30,
          maxInstallments: 12,
          autoGenerateBoletos: true
        };
      }

      const configs = data || [];
      const getValue = (key: string) => configs.find(c => c.key === key)?.value || '';
      const getBoolValue = (key: string) => configs.find(c => c.key === key)?.value === 'true';
      const getIntValue = (key: string) => parseInt(configs.find(c => c.key === key)?.value || '0');

      return {
        defaultMethod: getValue('payment.default.method') || 'PIX',
        enablePix: getBoolValue('payment.enable.pix'),
        enableBoleto: getBoolValue('payment.enable.boleto'),
        enableCreditCard: getBoolValue('payment.enable.credit.card'),
        defaultDueDays: getIntValue('payment.default.due.days') || 30,
        maxInstallments: getIntValue('payment.max.installments') || 12,
        autoGenerateBoletos: getBoolValue('payment.auto.generate.boletos')
      };
    } catch (error) {
      console.error('Error in getPaymentConfig:', error);
      return {
        defaultMethod: 'PIX',
        enablePix: true,
        enableBoleto: true,
        enableCreditCard: false,
        defaultDueDays: 30,
        maxInstallments: 12,
        autoGenerateBoletos: true
      };
    }
  }

  async getNotificationConfig(): Promise<NotificationConfig> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['notification.send.payment.confirmed', 'notification.send.overdue', 'notification.days.before.due']);

      if (error) {
        console.error('Error loading Notification config:', error);
        return {
          sendPaymentConfirmed: true,
          sendOverdue: true,
          daysBeforeDue: 7
        };
      }

      const configs = data || [];
      const getBoolValue = (key: string) => configs.find(c => c.key === key)?.value === 'true';
      const getIntValue = (key: string) => parseInt(configs.find(c => c.key === key)?.value || '7');

      return {
        sendPaymentConfirmed: getBoolValue('notification.send.payment.confirmed'),
        sendOverdue: getBoolValue('notification.send.overdue'),
        daysBeforeDue: getIntValue('notification.days.before.due') || 7
      };
    } catch (error) {
      console.error('Error in getNotificationConfig:', error);
      return {
        sendPaymentConfirmed: true,
        sendOverdue: true,
        daysBeforeDue: 7
      };
    }
  }

  async setAsaasConfig(config: Partial<AsaasConfig>): Promise<boolean> {
    try {
      const updates: Promise<any>[] = [];
      
      if (config.apiKey !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'asaas.api.key', value: config.apiKey }, { onConflict: 'key' })
        );
      }
      if (config.environment !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'asaas.environment', value: config.environment }, { onConflict: 'key' })
        );
      }
      if (config.webhookSecret !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'asaas.webhook.secret', value: config.webhookSecret }, { onConflict: 'key' })
        );
      }
      if (config.webhookUrl !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'asaas.webhook.url', value: config.webhookUrl }, { onConflict: 'key' })
        );
      }

      if (updates.length === 0) return true;

      const results = await Promise.all(updates);
      return results.every(result => !result.error);
    } catch (error) {
      console.error('Error setting Asaas config:', error);
      return false;
    }
  }

  async setPaymentConfig(config: Partial<PaymentConfig>): Promise<boolean> {
    try {
      const updates: Promise<any>[] = [];
      
      if (config.enablePix !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'payment.enable.pix', value: config.enablePix.toString() }, { onConflict: 'key' })
        );
      }
      if (config.enableBoleto !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'payment.enable.boleto', value: config.enableBoleto.toString() }, { onConflict: 'key' })
        );
      }
      if (config.enableCreditCard !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'payment.enable.credit.card', value: config.enableCreditCard.toString() }, { onConflict: 'key' })
        );
      }
      if (config.defaultDueDays !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'payment.default.due.days', value: config.defaultDueDays.toString() }, { onConflict: 'key' })
        );
      }
      if (config.maxInstallments !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'payment.max.installments', value: config.maxInstallments.toString() }, { onConflict: 'key' })
        );
      }
      if (config.autoGenerateBoletos !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'payment.auto.generate.boletos', value: config.autoGenerateBoletos.toString() }, { onConflict: 'key' })
        );
      }

      if (updates.length === 0) return true;

      const results = await Promise.all(updates);
      return results.every(result => !result.error);
    } catch (error) {
      console.error('Error setting Payment config:', error);
      return false;
    }
  }

  async setNotificationConfig(config: Partial<NotificationConfig>): Promise<boolean> {
    try {
      const updates: Promise<any>[] = [];
      
      if (config.sendPaymentConfirmed !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'notification.send.payment.confirmed', value: config.sendPaymentConfirmed.toString() }, { onConflict: 'key' })
        );
      }
      if (config.sendOverdue !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'notification.send.overdue', value: config.sendOverdue.toString() }, { onConflict: 'key' })
        );
      }
      if (config.daysBeforeDue !== undefined) {
        updates.push(
          supabase.from('system_config')
            .upsert({ key: 'notification.days.before.due', value: config.daysBeforeDue.toString() }, { onConflict: 'key' })
        );
      }

      if (updates.length === 0) return true;

      const results = await Promise.all(updates);
      return results.every(result => !result.error);
    } catch (error) {
      console.error('Error setting Notification config:', error);
      return false;
    }
  }
}

// Export singleton instance
export const systemConfigService = new SystemConfigService();

export default systemConfigService;
