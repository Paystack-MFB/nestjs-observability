#!/usr/bin/env node

/**
 * Mock OTLP Collector Server
 *
 * A simple HTTP server that accepts OTLP requests and logs received data
 * for validation during integration tests.
 */

const http = require('http');
const url = require('url');

const PORT = 4318;
const HOST = 'localhost';

// Statistics
let stats = {
  traces: 0,
  metrics: 0,
  logs: 0,
  requests: 0,
};

/**
 * Sanitize string for safe logging by removing/escaping potentially dangerous characters
 * This prevents log injection attacks by ensuring user input cannot forge log entries
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string safe for logging
 */
function sanitizeForLogging(str) {
  if (typeof str !== 'string') {
    str = String(str);
  }

  return (
    str
      // Remove null bytes and other dangerous control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Replace newlines and carriage returns with escaped versions to prevent log forging
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      // Replace tabs with escaped version for clarity
      .replace(/\t/g, '\\t')
      // Remove any remaining sequences that could be interpreted as log formatting
      .replace(/\x1b\[[0-9;]*m/g, '') // ANSI escape sequences
      // Limit length to prevent log flooding
      .substring(0, 1000)
  );
}

/**
 * Log received data with headers
 */
function logData(type, headers, body) {
  console.log(`\n📦 Received ${type} data`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`📊 Stats: ${JSON.stringify(stats)}`);

  // Log relevant headers with sanitization to prevent log injection
  const relevantHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    if (
      key.toLowerCase().startsWith('x-') ||
      key.toLowerCase().includes('auth') ||
      key.toLowerCase().includes('content') ||
      key.toLowerCase().includes('user-agent')
    ) {
      // SECURITY: Sanitize both header names and values as they are user-controlled
      const safeKey = sanitizeForLogging(String(key));
      const safeValue = sanitizeForLogging(String(value));
      relevantHeaders[safeKey] = safeValue;
    }
  }

  if (Object.keys(relevantHeaders).length > 0) {
    console.log(`📋 Headers:`, relevantHeaders);
  }

  // Log body size and first few bytes if available
  if (body && body.length > 0) {
    console.log(`📏 Body size: ${body.length} bytes`);

    // Try to detect if it's JSON
    try {
      const bodyStr = body.toString('utf8');
      if (bodyStr.startsWith('{') || bodyStr.startsWith('[')) {
        const parsed = JSON.parse(bodyStr);
        // SECURITY: JSON.stringify handles escaping, but sanitize for comprehensive safety
        const jsonStr = JSON.stringify(parsed, null, 2);
        const sanitizedJson = sanitizeForLogging(jsonStr);
        console.log(`📄 JSON data: ${sanitizedJson.substring(0, 500)}...`);
      } else {
        // SECURITY: Sanitize user-controlled raw data to prevent log injection attacks
        // This ensures malicious input cannot forge log entries or inject control sequences
        const sanitizedData = sanitizeForLogging(bodyStr);
        console.log(`📄 Raw data (first 200 chars): ${sanitizedData.substring(0, 200)}...`);
      }
    } catch (error) {
      // SECURITY: Sanitize hex representation of binary data to prevent log injection
      // Even hex should be sanitized as a defensive measure against unexpected content
      let hexStr = body.toString('hex').substring(0, 100);
      // Further restrict to hex digits only, as strict defense-in-depth
      hexStr = hexStr.replace(/[^a-f0-9]/g, '');
      const sanitizedHex = sanitizeForLogging(hexStr);
      console.log(`📄 Binary data: ${sanitizedHex}...`);
    }
  }

  console.log('─'.repeat(60));
}

/**
 * Handle OTLP requests
 */
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Sanitize all user-controlled inputs for logging to prevent log injection
  const safeMethod = sanitizeForLogging(String(req.method));
  const safePathname = sanitizeForLogging(String(pathname));
  const rawContentType = req.headers['content-type'] || 'no content-type';
  const safeContentType = sanitizeForLogging(String(rawContentType));

  stats.requests++;

  console.log(`\n🌐 ${safeMethod} ${safePathname} - ${safeContentType}`);

  // Set CORS headers for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-test-header, x-custom');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Collect request body
  let body = Buffer.alloc(0);

  req.on('data', (chunk) => {
    body = Buffer.concat([body, chunk]);
  });

  req.on('end', () => {
    // Route the request
    switch (pathname) {
      case '/v1/traces':
        stats.traces++;
        logData('trace', req.headers, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'success',
            message: 'Traces received',
            count: stats.traces,
          })
        );
        break;

      case '/v1/metrics':
        stats.metrics++;
        logData('metrics', req.headers, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'success',
            message: 'Metrics received',
            count: stats.metrics,
          })
        );
        break;

      case '/v1/logs':
        stats.logs++;
        logData('logs', req.headers, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'success',
            message: 'Logs received',
            count: stats.logs,
          })
        );
        break;

      case '/health':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            stats,
          })
        );
        break;

      case '/stats':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats, null, 2));
        break;

      case '/reset':
        stats = { traces: 0, metrics: 0, logs: 0, requests: 0 };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Stats reset', stats }));
        break;

      default:
        console.log(`❓ Unknown endpoint [user input]: ${safePathname}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Not found',
            path: pathname,
            availableEndpoints: ['/v1/traces', '/v1/metrics', '/v1/logs', '/health', '/stats', '/reset'],
          })
        );
    }
  });

  req.on('error', (error) => {
    console.error(`❌ Request error: ${error.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
}

/**
 * Create and start the server
 */
const server = http.createServer(handleRequest);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error(`❌ Server error: ${error.message}`);
    process.exit(1);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Mock OTLP Collector running on http://${HOST}:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   POST /v1/traces  - Accept trace data`);
  console.log(`   POST /v1/metrics - Accept metrics data`);
  console.log(`   POST /v1/logs    - Accept log data`);
  console.log(`   GET  /health     - Health check`);
  console.log(`   GET  /stats      - View statistics`);
  console.log(`   GET  /reset      - Reset statistics`);
  console.log('');
  console.log('📝 All received data will be logged to stdout');
  console.log('💡 Use Ctrl+C to stop the server');
  console.log('─'.repeat(60));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down mock OTLP collector...');
  console.log(`📊 Final stats: ${JSON.stringify(stats)}`);
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
