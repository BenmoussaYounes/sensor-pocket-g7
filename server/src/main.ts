import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  const httpServer = app.getHttpAdapter().getInstance();
  httpServer.disable('x-powered-by');
  // Derrière un reverse proxy TLS (Caddy, nginx, ingress...), req.ip serait
  // sinon l'adresse du proxy : le rate limit bloquerait tout le monde d'un
  // coup. TRUST_PROXY=1 -> on fait confiance à X-Forwarded-For du 1er proxy.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    httpServer.set(
      'trust proxy',
      Number.isNaN(hops) ? process.env.TRUST_PROXY : hops,
    );
  }
  // CORS strict : sans CORS_ORIGIN, aucune origine navigateur n'est autorisée.
  // Liste explicite, jamais '*'.
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    const origins = corsOrigin
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    app.enableCors({
      origin: origins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  }
  // Swagger décrit toute la surface d'attaque : coupé en production sauf si
  // ENABLE_SWAGGER=true.
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Serveur G7 API')
    .setDescription(
      `
## API HTTP

L API permet de contrôler la LED d un device :

\`POST /devices/{deviceId}/led\`

Corps de la requête : \`{ "on": true }\` pour allumer ou \`{ "on": false }\`
pour éteindre.

Les actions d'écriture (LED + seuils) exigent un JWT via
\`Authorization: Bearer <token>\`.

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
    `,
    )
    .setVersion('1.0')
    .addTag('LED', 'Contrôle des LEDs des devices')
    .addBearerAuth()
    .build();
  if (swaggerEnabled) {
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(process.env.PORT ?? 110, '0.0.0.0');
}
bootstrap();
