// Helper function para inserir tabelas HTML no Quill
export function insertTable(quill: any, rows: number = 3, cols: number = 3) {
  // Criar HTML da tabela
  let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">\n';
  
  // Criar cabeçalho
  tableHTML += '  <thead>\n    <tr>\n';
  for (let i = 0; i < cols; i++) {
    tableHTML += `      <th style="border: 1px solid #ddd; padding: 8px 12px; background-color: #f2f2f2; font-weight: bold;">Cabeçalho ${i + 1}</th>\n`;
  }
  tableHTML += '    </tr>\n  </thead>\n';
  
  // Criar corpo da tabela
  tableHTML += '  <tbody>\n';
  for (let i = 0; i < rows - 1; i++) {
    tableHTML += '    <tr>\n';
    for (let j = 0; j < cols; j++) {
      const bgColor = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
      tableHTML += `      <td style="border: 1px solid #ddd; padding: 8px 12px; background-color: ${bgColor};">Célula ${i + 1},${j + 1}</td>\n`;
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

// Configuração padrão dos módulos do Quill SEM suporte a tabelas na toolbar
export const quillModules = {
  toolbar: {
    container: [
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ]
  },
  clipboard: {
    matchVisual: false,
  }
};

// Formatos suportados pelo Quill (sem tabela)
export const quillFormats = [
  'header', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'blockquote', 'code-block',
  'link', 'image'
];