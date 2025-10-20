import Quill from 'quill';
import QuillBetterTable from 'quill-better-table';
import 'quill-better-table/dist/quill-better-table.css';

// Register the table module
Quill.register({
  'modules/better-table': QuillBetterTable
}, true);

// Modules configuration with table support
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
  'better-table': {
    operationMenu: {
      items: {
        unmergeCells: {
          text: 'Desfazer mesclagem'
        },
        insertColumnRight: {
          text: 'Inserir coluna à direita'
        },
        insertColumnLeft: {
          text: 'Inserir coluna à esquerda'
        },
        insertRowUp: {
          text: 'Inserir linha acima'
        },
        insertRowDown: {
          text: 'Inserir linha abaixo'
        },
        mergeCells: {
          text: 'Mesclar células'
        },
        deleteColumn: {
          text: 'Excluir coluna'
        },
        deleteRow: {
          text: 'Excluir linha'
        },
        deleteTable: {
          text: 'Excluir tabela'
        }
      }
    }
  },
  clipboard: {
    matchVisual: false,
  },
  keyboard: {
    bindings: QuillBetterTable.keyboardBindings
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
  'table', 'table-cell-line'
];

// Helper function to insert a table
export const insertTable = (quill: any, rows: number = 3, columns: number = 3) => {
  const tableModule = quill.getModule('better-table');
  if (tableModule) {
    tableModule.insertTable(rows, columns);
  }
};

