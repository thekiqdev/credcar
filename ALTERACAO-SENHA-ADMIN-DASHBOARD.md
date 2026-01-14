# Alteração de Senha no Modal de Edição do Cliente

## ✅ Problema Resolvido

**Problema**: Ao clicar em "Editar" o perfil do cliente no AdminDashboard, não aparecia a opção de trocar a senha.

**Solução**: Adicionada seção completa de "Alterar Senha" no modal de edição de cliente.

---

## 🔧 Implementação

### Estados Adicionados

```typescript
// Estados para alteração de senha do cliente
const [newClientPassword, setNewClientPassword] = useState("");
const [confirmClientPassword, setConfirmClientPassword] = useState("");
const [showNewClientPassword, setShowNewClientPassword] = useState(false);
const [showConfirmClientPassword, setShowConfirmClientPassword] = useState(false);
const [clientPasswordError, setClientPasswordError] = useState<string | null>(null);
const [clientPasswordSuccess, setClientPasswordSuccess] = useState<string | null>(null);
const [isChangingClientPassword, setIsChangingClientPassword] = useState(false);
```

### Função de Alteração de Senha

```typescript
const handleChangeClientPassword = async () => {
  // Validações:
  // - Campos preenchidos
  // - Senha mínimo 6 caracteres
  // - Senhas coincidem
  // - Atualiza senha usando clientService.updatePassword()
  // - Mostra feedback de sucesso/erro
}
```

### Seção Adicionada no Modal

A seção "Alterar Senha" foi adicionada no final do modal de edição, antes do `DialogFooter`, incluindo:

1. **Cabeçalho com ícone**
   - Ícone de Lock
   - Título "Alterar Senha"
   - Descrição explicativa

2. **Campos de Senha**
   - Campo "Nova Senha" com botão mostrar/ocultar
   - Campo "Confirmar Nova Senha" com botão mostrar/ocultar
   - Validação visual (mínimo 6 caracteres)

3. **Feedback Visual**
   - Mensagens de erro em vermelho
   - Mensagens de sucesso em verde
   - Indicador de loading durante alteração

4. **Botão de Ação**
   - Botão "Alterar Senha" com ícone
   - Desabilitado durante processamento
   - Desabilitado se campos vazios

### Imports Adicionados

```typescript
import {
  // ... outros imports
  Lock,
  EyeOff,
  AlertCircle,
} from "lucide-react";
```

---

## 📋 Funcionalidades

### Validações Implementadas

- ✅ Verifica se ambos os campos estão preenchidos
- ✅ Verifica se nova senha tem mínimo 6 caracteres
- ✅ Verifica se as senhas coincidem
- ✅ Mostra mensagens de erro claras
- ✅ Mostra mensagem de sucesso após alteração

### Segurança

- ✅ Usa `clientService.updatePassword()` que cria hash SHA-256
- ✅ Senha não é exibida em texto plano
- ✅ Botões de mostrar/ocultar senha para melhor UX

### UX/UI

- ✅ Layout responsivo (grid adaptável)
- ✅ Ícones visuais para melhor identificação
- ✅ Feedback imediato de sucesso/erro
- ✅ Loading state durante processamento
- ✅ Campos limpos após sucesso
- ✅ Estados limpos ao abrir modal

---

## 🎯 Como Usar

1. **Acessar AdminDashboard**
   - Faça login como Administrador
   - Vá para a aba "Clientes"

2. **Editar Cliente**
   - Clique no botão "Editar" (ícone de lápis) ao lado do cliente desejado
   - O modal de edição será aberto

3. **Alterar Senha**
   - Role até a seção "Alterar Senha" no final do modal
   - Preencha o campo "Nova Senha" (mínimo 6 caracteres)
   - Preencha o campo "Confirmar Nova Senha"
   - Clique em "Alterar Senha"
   - Aguarde confirmação de sucesso

4. **Salvar Outras Alterações**
   - Se necessário, edite outros campos do cliente
   - Clique em "Salvar Alterações" para salvar dados pessoais
   - A alteração de senha é independente e pode ser feita separadamente

---

## 📝 Estrutura do Modal

```
Modal de Edição de Cliente
├── Dados Pessoais
│   ├── Nome Completo
│   └── CPF/CNPJ
├── Identificação
│   ├── RG
│   ├── Data de Nascimento
│   ├── Nacionalidade
│   ├── Estado Civil
│   ├── Nome do Cônjuge
│   └── Celular do Cônjuge
├── Contato
│   ├── Email
│   └── Telefone
├── Dados Profissionais
│   ├── Empresa
│   ├── Cargo
│   └── Salário
├── Referências Pessoais
│   ├── Nome da Referência
│   ├── Telefone da Referência
│   └── Endereço da Referência
├── Endereço
│   └── Campos de endereço completos
└── Alterar Senha ⭐ NOVO
    ├── Nova Senha (com mostrar/ocultar)
    ├── Confirmar Nova Senha (com mostrar/ocultar)
    ├── Mensagens de erro/sucesso
    └── Botão "Alterar Senha"
```

---

## ✅ Checklist de Implementação

- [x] Estados adicionados para gerenciar alteração de senha
- [x] Função `handleChangeClientPassword()` implementada
- [x] Seção "Alterar Senha" adicionada no modal
- [x] Campos de senha com botões mostrar/ocultar
- [x] Validações implementadas
- [x] Feedback visual de erro/sucesso
- [x] Loading state durante alteração
- [x] Limpeza de estados ao abrir modal
- [x] Imports necessários adicionados
- [x] Sem erros de lint
- [x] Layout responsivo

---

## 🔍 Arquivos Modificados

- **`src/components/dashboard/AdminDashboard.tsx`**
  - Adicionados estados para alteração de senha
  - Adicionada função `handleChangeClientPassword()`
  - Adicionada seção "Alterar Senha" no modal
  - Adicionados imports: `Lock`, `EyeOff`, `AlertCircle`
  - Modificada função `handleEditClient()` para limpar estados

---

## 🐛 Possíveis Problemas e Soluções

### Problema: Botão "Alterar Senha" não funciona

**Soluções**:
1. Verifique se ambos os campos estão preenchidos
2. Verifique se as senhas coincidem
3. Verifique se a senha tem pelo menos 6 caracteres
4. Verifique console do navegador para erros
5. Verifique se `clientService.updatePassword()` está funcionando

### Problema: Mensagem de erro não aparece

**Solução**: Verifique se os estados `clientPasswordError` estão sendo setados corretamente na função `handleChangeClientPassword()`.

### Problema: Senha não é alterada

**Soluções**:
1. Verifique se o cliente tem ID válido
2. Verifique se a migration `migration-add-client-password.sql` foi aplicada
3. Verifique se o campo `password_hash` existe na tabela `clients`
4. Verifique console do navegador para erros de API

---

## 📊 Próximas Melhorias Sugeridas

1. **Validação de Força de Senha**
   - Indicador de força da senha
   - Requisitos visuais (maiúscula, número, caractere especial)

2. **Histórico de Alterações**
   - Log de quando a senha foi alterada
   - Quem alterou (se admin)

3. **Notificação ao Cliente**
   - Enviar email quando senha for alterada
   - Alertar sobre alteração de segurança

4. **Reset de Senha**
   - Opção para gerar senha temporária
   - Opção para resetar senha e enviar por email

---

**Data de Implementação**: Janeiro 2025  
**Status**: ✅ Completo e Funcional
