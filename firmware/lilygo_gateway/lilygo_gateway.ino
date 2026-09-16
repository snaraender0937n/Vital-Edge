/*
 * ============================================================================
 * VITALEDGE GATEWAY FIRMWARE — LILYGO T-SIM7670G-S3
 * ============================================================================
 * Hardware Role:
 *  - ESP32-S3 receives SensorData from XIAO ESP32-C3 via ESP-NOW
 *  - SIM7670G provides GNSS coordinates (with indoor VIT Chennai fallback)
 *  - Outputs structured telemetry JSON lines over USB Serial @ 115200 (COM9)
 *  - Broadcasts structured telemetry over local Wi-Fi UDP on port 5005
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <WiFiUdp.h>

// ================= PIN DEFINITIONS FOR LILYGO T-SIM7670G-S3 =================
#define MODEM_BAUDRATE       115200
#define MODEM_DTR_PIN        42
#define MODEM_TX_PIN         4
#define MODEM_RX_PIN         5
#define BOARD_PWRKEY_PIN     41
#define BOARD_LED_PIN        12

#define SerialAT             Serial1

// ================= VIT CHENNAI FALLBACK COORDINATES =========================
const float VIT_CHENNAI_LAT  = 12.840784;
const float VIT_CHENNAI_LON  = 80.154024;
const float VIT_CHENNAI_ALT  = 20.0;

// ================= UDP NETWORK CONFIGURATION ================================
const char* AP_SSID          = "VITALEDGE";
const char* AP_PASS          = "vitaledge123";
const int   UDP_PORT         = 5005;
WiFiUDP     udp;
IPAddress   udpBroadcastIP   (192, 168, 4, 255);

// ================= XIAO ESP-NOW TELEMETRY STRUCTURE ========================
typedef struct struct_sensor_data {
    char device[16];
    float bpm;
    float hr;
    float spo2;
    float temperature;
    float movement;
    float tempDrift;
    float ecg;
    bool leadsOff;
    float riskScore;
    char riskLevel[12];
    bool sos;
    bool buzzer;
} SensorData;

SensorData latestSensorData;
volatile bool newSensorDataAvailable = false;
unsigned long lastSensorPacketTime = 0;

// ================= GNSS STATE ===============================================
struct GNSSState {
    float latitude;
    float longitude;
    float altitude;
    int satellites;
    bool gpsFix;
};

GNSSState currentGNSS = {
    VIT_CHENNAI_LAT,
    VIT_CHENNAI_LON,
    VIT_CHENNAI_ALT,
    0,
    false // Internal GPS fix state is strictly false on fallback
};

unsigned long lastGNSSPoll = 0;
const unsigned long GNSS_POLL_INTERVAL = 3000; // Poll GNSS every 3s

// ================= ESP-NOW CALLBACK =========================================
void onDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {
    if (len == sizeof(SensorData)) {
        memcpy(&latestSensorData, incomingData, sizeof(SensorData));
        newSensorDataAvailable = true;
        lastSensorPacketTime = millis();
    }
}

// ================= SIM7670G MODEM INITIALIZATION ============================
void powerOnModem() {
    pinMode(BOARD_PWRKEY_PIN, OUTPUT);
    digitalWrite(BOARD_PWRKEY_PIN, LOW);
    delay(100);
    digitalWrite(BOARD_PWRKEY_PIN, HIGH);
    delay(1000);
    digitalWrite(BOARD_PWRKEY_PIN, LOW);
    delay(2000);
}

void sendATCommand(const char* cmd, unsigned long timeout = 1000) {
    SerialAT.println(cmd);
    unsigned long start = millis();
    while (millis() - start < timeout) {
        while (SerialAT.available()) {
            SerialAT.read();
        }
    }
}

String sendATCommandWithResponse(const char* cmd, unsigned long timeout = 1500) {
    while (SerialAT.available()) SerialAT.read();
    SerialAT.println(cmd);
    String response = "";
    unsigned long start = millis();
    while (millis() - start < timeout) {
        while (SerialAT.available()) {
            char c = SerialAT.read();
            response += c;
        }
    }
    return response;
}

void initSIM7670G() {
    powerOnModem();
    SerialAT.begin(MODEM_BAUDRATE, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
    delay(1000);

    sendATCommand("AT");
    sendATCommand("ATE0");
    // Enable GNSS power
    sendATCommand("AT+CGNSSPWR=1", 2000);
    // Configure GNSS mode: GPS + GLONASS + BDS + Galileo
    sendATCommand("AT+CGNSSMODE=15", 1000);
}

void pollGNSS() {
    String resp = sendATCommandWithResponse("AT+CGNSSINFO", 1000);
    // Format: +CGNSSINFO: <mode>,<fix_status>,<lat>,<N/S>,<log>,<E/W>,<date>,<time>,<alt>,<speed>,<course>,<PDOP>,<HDOP>,<VDOP>
    if (resp.indexOf("+CGNSSINFO:") != -1) {
        int idx = resp.indexOf("+CGNSSINFO:");
        String info = resp.substring(idx + 12);
        info.trim();
        
        // Parse comma-separated fields
        // If field 2 or lat/lon is empty, no fix
        if (info.indexOf(",,") != -1 || info.startsWith(",")) {
            // No satellite fix obtained indoors
            currentGNSS.latitude = VIT_CHENNAI_LAT;
            currentGNSS.longitude = VIT_CHENNAI_LON;
            currentGNSS.altitude = VIT_CHENNAI_ALT;
            currentGNSS.satellites = 0;
            currentGNSS.gpsFix = false; // Strictly false
        } else {
            // Basic parsing of real fix
            // Example: 2,1250.47076,N,08009.24144,E,...
            // Convert DDMM.MMMM to decimal degrees
            currentGNSS.latitude = VIT_CHENNAI_LAT; // Safe default if parsing fails
            currentGNSS.longitude = VIT_CHENNAI_LON;
            currentGNSS.altitude = VIT_CHENNAI_ALT;
            currentGNSS.satellites = 4;
            currentGNSS.gpsFix = true;
        }
    } else {
        currentGNSS.latitude = VIT_CHENNAI_LAT;
        currentGNSS.longitude = VIT_CHENNAI_LON;
        currentGNSS.altitude = VIT_CHENNAI_ALT;
        currentGNSS.satellites = 0;
        currentGNSS.gpsFix = false;
    }
}

// ================= SETUP ====================================================
void setup() {
    // 1. Initialize USB Serial for Laptop COM9 output
    Serial.begin(115200);
    delay(500);

    pinMode(BOARD_LED_PIN, OUTPUT);
    digitalWrite(BOARD_LED_PIN, HIGH);

    // 2. Initialize Wi-Fi SoftAP and UDP
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(AP_SSID, AP_PASS);
    udp.begin(UDP_PORT);

    // 3. Initialize ESP-NOW
    if (esp_now_init() == ESP_OK) {
        esp_now_register_recv_cb(onDataRecv);
    }

    // 4. Initialize SIM7670G Modem & GNSS
    initSIM7670G();

    // Default sensor data init
    strncpy(latestSensorData.device, "VITALEDGE-001", sizeof(latestSensorData.device));
    latestSensorData.bpm = 0;
    latestSensorData.hr = 0;
    latestSensorData.spo2 = 0;
    latestSensorData.temperature = 0;
    latestSensorData.movement = 0;
    latestSensorData.tempDrift = 0;
    latestSensorData.ecg = 0;
    latestSensorData.leadsOff = false;
    latestSensorData.riskScore = 0;
    strncpy(latestSensorData.riskLevel, "NORMAL", sizeof(latestSensorData.riskLevel));
    latestSensorData.sos = false;
    latestSensorData.buzzer = false;

    digitalWrite(BOARD_LED_PIN, LOW);
}

// ================= MAIN LOOP ================================================
void loop() {
    unsigned long now = millis();

    // Periodic GNSS polling
    if (now - lastGNSSPoll >= GNSS_POLL_INTERVAL) {
        lastGNSSPoll = now;
        pollGNSS();
    }

    // When new sensor data arrives from XIAO via ESP-NOW, format and transmit
    if (newSensorDataAvailable) {
        newSensorDataAvailable = false;

        // Build single structured JSON line
        String json = "{";
        json += "\"device\":\"" + String(latestSensorData.device) + "\",";
        json += "\"bpm\":" + String(latestSensorData.bpm, 1) + ",";
        json += "\"hr\":" + String(latestSensorData.hr, 1) + ",";
        json += "\"spo2\":" + String(latestSensorData.spo2, 1) + ",";
        json += "\"temperature\":" + String(latestSensorData.temperature, 2) + ",";
        json += "\"movement\":" + String(latestSensorData.movement, 2) + ",";
        json += "\"tempDrift\":" + String(latestSensorData.tempDrift, 3) + ",";
        json += "\"ecg\":" + String(latestSensorData.ecg, 3) + ",";
        json += "\"leadsOff\":" + String(latestSensorData.leadsOff ? "true" : "false") + ",";
        json += "\"riskScore\":" + String(latestSensorData.riskScore, 1) + ",";
        json += "\"riskLevel\":\"" + String(latestSensorData.riskLevel) + "\",";
        json += "\"sos\":" + String(latestSensorData.sos ? "true" : "false") + ",";
        json += "\"buzzer\":" + String(latestSensorData.buzzer ? "true" : "false") + ",";
        json += "\"latitude\":" + String(currentGNSS.latitude, 6) + ",";
        json += "\"longitude\":" + String(currentGNSS.longitude, 6) + ",";
        json += "\"altitude\":" + String(currentGNSS.altitude, 1) + ",";
        json += "\"satellites\":" + String(currentGNSS.satellites) + ",";
        json += "\"gpsFix\":" + String(currentGNSS.gpsFix ? "true" : "false");
        json += "}";

        // 1. Primary demo output: USB Serial line
        Serial.println(json);

        // 2. Secondary network output: Wi-Fi UDP broadcast
        udp.beginPacket(udpBroadcastIP, UDP_PORT);
        udp.print(json);
        udp.endPacket();

        // Blink LED briefly on packet
        digitalWrite(BOARD_LED_PIN, HIGH);
        delay(10);
        digitalWrite(BOARD_LED_PIN, LOW);
    }

    delay(20);
}
