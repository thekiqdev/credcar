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
  invoiceGenerationDaysAdvance: number; // Padrão: 15 dias
  invoiceGenerationFixedDay: number; // Padrão: 20 (dia do mês)
}

export interface NotificationConfig {
  sendPaymentConfirmed: boolean;
  sendOverdue: boolean;
  daysBeforeDue: number;
}

// System Identity Configuration
export interface SystemConfig {
  system_name: string;
  system_description: string;
  logo_url?: string;
  logo_width?: number;
  logo_height?: number;
}

export interface SystemConfigUpdate {
  system_name?: string;
  system_description?: string;
  logo_url?: string;
  logo_width?: number;
  logo_height?: number;
}

// Cache for configurations
class ConfigCache {
  private cache: Map<string, SystemConfig> = new Map();
  private lastUpdate: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, config: SystemConfig): void {
    this.cache.set(key, config);
    this.lastUpdate = new Date();
  }

  get(key: string): SystemConfig | null {
    if (this.lastUpdate && (Date.now() - this.lastUpdate.getTime()) > this.CACHE_TTL) {
      this.clear();
      return null;
    }
    return this.cache.get(key) || null;
  }

  setBatch(configs: SystemConfig[]): void {
    this.cache.clear();
    configs.forEach(config => this.cache.set(config.key, config));
    this.lastUpdate = new Date();
  }

  getBatch(): SystemConfig[] {
    if (this.lastUpdate && (Date.now() - this.lastUpdate.getTime()) > this.CACHE_TTL) {
      this.clear();
      return [];
    }
    return Array.from(this.cache.values());
  }

  clear(): void {
    this.cache.clear();
    this.lastUpdate = null;
  }

  has(key: string): boolean {
    if (this.lastUpdate && (Date.now() - this.lastUpdate.getTime()) > this.CACHE_TTL) {
      this.clear();
      return false;
    }
    return this.cache.has(key);
  }
}

class SystemConfigService {
  private cache = new ConfigCache();

  /**
   * Get a single configuration by key
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.cache.get(key);
      if (cached) {
        return cached.value;
      }

      // Fetch from database
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

      if (data) {
        this.cache.set(key, data);
        return data.value;
      }

      return null;
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

      // Update cache
      if (data) {
        this.cache.set(key, data);
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

      // Update cache for these configs
      data?.forEach(config => this.cache.set(config.key, config));

      return data || [];
    } catch (error) {
      console.error(`Exception in getConfigsByCategory for ${category}:`, error);
      return [];
    }
  }

  // Type-safe configuration getters

  /**
   * Get Asaas configuration
   */
  async getAsaasConfig(): Promise<AsaasConfig> {
    try {
      const configs = await this.getConfigsByCategory('asaas');
      
      const environment = (configs.find(c => c.key === 'asaas.environment')?.value || 'sandbox') as 'sandbox' | 'production';
      const baseUrlFromDB = configs.find(c => c.key === 'asaas.base.url')?.value;
      
      // If no URL in DB or environment changed, use correct URL based on environment
      const baseUrl = baseUrlFromDB || (environment === 'sandbox' 
        ? 'https://sandbox.asaas.com/api/v3' 
        : 'https://www.asaas.com/api/v3');
      
      return {
        apiKey: configs.find(c => c.key === 'asaas.api.key')?.value || '',
        environment,
        baseUrl,
        webhookSecret: configs.find(c => c.key === 'asaas.webhook.secret')?.value || '',
        webhookUrl: configs.find(c => c.key === 'asaas.webhook.url')?.value || '',
      };
    } catch (error) {
      console.error('Error getting Asaas config:', error);
      return {
        apiKey: '',
        environment: 'sandbox',
        baseUrl: 'https://sandbox.asaas.com/api/v3',
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
        invoiceGenerationDaysAdvance: parseInt(configs.find(c => c.key === 'payment.invoice.generation.days.advance')?.value || '15'),
        invoiceGenerationFixedDay: parseInt(configs.find(c => c.key === 'payment.invoice.generation.fixed.day')?.value || '20'),
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
        invoiceGenerationDaysAdvance: 15,
        invoiceGenerationFixedDay: 20,
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
      if (config.invoiceGenerationDaysAdvance !== undefined) {
        promises.push(this.setConfig('payment.invoice.generation.days.advance', config.invoiceGenerationDaysAdvance.toString(), 'Dias de antecedência para geração automática de faturas', 'payment'));
      }
      if (config.invoiceGenerationFixedDay !== undefined) {
        promises.push(this.setConfig('payment.invoice.generation.fixed.day', config.invoiceGenerationFixedDay.toString(), 'Dia fixo do mês para vencimento de faturas (1-31)', 'payment'));
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
   * Clear configuration cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get System Identity Configuration
   */
  async getSystemConfig(): Promise<SystemConfig | null> {
    try {
      const configs = await this.getConfigsByCategory('system');
      
      const systemConfig: SystemConfig = {
        system_name: configs.find(c => c.key === 'system.name')?.value || 'CredCar Finance',
        system_description: configs.find(c => c.key === 'system.description')?.value || 'Sistema de Gestão Financeira',
        logo_url: configs.find(c => c.key === 'system.logo.url')?.value || undefined,
        logo_width: configs.find(c => c.key === 'system.logo.width')?.value ? parseInt(configs.find(c => c.key === 'system.logo.width')!.value) : undefined,
        logo_height: configs.find(c => c.key === 'system.logo.height')?.value ? parseInt(configs.find(c => c.key === 'system.logo.height')!.value) : undefined,
      };

      return systemConfig;
    } catch (error) {
      console.error('Error getting System config:', error);
      return {
        system_name: 'CredCar Finance',
        system_description: 'Sistema de Gestão Financeira',
      };
    }
  }

  /**
   * Update System Identity Configuration
   */
  async updateSystemConfig(config: SystemConfigUpdate): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];

      if (config.system_name !== undefined) {
        promises.push(this.setConfig('system.name', config.system_name, 'Nome do sistema', 'system'));
      }
      if (config.system_description !== undefined) {
        promises.push(this.setConfig('system.description', config.system_description, 'Descrição do sistema', 'system'));
      }
      if (config.logo_url !== undefined) {
        promises.push(this.setConfig('system.logo.url', config.logo_url, 'URL do logo do sistema', 'system'));
      }
      if (config.logo_width !== undefined) {
        promises.push(this.setConfig('system.logo.width', config.logo_width.toString(), 'Largura do logo', 'system'));
      }
      if (config.logo_height !== undefined) {
        promises.push(this.setConfig('system.logo.height', config.logo_height.toString(), 'Altura do logo', 'system'));
      }

      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Error updating System config:', error);
      return false;
    }
  }

  /**
   * Validate logo file
   */
  validateLogoFile(file: File): { valid: boolean; message?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      return { valid: false, message: 'Arquivo muito grande. Máximo 5MB.' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, message: 'Tipo de arquivo não suportado. Use JPEG, PNG, GIF ou WebP.' };
    }

    return { valid: true };
  }

  /**
   * Convert file to base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Update page title
   */
  updatePageTitle(systemName: string): void {
    document.title = `${systemName} - Sistema de Gestão Financeira`;
  }
}

// Export singleton instance
export const systemConfigService = new SystemConfigService();

// Default export
export default systemConfigService;
