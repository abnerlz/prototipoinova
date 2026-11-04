#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <stdlib.h>
#include <time.h>

#include "secrets.h"

const char* SENSOR_ID = "bancada_esp32_01";
constexpr unsigned long SEND_INTERVAL_MS = 5000;

unsigned long lastSendAt = 0;
unsigned long tokenExpiresAt = 0;
String firebaseIdToken;
WiFiClientSecure secureClient;

void connectWiFi() {
  Serial.print("Conectando ao Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long timeoutAt = millis() + 20000;
  while (WiFi.status() != WL_CONNECTED && millis() < timeoutAt) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi conectado.");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nNão conectou. Vou tentar novamente no próximo ciclo.");
  }
}

bool authenticateWithFirebase(bool forceRefresh = false) {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (!forceRefresh && firebaseIdToken.length() > 0 && millis() < tokenExpiresAt) return true;

  HTTPClient https;
  const String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=") +
                     FIREBASE_WEB_API_KEY;
  if (!https.begin(secureClient, url)) {
    Serial.println("Não foi possível iniciar a autenticação do Firebase.");
    return false;
  }

  StaticJsonDocument<384> credentials;
  credentials["email"] = FIREBASE_AUTH_EMAIL;
  credentials["password"] = FIREBASE_AUTH_PASSWORD;
  credentials["returnSecureToken"] = true;
  String requestBody;
  serializeJson(credentials, requestBody);

  https.addHeader("Content-Type", "application/json");
  const int status = https.POST(requestBody);
  const String responseBody = https.getString();
  https.end();

  if (status != 200) {
    Serial.print("Falha na autenticação Firebase. HTTP ");
    Serial.println(status);
    return false;
  }

  StaticJsonDocument<2048> response;
  if (deserializeJson(response, responseBody) || !response["idToken"].is<const char*>()) {
    Serial.println("Resposta de autenticação Firebase inválida.");
    return false;
  }

  firebaseIdToken = response["idToken"].as<String>();
  const char* expiresIn = response["expiresIn"] | "3600";
  const unsigned long lifetimeSeconds = strtoul(expiresIn, nullptr, 10);
  tokenExpiresAt = millis() + (lifetimeSeconds > 300 ? lifetimeSeconds - 300 : lifetimeSeconds) * 1000UL;
  Serial.println("Sensor autenticado no Firebase.");
  return true;
}

bool makeTimestamp(String& timestamp) {
  const time_t now = time(nullptr);
  if (now < 1700000000) return false;

  struct tm utcTime;
  gmtime_r(&now, &utcTime);
  char formatted[25];
  if (strftime(formatted, sizeof(formatted), "%Y-%m-%dT%H:%M:%SZ", &utcTime) == 0) return false;
  timestamp = formatted;
  return true;
}

int writeReading(const String& idToken, const String& readingId, const String& body) {
  HTTPClient https;
  const String url = String(FIREBASE_DATABASE_URL) + "/sensor_readings/" + readingId + ".json?auth=" + idToken;
  if (!https.begin(secureClient, url)) return -1;

  https.addHeader("Content-Type", "application/json");
  const int status = https.PUT(body);
  const String responseBody = https.getString();
  if (status != 200) {
    Serial.print("Firebase respondeu HTTP ");
    Serial.println(status);
    if (responseBody.length()) Serial.println(responseBody);
  }
  https.end();
  return status;
}

void sendSimulatedReading() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  String timestamp;
  if (!makeTimestamp(timestamp)) {
    Serial.println("Aguardando sincronização de horário para registrar a leitura.");
    return;
  }

  StaticJsonDocument<256> reading;
  reading["sensor_id"] = SENSOR_ID;
  reading["umidade_solo"] = random(450, 701) / 10.0f;
  reading["inclinacao"] = random(0, 41) / 10.0f;
  reading["vibracao"] = random(5, 41) / 100.0f;
  reading["chuva"] = random(0, 161) / 10.0f;
  reading["created_at"] = timestamp;

  String body;
  serializeJson(reading, body);
  Serial.print("Enviando leitura direto ao Firebase: ");
  Serial.println(body);

  // Uma chave única permite que as regras autorizem criação, mas bloqueiem alterações.
  const String readingId = String((unsigned long)time(nullptr)) + "-" + String(random(0x7fffffff), HEX);

  if (!authenticateWithFirebase()) return;
  int status = writeReading(firebaseIdToken, readingId, body);
  if (status == 401) {
    firebaseIdToken = "";
    if (authenticateWithFirebase(true)) status = writeReading(firebaseIdToken, readingId, body);
  }

  if (status == 200) Serial.println("Leitura gravada no Firebase.");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  randomSeed(esp_random());

  // Protótipo: em produção, valide o certificado TLS do servidor.
  secureClient.setInsecure();
  connectWiFi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {
  if (millis() - lastSendAt >= SEND_INTERVAL_MS) {
    lastSendAt = millis();
    sendSimulatedReading();
  }
}
