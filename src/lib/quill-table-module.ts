// Módulo customizado para adicionar tabelas na barra de ferramentas do Quill
import Quill from 'quill';

const TableButton = Quill.import('ui/tooltip');

class TableHandler {
  constructor(quill: any, options: any) {
    this.quill = quill;
    this.options = options;
    this.toolbar = quill.getModule('toolbar');
    
    if (this.toolbar) {
      this.toolbar.addHandler('table', this.insertTable.bind(this));
    }
  }

  insertTable() {
    const range = this.quill.getSelection(true);
    if (range) {
      const tableHTML = this.createTableHTML(3, 3);
      this.quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
      this.quill.setSelection(range.index + tableHTML.length);
    }
  }

  createTableHTML(rows: number, cols: number): string {
    let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">\n';
    
    // Cabeçalho
    tableHTML += '  <thead>\n    <tr>\n';
    for (let i = 0; i < cols; i++) {
      tableHTML += `      <th style="border: 1px solid #ddd; padding: 8px 12px; background-color: #f2f2f2; font-weight: bold;">Cabeçalho ${i + 1}</th>\n`;
    }
    tableHTML += '    </tr>\n  </thead>\n';
    
    // Corpo da tabela
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
    
    return tableHTML;
  }
}

// Registrar o módulo
Quill.register('modules/tableHandler', TableHandler);

export default TableHandler;
