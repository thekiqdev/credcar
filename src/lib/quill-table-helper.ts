// Helper function para inserir tabelas HTML no Quill

export function insertTable(quill: any, rows: number = 3, cols: number = 3) {
  // Criar HTML da tabela
  let tableHTML = '<table style="border-collapse: collapse; width: 100%;">\n';
  
  // Criar cabeçalho
  tableHTML += '  <thead>\n    <tr>\n';
  for (let i = 0; i < cols; i++) {
    tableHTML += `      <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Cabeçalho ${i + 1}</th>\n`;
  }
  tableHTML += '    </tr>\n  </thead>\n';
  
  // Criar corpo da tabela
  tableHTML += '  <tbody>\n';
  for (let i = 0; i < rows - 1; i++) {
    tableHTML += '    <tr>\n';
    for (let j = 0; j < cols; j++) {
      tableHTML += `      <td style="border: 1px solid #ddd; padding: 8px;">Célula ${i + 1},${j + 1}</td>\n`;
    }
    tableHTML += '    </tr>\n';
  }
  tableHTML += '  </tbody>\n';
  tableHTML += '</table>\n<p><br></p>\n';

  // Obter posição atual do cursor
  const range = quill.getSelection(true);
  
  // Inserir tabela no editor
  if (range) {
    quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
    // Mover cursor para após a tabela
    quill.setSelection(range.index + tableHTML.length);
  } else {
    // Se não há seleção, inserir no final
    const length = quill.getLength();
    quill.clipboard.dangerouslyPasteHTML(length, tableHTML);
    quill.setSelection(length + tableHTML.length);
  }
}

// Função para criar uma tabela customizada
export function createCustomTable(rows: number, cols: number, hasHeader: boolean = true): string {
  let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">\n';
  
  if (hasHeader) {
    tableHTML += '  <thead>\n    <tr>\n';
    for (let i = 0; i < cols; i++) {
      tableHTML += `      <th style="border: 1px solid #ddd; padding: 8px 12px; background-color: #f2f2f2; font-weight: bold;">Cabeçalho ${i + 1}</th>\n`;
    }
    tableHTML += '    </tr>\n  </thead>\n';
  }
  
  tableHTML += '  <tbody>\n';
  const bodyRows = hasHeader ? rows - 1 : rows;
  for (let i = 0; i < bodyRows; i++) {
    tableHTML += '    <tr>\n';
    for (let j = 0; j < cols; j++) {
      const bgColor = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
      tableHTML += `      <td style="border: 1px solid #ddd; padding: 8px 12px; background-color: ${bgColor};">Célula ${i + 1},${j + 1}</td>\n`;
    }
    tableHTML += '    </tr>\n';
  }
  tableHTML += '  </tbody>\n';
  tableHTML += '</table>\n<p><br></p>\n';
  
  return tableHTML;
}

