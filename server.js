const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Only apply COEP headers in development (not on Fly.io production)
// This allows cross-origin scripts (like Umami analytics) to load properly
const isLocalhost = process.env.FLY_APP_NAME === undefined;
if (isLocalhost) {
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });
}

app.use(express.static(path.join(__dirname, 'apps/browser-ci-pipeline/dist')));

app.get('*', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'apps/browser-ci-pipeline/dist', 'index.html')
  );
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
