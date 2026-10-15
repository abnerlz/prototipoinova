# Configurar a conexão com o banco

O site consulta `sensor_readings` com a chave pública do Supabase. A tabela já permite leitura pública pela política RLS da migração em `supabase/migrations`. A gravação do ESP32 usa uma rota do servidor e precisa de duas chaves privadas.

## No Vercel

Em **Settings → Environment Variables**, configure estas variáveis para o ambiente publicado:

| Variável | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | endereço do projeto Supabase usado pelo site |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave pública usada pelo navegador |
| `SUPABASE_URL` | endereço do projeto usado pelas rotas do servidor |
| `SUPABASE_PUBLISHABLE_KEY` | chave pública usada pelas consultas da API |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta usada apenas pelo servidor para gravar leituras |
| `SENSOR_API_KEY` | segredo compartilhado entre o ESP32 e a rota de gravação |

Depois de salvar as variáveis, faça um novo deploy. Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` ou `SENSOR_API_KEY` em variáveis com prefixo `VITE_`, no código do ESP32 em repositório público, nem em mensagens ou capturas de tela.

## No computador

Copie `.env.example` para `.env.local` e preencha com as chaves do projeto. Use valores inventados apenas para entender o formato; eles não conectam ao banco.

## O que cada mensagem significa

- **Banco conectado**: o site conseguiu ler a tabela.
- **Banco sem dados**: conseguiu falar com o Supabase, mas ainda não encontrou uma leitura do `SENSOR-001`.
- **Erro no banco**: endereço, chave pública, política de leitura, rede ou tabela precisam ser conferidos.
- **Recepção de sensores não configurada**: falta `SENSOR_API_KEY` no servidor.
- **Banco não configurado para receber leituras**: falta `SUPABASE_SERVICE_ROLE_KEY` ou a configuração de gravação está incorreta.

As chaves privadas não podem ser criadas com segurança pelo código. Elas precisam ser cadastradas no painel do Supabase/Vercel e também no equipamento responsável por enviar as leituras.
