import { logger } from './logger.js';

export function gracefulShutdown(app, db) {
  let server = null;

  app.on('listening', (s) => { server = s; });

  const shutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    if (server) {
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await db.disconnect();
          logger.info('Database disconnected');
        } catch (err) {
          logger.error('Error during database disconnect:', err.message);
        }
        process.exit(0);
      });
    } else {
      try {
        await db.disconnect();
      } catch (_) {}
      process.exit(0);
    }

    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err.message, err.stack);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
}
