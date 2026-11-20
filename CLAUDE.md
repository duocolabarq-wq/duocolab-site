# Duo Colab · site e área do cliente

Projeto do escritório Duo Colab Arquitetura (Recife). Comunicação com a equipe sempre em português.

## Estrutura
- **Site institucional**: `public/site.html` (HTML estático servido em `/` por um rewrite em `next.config.ts`). Imagens em `public/img/`.
- **Portal do cliente**: `src/app/portal/` — login por link mágico no e-mail (Supabase Auth). Cada cliente vê só os projetos em que o e-mail dele está na tabela `acessos`.
  - `/portal` = login ou lista de projetos; `/portal/[id]` = página do projeto.
- **Painel da equipe**: `src/app/admin/` — `/admin` (projetos), `/admin/[id]` (editar seções), `/admin/equipe` (quem é da equipe).
- **Banco**: Supabase (instalado pelo Vercel Marketplace). Esquema, funções e regras de acesso (RLS) em `supabase/schema.sql`.
  - Tabelas: `projetos`, `acessos`, `equipe`, `etapas`, `marcos`, `decisoes`, `documentos`, `reunioes`, `links`, `compras`, `ambientes`, `pessoas_projeto`.
  - O cliente só altera decisões pela função `responder_decisao`. A equipe (`sou_equipe()`) edita tudo.
  - Imagens no bucket público `projetos` do Supabase Storage.
- Helpers: `src/lib/supabase/{server,client,admin,env}.ts`, tipos em `src/lib/tipos.ts`, carregamento em `src/lib/dados.ts`.
- Next.js 16 (App Router, `src/proxy.ts` no lugar do middleware), React 19, sem Tailwind: estilos em `src/app/globals.css`, `src/app/portal/portal.css` e `src/app/admin/admin.css`.

## Identidade visual
Creme `#f2eee8`, tinta `#1f1c18`, verde-oliva `#3f4a37`, sálvia `#8f9a78`, terra `#8a5529`, rosa `#b86a5e`.
Títulos em Cormorant Garamond; textos e rótulos (`.rot`, caixa alta espaçada) em Sora.

## Regras
- Nunca versionar dados reais de clientes, chaves ou `.env*`. Dados de clientes vivem só no banco.
- Mudanças no banco: atualizar `supabase/schema.sql` de forma idempotente (`if not exists`, `create or replace`) e avisar a equipe que precisa rodar o SQL no Supabase.
- Rodar `npm run build` antes de enviar.

## Publicação
- Cada envio para a branch `main` publica automaticamente na Vercel (projeto `duocolab-site`, conta `duocolabarq-9201`).
- Site no ar: https://duocolab-site.vercel.app
- Plano gratuito (Hobby) da Vercel: envios feitos por um usuário do GitHub diferente do dono podem não publicar sozinhos.
  Se um envio do GitHub da equipe não aparecer na Vercel, trabalhar numa branch, abrir um pull request e pedir para o dono
  (duocolabarq-wq) aprovar e juntar na `main`.
