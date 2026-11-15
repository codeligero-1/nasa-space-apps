const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { extname, resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const publicFiles = new Map([
  ['/', 'html/index.html'],
  ['/html/index.html', 'html/index.html'],
  ['/assets/favicon/vital.svg', 'assets/favicon/vital.svg'],
  ['/css/styles.css', 'css/styles.css'],
  ['/js/app.js', 'js/app.js'],
  ['/js/data.js', 'js/data.js'],
  ['/js/demo-health-data.js', 'js/demo-health-data.js'],
  ['/js/health-summary.js', 'js/health-summary.js']
]);
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new RangeError('PORT must be an integer between 1 and 65535.');
}

function sendText(response, status, message, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers
  });
  response.end(message);
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendText(response, 405, 'Method not allowed.', { Allow: 'GET, HEAD' });
    return;
  }

  let pathname;
  try {
    pathname = new URL(request.url || '/', 'http://localhost').pathname;
  } catch {
    sendText(response, 400, 'Invalid request URL.');
    return;
  }

  const asset = publicFiles.get(pathname);
  if (!asset) {
    sendText(response, 404, 'Not found.');
    return;
  }

  try {
    const contents = await readFile(resolve(projectRoot, asset));
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes.get(extname(asset)) || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      sendText(response, 404, 'Not found.');
      return;
    }

    console.error(`Could not serve ${pathname}.`, error);
    sendText(response, 500, 'Could not serve the requested file.');
  }
});

server.on('error', (error) => {
  console.error('Could not start the VITAL dashboard server.', error);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`VITAL dashboard is running at http://127.0.0.1:${port}/`);
});
