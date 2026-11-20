# Banco de dados do portal (Supabase)

1. Na Vercel, instale a integração **Supabase** neste projeto (Marketplace). Ela cria as variáveis
   `NEXT_PUBLIC_SUPABASE_URL` e a chave pública automaticamente.
2. No painel do Supabase, abra **SQL Editor**, cole o conteúdo de `schema.sql` e rode.
3. Cadastre a equipe (quem pode entrar em `/admin`):
   ```sql
   insert into equipe (email, nome) values ('email@duocolab.com.br', 'Nome');
   ```
4. Em **Authentication → URL Configuration**, coloque o endereço do site em *Site URL* e
   `https://SEU-SITE/auth/confirm` em *Redirect URLs*.
