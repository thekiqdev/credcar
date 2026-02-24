# Deploy no Easypanel

## Backend (API / upload-server)

- **Dockerfile:** `Dockerfile` (padrão)
- **Porta:** 80 (ou defina `PORT` nas variáveis de ambiente)
- **Variáveis de ambiente:** Supabase, ASAAS, etc.

## Frontend (Vite/React)

- **Dockerfile:** use exatamente `Dockerfile.frontend`  
  No Easypanel, no campo **"Dockerfile"** ou **"Docker file path"**, informe: **`Dockerfile.frontend`**  
  (não use o nome do repositório nem deixe em branco)
- **Porta:** 80

### Build args do frontend

| Nome | Descrição |
|------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (ex.: `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima (anon key) do Supabase |
| **`VITE_UPLOAD_SERVER_URL`** | **URL do backend (upload-server)** quando está em outro host que o frontend. Ex.: se o frontend está em `sistema.credcarmultimarcas.com.br` e o backend em `api.credcarmultimarcas.com.br`, defina `https://api.credcarmultimarcas.com.br` (sem `/api`). Evita erro 405 ao anexar documentos e outras chamadas à API. |

Se o frontend e o backend estiverem no **mesmo domínio** (ex.: proxy em sistema que encaminha `/api` para o Node), não é necessário definir `VITE_UPLOAD_SERVER_URL`. Se o frontend for servido por Nginx estático em um host e o backend em outro, defina este build arg com a URL pública do backend.

### Variáveis de ambiente em runtime (frontend)

O container do frontend é só Nginx servindo arquivos estáticos. Não é necessário definir variáveis de ambiente em **runtime** para o serviço frontend (as que importam foram embutidas na build). Opcionalmente você pode não passar os build args e injetar config em outro momento (ex.: substituição em arquivo após a build).

Se o build falhar com `open CredCar-Finance: no such file or directory`, o caminho do Dockerfile está errado — deve ser `Dockerfile.frontend`, não o nome do repositório.

Se falhar com `Cannot find module @rollup/rollup-linux-x64-musl`, o Dockerfile.frontend já foi ajustado para usar `node:20-slim` no build (evita Alpine/musl).
