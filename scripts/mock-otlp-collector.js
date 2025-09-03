#!/usr/bin/env node

/**
 * Mock OTLP Collector for Integration Testing
 *
 * This is a lightweight HTTP server that mimics an OTLP collector
 * for testing purposes. It accepts OTLP data and logs it for verification.
 */

const http = require('http');
const url = require('url');

// Configuration
const PORT = process.env.OTLP_PORT || 4318;
const HOST = process.env.OTLP_HOST || 'localhost';

// Storage for received data (in-memory for testing)
const receivedData = {
  traces: [],
  metrics: [],
  logs: [],
};

// Statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  errors: 0,
  startTime: new Date(),
};

/**
 * Sanitize log messages to prevent log injection
 * @param {string} message - The message to sanitize
 * @returns {string} - Sanitized message
 */
function sanitizeForLogging(message) {
  if (typeof message !== 'string') {
    return String(message);
  }

  let sanitized = message
    // Replace newlines and carriage returns to prevent log injection
    .replace(/\r\n/g, ' [CRLF] ')
    .replace(/\n/g, ' [LF] ')
    .replace(/\r/g, ' [CR] ')
    // Replace tab characters
    .replace(/\t/g, ' [TAB] ')
    // Remove any remaining sequences that could be interpreted as log formatting
    .replace(/\x1b\[[0-9;]*m/g, ''); // ANSI escape sequences

  // This avoids ESLint control character warnings
  sanitized = sanitized.replace(/\0/g, ' [NULL] ');

  // Escape percent signs used by console.log format strings
  sanitized = sanitized.replace(/%/g, ' [PERCENT] ');

  // Replace other control characters by checking character codes
  sanitized = sanitized.replace(/./g, (char) => {
    const code = char.charCodeAt(0);
    // Allow printable ASCII characters (32-126) and some common ones
    if (code >= 32 && code <= 126) {
      return char;
    }
    // Replace control characters with their representation
    return ` [CTRL-${code}] `;
  });

  return sanitized;
}

/**
 * Process and log received OTLP data
 * @param {Buffer} body - Raw request body
 * @param {string} endpoint - The endpoint that received the data
 */
function logData(body, endpoint) {
  const bodySize = body.length;
  console.log(`📦 Received ${bodySize} bytes at ${endpoint}`);

  if (bodySize === 0) {
    console.log('📄 Empty body received');
    return;
  }

  // Try to parse as JSON first (for HTTP/JSON OTLP)
  try {
    const bodyStr = body.toString('utf8');
    if (bodyStr.startsWith('{') || bodyStr.startsWith('[')) {
      const parsed = JSON.parse(bodyStr);
      console.log(`📄 Parsed JSON data with ${Object.keys(parsed).length} top-level keys`);
      return;
    }
  } catch (jsonError) {
    // Not JSON, continue to binary handling
  }

  // Handle binary data (protobuf)
  try {
    console.log('📄 Binary protobuf data received');
  } catch (error) {
    // SECURITY: Sanitize hex representation of binary data to prevent log injection
    // Even hex should be sanitized as a defensive measure against unexpected content
    const hexStr = body.toString('hex').substring(0, 100);
    // Further restrict to hex digits only, as strict defense-in-depth
    const sanitizedHex = hexStr.replace(/[^a-f0-9]/g, '');
    console.log(`📄 Raw binary data: ${sanitizedHex}...`);
  }
}

/**
 * Handle OTLP requests
 * @param {http.IncomingMessage} req - HTTP request
 * @param {http.ServerResponse} res - HTTP response
 */
function handleOtlpRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  stats.totalRequests++;

  // Collect request body
  let body = Buffer.alloc(0);

  req.on('data', (chunk) => {
    body = Buffer.concat([body, chunk]);
  });

  req.on('end', () => {
    try {
      // Log the received data
      logData(body, pathname);

      // Store data based on endpoint
      const timestamp = new Date().toISOString();
      const dataEntry = {
        timestamp,
        endpoint: pathname,
        method: req.method,
        headers: req.headers,
        bodySize: body.length,
        contentType: req.headers['content-type'] || 'unknown',
      };

      // Route to appropriate storage
      if (pathname.includes('/traces')) {
        receivedData.traces.push(dataEntry);
        console.log(`✅ Stored trace data (${receivedData.traces.length} total)`);
      } else if (pathname.includes('/metrics')) {
        receivedData.metrics.push(dataEntry);
        console.log(`✅ Stored metrics data (${receivedData.metrics.length} total)`);
      } else if (pathname.includes('/logs')) {
        receivedData.logs.push(dataEntry);
        console.log(`✅ Stored log data (${receivedData.logs.length} total)`);
      } else {
        console.log(`⚠️  Unknown endpoint: ${pathname}`);
      }

      stats.successfulRequests++;

      // Send success response
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });

      res.end(
        JSON.stringify({
          status: 'success',
          message: 'Data received successfully',
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      stats.errors++;
      console.error('❌ Error processing request:', error.message);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'error',
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
        })
      );
    }
  });

  req.on('error', (error) => {
    stats.errors++;
    console.error('❌ Request error:', error.message);

    if (!res.headersSent) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'error',
          message: 'Bad request',
          timestamp: new Date().toISOString(),
        })
      );
    }
  });
}

/**
 * Handle OPTIONS requests for CORS
 * @param {http.IncomingMessage} req - HTTP request
 * @param {http.ServerResponse} res - HTTP response
 */
function handleOptionsRequest(req, res) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end();
}

/**
 * Handle status endpoint
 * @param {http.IncomingMessage} req - HTTP request
 * @param {http.ServerResponse} res - HTTP response
 */
function handleStatusRequest(req, res) {
  const uptime = Date.now() - stats.startTime.getTime();

  const status = {
    status: 'running',
    uptime: `${Math.floor(uptime / 1000)}s`,
    stats: {
      ...stats,
      successRate:
        stats.totalRequests > 0 ? `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%` : '0%',
    },
    endpoints: {
      traces: `/v1/traces (${receivedData.traces.length} received)`,
      metrics: `/v1/metrics (${receivedData.metrics.length} received)`,
      logs: `/v1/logs (${receivedData.logs.length} received)`,
    },
    lastReceived: {
      traces: receivedData.traces.length > 0 ? receivedData.traces[receivedData.traces.length - 1].timestamp : 'none',
      metrics:
        receivedData.metrics.length > 0 ? receivedData.metrics[receivedData.metrics.length - 1].timestamp : 'none',
      logs: receivedData.logs.length > 0 ? receivedData.logs[receivedData.logs.length - 1].timestamp : 'none',
    },
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status, null, 2));
}

/**
 * Main request handler
 * @param {http.IncomingMessage} req - HTTP request
 * @param {http.ServerResponse} res - HTTP response
 */
function requestHandler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`🔄 ${req.method} ${pathname} - ${req.headers['content-type'] || 'no-content-type'}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    handleOptionsRequest(req, res);
    return;
  }

  // Handle status endpoint
  if (pathname === '/status' || pathname === '/health') {
    handleStatusRequest(req, res);
    return;
  }

  // Handle OTLP endpoints
  if (pathname.startsWith('/v1/')) {
    handleOtlpRequest(req, res);
    return;
  }

  // Handle unknown endpoints
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'error',
      message: 'Endpoint not found',
      availableEndpoints: ['/v1/traces', '/v1/metrics', '/v1/logs', '/status'],
      timestamp: new Date().toISOString(),
    })
  );
}

// Create and start the server
const server = http.createServer(requestHandler);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Mock OTLP Collector running on http://${HOST}:${PORT}`);
  console.log(`📊 Status endpoint: http://${HOST}:${PORT}/status`);
  console.log(`🔍 Available endpoints:`);
  console.log(`   • POST /v1/traces   - Accept trace data`);
  console.log(`   • POST /v1/metrics  - Accept metrics data`);
  console.log(`   • POST /v1/logs     - Accept log data`);
  console.log(`   • GET  /status      - Server status and statistics`);
  console.log(`   • GET  /health      - Health check`);
  console.log('');
  console.log('🎯 Ready to receive OTLP data!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock OTLP collector...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    console.log(`📈 Final stats: ${stats.successfulRequests}/${stats.totalRequests} successful requests`);
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server terminated successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
