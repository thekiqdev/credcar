# Deploy no Easypanel

## Backend (API / upload-server)

- **Dockerfile:** `Dockerfile` (padrão)
- **Porta:** 80 (ou defina `PORT` nas variáveis de ambiente)
- **Variáveis de ambiente:** Supabase, ASAAS, etc.

## Frontend (Vite/React)

- **Dockerfile:** use exatamente `Dockerfile.frontend`  
  No Easypanel, no campo **"Dockerfile"** ou **"Docker file path"**, informe: **`Dockerfile.frontend`**  
  (não use o nome do repositório nem deixe em branco)
- **Build args** (opcional): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Porta:** 80

Se o build falhar com `open CredCar-Finance: no such file or directory`, o caminho do Dockerfile está errado — deve ser `Dockerfile.frontend`, não o nome do repositório.
