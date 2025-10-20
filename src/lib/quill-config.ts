import Quill from 'quill';

// Modules configuration - simplified without better-table for now
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

// Formats supported - including basic HTML table support
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
  // Generate simple HTML table
  let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">\n';
  
  for (let i = 0; i < rows; i++) {
    tableHTML += '  <tr>\n';
    for (let j = 0; j < columns; j++) {
      tableHTML += '    <td style="border: 1px solid #ddd; padding: 8px; min-width: 50px; min-height: 30px;">&nbsp;</td>\n';
    }
    tableHTML += '  </tr>\n';
  }
  
  tableHTML += '</table>\n<p><br></p>';
  
  // Insert at cursor position
  const range = quill.getSelection();
  if (range) {
    quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
    quill.setSelection(range.index + tableHTML.length);
  } else {
    const length = quill.getLength();
    quill.clipboard.dangerouslyPasteHTML(length, tableHTML);
  }
};

