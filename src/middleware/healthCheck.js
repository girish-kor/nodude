export function healthCheck(db) {
  const startTime = Date.now();

  return (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: db.isConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      node: process.version
    });
  };
}
