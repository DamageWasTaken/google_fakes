const https = require('https');
const fs = require('fs');
const path = require('path');

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'certificate.pem')),
  // Enable all security features
  minVersion: 'TLSv1.2',
  // Recommended security settings
  secureOptions: require('constants').SSL_OP_NO_SSLv3 |
              require('constants').SSL_OP_NO_TLSv1 |
              require('constants').SSL_OP_NO_TLSv1_1
};


// Create the HTTPS server
const server = https.createServer(sslOptions, (req, res) => {
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Handle different routes
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(' .d8888b.                             888               8888888888       888                        \nd88P  Y88b                            888               888              888                        \n888    888                            888               888              888                        \n888         .d88b.   .d88b.   .d88b.  888  .d88b.       8888888  8888b.  888  888  .d88b.  .d8888b  \n888  88888 d88""88b d88""88b d88P"88b 888 d8P  Y8b      888         "88b 888 .88P d8P  Y8b 88K      \n888    888 888  888 888  888 888  888 888 88888888      888     .d888888 888888K  88888888 "Y8888b. \nY88b  d88P Y88..88P Y88..88P Y88b 888 888 Y8b.          888     888  888 888 "88b Y8b.          X88 \n "Y8888P88  "Y88P"   "Y88P"   "Y88888 888  "Y8888       888     "Y888888 888  888  "Y8888   88888P \n                                  888                                                               \n                             Y8b d88P                                                               \n                              "Y88P"');
  } else if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start the server on port 3000 (HTTPS default is 443 but requires root)
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at https://localhost:${PORT}`);
  console.log(' .d8888b.                             888               8888888888       888                        \nd88P  Y88b                            888               888              888                        \n888    888                            888               888              888                        \n888         .d88b.   .d88b.   .d88b.  888  .d88b.       8888888  8888b.  888  888  .d88b.  .d8888b  \n888  88888 d88""88b d88""88b d88P"88b 888 d8P  Y8b      888         "88b 888 .88P d8P  Y8b 88K      \n888    888 888  888 888  888 888  888 888 88888888      888     .d888888 888888K  88888888 "Y8888b. \nY88b  d88P Y88..88P Y88..88P Y88b 888 888 Y8b.          888     888  888 888 "88b Y8b.          X88 \n "Y8888P88  "Y88P"   "Y88P"   "Y88888 888  "Y8888       888     "Y888888 888  888  "Y8888   88888P \n                                  888                                                               \n                             Y8b d88P                                                               \n                              "Y88P"');
}); 