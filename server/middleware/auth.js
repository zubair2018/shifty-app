// server/middleware/auth.js

export function requireAuth(_req, _res, next) {
  // TODO: real auth later
  next();
}

export function requireAdmin(_req, _res, next) {
  // TODO: real admin checks later
  next();
}
