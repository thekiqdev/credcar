# Correção: Notificação de Upload de Documentos Não Aparecendo

## Problema Identificado
A notificação de upload de documentos não estava aparecendo mesmo quando `documents_approved = false` na tabela `profiles`.

## Causas Identificadas

### 1. Condição de Exibição Incompleta
- **Problema**: A condição verificava apenas `documents_approved === false || documents_approved === null`, mas não considerava `undefined`
- **Localização**: `src/components/dashboard/RepresentativeDashboard.tsx` (linha 750)

### 2. Lógica Interna do DocumentNotification
- **Problema**: O componente `DocumentNotification` verificava apenas se todos os documentos individuais estavam aprovados (`getDocumentProgress() === 100`), mas não considerava o campo `documents_approved` da tabela `profiles`
- **Localização**: `src/components/dashboard/DocumentNotification.tsx` (linha 140-142)
- **Impacto**: Mesmo que `documents_approved = false` na tabela `profiles`, se todos os documentos individuais estivessem aprovados, a notificação não aparecia

### 3. Processamento de Dados do Banco
- **Problema**: A conversão de `null`/`undefined` para `false` poderia estar causando problemas de timing
- **Localização**: `src/components/dashboard/RepresentativeDashboard.tsx` (linha 213)

## Correções Implementadas

### 1. Melhorada a Condição de Exibição
**Arquivo**: `src/components/dashboard/RepresentativeDashboard.tsx`

**Alteração**:
- Adicionada verificação explícita para `undefined`
- Adicionada verificação usando `!documents_approved` como fallback
- Adicionados logs detalhados para debug

**Código**:
```typescript
const shouldShowNotification = currentUser && (
  currentUser.documents_approved === false || 
  currentUser.documents_approved === null || 
  currentUser.documents_approved === undefined ||
  !currentUser.documents_approved
);
```

### 2. Adicionada Prop `documentsApproved` ao DocumentNotification
**Arquivo**: `src/components/dashboard/DocumentNotification.tsx`

**Alteração**:
- Adicionada prop `documentsApproved` para receber o valor de `documents_approved` da tabela `profiles`
- Modificada a lógica de exibição para considerar tanto o progresso dos documentos quanto o campo `documents_approved`

**Código**:
```typescript
interface DocumentNotificationProps {
  representativeId: string;
  representativeName?: string;
  representativeCpfCnpj?: string;
  documentsApproved?: boolean | null; // NOVO
  onClose?: () => void;
}

// Lógica de exibição atualizada
const allDocumentsApproved = getDocumentProgress() === 100;
const profileDocumentsApproved = documentsApproved === true;

// Só ocultar se ambos forem true
if (profileDocumentsApproved && allDocumentsApproved) {
  return null;
}
```

### 3. Melhorado o Processamento de Dados do Banco
**Arquivo**: `src/components/dashboard/RepresentativeDashboard.tsx`

**Alteração**:
- Processamento explícito de `documents_approved` garantindo que `null`/`undefined` sejam convertidos para `false`
- Adicionados logs detalhados para debug

**Código**:
```typescript
const documentsApprovedValue = freshUser.documents_approved === true ? true : false;
const updatedUser = {
  ...user,
  ...freshUser,
  documents_approved: documentsApprovedValue,
};
```

### 4. Passagem da Prop `documentsApproved`
**Arquivo**: `src/components/dashboard/RepresentativeDashboard.tsx`

**Alteração**:
- Passando explicitamente `documentsApproved={currentUser.documents_approved}` para o componente `DocumentNotification`

## Comportamento Esperado Após Correção

### Quando `documents_approved = false`:
- ✅ A notificação aparece no topo da tela inicial
- ✅ A notificação aparece em todas as abas do dashboard
- ✅ A notificação aparece independente do status do representante
- ✅ A notificação aparece mesmo que todos os documentos individuais estejam aprovados (se o admin não tiver aprovado o representante)

### Quando `documents_approved = true`:
- ✅ A notificação não aparece
- ✅ O representante pode usar todas as funcionalidades normalmente

### Quando `documents_approved = null` ou `undefined`:
- ✅ A notificação aparece (tratado como `false`)

## Logs de Debug Adicionados

Foram adicionados logs detalhados em vários pontos para facilitar o debug:

1. **No carregamento do usuário**:
   - Valor bruto de `documents_approved` do banco
   - Valor processado após conversão
   - Status do representante

2. **Na verificação de exibição**:
   - Todas as condições verificadas
   - Resultado final da decisão de exibir ou não

3. **No componente DocumentNotification**:
   - Valor da prop `documentsApproved`
   - Progresso dos documentos individuais
   - Decisão final de exibir ou ocultar

## Testes Recomendados

1. **Teste com `documents_approved = false`**:
   - Verificar se a notificação aparece
   - Verificar logs no console
   - Verificar se aparece em todas as abas

2. **Teste com `documents_approved = null`**:
   - Verificar se a notificação aparece (deve aparecer)

3. **Teste com `documents_approved = true`**:
   - Verificar se a notificação não aparece

4. **Teste com documentos individuais aprovados mas `documents_approved = false`**:
   - Verificar se a notificação ainda aparece (deve aparecer)

## Arquivos Modificados

1. `src/components/dashboard/RepresentativeDashboard.tsx`
2. `src/components/dashboard/DocumentNotification.tsx`
