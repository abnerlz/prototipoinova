# Configurar o Firebase Realtime Database

O modo real lê `/sensor_readings` em tempo real pelo SDK Web do Firebase. O ESP32 envia novas leituras para `POST /api/sensores`; a rota valida `SENSOR_API_KEY` e grava com o Firebase Admin SDK. As rotas de consulta usam a mesma conta de serviço no servidor.

## Variáveis de ambiente

Configure estas variáveis no `.env.local` durante o desenvolvimento e no provedor de deploy:

| Variável | Onde é usada | Valor |
| --- | --- | --- |
| `VITE_FIREBASE_DATABASE_URL` | Navegador | URL do Realtime Database, por exemplo `https://proterra-sensors-default-rtdb.firebaseio.com/` |
| `FIREBASE_DATABASE_URL` | Servidor | A mesma URL do Realtime Database |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Servidor | JSON da conta de serviço do Firebase, em uma única linha |
| `SENSOR_API_KEY` | Servidor e ESP32 | Segredo compartilhado usado no header `x-api-key` |

Não coloque `FIREBASE_SERVICE_ACCOUNT_JSON` nem `SENSOR_API_KEY` em variáveis `VITE_*`, no código do ESP32 em um repositório público ou em mensagens. Em ambientes Google que fornecem Application Default Credentials, o Admin SDK pode usar a credencial do ambiente sem `FIREBASE_SERVICE_ACCOUNT_JSON`.

## Regras do Realtime Database

O app precisa permitir leitura pública dos registros de sensores, mas não gravação pública. As regras versionadas em `firebase/database.rules.json` aplicam essa configuração e indexam `sensor_id`. Publique-as com o Firebase CLI:

```sh
firebase deploy --only database
```

As gravações do servidor usam o Admin SDK e não dependem de liberar escrita nas regras do banco. Configure credenciais administrativas apenas no ambiente do servidor.

## Formato dos dados

Cada leitura fica como um filho de `/sensor_readings`, criado com uma chave `push` do Firebase:

```json
{
  "sensor_id": "bancada_esp32_01",
  "umidade_solo": 55,
  "inclinacao": 1.2,
  "vibracao": 0.1,
  "chuva": 0,
  "created_at": "2026-11-04T12:00:00.000Z"
}
```

Leituras novas devem incluir `created_at` em ISO 8601. Para dados antigos sem esse campo, o painel recupera o horário de criação da chave push do Firebase.

## Diagnóstico

- **Banco conectado**: o navegador conseguiu consultar o caminho `/sensor_readings`.
- **Banco sem dados**: a conexão funcionou, mas ainda não há leituras para `bancada_esp32_01`.
- **Erro no banco**: confira URL, regras públicas de leitura e índice `sensor_id`.
- **Recepção de sensores não configurada**: configure `SENSOR_API_KEY` no servidor.
- **Banco não configurado para receber leituras**: confira `FIREBASE_DATABASE_URL` e as credenciais do Admin SDK.
