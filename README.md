# Sensor Pocket

Application de supervision d'un capteur connecte. Le projet associe une
application mobile Expo/React Native a un serveur NestJS qui communique avec
les appareils via MQTT.

## Fonctionnalites

- affichage en temps reel de la temperature et de l'humidite ;
- historique de temperature sur les dix dernieres minutes ;
- indicateur de connexion au serveur ;
- commande d'allumage et d'extinction de la LED du device `esp-01` ;
- diffusion des mesures MQTT aux clients mobiles par WebSocket ;
- documentation interactive de l'API avec Swagger.

## Architecture

```text
sensor-pocket-app/
├── mobile_app/   # Application Expo / React Native
└── server/       # API NestJS, client MQTT et passerelle WebSocket
```

Flux principal :

```text
Capteur -> MQTT broker -> serveur NestJS -> WebSocket -> application mobile
                              └──── API HTTP -> commande LED -> MQTT broker
```

## Prerequis

- Node.js 20 ou une version plus recente ;
- npm ;
- un broker MQTT accessible par le serveur ;
- Expo Go, un emulateur Android/iOS ou un navigateur pour lancer le mobile.

## Installation

Les dependances sont installees separement pour le mobile et le serveur.

```bash
cd server
npm install

cd ../mobile_app
npm install
```

## Configuration du serveur

Dans `server/`, creez un fichier `.env` :

```env
PORT=110
MQTT_URL=mqtt://localhost:1883
MQTT_GROUP=group7
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=serveur-group7
```

`MQTT_USERNAME` et `MQTT_PASSWORD` sont optionnels selon la configuration du
broker. Si `MQTT_URL` ou `MQTT_GROUP` est absent, le serveur demarre mais la
connexion MQTT reste desactivee.

Le serveur ecoute les topics suivants :

- `sentinelle/<groupe>/+/telemetry` ;
- `sentinelle/<groupe>/+/status`.

Une mesure `telemetry` doit contenir au minimum :

```json
{
  "ts": 1720000000,
  "t": 22.2,
  "h": 48.5,
  "seq": 12
}
```

## Lancer le projet

### Serveur

```bash
cd server
npm run start:dev
```

Le serveur est disponible par defaut sur `http://localhost:110`.

### Application mobile

Dans un second terminal :

```bash
cd mobile_app
npx expo start
```

Utilisez ensuite Expo Go, un emulateur ou les raccourcis affiches par Expo
(`a` pour Android, `i` pour iOS, `w` pour le web).

L'URL du serveur et l'identifiant du device sont actuellement definis dans
`mobile_app/src/app/index.tsx` :

```ts
const API_BASE_URL = 'http://31.207.35.155:110';
const DEVICE_ID = 'esp-01';
```

Pour un serveur local ou une autre adresse, adaptez ces deux constantes avant
de lancer l'application mobile. Sur un appareil physique, utilisez l'adresse
IP accessible depuis le meme reseau que le telephone.

## API

### Controle de la LED

```http
POST /devices/{deviceId}/led
Content-Type: application/json
```

Corps de la requete :

```json
{ "on": true }
```

La commande est publiee sur le topic MQTT :
`sentinelle/<groupe>/<deviceId>/cmd`.

### WebSocket de telemetrie

```text
ws://localhost:110/ws/telemetry
```

Exemple de message recu :

```json
{
  "deviceId": "esp-01",
  "topic": "sentinelle/group7/esp-01/telemetry",
  "ts": 1720000000,
  "t": 22.2,
  "h": 48.5,
  "seq": 12
}
```

### Swagger

La documentation interactive est accessible a l'adresse suivante lorsque le
serveur est demarre :

```text
http://localhost:110/docs
```

## Tests et qualite

```bash
cd server
npm run test       # tests unitaires
npm run test:e2e   # tests end-to-end
npm run test:cov   # couverture
npm run build      # compilation
```

Pour le mobile :

```bash
cd mobile_app
npx expo lint
npx tsc --noEmit
```

## Structure du code

- `mobile_app/src/app/` : ecrans et routes Expo Router ;
- `mobile_app/src/components/` : composants reutilisables ;
- `server/src/modules/mqtt/` : connexion au broker et validation des mesures ;
- `server/src/modules/telemetry/` : passerelle WebSocket ;
- `server/src/modules/led/` : endpoint HTTP de controle de la LED.

## Licence

Le serveur est configure avec une licence `UNLICENSED`. Consultez le fichier
`mobile_app/LICENSE` pour les informations du projet.