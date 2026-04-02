# API

Backend Express/TypeScript da integração com Tiendanube/Nuvemshop.

## Ambiente

Copie `api/.env.example` para `api/.env` e preencha:

- credenciais da aplicação (`CLIENT_ID`, `CLIENT_SECRET`, `CLIENT_EMAIL`)
- URLs da Tiendanube/Nuvemshop
- conexão do MongoDB Atlas
- `FRONTEND_URL` para o redirecionamento após instalação

## Scripts

- `npm run dev`
- `npm run start:dev`
- `npm run typecheck`

## Observações

- O backend carrega `api/.env` independentemente do diretório em que o comando for executado.
- O redirect pós-instalação usa `FRONTEND_URL`, com fallback local para `http://localhost:5173`.
