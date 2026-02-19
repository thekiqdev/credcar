# Plano: QR Code de Pagamento e Geração ASAAS sob Demanda

## Objetivo
Ao clicar em "Visualizar fatura", exibir o QR Code de pagamento PIX do ASAAS. Se a fatura ainda não tiver sido gerada no ASAAS (faturas antigas ou falha anterior), criar a cobrança no ASAAS nesse momento e depois exibir o QR Code.

---

## Contexto Atual

### Dados armazenados
- **Tabela `invoices`**: `invoice_code` (ID no ASAAS), `payment_link_pix`, `payment_link_boleto`.
- **ASAAS**: ao criar cobrança PIX, a API retorna `pixQrCode` (string PIX “copia e cola”) e `bankSlipUrl` (link do boleto). O upload-server já persiste isso em `payment_link_pix` e `payment_link_boleto`.

### Onde a criação no ASAAS acontece hoje
- **upload-server.js**: `createInvoiceInAsaasInline(invoice)` — cria cobrança no ASAAS e atualiza a fatura local com `invoice_code`, `payment_link_pix`, `payment_link_boleto`.
- **Frontend**: `asaas-invoice.service.ts` — `createInvoiceInAsaas()` usa `createPaymentLink` do asaas.service; o retorno é usado para atualizar apenas `invoice_code` no serviço atual (não persiste PIX/boleto no Supabase).
- Faturas antigas podem não ter `invoice_code` nem `payment_link_pix` (foram criadas antes da integração ou a criação no ASAAS falhou).

### Exibição atual
- Na visualização de fatura mostramos apenas os **links** “Pagar com PIX” e “Ver Boleto”, sem QR Code.
- O campo `payment_link_pix` pode ser a **string PIX “copia e cola”** (EMV) — ideal para gerar QR Code no frontend.

---

## Etapas do Plano

### Fase 1: Backend – Endpoint “garantir fatura no ASAAS”

**Objetivo:** Um endpoint que, para uma fatura local, garante que exista cobrança no ASAAS e que a fatura local tenha `invoice_code`, `payment_link_pix` e `payment_link_boleto` preenchidos.

**Arquivo:** `upload-server.js` (ou módulo de rotas de invoice).

**Endpoint sugerido:** `POST /api/invoices/:invoiceId/ensure-asaas` (ou `GET` se for idempotente e sem efeitos colaterais além de “criar se não existir”).

**Lógica:**
1. Receber `invoiceId` (ID da fatura no banco).
2. Buscar a fatura no Supabase (com `contract_id` e dados necessários para o ASAAS).
3. **Se** a fatura já tem `invoice_code` (e opcionalmente `payment_link_pix`):
   - Retornar sucesso e os dados atuais da fatura (incluindo `payment_link_pix`, `payment_link_boleto`).
4. **Senão:**
   - Chamar a lógica existente de criação no ASAAS (ex.: `createInvoiceInAsaasInline(invoice)`).
   - Se sucesso: atualizar a fatura no banco com os dados retornados pelo ASAAS; responder com a fatura atualizada.
   - Se erro: responder com status de erro e mensagem amigável (ex.: “Cliente sem cadastro no ASAAS”, “Falha ao criar cobrança”).

**Resposta de sucesso (exemplo):**
```json
{
  "success": true,
  "invoice": { "id", "invoice_code", "payment_link_pix", "payment_link_boleto", ... }
}
```

**Resposta de erro:**
```json
{
  "success": false,
  "error": "mensagem",
  "code": "optional_code"
}
```

**Segurança:** Restringir o endpoint a usuários autenticados (admin ou cliente dono do contrato) ou a um token de serviço, para evitar que qualquer pessoa force criação de cobranças para qualquer fatura.

**Tarefas:**
- [ ] Implementar `POST /api/invoices/:invoiceId/ensure-asaas`.
- [ ] Reutilizar `createInvoiceInAsaasInline` (ou equivalente) e garantir que a fatura seja atualizada com `payment_link_pix` e `payment_link_boleto`.
- [ ] Tratar erros (cliente sem ASAAS, ASAAS indisponível, fatura já paga, etc.) com mensagens claras.
- [ ] (Opcional) Adicionar um mínimo de autorização (ex.: validar que o usuário pode ver essa fatura).

---

### Fase 2: Frontend – Chamar “ensure-asaas” ao abrir a visualização

**Objetivo:** Ao abrir o modal/página de visualização de fatura, garantir que a fatura esteja no ASAAS e que tenhamos PIX/boleto antes de mostrar o QR Code.

**Onde:** Onde a fatura é carregada para visualização:
- **Admin:** ao abrir o modal de fatura no AdminDashboard (após `handleViewInvoice`).
- **Cliente:** ao abrir o modal de fatura no ClientDashboard (após `handleViewInvoice`).
- **Página pública:** em `InvoiceViewOnly`, ao carregar a fatura por ID.

**Fluxo sugerido:**
1. Carregar a fatura (como hoje: `invoiceService.getById` ou dados já em contexto).
2. **Se** a fatura não tem `payment_link_pix` (e opcionalmente não tem `invoice_code`):
   - Chamar `POST /api/invoices/:invoiceId/ensure-asaas` (usando a URL base do upload-server configurada no projeto).
   - Enquanto aguarda: mostrar estado de “Preparando pagamento…” (loading).
   - Se sucesso: atualizar o estado da fatura com a resposta (incluindo `payment_link_pix` e `payment_link_boleto`).
   - Se erro: mostrar mensagem amigável (ex.: “Não foi possível gerar o pagamento no momento. Tente mais tarde ou use o link de pagamento enviado por e-mail.”).
3. **Se** a fatura já tem `payment_link_pix` (e possivelmente `invoice_code`):
   - Seguir direto para exibir o QR Code e os links.

**Serviço no frontend:**
- Criar função `ensureInvoiceInAsaas(invoiceId: string): Promise<Invoice>` que chama o endpoint e devolve a fatura atualizada (ou lança em caso de erro).
- Configurar a URL base do upload-server (variável de ambiente ou config) para montar a URL do `/api/invoices/:id/ensure-asaas`.

**Tarefas:**
- [ ] Criar `ensureInvoiceInAsaas` (ex.: em `src/lib/supabase.ts` ou `src/lib/invoice-asaas.client.ts`).
- [ ] No AdminDashboard: ao abrir o modal de fatura, se faltar PIX/ASAAS, chamar `ensureInvoiceInAsaas` e atualizar `selectedInvoiceForView`.
- [ ] No ClientDashboard: mesma lógica ao abrir o modal.
- [ ] Em InvoiceViewOnly: ao carregar a fatura, se faltar PIX/ASAAS, chamar `ensureInvoiceInAsaas` e atualizar o estado da fatura.
- [ ] UI de loading (“Preparando pagamento…”) e tratamento de erro com mensagem clara.

---

### Fase 3: Exibir o QR Code de pagamento PIX

**Objetivo:** Na tela de visualização de fatura, exibir o QR Code gerado a partir da string PIX “copia e cola” quando existir.

**Comportamento esperado:**
- Se `payment_link_pix` existir e for uma **string PIX** (copia e cola, ex.: começa com `00020` ou tem formato EMV):
  - Gerar e exibir um QR Code 2D a partir dessa string.
  - Exibir também o texto “Código PIX copia e cola” e um campo (readonly) ou botão “Copiar” para a mesma string.
- Se `payment_link_pix` for uma **URL** (link da página de pagamento ASAAS):
  - Manter o botão “Pagar com PIX” (abre a URL) e, se a API do ASAAS permitir, opcionalmente exibir QR Code via iframe ou imagem retornada por outro endpoint (caso queira incluir isso depois).
- Se não houver `payment_link_pix` após o “ensure-asaas”:
  - Não mostrar bloco de QR Code; manter apenas mensagem de que o pagamento não está disponível no momento.

**Implementação técnica:**
- **Biblioteca:** Usar uma lib que gere QR Code a partir de string (ex.: `qrcode.react` ou `qrcode` + canvas). Exemplo: `<QRCodeSVG value={payment_link_pix} />` ou `qrcode.toCanvas`.
- **Componente:** Criar um componente reutilizável, ex.: `PixQrCodeDisplay.tsx`, que recebe `pixCopiaECola: string` e opcionalmente `onCopy`, e renderiza o QR e o botão “Copiar”.
- **Onde usar:** Dentro de `InvoiceView.tsx` (e onde mais a fatura for exibida), na seção de “Links de pagamento”:
  - Se houver `payment_link_pix` e for string PIX (heurística: tamanho > 50 e não começa com `http`), mostrar `<PixQrCodeDisplay pixCopiaECola={payment_link_pix} />`.
  - Manter os botões “Pagar com PIX” (se for URL) e “Ver Boleto” como hoje.

**Tarefas:**
- [ ] Adicionar dependência (ex.: `qrcode.react` ou `qrcode`).
- [ ] Criar componente `PixQrCodeDisplay` (QR + copia e cola + botão Copiar).
- [ ] Em `InvoiceView`, detectar se `payment_link_pix` é string PIX; se sim, exibir o componente de QR Code acima ou ao lado dos botões.
- [ ] (Opcional) Ajustar layout para impressão (esconder ou simplificar QR na impressão, conforme regra de negócio).

---

### Fase 4: Ajustes e regras de negócio

**Faturas já pagas**
- Se a fatura já estiver paga (`status === 'paid'` ou `status === 'Pago'`), não chamar “ensure-asaas” e não exibir QR Code de pagamento; apenas mostrar “Fatura paga” e dados do pagamento.

**Permissões**
- Admin: pode visualizar qualquer fatura e disparar “ensure-asaas” para qualquer fatura.
- Cliente: só pode visualizar e garantir ASAAS para faturas dos próprios contratos (já garantido se a API de fatura for filtrada por cliente).
- Página pública (`/invoice/:id`): definir se o link é “aberto” (qualquer um com o link) ou exige login; em qualquer caso, o endpoint `ensure-asaas` pode ser chamado apenas para aquele `invoiceId` e o backend pode validar se o token/sessão (se houver) corresponde ao cliente da fatura.

**Erros comuns**
- Cliente sem `asaas_customer_id`: mensagem “Cadastro de pagamento não disponível para este cliente. Entre em contato com o suporte.”
- ASAAS fora do ar ou timeout: “Pagamento temporariamente indisponível. Tente novamente em alguns minutos.”
- Fatura vencida e cancelada no ASAAS: tratar conforme política (não criar nova cobrança ou criar com nova data; documentar no plano).

**Tarefas:**
- [ ] Não chamar ensure-asaas quando fatura já está paga.
- [ ] Revisar permissões do endpoint no backend (admin e cliente dono).
- [ ] Mensagens de erro mapeadas por código ou tipo retornado pelo backend.
- [ ] (Opcional) Log ou métrica de “ensure-asaas” para análise (quantas faturas antigas foram geradas sob demanda).

---

## Ordem sugerida de implementação

1. **Fase 1** – Backend: endpoint `ensure-asaas` e testes com uma fatura sem `invoice_code`.
2. **Fase 2** – Frontend: integração do endpoint ao abrir a visualização (Admin, Cliente, InvoiceViewOnly) e estados de loading/erro.
3. **Fase 3** – Componente de QR Code e exibição na tela de fatura.
4. **Fase 4** – Regras (fatura paga, permissões, mensagens) e ajustes finais.

---

## Resumo de arquivos a criar/alterar

| Item | Arquivo / local | Ação |
|------|----------------------|------|
| Endpoint ensure-asaas | `upload-server.js` | Criar rota `POST /api/invoices/:invoiceId/ensure-asaas` e reutilizar criação ASAAS + atualização da fatura. |
| Cliente HTTP ensure | `src/lib/` (ex.: `invoice-asaas.client.ts` ou em `supabase.ts`) | Função `ensureInvoiceInAsaas(invoiceId)`. |
| Chamada ao ensure | AdminDashboard, ClientDashboard, InvoiceViewOnly | Ao abrir fatura, se faltar PIX/ASAAS, chamar ensure e atualizar estado. |
| Componente QR | `src/components/sales/PixQrCodeDisplay.tsx` (ou em `ui/`) | Novo componente com QR + copia e cola. |
| Uso do QR | `InvoiceView.tsx` | Incluir `PixQrCodeDisplay` quando `payment_link_pix` for string PIX. |
| Dependência | `package.json` | Adicionar lib de QR Code (ex.: `qrcode.react`). |

---

## Checklist final (para marcar ao concluir)

- [ ] **Fase 1:** Endpoint ensure-asaas implementado e testado.
- [ ] **Fase 2:** Frontend chama ensure ao abrir fatura e trata loading/erro.
- [ ] **Fase 3:** QR Code PIX exibido na visualização da fatura quando houver string PIX.
- [ ] **Fase 4:** Fatura paga não gera ASAAS; mensagens e permissões revisadas.

Quando tudo estiver implementado, basta marcar os itens acima e revisar o plano para futuras manutenções (ex.: mudança de API do ASAAS ou novo tipo de pagamento).
