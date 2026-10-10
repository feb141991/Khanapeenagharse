// Unified Structured Logger for Khana Peena Ghar Se Serverless APIs
// Formats logs cleanly for Vercel Runtime Logs and local development

export function logRequest(endpoint, req, meta = {}) {
  const method = req.method || "UNKNOWN";
  const ip = req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "127.0.0.1";
  const authHeaderPresent = Boolean(req.headers?.["x-admin-key"] || req.headers?.["X-Admin-Key"]);
  const queryStr = req.query ? JSON.stringify(req.query) : "{}";
  
  console.log(`[${endpoint}] [REQ] ${method} | IP: ${ip} | HasAdminKey: ${authHeaderPresent} | Query: ${queryStr}`, Object.keys(meta).length ? meta : "");
}

export function logInfo(endpoint, message, meta = {}) {
  console.log(`[${endpoint}] [INFO] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : "");
}

export function logWarn(endpoint, message, meta = {}) {
  console.warn(`[${endpoint}] [WARN] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : "");
}

export function logError(endpoint, message, err = null, meta = {}) {
  console.error(`[${endpoint}] [ERROR] ${message}`, {
    errorMessage: err?.message || String(err),
    errorStack: err?.stack || undefined,
    ...meta
  });
}
