# UPGRADE - Sistema de Upload de Documentos para Representantes

## 📋 Visão Geral

Este documento detalha o upgrade necessário no sistema de upload de documentos para representantes, expandindo de 4 para 15 tipos de documentos obrigatórios, organizados em duas categorias: **Documentos da Empresa** e **Documentos do Sócio**.

## 🎯 Objetivo

Implementar um sistema completo de upload de documentos que permita aos representantes enviar todos os documentos necessários para completar seu cadastro, com validação, organização e controle de status adequados.

## 📊 Situação Atual vs. Nova Situação

### Sistema Atual (4 documentos)
- Certidão Negativa Civil
- Comprovante de Endereço  
- Cartão do CNPJ/CPF
- Certidão de Antecedente Criminal

### Sistema Novo (15 documentos)

#### **Documentos da Empresa (6 documentos)**
1. **Cartilha de credenciamento preenchida**
2. **Cartão CNPJ**
3. **Contrato social e última alteração** ou **Certificado de Microempreendedor Individual (MEI)**
4. **Comprovante de endereço em nome da empresa** (atualizado, últimos 3 meses)
5. **Declaração de endereço assinada** com reconhecimento de firma por autenticidade pelo titular da conta
6. **Dados bancários para recebimento das comissões**

#### **Documentos do Sócio (9 documentos)**
1. **Cartilha de credenciamento PF**
2. **Comprovante de endereço em nome da empresa/titular/sócio** (atualizado, últimos 3 meses)
3. **Certidão de antecedentes criminais**
4. **Certidão negativa cível de 1º grau** do distribuidor estadual
5. **Certidão negativa criminal de 1º grau** do distribuidor estadual
6. **Foto de identidade ou CNH (frente)**
7. **Foto de identidade ou CNH (verso)**

## 🏗️ Arquitetura Atual Analisada

### Componentes Principais
- `DocumentUploadModal.tsx` - Modal principal de upload
- `DocumentUploadModalLocal.tsx` - Versão local do modal
- `DocumentUpload.tsx` - Componente de upload na autenticação
- `upload-server.js` - Servidor de upload (porta 3001)
- `documentUpload.ts` - API de upload para VPS
- `upload.service.ts` - Serviço de upload
- `vps-upload.service.ts` - Serviço específico para VPS

### Estrutura de Pastas Atual
```
documentos/
├── {cpf_cnpj}/
│   ├── certidao_negativa_civil/
│   ├── comprovante_endereco/
│   ├── cartao_cnpj_cpf/
│   └── certidao_antecedente_criminal/
```

### Banco de Dados
- Tabela: `representative_documents` (já existente)
- **Estrutura Atual**:
  - `id`: number (PK, auto-increment)
  - `representative_id`: string (FK para profiles.id)
  - `document_type`: string (tipo do documento)
  - `file_url`: string (URL do arquivo)
  - `status`: enum ('Pendente' | 'Aprovado' | 'Reprovado')
  - `uploaded_at`: string | null (timestamp do upload)
- **Relacionamentos**: FK para `profiles.id`
- **Permissões**: Realtime habilitado, acesso para anon/authenticated/service_role
- **Nota**: A tabela já possui a estrutura necessária para suportar os novos tipos de documentos

### Documentos Existentes no Sistema
**Documentos Atuais (4 tipos)**:
1. **Cartão do CNPJ/CPF** - Documento oficial do CNPJ da empresa
2. **Comprovante de Endereço** - Comprovante de endereço da empresa (máximo 3 meses)
3. **Certidão de Antecedente Criminal** - Certidão negativa de antecedentes criminais do responsável
4. **Certidão Negativa Civil** - Certidão negativa de débitos civis do responsável

**Estrutura de Pastas Atual**:
```
documentos/
├── {cpf_cnpj}/
│   ├── cartao_cnpj_cpf/
│   ├── comprovante_endereco/
│   ├── certidao_antecedente_criminal/
│   └── certidao_negativa_civil/
```

**Backup Realizado**: `documentos_backup_20251007_123534`

**Nova Estrutura Criada**:
```
documentos/
├── {cpf_cnpj}/
│   ├── empresa/
│   │   ├── cartilha_credenciamento_empresa/
│   │   ├── cartao_cnpj/
│   │   ├── contrato_social/
│   │   ├── certificado_mei/
│   │   ├── comprovante_endereco_empresa/
│   │   ├── declaracao_endereco/
│   │   └── dados_bancarios/
│   └── socio/
│       ├── cartilha_credenciamento_pf/
│       ├── comprovante_endereco_socio/
│       ├── certidao_antecedentes_criminais/
│       ├── certidao_negativa_civel_1grau/
│       ├── certidao_negativa_criminal_1grau/
│       ├── foto_identidade_frente/
│       └── foto_identidade_verso/
```

**Validação da Organização**:
- ✅ **9 arquivos** organizados na categoria `empresa/`
- ✅ **12 arquivos** organizados na categoria `socio/`
- ✅ **Mapeamento correto** dos documentos existentes
- ✅ **Arquivos originais preservados** (backup mantido)
- ✅ **Estrutura hierárquica validada**

## 🔧 Implementação do Upgrade

### 1. Atualização da Interface do Usuário

#### Estrutura do Modal Atualizado
```typescript
interface DocumentFile {
  id: string;
  type: string;
  category: 'empresa' | 'socio';
  file: File | null;
  status: 'pending' | 'uploading' | 'uploaded' | 'approved' | 'rejected' | 'error';
  progress: number;
  error?: string;
  localPath?: string;
  description?: string;
  uploadOrder: number;
  isRequired: boolean;
}
```

#### Layout Proposto
```
┌─────────────────────────────────────────────────────────────┐
│                    Upload de Documentos                     │
├─────────────────────────────────────────────────────────────┤
│ 📁 DOCUMENTOS DA EMPRESA                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Cartilha de credenciamento preenchida [PENDENTE]    │ │
│ │ 2. Cartão CNPJ [PENDENTE]                              │ │
│ │ 3. Contrato social OU Certificado MEI [PENDENTE]       │ │
│ │ 4. Comprovante de endereço empresa [PENDENTE]          │ │
│ │ 5. Declaração de endereço [PENDENTE]                   │ │
│ │ 6. Dados bancários [PENDENTE]                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 👤 DOCUMENTOS DO SÓCIO                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 7. Cartilha de credenciamento PF [PENDENTE]            │ │
│ │ 8. Comprovante de endereço sócio [PENDENTE]            │ │
│ │ 9. Certidão de antecedentes criminais [PENDENTE]        │ │
│ │ 10. Certidão negativa cível 1º grau [PENDENTE]         │ │
│ │ 11. Certidão negativa criminal 1º grau [PENDENTE]      │ │
│ │ 12. Foto identidade frente [PENDENTE]                   │ │
│ │ 13. Foto identidade verso [PENDENTE]                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [ENVIAR DOCUMENTOS]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2. Atualização dos Serviços de Upload

#### Mapeamento de Tipos de Documento
```typescript
const documentTypeMap = {
  // Documentos da Empresa
  'cartilha de credenciamento preenchida': 'cartilha_credenciamento_empresa',
  'cartão cnpj': 'cartao_cnpj',
  'contrato social e última alteração': 'contrato_social',
  'certificado de microempreendedor individual (mei)': 'certificado_mei',
  'comprovante de endereço empresa': 'comprovante_endereco_empresa',
  'declaração de endereço': 'declaracao_endereco',
  'dados bancários': 'dados_bancarios',
  
  // Documentos do Sócio
  'cartilha de credenciamento pf': 'cartilha_credenciamento_pf',
  'comprovante de endereço sócio': 'comprovante_endereco_socio',
  'certidão de antecedentes criminais': 'certidao_antecedentes_criminais',
  'certidão negativa cível 1º grau': 'certidao_negativa_civel_1grau',
  'certidão negativa criminal 1º grau': 'certidao_negativa_criminal_1grau',
  'foto identidade frente': 'foto_identidade_frente',
  'foto identidade verso': 'foto_identidade_verso'
};
```

### 3. Nova Estrutura de Pastas

```
documentos/
├── {cpf_cnpj}/
│   ├── empresa/
│   │   ├── cartilha_credenciamento_empresa/
│   │   ├── cartao_cnpj/
│   │   ├── contrato_social/
│   │   ├── certificado_mei/
│   │   ├── comprovante_endereco_empresa/
│   │   ├── declaracao_endereco/
│   │   └── dados_bancarios/
│   └── socio/
│       ├── cartilha_credenciamento_pf/
│       ├── comprovante_endereco_socio/
│       ├── certidao_antecedentes_criminais/
│       ├── certidao_negativa_civel_1grau/
│       ├── certidao_negativa_criminal_1grau/
│       ├── foto_identidade_frente/
│       └── foto_identidade_verso/
```

## 📋 Cronograma de Implementação

### Fase 1: Preparação (1 dia)
- [ ] Atualizar estrutura de pastas
- [ ] Testar nova organização em ambiente de desenvolvimento

### Fase 2: Backend (2-3 dias)
- [ ] Atualizar `upload-server.js` com novos tipos
- [ ] Modificar `documentUpload.ts` para nova estrutura
- [ ] Atualizar serviços de upload
- [ ] Implementar validações específicas

### Fase 3: Frontend (3-4 dias)
- [ ] Atualizar `DocumentUploadModal.tsx`
- [ ] Implementar categorização visual
- [ ] Adicionar validações de upload
- [ ] Implementar progresso por categoria
- [ ] Testes de interface

### Fase 4: Testes e Deploy (1-2 dias)
- [ ] Testes completos do sistema
- [ ] Validação de uploads
- [ ] Deploy em produção
- [ ] Monitoramento pós-deploy

## ✅ CHECKLIST DE IMPLEMENTAÇÃO POR ETAPAS

### 🚀 ETAPA 1: PREPARAÇÃO E ESTRUTURA DE PASTAS
**Status**: ⏳ Pendente  
**Tempo Estimado**: 1 dia  
**Responsável**: Backend Developer

#### 1.1 Preparação do Ambiente
- [ ] **OK ETAPA 1.1** - Criar branch `feature/upgrade-document-upload`
- [x] **OK ETAPA 1.2** - Verificar estrutura atual da tabela `representative_documents`
- [x] **OK ETAPA 1.3** - Documentar documentos existentes no sistema
- [x] **OK ETAPA 1.4** - Backup dos documentos existentes

#### 1.2 Estrutura de Pastas
- [x] **OK ETAPA 1.5** - Criar nova estrutura de pastas `documentos/{cpf}/empresa/` e `documentos/{cpf}/socio/`
- [x] **OK ETAPA 1.6** - Migrar documentos existentes para nova estrutura
- [x] **OK ETAPA 1.7** - Testar criação de pastas para novos documentos
- [x] **OK ETAPA 1.8** - Validar organização dos arquivos por categoria

---

### 🔧 ETAPA 2: ATUALIZAÇÃO DO BACKEND
**Status**: ⏳ Pendente  
**Tempo Estimado**: 2-3 dias  
**Responsável**: Backend Developer

#### 2.1 Servidor de Upload
- [x] **OK ETAPA 2.1** - Atualizar `upload-server.js` com novos tipos de documento
- [x] **OK ETAPA 2.2** - Implementar mapeamento de tipos de documento expandido
- [x] **OK ETAPA 2.3** - Atualizar validações de arquivo por tipo
- [x] **OK ETAPA 2.4** - Implementar criação automática de pastas por categoria
- [x] **OK ETAPA 2.5** - Testar upload de cada tipo de documento

#### 2.2 API de Upload
- [x] **OK ETAPA 2.6** - Atualizar `documentUpload.ts` com nova estrutura
- [x] **OK ETAPA 2.7** - Implementar validações específicas por categoria
- [x] **OK ETAPA 2.8** - Adicionar suporte a upload em lote
- [x] **OK ETAPA 2.9** - Implementar logs detalhados de upload

#### 2.3 Serviços de Upload
- [x] **OK ETAPA 2.10** - Atualizar `upload.service.ts` com novos tipos
- [x] **OK ETAPA 2.11** - Atualizar `vps-upload.service.ts` com nova estrutura
- [x] **OK ETAPA 2.12** - Implementar validações de tamanho por tipo
- [x] **OK ETAPA 2.13** - Testar todos os serviços de upload

---

### 🎨 ETAPA 3: ATUALIZAÇÃO DO FRONTEND
**Status**: ✅ Concluída
**Tempo Estimado**: 3-4 dias
**Responsável**: Frontend Developer

#### 3.1 Componente Principal
- [x] **OK ETAPA 3.1** - Atualizar interface `DocumentFile` com novos campos
- [x] **OK ETAPA 3.2** - Modificar `DocumentUploadModal.tsx` para suportar 15 documentos
- [x] **OK ETAPA 3.3** - Implementar categorização visual (empresa/sócio)
- [x] **OK ETAPA 3.4** - Adicionar numeração sequencial dos documentos
- [x] **OK ETAPA 3.5** - Implementar layout responsivo para 15 documentos

#### 3.2 Interface do Usuário
- [x] **OK ETAPA 3.6** - Criar seções visuais separadas para empresa e sócio
- [x] **OK ETAPA 3.7** - Implementar ícones específicos por tipo de documento
- [x] **OK ETAPA 3.8** - Adicionar descrições explicativas para cada documento
- [x] **OK ETAPA 3.9** - Implementar validação visual de documentos obrigatórios
- [x] **OK ETAPA 3.10** - Criar indicadores de progresso por categoria

#### 3.3 Validações e UX
- [x] **OK ETAPA 3.11** - Implementar validações específicas por tipo de arquivo
- [x] **OK ETAPA 3.12** - Adicionar preview de documentos enviados
- [x] **OK ETAPA 3.13** - Implementar mensagens de erro específicas
- [x] **OK ETAPA 3.14** - Criar sistema de ajuda contextual
- [x] **OK ETAPA 3.15** - Testar interface em diferentes dispositivos

#### 3.4 Componentes Auxiliares
- [x] **OK ETAPA 3.16** - Atualizar `DocumentUploadModalLocal.tsx` se necessário
- [x] **OK ETAPA 3.17** - Modificar `DocumentUpload.tsx` para nova estrutura
- [x] **OK ETAPA 3.18** - Atualizar componentes de aprovação de documentos
- [x] **OK ETAPA 3.19** - Implementar notificações de progresso
- [x] **OK ETAPA 3.20** - Atualizar painel administrativo com 15 tipos de documentos
- [x] **OK ETAPA 3.21** - Corrigir erro de salvamento no banco (filePath/directory)
- [x] **OK ETAPA 3.22** - Otimizar performance do modal (eliminar piscar durante upload)
- [x] **OK ETAPA 3.23** - Remover completamente atualizações visuais durante upload
- [x] **OK ETAPA 3.24** - Corrigir problema de documentos vazios no servidor
- [x] **OK ETAPA 3.25** - Corrigir criação múltipla de registros (UPDATE em vez de INSERT)
- [x] **OK ETAPA 3.26** - Corrigir função createRequiredDocuments com nomes antigos
- [x] **OK ETAPA 3.27** - Remover polling automático do DocumentNotification (30s)
- [x] **OK ETAPA 3.28** - Otimizar chamadas de loadDocumentStatus (dupla chamada)
- [x] **OK ETAPA 3.29** - Adicionar logs para debug de re-renders

---

### 🧪 ETAPA 4: TESTES E VALIDAÇÃO
**Status**: ⏳ Pendente  
**Tempo Estimado**: 1-2 dias  
**Responsável**: QA/Desenvolvedor

#### 4.1 Testes Funcionais
- [ ] **OK ETAPA 4.1** - Testar upload de todos os 15 tipos de documento
- [ ] **OK ETAPA 4.2** - Validar criação correta de pastas por categoria
- [ ] **OK ETAPA 4.3** - Testar validações de formato e tamanho
- [ ] **OK ETAPA 4.4** - Verificar salvamento correto no banco de dados
- [ ] **OK ETAPA 4.5** - Testar upload em lote de múltiplos documentos

#### 4.2 Testes de Interface
- [ ] **OK ETAPA 4.6** - Testar interface em diferentes navegadores
- [ ] **OK ETAPA 4.7** - Validar responsividade em mobile e tablet
- [ ] **OK ETAPA 4.8** - Testar fluxo completo de upload
- [ ] **OK ETAPA 4.9** - Verificar mensagens de erro e sucesso
- [ ] **OK ETAPA 4.10** - Testar performance com múltiplos uploads

#### 4.3 Testes de Compatibilidade
- [ ] **OK ETAPA 4.11** - Verificar compatibilidade com documentos existentes
- [ ] **OK ETAPA 4.12** - Testar migração de representantes antigos
- [ ] **OK ETAPA 4.13** - Validar funcionamento em diferentes ambientes
- [ ] **OK ETAPA 4.14** - Testar rollback em caso de problemas

---

### 🚀 ETAPA 5: DEPLOY E MONITORAMENTO
**Status**: ⏳ Pendente  
**Tempo Estimado**: 1 dia  
**Responsável**: DevOps/Desenvolvedor

#### 5.1 Preparação para Deploy
- [ ] **OK ETAPA 5.1** - Criar script de deploy automatizado
- [ ] **OK ETAPA 5.2** - Preparar rollback plan em caso de problemas
- [ ] **OK ETAPA 5.3** - Configurar monitoramento de logs
- [ ] **OK ETAPA 5.4** - Preparar comunicação para usuários

#### 5.2 Deploy em Produção
- [ ] **OK ETAPA 5.5** - Executar migração do banco em produção
- [ ] **OK ETAPA 5.6** - Deploy do código atualizado
- [ ] **OK ETAPA 5.7** - Verificar funcionamento dos serviços
- [ ] **OK ETAPA 5.8** - Testar upload de documento em produção
- [ ] **OK ETAPA 5.9** - Validar criação de pastas em produção

#### 5.3 Pós-Deploy
- [ ] **OK ETAPA 5.10** - Monitorar logs por 24 horas
- [ ] **OK ETAPA 5.11** - Verificar métricas de performance
- [ ] **OK ETAPA 5.12** - Coletar feedback dos usuários
- [ ] **OK ETAPA 5.13** - Documentar lições aprendidas
- [ ] **OK ETAPA 5.14** - Atualizar documentação técnica

---

### 📊 ETAPA 5: VALIDAÇÃO E OTIMIZAÇÃO
**Status**: ⏳ Pendente  
**Tempo Estimado**: 1-2 dias  
**Responsável**: Equipe Completa

#### 5.1 Métricas de Sucesso
- [ ] **OK ETAPA 5.1** - Medir taxa de sucesso de uploads (meta: >98%)
- [ ] **OK ETAPA 5.2** - Verificar tempo médio de upload (meta: <30s por documento)
- [ ] **OK ETAPA 5.3** - Avaliar satisfação do usuário (meta: >4.5/5)
- [ ] **OK ETAPA 5.4** - Monitorar taxa de erro (meta: <2%)
- [ ] **OK ETAPA 5.5** - Verificar completude de cadastros (meta: 100%)

#### 5.2 Otimizações
- [ ] **OK ETAPA 5.6** - Otimizar performance baseada em métricas
- [ ] **OK ETAPA 5.7** - Ajustar validações baseado no feedback
- [ ] **OK ETAPA 5.8** - Melhorar UX baseado no uso real
- [ ] **OK ETAPA 5.9** - Implementar melhorias identificadas
- [ ] **OK ETAPA 5.10** - Documentar melhorias para futuras versões

---

## 🎯 RESUMO DO PROGRESSO

**Total de Etapas**: 5  
**Total de Tarefas**: 66  
**Progresso Geral**: 50/66 (76%)

### Status por Etapa:
- **ETAPA 1**: ✅ Concluída (8/8 tarefas)
- **ETAPA 2**: ✅ Concluída (13/13 tarefas)
- **ETAPA 3**: ✅ Concluída (30/30 tarefas)
- **ETAPA 4**: ⏳ Pendente (0/14 tarefas)
- **ETAPA 5**: ⏳ Pendente (0/10 tarefas)

### Próxima Ação:
**Iniciar ETAPA 4.1** - Testar upload de todos os 15 tipos de documento

## 🔍 Validações e Regras de Negócio

### Validações por Tipo de Documento
1. **Cartilhas**: PDF obrigatório, máximo 5MB
2. **Cartões/CNPJ**: Imagem ou PDF, máximo 2MB
3. **Contratos**: PDF obrigatório, máximo 10MB
4. **Certificados**: PDF obrigatório, máximo 3MB
5. **Comprovantes**: PDF ou imagem, máximo 2MB
6. **Declarações**: PDF obrigatório, máximo 2MB
7. **Dados bancários**: PDF obrigatório, máximo 2MB
8. **Certidões**: PDF obrigatório, máximo 3MB
9. **Fotos**: Imagem obrigatória, máximo 1MB

### Regras de Upload
- Upload sequencial por categoria
- Validação de formato antes do envio
- Compressão automática de imagens grandes
- Backup automático dos arquivos
- Log detalhado de todas as operações

## 🚨 Considerações Importantes

### Compatibilidade
- Manter compatibilidade com documentos já enviados
- Migração automática de documentos existentes
- Preservar histórico de uploads

### Performance
- Upload em lotes para múltiplos documentos
- Compressão de imagens no frontend
- Validação assíncrona de arquivos

### Segurança
- Validação rigorosa de tipos de arquivo
- Sanitização de nomes de arquivo
- Controle de acesso por representante
- Backup automático dos arquivos

### UX/UI
- Interface intuitiva com categorias visuais
- Progresso detalhado por documento
- Mensagens de erro claras
- Preview de documentos enviados

## 📊 Métricas de Sucesso

- [ ] 100% dos representantes conseguem enviar todos os documentos
- [ ] Tempo médio de upload reduzido em 30%
- [ ] Taxa de erro de upload < 2%
- [ ] Satisfação do usuário > 4.5/5
- [ ] Tempo de processamento de documentos reduzido em 50%

## 🔄 Próximos Passos

1. **Aprovação do documento** pela equipe técnica
2. **Criação do branch** `feature/upgrade-document-upload`
3. **Implementação da migração** do banco de dados
4. **Desenvolvimento incremental** das funcionalidades
5. **Testes em ambiente** de desenvolvimento
6. **Deploy em produção** com monitoramento

---

**Data de Criação**: 2025-01-06  
**Versão**: 1.0  
**Responsável**: Equipe de Desenvolvimento  
**Status**: Em Planejamento
