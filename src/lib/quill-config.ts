import Quill from 'quill';

// Get the Block Embed class from Quill
const BlockEmbed = Quill.import('blots/block/embed');

// Create a custom blot that allows raw HTML (including tables)
class RawHTMLBlot extends BlockEmbed {
  static create(value: string) {
    const node = super.create(value);
    node.innerHTML = value;
    node.setAttribute('contenteditable', 'true');
    return node;
  }

  static value(node: HTMLElement) {
    return node.innerHTML;
  }
}

RawHTMLBlot.blotName = 'raw-html';
RawHTMLBlot.tagName = 'div';
RawHTMLBlot.className = 'ql-raw-html';

// Register the custom blot
Quill.register(RawHTMLBlot);

// Modules configuration with enhanced clipboard for tables
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
  'link', 'image',
  'raw-html'
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
  
  try {
    // Get current selection
    const range = quill.getSelection(true);
    console.log('📍 Range atual:', range);
    
    if (range) {
      // Insert table HTML at cursor position
      const delta = quill.clipboard.convert(tableHTML);
      console.log('🔄 Delta gerado:', delta);
      
      quill.updateContents(delta, 'user');
      quill.setSelection(range.index + 1, 'silent');
      console.log('✅ Tabela inserida com sucesso');
    } else {
      // Fallback: insert at end
      const length = quill.getLength();
      const delta = quill.clipboard.convert(tableHTML);
      quill.updateContents(delta, 'user');
      console.log('✅ Tabela inserida no final');
    }
  } catch (error) {
    console.error('❌ Erro ao inserir tabela:', error);
    
    // Fallback method: use dangerouslyPasteHTML
    try {
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.clipboard.dangerouslyPasteHTML(index, tableHTML, 'user');
      console.log('✅ Tabela inserida via dangerouslyPasteHTML');
    } catch (fallbackError) {
      console.error('❌ Erro no fallback:', fallbackError);
    }
  }
};

