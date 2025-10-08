/**
 * Utilitários para formatação de datas
 * Evita problemas de timezone ao converter datas
 */

/**
 * Formatar data de YYYY-MM-DD para DD/MM/YYYY
 * Evita problemas de timezone usando formatação direta
 */
export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  // Se já está no formato DD/MM/YYYY, retornar como está
  if (dateString.includes('/')) {
    return dateString;
  }
  
  // Se está no formato YYYY-MM-DD, converter para DD/MM/YYYY
  if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  }
  
  return dateString;
}

/**
 * Verificar se uma data está vencida
 * Compara data no formato YYYY-MM-DD com data atual
 */
export function isDateOverdue(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  
  try {
    // Criar data local sem problemas de timezone
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const today = new Date();
      
      // Resetar horas para comparar apenas datas
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate < today;
    }
  } catch (error) {
    console.error('Erro ao verificar data vencida:', error);
  }
  
  return false;
}

/**
 * Converter data de DD/MM/YYYY para YYYY-MM-DD
 */
export function formatDateToISO(dateString: string): string {
  if (!dateString) return '';
  
  // Se já está no formato YYYY-MM-DD, retornar como está
  if (dateString.includes('-')) {
    return dateString;
  }
  
  // Se está no formato DD/MM/YYYY, converter para YYYY-MM-DD
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  return dateString;
}
