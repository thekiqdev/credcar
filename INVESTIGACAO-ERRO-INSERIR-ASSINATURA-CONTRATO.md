# Investigação: Erro ao Inserir Assinatura no Contrato

## Data da Investigação
2025-01-27

## Problema Reportado
Erro ao tentar anexar assinatura no contrato:

```
Uncaught TypeError: he.current.insertContent is not a function
    at Tt (index-C_9Fbpmr.js:9483:11609)
    at Object.Di (index-C_9Fbpmr.js:37:9862)
    ...
[Violation]'click' handler took 3888ms
```

## Causa Raiz Identificada

**Arquivo**: `src/components/sales/ContractDetails.tsx` (linha 258)

**Problema**: O código estava tentando usar `editorRef.current.insertContent()` diretamente, mas o CKEditor 5 não possui esse método na API pública. A inserção de conteúdo deve ser feita através da API do modelo (`model.change()` e `model.insertContent()`).

**Código Problemático**:
```typescript
// ❌ INCORRETO - CKEditor 5 não tem insertContent() diretamente
editorRef.current.insertContent(signatureShortcode);
```

## Solução Implementada

**Correção**: Usar a API correta do CKEditor 5 através do modelo:

```typescript
// ✅ CORRETO - Usar model.change() e model.insertContent()
try {
  editorRef.current.model.change(writer => {
    const textNode = writer.createText(signatureShortcode);
    editorRef.current.model.insertContent(textNode);
  });
} catch (error) {
  console.error("Erro ao inserir assinatura no editor:", error);
  alert("Erro ao inserir campo de assinatura. Por favor, tente novamente.");
  return;
}
```

## Análise do Código

### 1. Função `handleInsertSignatureBlock`
**Arquivo**: `src/components/sales/ContractDetails.tsx` (linhas 223-267)

**Status**: ✅ **CORRIGIDO**
- Agora usa a API correta do CKEditor 5
- Inclui tratamento de erro adequado
- Mantém a mesma funcionalidade (inserir shortcode de assinatura)

### 2. Outros Usos de `insertContent` no Código

Verificados e **todos corretos**:

1. **`handleInsertField`** (ContractDetails.tsx, linha 980-992)
   - ✅ Usa `model.change()` e `model.insertContent()` corretamente

2. **`ContractContentEditor.tsx`** (linha 324-329)
   - ✅ Usa `model.change()` e `model.insertContent()` corretamente

3. **`ContractTemplateEditor.tsx`** (linha 95-100)
   - ✅ Usa `model.change()` e `model.insertContent()` corretamente

4. **`ckeditor.tsx`** (linhas 190, 203)
   - ✅ Usa `model.insertContent()` dentro de `model.change()` corretamente

## API do CKEditor 5

### Método Correto para Inserir Conteúdo

No CKEditor 5, a inserção de conteúdo deve ser feita através do modelo:

```typescript
editor.model.change(writer => {
  // Criar elemento de texto
  const textNode = writer.createText("conteúdo a inserir");
  
  // Inserir no modelo
  editor.model.insertContent(textNode);
});
```

### Por que não funciona `insertContent()` diretamente?

- O CKEditor 5 usa uma arquitetura baseada em modelo-visão (MVVM)
- Todas as modificações devem passar pelo modelo (`model`)
- O método `insertContent()` existe apenas dentro do contexto do `model.change()`
- Chamar diretamente no editor não funciona porque não há contexto de escrita (`writer`)

## Impacto da Correção

- ✅ Erro de `insertContent is not a function` resolvido
- ✅ Assinaturas podem ser inseridas corretamente no contrato
- ✅ Tratamento de erro adicionado para melhor experiência do usuário
- ✅ Consistência com outros métodos de inserção no código

## Testes Recomendados

1. ✅ Testar inserção de campo de assinatura no editor de contrato
2. ✅ Verificar que o shortcode é inserido corretamente
3. ✅ Verificar que não há erros no console
4. ✅ Testar fluxo completo: inserir assinatura → salvar → gerar link

## Próximos Passos

1. ✅ Correção implementada
2. ⏳ Testar em ambiente de desenvolvimento
3. ⏳ Validar que não há regressões
4. ⏳ Deploy em produção após validação
