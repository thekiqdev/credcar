/**
 * AsaasClient - Wrapper HTTP client for Asaas API
 * Provides enhanced error handling, logging and retry logic
 */

import { createAsaasService, AsaasService, AsaasConfig } from './asaas.service';

interface ClientOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableLogging?: boolean;
}

interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  timestamp: Date;
}

interface RequestLog {
  method: string;
  url: string;
  status?: number;
  duration: number;
  error?: string;
  timestamp: Date;
}

class AsaasClient {
  private service: AsaasService;
  private options: Required<ClientOptions>;
  private requestLogs: RequestLog[] = [];
  private maxLogs: number = 100;

  constructor(config: AsaasConfig, options: ClientOptions = {}) {
    this.service = createAsaasService(config);
    this.options = {
      timeout: options.timeout || 30000, // 30 seconds
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000, // 1 second
      enableLogging: options.enableLogging !== false, // default true
    };
  }

  /**
   * Enhanced request wrapper with retry logic and comprehensive error handling
   */
  private async makeRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    context: { method: string; endpoint: string }
  ): Promise<T> {
    let lastError: Error | null = null;
    
     for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      const startTime = Date.now();
      
      try {
        if (this.options.enableLogging) {
          console.log(`[AsaasClient] ${context.method} ${context.endpoint} (attempt ${attempt})`);
        }

        const result = await Promise.race([
          requestFn(),
          this.createTimeoutPromise(),
        ]);

        const duration = Date.now() - startTime;
        this.logRequest({
          method: context.method,
          url: context.endpoint,
          status: 200,
          duration,
          timestamp: new Date(),
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        lastError = error as Error;

        this.logRequest({
          method: context.method,
          url: context.endpoint,
          status: error.status || 500,
          duration,
          error: lastError.message,
          timestamp: new Date(),
        });

        if (attempt === this.options.retryAttempts) {
          break; // Don't retry on last attempt
        }

        // Wait before retry
        await this.delay(this.options.retryDelay * attempt);
        
        if (this.options.enableLogging) {
          console.warn(`[AsaasClient] Retry ${attempt}/${this.options.retryAttempts} after error:`, lastError.message);
        }
      }
    }

    // All retries failed
    const apiError = this.createApiError(lastError);
    throw apiError;
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });
  }

  /**
   * Create standardized API error
   */
  private createApiError(error: Error | null): ApiError {
    let code = 'UNKNOWN_ERROR';
    let statusCode = 500;
    let message = error?.message || 'Unknown error occurred';

    // Parse HTTP status headers if available
    if (error && 'response' in error && error.response) {
      statusCode = (error.response as any).status || statusCode;
      message = (error.response as any).statusText || message;
    }

    // Parse JSON error response if available
    if (error && 'json' in error) {
      try {
        const errorData = (error as any).json;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          code = errorData.errors[0].code || code;
          message = errorData.errors[0].description || message;
        }
      } catch (parseError) {
        // Ignore JSON parsing errors
      }
    }

    return {
      code,
      message,
      statusCode,
      timestamp: new Date(),
    };
  }

  /**
   * Log request details
   */
  private logRequest(log: RequestLog): void {
    this.requestLogs.unshift(log);
    
    // Keep only recent logs
    if (this.requestLogs.length > this.maxLogs) {
      this.requestLogs = this.requestLogs.slice(0, this.maxLogs);
    }

    if (this.options.enableLogging) {
      const level = log.error ? 'error' : 'info';
      console[level](`[AsaasClient] ${log.method} ${log.url} - ${log.status} in ${log.duration}ms`);
    }
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Customer management methods
   */
  async createCustomer(customerData: any): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.createCustomer(customerData),
      { method: 'POST', endpoint: 'customers' }
    );
  }

  async getUser(customerId: string): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.getCustomer(customerId),
      { method: 'GET', endpoint: `customers/${customerId}` }
    );
  }

  async updateCustomer(customerId: string, updateData: any): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.updateCustomer(customerId, updateData),
      { method: 'PUT', endpoint: `customers/${customerId}` }
    );
  }

  async deleteCustomer(customerId: string): Promise<void> {
    return this.makeRequestWithRetry(
      () => this.service.deleteCustomer(customerId),
      { method: 'DELETE', endpoint: `customers/${customerId}` }
    );
  }

  async listCustomers(): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.listCustomers(),
      { method: 'GET', endpoint: 'customers' }
    );
  }

  /**
   * Invoice/Payment management methods
   */
  async createInvoice(invoiceData: any): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.createInvoice(invoiceData),
      { method: 'POST', endpoint: 'payments' }
    );
  }

  async getInvoice(invoiceId: string): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.getInvoice(invoiceId),
      { method: 'GET', endpoint: `payments/${invoiceId}` }
    );
  }

  async updateInvoice(invoiceId: string, updateData: any): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.updateInvoice(invoiceId, updateData),
      { method: 'PUT', endpoint: `payments/${invoiceId}` }
    );
  }

  async cancelInvoice(invoiceId: string): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.cancelInvoice(invoiceId),
      { method: 'POST', endpoint: `payments/${invoiceId}/refunding` }
    );
  }

  async listInvoices(): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.listInvoices(),
      { method: 'GET', endpoint: 'payments' }
    );
  }

  /**
   * PIX management
   */
  async getPixQrCode(invoiceId: string): Promise<{ payload: string; qrCode: string }> {
    return this.makeRequestWithRetry(
      () => this.service.getPixQrCode(invoiceId),
      { method: 'GET', endpoint: `payments/${invoiceId}/pixQrCode` }
    );
  }

  /**
   * Webhook management
   */
  async createWebhook(): Promise<{ webhookUrl: string; webhookId: string }> {
    return this.makeRequestWithRetry(
      () => this.service.createWebhook(),
      { method: 'POST', endpoint: 'webhooks' }
    );
  }

  /**
   * Health check and connection test
   */
  async testConnection(): Promise<{ status: string; message: string; environment: string }> {
    return this.makeRequestWithRetry(
      () => this.service.testConnection(),
      { method: 'GET', endpoint: 'health-check' }
    );
  }

  /**
   * Reports and analytics
   */
  async getReports(startDate: string, endDate: string): Promise<any> {
    return this.makeRequestWithRetry(
      () => this.service.getReports(startDate, endDate),
      { method: 'GET', endpoint: `billings?startDate=${startDate}&endDate=${endDate}` }
    );
  }

  /**
   * Configuration and utilities
   */
  getConfig(): AsaasConfig {
    return this.service.getConfig();
  }

  updateConfig(newConfig: Partial<AsaasConfig>): void {
    this.service.updateConfig(newConfig);
  }

  getBaseUrl(): string {
    return this.service.getBaseUrl();
  }

  /**
   * Logging and diagnostics
   */
  getRequestLogs(): RequestLog[] {
    return [...this.requestLogs];
  }

  getLastRequests(limit: number = 10): RequestLog[] {
    return this.requestLogs.slice(0, limit);
  }

  clearLogs(): void {
    this.requestLogs = [];
  }

  getStatistics(): {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    last24Hours: number;
  } {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    
    const recentLogs = this.requestLogs.filter(log => log.timestamp.getTime() > last24Hours);
    const errorLogs = this.requestLogs.filter(log => log.error);
    
    const totalRequests = this.requestLogs.length;
    const totalResponseTime = this.requestLogs.reduce((sum, log) => sum + log.duration, 0);
    const avgResponseTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;
    const errorRate = totalRequests > 0 ? Math.round((errorLogs.length / totalRequests) * 100) : 0;

    return {
      totalRequests,
      avgResponseTime,
      errorRate,
      last24Hours: recentLogs.length,
    };
  }
}

/**
 * Factory function to create AsaasClient instance
 */
export function createAsaasClient(config: AsaasConfig, options?: ClientOptions): AsaasClient {
  return new AsaasClient(config, options);
}

// Default export
export default AsaasClient;

// Export types
export {
  ClientOptions,
  ApiError,
  RequestLog,
};
