/**
 * InvoiceDateCalculatorService - Service for calculating invoice dates
 * Handles complex date calculations for invoice due dates and generation dates
 */

import { systemConfigService } from './system-config.service.js';

export interface InvoiceDateCalculation {
  dueDate: string; // YYYY-MM-DD format
  generationDate: string; // YYYY-MM-DD format
  nextInvoiceDate: string | null; // YYYY-MM-DD format
}

export interface InvoiceDateExample {
  description: string;
  generationDate: string;
  dueDate: string;
  calculation: string;
}

class InvoiceDateCalculatorService {
  /**
   * Calculate invoice dates based on the new rules
   * @param baseDate - Base date for calculation (usually today)
   * @param installmentNumber - Installment number (1, 2, 3, etc.)
   * @param totalInstallments - Total number of installments
   * @param contractId - Contract ID (optional, for subsequent installments)
   * @returns InvoiceDateCalculation object
   */
  async calculateInvoiceDates(
    baseDate: Date = new Date(),
    installmentNumber: number = 1,
    totalInstallments: number = 1,
    contractId?: number
  ): Promise<InvoiceDateCalculation> {
    try {
      // Get payment configuration
      const paymentConfig = await systemConfigService.getPaymentConfig();
      const fixedDay = paymentConfig.invoiceGenerationFixedDay || 20;
      const daysAdvance = paymentConfig.invoiceGenerationDaysAdvance || 15;

      let dueDate: Date;
      let generationDate: Date;

      if (installmentNumber === 1) {
        // FIRST INVOICE: Fixed rule - due in 2 days
        dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + 2);
        
        // Generation date is the same as base date (created immediately)
        generationDate = new Date(baseDate);
        
        console.log(`📅 Primeira fatura: Vencimento em 2 dias (${this.formatDateToString(dueDate)})`);
      } else {
        // SUBSEQUENT INVOICES: Configurable rule
        // For subsequent installments, we need to calculate based on the first invoice date
        let calculationBaseDate = baseDate;
        
        if (contractId && installmentNumber > 1) {
          // Try to get the first invoice date for this contract
          try {
            const { supabase } = await import('./supabase');
            const { data: firstInvoice, error } = await supabase
              .from('invoices')
              .select('due_date')
              .eq('contract_id', contractId)
              .eq('installment_number', 1)
              .single();
            
            if (!error && firstInvoice) {
              // Use the first invoice date as base for calculation
              calculationBaseDate = new Date(firstInvoice.due_date);
              console.log(`📅 Usando data da primeira fatura como base: ${this.formatDateToString(calculationBaseDate)}`);
            }
          } catch (error) {
            console.warn('Could not fetch first invoice date, using baseDate:', error);
          }
        }
        
        // Calculate due date based on fixed day rule
        dueDate = this.calculateDueDate(calculationBaseDate, installmentNumber, fixedDay);
        
        // Calculate generation date (daysAdvance days before due date)
        generationDate = this.calculateGenerationDate(dueDate, daysAdvance);
        
        console.log(`📅 Fatura ${installmentNumber}: Vencimento dia ${fixedDay} (${this.formatDateToString(dueDate)}), Geração ${daysAdvance} dias antes (${this.formatDateToString(generationDate)})`);
      }
      
      // Calculate next invoice date (for subsequent installments)
      let nextInvoiceDate: string | null = null;
      if (installmentNumber < totalInstallments) {
        // Use the same calculation base date for next invoice
        let nextCalculationBaseDate = baseDate;
        
        if (contractId && installmentNumber >= 1) {
          // Try to get the first invoice date for this contract
          try {
            const { supabase } = await import('./supabase');
            const { data: firstInvoice, error } = await supabase
              .from('invoices')
              .select('due_date')
              .eq('contract_id', contractId)
              .eq('installment_number', 1)
              .single();
            
            if (!error && firstInvoice) {
              nextCalculationBaseDate = new Date(firstInvoice.due_date);
            }
          } catch (error) {
            console.warn('Could not fetch first invoice date for next calculation, using baseDate:', error);
          }
        }
        
        // Calculate next invoice date
        const nextDueDate = this.calculateDueDate(nextCalculationBaseDate, installmentNumber + 1, fixedDay);
        nextInvoiceDate = this.calculateGenerationDate(nextDueDate, daysAdvance);
      }

      return {
        dueDate: this.formatDateToString(dueDate),
        generationDate: this.formatDateToString(generationDate),
        nextInvoiceDate: nextInvoiceDate ? this.formatDateToString(nextInvoiceDate) : null
      };
    } catch (error) {
      console.error('Error calculating invoice dates:', error);
      throw error;
    }
  }

  /**
   * Check if an invoice should be generated today
   * @param contractId - Contract ID
   * @param currentInstallment - Current installment number
   * @returns boolean indicating if invoice should be generated
   */
  async shouldGenerateInvoiceToday(
    contractId: number,
    currentInstallment: number
  ): Promise<boolean> {
    try {
      const today = new Date();
      const calculation = await this.calculateInvoiceDates(today, currentInstallment + 1);
      
      const todayStr = this.formatDateToString(today);
      return calculation.generationDate === todayStr;
    } catch (error) {
      console.error('Error checking if invoice should be generated today:', error);
      return false;
    }
  }

  /**
   * Get example dates for the current configuration
   * @returns Array of example calculations
   */
  async getExampleDates(): Promise<InvoiceDateExample[]> {
    try {
      const paymentConfig = await systemConfigService.getPaymentConfig();
      const fixedDay = paymentConfig.invoiceGenerationFixedDay || 20;
      const daysAdvance = paymentConfig.invoiceGenerationDaysAdvance || 15;

      const examples: InvoiceDateExample[] = [];
      const today = new Date();

      // Example 1: First installment (fixed rule - 2 days)
      const firstInstallment = await this.calculateInvoiceDates(today, 1, 3);
      const firstDueDate = new Date(today);
      firstDueDate.setDate(firstDueDate.getDate() + 2);
      
      examples.push({
        description: 'Primeira Parcela',
        generationDate: firstInstallment.generationDate,
        dueDate: firstInstallment.dueDate,
        calculation: `Regra fixa: Vencimento em 2 dias a partir de hoje.`
      });

      // Example 2: Second installment (configurable rule)
      const secondInstallment = await this.calculateInvoiceDates(today, 2, 3);
      examples.push({
        description: 'Segunda Parcela',
        generationDate: secondInstallment.generationDate,
        dueDate: secondInstallment.dueDate,
        calculation: `Regra configurável: Vencimento dia ${fixedDay} do próximo mês. Geração ${daysAdvance} dias antes.`
      });

      // Example 3: Third installment (configurable rule)
      const thirdInstallment = await this.calculateInvoiceDates(today, 3, 3);
      examples.push({
        description: 'Terceira Parcela',
        generationDate: thirdInstallment.generationDate,
        dueDate: thirdInstallment.dueDate,
        calculation: `Regra configurável: Vencimento dia ${fixedDay} do mês seguinte. Geração ${daysAdvance} dias antes.`
      });

      return examples;
    } catch (error) {
      console.error('Error getting example dates:', error);
      return [];
    }
  }

  /**
   * Calculate due date based on fixed day rule
   * @param baseDate - Base date for calculation
   * @param installmentNumber - Installment number
   * @param fixedDay - Fixed day of the month (1-31)
   * @returns Date object
   */
  private calculateDueDate(baseDate: Date, installmentNumber: number, fixedDay: number): Date {
    // Create a new date to avoid modifying the original
    const dueDate = new Date(baseDate);
    
    // For subsequent installments, add months from base date
    if (installmentNumber > 1) {
      dueDate.setMonth(dueDate.getMonth() + (installmentNumber - 1));
    }
    
    // Set to fixed day of the month (use setDate with proper handling)
    const year = dueDate.getFullYear();
    const month = dueDate.getMonth();
    
    // Create a new date with the fixed day
    const resultDate = new Date(year, month, fixedDay);
    
    // If the fixed day doesn't exist in the month (e.g., Feb 30), use last day of month
    if (resultDate.getDate() !== fixedDay) {
      resultDate.setDate(0); // Last day of previous month
    }
    
    return resultDate;
  }

  /**
   * Calculate generation date (daysAdvance days before due date)
   * @param dueDate - Due date
   * @param daysAdvance - Days in advance
   * @returns Date object
   */
  private calculateGenerationDate(dueDate: Date, daysAdvance: number): Date {
    const generationDate = new Date(dueDate);
    generationDate.setDate(generationDate.getDate() - daysAdvance);
    return generationDate;
  }

  /**
   * Format date to YYYY-MM-DD string
   * @param date - Date object
   * @returns Formatted date string
   */
  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Export singleton instance
export const invoiceDateCalculatorService = new InvoiceDateCalculatorService();

// Default export
export default invoiceDateCalculatorService;
