// Helper function para inserir tabelas HTML no Quill
export function insertTable(quill: any, rows: number = 3, cols: number = 3) {
  // Obter posição atual do cursor
  const range = quill.getSelection(true);
  const index = range ? range.index : quill.getLength();
  
  // Criar HTML da tabela
  let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">';
  
  // Criar cabeçalho
  tableHTML += '<thead><tr>';
  for (let i = 0; i < cols; i++) {
    tableHTML += `<th style="border: 1px solid #ddd; padding: 8px 12px; background-color: #f2f2f2; font-weight: bold;">Cabeçalho ${i + 1}</th>`;
  }
  tableHTML += '</tr></thead>';
  
  // Criar corpo da tabela
  tableHTML += '<tbody>';
  for (let i = 0; i < rows - 1; i++) {
    tableHTML += '<tr>';
    for (let j = 0; j < cols; j++) {
      const bgColor = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
      tableHTML += `<td style="border: 1px solid #ddd; padding: 8px 12px; background-color: ${bgColor};">Célula ${i + 1},${j + 1}</td>`;
    }
    tableHTML += '</tr>';
  }
  tableHTML += '</tbody></table><p><br></p>';

  // Inserir usando insertEmbed ou updateContents
  try {
    // Tentar inserir como HTML usando updateContents
    const delta = quill.clipboard.convert(tableHTML);
    quill.updateContents(delta, 'user');
  } catch (error) {
    // Fallback: inserir como texto HTML
    quill.clipboard.dangerouslyPasteHTML(index, tableHTML);
  }
  
  // Mover cursor para após a tabela
  quill.setSelection(index + 100); // Aproximadamente após a tabela
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