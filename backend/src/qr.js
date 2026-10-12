import crypto from 'crypto';

const ROTATION_INTERVAL_MS = 90 * 1000;

let currentToken = null;
let previousToken = null;
let tokenGeneratedAt = null;
let rotationTimer = null;

function generateToken() {
  return crypto.randomBytes(8).toString('hex');
}

function rotateToken() {
  previousToken = currentToken;
  currentToken = generateToken();
  tokenGeneratedAt = Date.now();
  console.log('QR rotado:', { current: currentToken, previous: previousToken });
}

function startRotation() {
  rotateToken();
  rotationTimer = setInterval(rotateToken, ROTATION_INTERVAL_MS);
}

function stopRotation() {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
}

function getCurrent() {
  if (!currentToken) {
    rotateToken();
  }
  const elapsed = Math.floor((Date.now() - tokenGeneratedAt) / 1000);
  const remaining = Math.max(0, 90 - elapsed);
  return {
    token: currentToken,
    remainingSeconds: remaining,
    expiresAt: tokenGeneratedAt + ROTATION_INTERVAL_MS
  };
}

function validateToken(token) {
  if (!token) return false;
  return token === currentToken || token === previousToken;
}

function getPreviousToken() {
  return previousToken;
}

export { startRotation, stopRotation, getCurrent, validateToken, getPreviousToken, ROTATION_INTERVAL_MS };