/**
 * Utilitários para hash e verificação de senhas
 * Usa Web Crypto API nativa do navegador
 * 
 * NOTA: Para produção, recomenda-se usar Edge Function do Supabase
 * para fazer hash com bcrypt no backend
 */

/**
 * Cria hash SHA-256 de uma string
 * @param text Texto a ser hasheado
 * @returns Promise com hash em hexadecimal
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verifica se uma senha corresponde ao hash armazenado
 * @param password Senha em texto plano
 * @param hash Hash armazenado no banco
 * @returns true se a senha corresponde ao hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
