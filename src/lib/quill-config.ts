import Quill from 'quill';

// Modules configuration - without custom table handling
// Quill will preserve HTML through dangerouslyPasteHTML
export const quillModulesWithTable = {
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

// Formats supported
export const quillFormatsWithTable = [
  'header', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'blockquote', 'code-block',
  'link', 'image'
];

// Helper function to insert a simple HTML table
export const insertTable = (quill: any, rows: number = 3, columns: number = 3) => {
  console.log('🔵 insertTable chamada com:', { rows, columns });
  
  if (!quill) {
    console.error('❌ Quill não está definido');
    return;
  }

  // Generate simple HTML table with better styling
  let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid #333;">\n';
  
  for (let i = 0; i < rows; i++) {
    tableHTML += '  <tr>\n';
    for (let j = 0; j < columns; j++) {
      tableHTML += `    <td style="border: 1px solid #333; padding: 8px; min-width: 80px; min-height: 30px;">${i === 0 && j === 0 ? 'Edite aqui' : '&nbsp;'}</td>\n`;
    }
    tableHTML += '  </tr>\n';
  }
  
  tableHTML += '</table>\n<p><br></p>';
  
  console.log('📋 HTML da tabela gerado:', tableHTML.substring(0, 200) + '...');
  
  // ALWAYS use dangerouslyPasteHTML to preserve table HTML
  try {
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    
    console.log('📍 Inserindo na posição:', index);
    
    // Use dangerouslyPasteHTML to insert raw HTML
    quill.clipboard.dangerouslyPasteHTML(index, tableHTML, 'user');
    
    console.log('✅ Tabela HTML inserida com sucesso');
    
    // Move cursor after the table
    setTimeout(() => {
      const newPosition = index + 1;
      quill.setSelection(newPosition, 0, 'silent');
    }, 10);
    
  } catch (error) {
    console.error('❌ Erro ao inserir tabela:', error);
  }
};

