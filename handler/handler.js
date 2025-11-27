const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const API_KEY = require('./api/key.json').key;
const childProcess = require('child_process');
const API_PATH = './../backend/index.js';

function runScript(scriptPath, callback) {

    // keep track of whether callback has been invoked to prevent multiple invocations
    var invoked = false;

    var process = childProcess.fork(scriptPath);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });

}

// Now we can run a script and invoke a callback when complete, e.g.
runScript('./some-script.js', function (err) {
    if (err) throw err;
    console.log('finished running some-script.js');
});

function format(seconds){
  function pad(s){
    return (s < 10 ? '0' : '') + s;
  }
  var hours = Math.floor(seconds / (60*60));
  var minutes = Math.floor(seconds % (60*60) / 60);
  var seconds = Math.floor(seconds % 60);

  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

//Get the main script to execute the data generation
function forwardRequest(data) {
  if (!checkDataValidity(data)) {
    return 400;
  } 
    //URL, AMOUNT, ANSWERS
    //curl -H "Content-Type: application/json" -H "Authorization: googlefakesyJ7CKUXiGq6AqJlsOog5TJF2tcHrJYDCsVtLp6nW7KJcZUxrvDloZIOpqvbHSVXu" https://172.28.96.1:3000/api/generate-response -k -d '{"url":"https://example.com","answers":[{"type": "biased", "params": [80,10,7,3]},{"type": "random", "params": [30,70]}],"amount":1}'
  console.log('Forwarding request');
  return 200;
}

function checkDataValidity(data) {
  if (!data.url || !data.url.match(/https:\/\//gi)) {
    return false;
  }
  if (!data.amount || data.amount < 1 || data.amount > 1000) {
    return false;
  }
  if (!data.answers || !Array.isArray(data.answers) || data.answers.length < 1) {
    return false;
  }
  return true;
}

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

  // Checking autenticity
  if (req.headers.authorization != API_KEY) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }



  

  switch (req.url) {
    case '/':
    case '/api/status':
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
      break;
    case '/api/generate-response':
      let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
      });

      req.on('end', () => {
        console.log('Received:', body);
        var response = forwardRequest(JSON.parse(body));
        if (response === 400) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad Request - Invalid data' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: 'call successful', callsRequested: 0}));
      });
      break;
    default:
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

server.on('close', () => {
  console.log("Server closed successfully");
})

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write('\x1Bc');
  console.log(`Server running at https://localhost:${PORT}`);
  console.log(' .d8888b.                             888               8888888888       888                        \nd88P  Y88b                            888               888              888                        \n888    888                            888               888              888                        \n888         .d88b.   .d88b.   .d88b.  888  .d88b.       8888888  8888b.  888  888  .d88b.  .d8888b  \n888  88888 d88""88b d88""88b d88P"88b 888 d8P  Y8b      888         "88b 888 .88P d8P  Y8b 88K      \n888    888 888  888 888  888 888  888 888 88888888      888     .d888888 888888K  88888888 "Y8888b. \nY88b  d88P Y88..88P Y88..88P Y88b 888 888 Y8b.          888     888  888 888 "88b Y8b.          X88 \n "Y8888P88  "Y88P"   "Y88P"   "Y88888 888  "Y8888       888     "Y888888 888  888  "Y8888   88888P \n                                  888                                                               \n                             Y8b d88P                                                               \n                              "Y88P"');
  console.log('');
  console.log('Press "q" to stop the server.');
  console.log('Press "r" to restart the server.');
  console.log('Press "i" to get server info.');
}); 

readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  if (key && key.ctrl && key.name === 'c') {
    console.log('Exiting...');
    process.exit();
  }

  if (str === 'q') {
    console.log('Stopping server...');
    server.close(() => {
      process.exit();
    });
  } else if (str === 'r') {
    console.log('Restarting server...');  
    server.close(() => {
      process.stdout.write('\x1Bc');
      console.log('Server stopped, restarting...');
      server.listen(PORT, '0.0.0.0', () => {
          console.log(`Server running at https://localhost:${PORT}`);
          console.log(' .d8888b.                             888               8888888888       888                        \nd88P  Y88b                            888               888              888                        \n888    888                            888               888              888                        \n888         .d88b.   .d88b.   .d88b.  888  .d88b.       8888888  8888b.  888  888  .d88b.  .d8888b  \n888  88888 d88""88b d88""88b d88P"88b 888 d8P  Y8b      888         "88b 888 .88P d8P  Y8b 88K      \n888    888 888  888 888  888 888  888 888 88888888      888     .d888888 888888K  88888888 "Y8888b. \nY88b  d88P Y88..88P Y88..88P Y88b 888 888 Y8b.          888     888  888 888 "88b Y8b.          X88 \n "Y8888P88  "Y88P"   "Y88P"   "Y88888 888  "Y8888       888     "Y888888 888  888  "Y8888   88888P \n                                  888                                                               \n                             Y8b d88P                                                               \n                              "Y88P"');
          console.log('');
          console.log('Press "q" to stop the server.');
          console.log('Press "r" to restart the server.');
          console.log('Press "i" to get server info.');
      });
    });
  } else if (str === 'i') {
    console.log('Server uptime: ' + format(process.uptime()));
  }
});