# Envio direto ao Firebase

O ESP32 envia leituras diretamente para o Realtime Database. O painel publicado no Vercel já assina as atualizações de `sensor_readings` no Firebase; o Vercel não recebe a leitura do dispositivo.

## Configuração única do Firebase

1. Em **Authentication → Sign-in method**, habilite **Email/Password**.
2. Em **Authentication → Users**, crie um usuário exclusivo para o ESP32.
3. Edite `firebase/database.rules.json`: substitua `esp32-device@example.com` pelo e-mail exato desse usuário.
4. Publique essas regras em **Realtime Database → Rules**. Elas mantêm a leitura do painel e só permitem ao usuário do sensor criar novas leituras de `bancada_esp32_01`.
5. Copie a Web API Key em **Project settings → General → Web API Key**. Essa chave identifica o projeto; a senha do usuário do dispositivo é que deve permanecer privada.

## Configuração do Arduino

1. Copie `secrets.example.h` para `secrets.h` na mesma pasta do sketch.
2. Preencha Wi-Fi, Web API Key e as credenciais do usuário criado para o ESP32.
3. Abra `esp32c3-simulacao.ino` na Arduino IDE e envie para a placa.
4. No Monitor Serial, confirme `Sensor autenticado no Firebase.` e `Leitura gravada no Firebase.`

`secrets.h` está ignorado pelo Git. Não publique a senha do Wi-Fi nem a senha do usuário do dispositivo. Para o site, a regra de leitura continua pública como no protótipo atual; use autenticação no painel antes de armazenar dados que não devam ser públicos.

O sketch usa `setInsecure()` apenas para facilitar o protótipo. Antes de uso real, configure a validação do certificado TLS do servidor.
