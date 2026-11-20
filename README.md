# Duo Colab Arquitetura · site e portal do cliente

- **Site institucional**: `public/site.html` (servido na raiz `/`) e imagens em `public/img/`.
- **Portal do cliente**: `/portal` — login por link no e-mail (Supabase Auth); cada cliente vê só os próprios projetos.
- **Painel da equipe**: `/admin` — cadastro e atualização dos projetos; `/admin/equipe` define quem é da equipe.
- **Banco de dados**: Supabase (via Vercel Marketplace). Esquema e permissões em `supabase/schema.sql`.

Cada envio para a branch `main` publica o site automaticamente na Vercel.

## Rodar localmente
```bash
npm install
vercel env pull .env.local
npm run dev
```
