function parseJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
      }
    });

    request.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(Object.assign(error, { statusCode: 400, publicMessage: 'Invalid JSON body.' }));
      }
    });

    request.on('error', reject);
  });
}

function send(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function notFound(response) {
  send(response, 404, { error: 'Not found.' });
}

function methodNotAllowed(response) {
  send(response, 405, { error: 'Method not allowed.' });
}

module.exports = {
  methodNotAllowed,
  notFound,
  parseJson,
  send,
};
