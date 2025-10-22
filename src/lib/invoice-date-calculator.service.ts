/**
 * InvoiceDateCalculatorService - Service for calculating invoice dates
 * Handles complex date calculations for invoice due dates and generation dates
 */

import { systemConfigService } from './system-config.service';

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
   * @returns InvoiceDateCalculation object
   */
  async calculateInvoiceDates(
    baseDate: Date = new Date(),
    installmentNumber: number = 1,
    totalInstallments: number = 1
  ): Promise<InvoiceDateCalculation> {
    try {
      // Get payment configuration
      const paymentConfig = await systemConfigService.getPaymentConfig();
      const fixedDay = paymentConfig.invoiceGenerationFixedDay || 20;
      const daysAdvance = paymentConfig.invoiceGenerationDaysAdvance || 15;

      // Calculate due date based on fixed day rule
      const dueDate = this.calculateDueDate(baseDate, installmentNumber, fixedDay);
      
      // Calculate generation date (daysAdvance days before due date)
      const generationDate = this.calculateGenerationDate(dueDate, daysAdvance);
      
      // Calculate next invoice date (for subsequent installments)
      let nextInvoiceDate: string | null = null;
      if (installmentNumber < totalInstallments) {
        const nextDueDate = this.calculateDueDate(baseDate, installmentNumber + 1, fixedDay);
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

      // Example 1: First installment
      const firstInstallment = await this.calculateInvoiceDates(today, 1, 3);
      examples.push({
        description: 'Primeira Parcela',
        generationDate: firstInstallment.generationDate,
        dueDate: firstInstallment.dueDate,
        calculation: `Vencimento: dia ${fixedDay} do mês atual. Geração: ${daysAdvance} dias antes.`
      });

      // Example 2: Second installment
      const secondInstallment = await this.calculateInvoiceDates(today, 2, 3);
      examples.push({
        description: 'Segunda Parcela',
        generationDate: secondInstallment.generationDate,
        dueDate: secondInstallment.dueDate,
        calculation: `Vencimento: dia ${fixedDay} do próximo mês. Geração: ${daysAdvance} dias antes.`
      });

      // Example 3: Third installment
      const thirdInstallment = await this.calculateInvoiceDates(today, 3, 3);
      examples.push({
        description: 'Terceira Parcela',
        generationDate: thirdInstallment.generationDate,
        dueDate: thirdInstallment.dueDate,
        calculation: `Vencimento: dia ${fixedDay} do mês seguinte. Geração: ${daysAdvance} dias antes.`
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
    const dueDate = new Date(baseDate);
    
    // For first installment, use current month
    // For subsequent installments, add months
    if (installmentNumber > 1) {
      dueDate.setMonth(dueDate.getMonth() + (installmentNumber - 1));
    }
    
    // Set to fixed day of the month
    dueDate.setDate(fixedDay);
    
    // If the fixed day doesn't exist in the month (e.g., Feb 30), use last day of month
    if (dueDate.getDate() !== fixedDay) {
      dueDate.setDate(0); // Last day of previous month
    }
    
    return dueDate;
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
