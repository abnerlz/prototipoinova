# Acesso e dados operacionais

## Antes de habilitar o acesso

1. No Firebase Console, ative **Authentication → Sign-in method → Email/Password** e adicione o domínio do site em **Authorized domains**.
2. Configure `VITE_FIREBASE_API_KEY` e `VITE_FIREBASE_AUTH_DOMAIN` no ambiente local e na Vercel. A chave web é configuração pública do Firebase; nunca coloque a chave de serviço em uma variável `VITE_`.
3. Mantenha `FIREBASE_SERVICE_ACCOUNT_JSON` apenas como segredo de servidor na Vercel e em um ambiente local protegido. Ela é necessária para criar contas e validar tokens no servidor.
4. Publique `firebase/database.rules.json` no Realtime Database. Sem essas regras, a leitura histórica e as gravações protegidas podem falhar.

## Primeiro administrador

O e-mail inicial padrão do script é `adrielfreitas367@gmail.com`. O script não contém nem imprime senha. Em uma máquina confiável, defina `INITIAL_ADMIN_PASSWORD` por uma sessão segura com uma senha temporária forte de pelo menos 14 caracteres e execute `npm run bootstrap:admin`. O script cria a conta, se ainda não existir, e concede os papéis de operador e administrador pelo Firebase Admin SDK.

A conta começa com o e-mail não confirmado. Ao tentar entrar, o site pede ao Firebase que envie a mensagem de verificação e encerra a sessão. Depois de confirmar pelo link recebido, entre novamente.

## Contas de operação

Um administrador com e-mail confirmado pode abrir **Administração** e criar contas de operador ou administrador. A rota de servidor valida o token Firebase e o papel `admin`; a página não concede privilégios por conta própria. Contas novas também precisam confirmar o e-mail antes de escrever no banco. Envie a senha temporária por um canal privado e recomende que a pessoa a troque após o primeiro acesso.

Operadores podem revisar leituras, registrar inspeções de sensor e cadastrar regiões no Recife. Essas ações são gravadas em `reading_reviews`, `sensor_reviews` e `custom_regions`. Alertas são gravados em `alerts`; a tela de ocorrências é derivada desse histórico. Leituras marcadas como simulação ficam somente no navegador.

As leituras de sensor continuam públicas para o painel e a API existentes. Os novos registros operacionais também têm leitura pública e escrita apenas para contas verificadas com papel de operador ou administrador. Não inclua dados pessoais nas descrições ou observações.

Novas regiões passam a aparecer nos filtros e mapas, mas não ganham sensores automaticamente. O vínculo de novos dispositivos precisa ser configurado separadamente.
