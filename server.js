const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// WebContainer requires SharedArrayBuffer which needs cross-origin isolation
// Add COEP/CORS headers - this is required for WebContainer to work
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

app.use(express.static(path.join(__dirname, 'apps/browser-ci-pipeline/dist')));

app.get('*', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'apps/browser-ci-pipeline/dist', 'index.html')
  );
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
