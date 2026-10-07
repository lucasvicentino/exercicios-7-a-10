import { createServer } from 'node:http';
import { config } from './config';
import { logger } from './logger';

export function startServer(): ReturnType<typeof createServer> {
  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'ok', environment: config.nodeEnv }));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Not found' }));
  });

  server.on('error', () => {
    logger.error('O servidor HTTP encontrou um erro; detalhes internos foram omitidos.');
    process.exitCode = 1;
  });

  server.listen(config.port, config.host, () => {
    logger.info(`Servidor iniciado em http://${config.host}:${config.port}.`);
  });

  return server;
}
