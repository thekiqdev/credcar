import Quill from 'quill';

// Extend Quill to allow table elements in clipboard
const Inline = Quill.import('blots/inline');
const Block = Quill.import('blots/block');
const BlockEmbed = Quill.import('blots/block/embed');

// Allow table, tr, td, th tags
class TableBlot extends BlockEmbed {
  static blotName = 'table';
  static tagName = 'TABLE';
}

class TableRowBlot extends Block {
  static blotName = 'table-row';
  static tagName = 'TR';
}

class TableCellBlot extends Block {
  static blotName = 'table-cell';
  static tagName = 'TD';
}

class TableHeaderBlot extends Block {
  static blotName = 'table-header';
  static tagName = 'TH';
}

// Register table blots
Quill.register({
  'formats/table': TableBlot,
  'formats/table-row': TableRowBlot,
  'formats/table-cell': TableCellBlot,
  'formats/table-header': TableHeaderBlot,
}, true);

// Modules configuration - simplified without better-table
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
    matchers: [
      // Allow table elements to be pasted
      ['TABLE', (node: any, delta: any) => {
        return delta;
      }],
      ['TR', (node: any, delta: any) => {
        return delta;
      }],
      ['TD', (node: any, delta: any) => {
        return delta;
      }],
      ['TH', (node: any, delta: any) => {
        return delta;
      }]
    ]
  }
};

// Formats supported - including basic HTML table support
export const quillFormatsWithTable = [
  'header', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'blockquote', 'code-block',
  'link', 'image',
  'table', 'table-row', 'table-cell', 'table-header'
];

// Helper function to insert a simple HTML table
export const insertTable = (quill: any, rows: number = 3, columns: number = 3) => {
  // Generate simple HTML table with better styling
  let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid #ddd;">\n';
  
  for (let i = 0; i < rows; i++) {
    tableHTML += '  <tr>\n';
    for (let j = 0; j < columns; j++) {
      tableHTML += `    <td style="border: 1px solid #ddd; padding: 8px; min-width: 80px; min-height: 30px;">${i === 0 && j === 0 ? 'Edite aqui' : '&nbsp;'}</td>\n`;
    }
    tableHTML += '  </tr>\n';
  }
  
  tableHTML += '</table>\n<p><br></p>';
  
  // Insert at cursor position
  const range = quill.getSelection();
  if (range) {
    quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
    quill.setSelection(range.index + 1);
  } else {
    const length = quill.getLength();
    quill.clipboard.dangerouslyPasteHTML(length, tableHTML);
  }
};

