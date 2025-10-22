/**
 * Serviço para geração automática de códigos de Ponto de Venda
 * Formato: PV-A1234567 (PV + LETRA + 6 NÚMEROS)
 */

export class PDVGeneratorService {
  private static readonly LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private static readonly NUMBERS = '0123456789';

  /**
   * Gera um código único de Ponto de Venda
   * Formato: PV-A1234567
   */
  static generatePDVCode(): string {
    // Gerar uma letra aleatória
    const randomLetter = this.LETTERS[Math.floor(Math.random() * this.LETTERS.length)];
    
    // Gerar 6 números aleatórios
    let numbers = '';
    for (let i = 0; i < 6; i++) {
      numbers += this.NUMBERS[Math.floor(Math.random() * this.NUMBERS.length)];
    }
    
    return `PV-${randomLetter}${numbers}`;
  }

  /**
   * Valida se um código de PDV está no formato correto
   * @param code Código para validar
   * @returns true se o formato estiver correto
   */
  static validatePDVCode(code: string): boolean {
    const regex = /^PV-[A-Z]\d{6}$/;
    return regex.test(code);
  }

  /**
   * Gera um código único verificando se já existe no banco
   * @param checkExists Função para verificar se o código já existe
   * @returns Código único de PDV
   */
  static async generateUniquePDVCode(checkExists: (code: string) => Promise<boolean>): Promise<string> {
    let attempts = 0;
    const maxAttempts = 100; // Evitar loop infinito
    
    while (attempts < maxAttempts) {
      const code = this.generatePDVCode();
      const exists = await checkExists(code);
      
      if (!exists) {
        return code;
      }
      
      attempts++;
    }
    
    // Se chegou aqui, algo deu errado
    throw new Error('Não foi possível gerar um código único de PDV após várias tentativas');
  }
}

export const pdvGeneratorService = PDVGeneratorService;
