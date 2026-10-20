import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/api';

dotenv.config();

const app = express();
// Runtime Environment requires dev server to bind to port 3000
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3000) : 3000;

app.use(express.json());

// API routes mounted directly with Express
app.use('/api', apiRouter);

async function start() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    // Mount Vite dev server in middleware mode with HMR disabled (prevents WebSocket port 24678 conflict)
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`FAITHTRACK full-stack server running on port ${PORT}`);
  });

  // Handle address in use gracefully without unhandled crashes
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} in use, waiting for release and retrying in 1.5s...`);
      setTimeout(() => {
        try {
          server.close();
        } catch {}
        server.listen(Number(PORT), '0.0.0.0');
      }, 1500);
    } else {
      console.error('Server error:', err);
    }
  });

  process.on('SIGTERM', () => {
    try {
      server.close();
    } catch {}
  });

  process.on('SIGINT', () => {
    try {
      server.close();
    } catch {}
  });
}

start().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
