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

### Build args do frontend (opcional)

Para o bundle do Vite incluir a URL do Supabase na build, defina no Easypanel em **Build arguments**:

| Nome | Descrição |
|------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (ex.: `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima (anon key) do Supabase |

Os mesmos valores do backend. Sem eles, o build roda mas o app pode não conectar ao Supabase até que sejam definidos de outra forma.

### Variáveis de ambiente em runtime (frontend)

O container do frontend é só Nginx servindo arquivos estáticos. Não é necessário definir variáveis de ambiente em **runtime** para o serviço frontend (as que importam foram embutidas na build). Opcionalmente você pode não passar os build args e injetar config em outro momento (ex.: substituição em arquivo após a build).

Se o build falhar com `open CredCar-Finance: no such file or directory`, o caminho do Dockerfile está errado — deve ser `Dockerfile.frontend`, não o nome do repositório.

Se falhar com `Cannot find module @rollup/rollup-linux-x64-musl`, o Dockerfile.frontend já foi ajustado para usar `node:20-slim` no build (evita Alpine/musl).
