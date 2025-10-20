import React, { useRef, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface CKEditorProps {
  content: string;
  onChange: (content: string) => void;
  onInit?: (editor: any) => void;
  height?: string | number;
  placeholder?: string;
  disabled?: boolean;
  showMergeFields?: boolean;
  onInsertSignature?: (signatoryName: string) => void;
  onInsertMergeField?: (fieldName: string) => void;
}

const CKEditorComponent: React.FC<CKEditorProps> = ({
  content,
  onChange,
  onInit,
  height = 500,
  placeholder = "Digite o conteúdo do contrato...",
  disabled = false,
  showMergeFields = false,
  onInsertSignature,
  onInsertMergeField,
}) => {
  const editorRef = useRef<any>(null);

  const handleInit = (editor: any) => {
    editorRef.current = editor;
    
    // Configurar tabelas para largura completa por padrão
    editor.model.schema.extend('table', {
      allowAttributes: ['width', 'style', 'class']
    });
    
    // Interceptar criação de tabelas para aplicar largura completa
    editor.model.document.on('change:data', () => {
      const root = editor.model.document.getRoot();
      const tables = Array.from(root.getChildren()).filter(child => child.is('table'));
      
      tables.forEach(table => {
        editor.model.change(writer => {
          // Sempre aplicar largura completa
          writer.setAttribute('width', '100%', table);
          writer.setAttribute('style', 'width: 100% !important; table-layout: fixed;', table);
          writer.setAttribute('class', 'full-width-table', table);
          
          // Aplicar largura para todas as células também
          const cells = Array.from(table.getChildren()).flatMap(row => 
            Array.from(row.getChildren()).filter(cell => cell.is('tableCell'))
          );
          
          cells.forEach(cell => {
            writer.setAttribute('style', 'width: auto; min-width: 100px;', cell);
          });
        });
      });
    });
    
    // Interceptar inserção de tabelas para aplicar largura completa imediatamente
    editor.model.schema.addAttributeCheck((context: any, attributeName: string) => {
      if (context.endsWith('table') && attributeName === 'width') {
        return true;
      }
    });
    
    // Converter atributos de largura para CSS
    editor.conversion.for('downcast').attributeToAttribute({
      model: 'width',
      view: {
        name: 'table',
        styles: {
          width: '100% !important',
          'table-layout': 'fixed'
        }
      }
    });
    
    // Interceptar inserção de tabelas para aplicar largura completa imediatamente
    editor.model.document.on('change', (evt: any) => {
      if (evt.source.is('operations')) {
        const changes = evt.source.getChanges();
        changes.forEach((change: any) => {
          if (change.type === 'insert' && change.position && change.position.parent) {
            const element = change.position.parent;
            if (element.is('table')) {
              editor.model.change(writer => {
                writer.setAttribute('width', '100%', element);
                writer.setAttribute('style', 'width: 100% !important; table-layout: fixed;', element);
                writer.setAttribute('class', 'full-width-table', element);
              });
            }
          }
        });
      }
    });
    
    // Adicionar botões customizados para assinatura e campos de mesclagem
    editor.ui.componentFactory.add('signatureField', (locale: any) => {
      const buttonView = new editor.ui.ButtonView(locale);
      
      buttonView.set({
        label: 'Inserir Assinatura',
        icon: '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L3 7v11h14V7l-7-5zM8 15v-4h4v4H8z"/></svg>',
        tooltip: true
      });

      buttonView.on('execute', () => {
        const signatoryName = prompt('Nome do signatário:');
        if (signatoryName && onInsertSignature) {
          onInsertSignature(signatoryName);
        }
      });

      return buttonView;
    });

    editor.ui.componentFactory.add('mergeField', (locale: any) => {
      const buttonView = new editor.ui.ButtonView(locale);
      
      buttonView.set({
        label: 'Inserir Campo de Mesclagem',
        icon: '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>',
        tooltip: true
      });

      buttonView.on('execute', () => {
        const fieldName = prompt('Nome do campo de mesclagem:');
        if (fieldName && onInsertMergeField) {
          onInsertMergeField(fieldName);
        }
      });

      return buttonView;
    });

    // Configurar estilos para campos de assinatura e mesclagem
    editor.model.schema.register('signatureField', {
      inheritAllFrom: '$block',
      allowAttributes: ['signatoryName']
    });

    editor.model.schema.register('mergeField', {
      inheritAllFrom: '$text',
      allowAttributes: ['fieldName']
    });

    // Converter para view
    editor.conversion.elementToElement({
      model: 'signatureField',
      view: {
        name: 'div',
        classes: 'signature-field',
        attributes: {
          'data-signatory': ''
        }
      }
    });

    editor.conversion.elementToElement({
      model: 'mergeField',
      view: {
        name: 'span',
        classes: 'merge-field',
        attributes: {
          'data-field': ''
        }
      }
    });

    if (onInit) {
      onInit(editor);
    }
  };

  const handleChange = (event: any, editor: any) => {
    const data = editor.getData();
    onChange(data);
  };

  const insertSignatureField = (signatoryName: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.model.change(writer => {
        const signatureElement = writer.createElement('signatureField', {
          signatoryName: signatoryName
        });
        writer.insertText(`[ASSINATURA: ${signatoryName}]`, signatureElement);
        editor.model.insertContent(signatureElement);
      });
    }
  };

  const insertMergeField = (fieldName: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.model.change(writer => {
        const mergeElement = writer.createElement('mergeField', {
          fieldName: fieldName
        });
        writer.insertText(`[${fieldName.toUpperCase()}]`, mergeElement);
        editor.model.insertContent(mergeElement);
      });
    }
  };

  const config = {
    placeholder: placeholder,
    toolbar: [
      'heading', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
      'bulletedList', 'numberedList', '|',
      'alignment', '|',
      'insertTable', '|',
      'codeBlock', '|',
      'link', 'imageUpload', '|',
      'signatureField', 'mergeField', '|',
      'undo', 'redo'
    ],
    table: {
      contentToolbar: [
        'tableColumn', 'tableRow', 'mergeTableCells',
        'tableProperties', 'tableCellProperties'
      ],
      tableProperties: {
        borderColors: ['#000000', '#666666', '#cccccc'],
        backgroundColors: ['#ffffff', '#f8f8f8', '#e8e8e8']
      },
      tableCellProperties: {
        borderColors: ['#000000', '#666666', '#cccccc'],
        backgroundColors: ['#ffffff', '#f8f8f8', '#e8e8e8']
      }
    },
    fontSize: {
      options: [9, 11, 13, 'default', 17, 19, 21, 24, 28, 32]
    },
    fontFamily: {
      options: [
        'default',
        'Arial, Helvetica, sans-serif',
        'Courier New, Courier, monospace',
        'Georgia, serif',
        'Lucida Sans Unicode, Lucida Grande, sans-serif',
        'Tahoma, Geneva, sans-serif',
        'Times New Roman, Times, serif',
        'Trebuchet MS, Helvetica, sans-serif',
        'Verdana, Geneva, sans-serif'
      ]
    },
    codeBlock: {
      languages: [
        { language: 'html', label: 'HTML' },
        { language: 'css', label: 'CSS' },
        { language: 'javascript', label: 'JavaScript' },
        { language: 'json', label: 'JSON' },
        { language: 'xml', label: 'XML' }
      ]
    },
    image: {
      toolbar: [
        'imageTextAlternative', '|',
        'imageStyle:alignLeft', 'imageStyle:alignCenter', 'imageStyle:alignRight'
      ],
      styles: [
        'full',
        'side',
        'alignLeft',
        'alignCenter',
        'alignRight'
      ]
    },
    language: 'pt-br',
    removePlugins: ['Title'],
    extraPlugins: []
  };

  return (
    <div className="ckeditor-container" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <CKEditor
        editor={ClassicEditor}
        data={content}
        onReady={handleInit}
        onChange={handleChange}
        config={config}
        disabled={disabled}
      />
      
      {/* Estilos customizados */}
      <style jsx global>{`
        .ckeditor-container .ck-editor__editable {
          min-height: ${typeof height === 'number' ? `${height - 100}px` : '400px'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
        }
        
        .ckeditor-container .signature-field {
          border: 2px dashed #ccc;
          padding: 20px;
          margin: 10px 0;
          text-align: center;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        
        .ckeditor-container .merge-field {
          background-color: #e3f2fd;
          padding: 2px 6px;
          border-radius: 3px;
          border: 1px solid #2196f3;
          color: #1976d2;
          font-weight: bold;
        }
        
        .ckeditor-container .ck-editor__editable p {
          margin: 0 0 1em 0;
        }
        
        .ckeditor-container .ck-editor__editable table,
        .ckeditor-container .ck-editor__editable .full-width-table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 1em 0 !important;
          min-width: 100% !important;
          table-layout: fixed !important;
          max-width: 100% !important;
        }
        
        .ckeditor-container .ck-editor__editable table td,
        .ckeditor-container .ck-editor__editable table th,
        .ckeditor-container .ck-editor__editable .full-width-table td,
        .ckeditor-container .ck-editor__editable .full-width-table th {
          border: 1px solid #ddd !important;
          padding: 8px 12px !important;
          text-align: left !important;
          min-width: 100px !important;
          width: auto !important;
          word-wrap: break-word !important;
          box-sizing: border-box !important;
        }
        
        .ckeditor-container .ck-editor__editable table th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        
        .ckeditor-container .ck-editor__editable table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .ckeditor-container .ck-editor__editable table tr:hover {
          background-color: #f5f5f5;
        }
        
        /* Forçar largura completa para todas as tabelas */
        .ckeditor-container .ck-editor__editable table {
          width: 100% !important;
          min-width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
        }
        
        .ckeditor-container .ck-editor__editable table td,
        .ckeditor-container .ck-editor__editable table th {
          width: auto !important;
          min-width: 100px !important;
        }
        
        /* Estilo específico para tabelas vazias ou com pouco conteúdo */
        .ckeditor-container .ck-editor__editable table:not([style*="width"]) {
          width: 100% !important;
        }
        
        .ckeditor-container .ck-editor__editable h1,
        .ckeditor-container .ck-editor__editable h2,
        .ckeditor-container .ck-editor__editable h3,
        .ckeditor-container .ck-editor__editable h4,
        .ckeditor-container .ck-editor__editable h5,
        .ckeditor-container .ck-editor__editable h6 {
          margin: 1em 0 0.5em 0;
          font-weight: bold;
        }
        
        .ckeditor-container .ck-editor__editable h1 { font-size: 2em; }
        .ckeditor-container .ck-editor__editable h2 { font-size: 1.5em; }
        .ckeditor-container .ck-editor__editable h3 { font-size: 1.3em; }
        .ckeditor-container .ck-editor__editable h4 { font-size: 1.1em; }
        .ckeditor-container .ck-editor__editable h5 { font-size: 1em; }
        .ckeditor-container .ck-editor__editable h6 { font-size: 0.9em; }
      `}</style>
    </div>
  );
};

export default CKEditorComponent;
