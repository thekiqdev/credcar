import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { MERGE_FIELDS } from '@/lib/merge-fields';

interface MergeFieldsHelperProps {
  onInsertField: (placeholder: string) => void;
}

const MergeFieldsHelper: React.FC<MergeFieldsHelperProps> = ({ onInsertField }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Cliente']);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleCopyField = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    setCopiedField(placeholder);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredFields = MERGE_FIELDS.map(category => ({
    ...category,
    fields: category.fields.filter(
      field =>
        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.placeholder.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(category => category.fields.length > 0);

  return (
    <Card className="w-80 h-full">
      <CardHeader>
        <CardTitle className="text-lg">Campos de Mesclagem</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Clique para inserir campos no contrato
        </p>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredFields.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            Nenhum campo encontrado
          </div>
        ) : (
          filteredFields.map(category => (
            <div key={category.category} className="border rounded-lg">
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
              >
                <span className="font-medium text-sm">{category.category}</span>
                {expandedCategories.includes(category.category) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {expandedCategories.includes(category.category) && (
                <div className="px-2 pb-2 space-y-1">
                  {category.fields.map(field => (
                    <div
                      key={field.placeholder}
                      className="p-2 rounded border hover:bg-gray-50 space-y-1 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{field.label}</div>
                          <code className="text-xs text-blue-600 bg-blue-50 px-1 rounded">
                            {field.placeholder}
                          </code>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyField(field.placeholder)}
                            className="h-6 px-2"
                            title="Copiar campo"
                          >
                            {copiedField === field.placeholder ? (
                              <span className="text-green-600 text-xs">✓</span>
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onInsertField(field.placeholder)}
                            className="h-6 px-2 text-xs"
                            title="Inserir no cursor"
                          >
                            Inserir
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ex: {field.example}
                      </div>
                      {field.description && (
                        <div className="text-xs text-gray-500 italic">
                          {field.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default MergeFieldsHelper;

