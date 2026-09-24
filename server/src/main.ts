import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Serveur G7 API')
    .setDescription(`
## API HTTP

L API permet de contrôler la LED d un device :

\`POST /devices/{deviceId}/led\`

Corps de la requête : \`{ "on": true }\` pour allumer ou \`{ "on": false }\`
pour éteindre.

## WebSocket télémétrie

Connectez-vous à \`ws://localhost:3000/ws/telemetry\` pour recevoir en temps
réel chaque message MQTT valide publié sur un topic de télémétrie.

Exemple de message reçu :

\`\`\`json
{
  "deviceId": "esp-01",
  "topic": "sentinelle/group7/esp-01/telemetry",
  "ts": 123,
  "t": 22.2,
  "h": 48.5,
  "seq": 12
}
\`\`\`
    `)
    .setVersion('1.0')
    .addTag('LED', 'Contrôle des LEDs des devices')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 110, '0.0.0.0');
}
bootstrap();
