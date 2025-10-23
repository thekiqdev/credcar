# 🧹 Guia de Limpeza de Documentos Duplicados

Este guia explica como limpar registros duplicados no banco de dados e arquivos antigos no sistema de arquivos.

## 📋 Problema Identificado

O sistema tinha múltiplos registros do mesmo documento para o mesmo representante:
- Registros antigos com `file_url` vazio
- Registros duplicados com diferentes datas de upload
- Arquivos físicos obsoletos no sistema de arquivos

## 🔧 Solução Implementada

### Correção no Código (JÁ APLICADA)
✅ O sistema agora sempre busca o registro **mais recente** por `uploaded_at`
✅ Aplicado em:
- `DocumentUploadModal.tsx`
- `DocumentUploadInline.tsx`
- `DocumentApproval.tsx`

### Limpeza do Banco de Dados (OPCIONAL)
Script SQL para remover registros duplicados mantendo apenas o mais recente.

### Limpeza de Arquivos Físicos (OPCIONAL)
Script Node.js para mover arquivos antigos para pasta de backup.

---

## 📝 PASSO 1: Análise (Recomendado)

### 1.1. Executar Script SQL de Análise

```bash
# Conectar ao banco de dados
psql -h seu-host -U seu-usuario -d seu-database

# Executar o script de análise
\i cleanup-duplicate-documents.sql
```

**O que este script faz:**
- ✅ Lista TODOS os registros duplicados
- ✅ Mostra detalhes de cada duplicata
- ✅ Calcula quantos registros serão mantidos/deletados
- ✅ NÃO deleta nada (por padrão)

**Resultado esperado:**
```sql
-- Exemplo de output:
representative_id | document_type                           | total_registros
------------------+-----------------------------------------+----------------
1999bdfd-...      | cartilha de credenciamento preenchida   | 2
```

### 1.2. Analisar Arquivos Físicos

```bash
# Executar em modo DRY RUN (simulação)
node cleanup-old-files.js
```

**O que este script faz:**
- ✅ Busca registros duplicados no banco
- ✅ Lista arquivos que seriam movidos/deletados
- ✅ Calcula estatísticas
- ✅ NÃO move/deleta nada em modo DRY_RUN

**Resultado esperado:**
```
📊 RESUMO DA LIMPEZA
==================================================
Total de registros processados: 35
Arquivos movidos para backup: 30
Registros sem arquivo: 5
Erros: 0
⚠️  MODO DRY RUN ATIVO - Nenhuma alteração foi feita!
```

---

## 🗑️ PASSO 2: Limpeza do Banco de Dados (OPCIONAL)

⚠️ **ATENÇÃO:** Esta operação é **IRREVERSÍVEL** (exceto pelo backup automático)

### 2.1. Revisar Registros que Serão Deletados

Execute primeiro o script SQL **SEM** descomentar o `DELETE` para revisar:

```sql
-- O script mostra detalhes dos registros que serão deletados:
SELECT 
  id,
  representative_id,
  document_type,
  file_url,
  status,
  uploaded_at,
  motivo_exclusao
FROM docs_to_delete
ORDER BY representative_id, document_type, uploaded_at DESC;
```

### 2.2. Criar Backup Automático

O script automaticamente cria backup em `representative_documents_backup_deleted`

### 2.3. Executar Limpeza

**Abra o arquivo:** `cleanup-duplicate-documents.sql`

**Encontre estas linhas (próximo ao final):**
```sql
-- DELETE FROM representative_documents
-- WHERE id IN (SELECT id FROM docs_to_delete);
```

**Remova os comentários:**
```sql
DELETE FROM representative_documents
WHERE id IN (SELECT id FROM docs_to_delete);
```

**Execute o script novamente:**
```bash
psql -h seu-host -U seu-usuario -d seu-database < cleanup-duplicate-documents.sql
```

### 2.4. Verificar Resultado

```sql
-- Verificar se ainda existem duplicatas
SELECT 
  representative_id,
  document_type,
  COUNT(*) as total_registros
FROM representative_documents
GROUP BY representative_id, document_type
HAVING COUNT(*) > 1;

-- Resultado esperado: Nenhuma linha (sem duplicatas)
```

---

## 🗂️ PASSO 3: Limpeza de Arquivos Físicos (OPCIONAL)

⚠️ **ATENÇÃO:** Arquivos serão movidos para `documentos_backup_deleted/`

### 3.1. Executar em Modo Real

**Abra o arquivo:** `cleanup-old-files.js`

**Encontre esta linha:**
```javascript
const DRY_RUN = true; // true = apenas simula, false = executa de verdade
```

**Altere para:**
```javascript
const DRY_RUN = false; // Modo REAL
```

**Execute o script:**
```bash
node cleanup-old-files.js
```

### 3.2. Verificar Backup

Os arquivos movidos estarão em:
```
documentos_backup_deleted/
  └── 44444444444444/
      └── empresa/
          └── cartilha_credenciamento_empresa/
              ├── PRO_1761231624951_1761231624951.pdf
              ├── PRO_1761231635095_1761231635095.pdf
              └── ...
```

### 3.3. Testar o Sistema

1. Faça login como representante
2. Vá em "Minha Conta"
3. Verifique se todos os documentos aparecem corretamente
4. Teste o upload de um novo documento

### 3.4. Deletar Backup (Se tudo estiver OK)

**⚠️ Aguarde alguns dias antes de deletar o backup!**

```bash
# Após confirmar que tudo funciona, delete o backup:
rm -rf documentos_backup_deleted/
```

---

## 📊 Estatísticas Esperadas

### Antes da Limpeza
```
Total de registros: ~850
Registros duplicados: ~200
Arquivos duplicados: ~150
```

### Depois da Limpeza
```
Total de registros: ~650
Registros duplicados: 0
Espaço liberado: ~50-100MB
```

---

## 🆘 Recuperação de Emergência

### Restaurar Registros do Banco

```sql
-- Se algo der errado, restaurar do backup:
INSERT INTO representative_documents 
  (id, representative_id, document_type, file_url, status, uploaded_at)
SELECT 
  id, representative_id, document_type, file_url, status, uploaded_at
FROM representative_documents_backup_deleted
WHERE id = 123; -- ID específico que deseja restaurar
```

### Restaurar Arquivos Físicos

```bash
# Mover arquivos de volta do backup:
cp -r documentos_backup_deleted/* documentos/
```

---

## ✅ Checklist Final

- [ ] Executei o script SQL em modo análise
- [ ] Revisei os registros que serão deletados
- [ ] Backup automático foi criado
- [ ] Executei o script Node.js em modo DRY_RUN
- [ ] Revisei os arquivos que serão movidos
- [ ] Executei a limpeza do banco (OPCIONAL)
- [ ] Executei a limpeza de arquivos (OPCIONAL)
- [ ] Testei o sistema após limpeza
- [ ] Sistema funcionando corretamente
- [ ] Aguardei alguns dias
- [ ] Deletei o backup (OPCIONAL)

---

## 📞 Suporte

Se tiver problemas:
1. **NÃO** delete o backup
2. Reverta as alterações usando os comandos de recuperação
3. Entre em contato para ajuda

---

## 🎯 Resultado Esperado

Após executar todos os passos:
- ✅ Sem registros duplicados no banco
- ✅ Sem arquivos duplicados no sistema
- ✅ Sistema funcionando perfeitamente
- ✅ Banco de dados otimizado
- ✅ Espaço em disco liberado

