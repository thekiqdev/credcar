# CredCar

Sistema de gestão de contratos, representantes, clientes e faturas.

## Tecnologias

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend / dados:** Supabase (auth, banco, storage)
- **Upload de documentos:** Node.js (Express + Multer)

## Pré-requisitos

- Node.js 18+
- npm ou yarn

## Configuração

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Crie um arquivo `.env` na raiz com as variáveis do Supabase (e demais que o projeto exigir). O arquivo `.env` não deve ser commitado.

## Desenvolvimento

```bash
# Aplicação web
npm run dev

# Servidor de upload de documentos (em outro terminal, se necessário)
npm run server
```

## Build para produção

```bash
npm run build
```

A saída fica em `dist/`. Para preview local:

```bash
npm run preview
```

## Docker

- **Frontend:** use `Dockerfile.frontend` para build da aplicação web.
- **Imagem geral:** use `Dockerfile` conforme sua pipeline de deploy.

## Versão

Consulte a tag ou o branch de release (ex.: `deploy-v2.9.0.7`) para a versão entregue.
