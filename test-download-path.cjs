// Script para testar download de arquivo
const path = require('path');
const fs = require('fs');

// Simular o processo de geração de URL
const baseDir = path.join(__dirname, 'documentos');
const fileName = 'contrato-representante-2025-10-13T19-10-00-721Z.pdf';
const cpfCnpj = '44444444444444';
const finalFilePath = path.join(baseDir, cpfCnpj, 'contrato-representante', fileName);

console.log('🔍 Testando geração de URL:');
console.log('  Base dir:', baseDir);
console.log('  File name:', fileName);
console.log('  CPF/CNPJ:', cpfCnpj);
console.log('  Final file path:', finalFilePath);
console.log('  File exists:', fs.existsSync(finalFilePath));

// Gerar URL como no servidor
const relativePath = path.relative(baseDir, finalFilePath).replace(/\\/g, '/');
const downloadUrl = `http://localhost:3001/api/download-file?path=${encodeURIComponent(relativePath)}`;

console.log('  Relative path:', relativePath);
console.log('  Download URL:', downloadUrl);

// Testar decodificação
const decodedPath = decodeURIComponent(encodeURIComponent(relativePath));
const normalizedPath = decodedPath.replace(/\//g, path.sep);
const fullPath = path.join(baseDir, normalizedPath);

console.log('  Decoded path:', decodedPath);
console.log('  Normalized path:', normalizedPath);
console.log('  Full path:', fullPath);
console.log('  Final file exists:', fs.existsSync(fullPath));
