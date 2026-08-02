import { construirApp } from './http/servidor';

const porta = Number(process.env.PORT ?? 3000);
const app = construirApp();

app
  .listen({ port: porta, host: '0.0.0.0' })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
