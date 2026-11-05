"use strict";
/**
 * Shared security middleware for ShopSphere.
 * - hardened response headers (CSP, nosniff, frame protection, referrer policy)
 * - tiny in-memory rate limiter for sensitive routes (no extra dependency)
 * - input helpers: crop oversized fields, validate email shape
 */

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; " +
      "script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'"
  );
  next();
}

const buckets = new Map();

function rateLimit({ windowMs = 60000, max = 30 } = {}) {
  return function rateLimiter(req, res, next) {
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || "unknown";
    const key = `${ip}:${req.method}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retry = Math.ceil((bucket.start + windowMs - now) / 1000);
      res.setHeader("Retry-After", String(retry));
      return res.status(429).send(`Too many attempts. Please try again in ${retry} seconds.`);
    }
    return next();
  };
}

function cap(value, max = 200) {
  return String(value == null ? "" : value).slice(0, max);
}

function emailOk(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ""));
}

module.exports = { securityHeaders, rateLimit, cap, emailOk };
