import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- SECRETS & KEY MANAGEMENT ---
const DB_DIR = path.join(process.cwd(), '.core', 'database');
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const JWT_SECRET_FILE = path.join(DB_DIR, '.jwt_secret');
export let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    if (fs.existsSync(JWT_SECRET_FILE)) {
        JWT_SECRET = fs.readFileSync(JWT_SECRET_FILE, 'utf8').trim();
    } else {
        JWT_SECRET = crypto.randomBytes(64).toString('hex');
        try {
            fs.writeFileSync(JWT_SECRET_FILE, JWT_SECRET, { mode: 0o600 });
        } catch (e) {
            // fallback in-memory
        }
    }
}

export const INTEGRITY_SECRET_FILE = path.join(DB_DIR, '.integrity_secret');
export let INTEGRITY_SECRET = process.env.INTEGRITY_SECRET;
if (!INTEGRITY_SECRET) {
    if (fs.existsSync(INTEGRITY_SECRET_FILE)) {
        INTEGRITY_SECRET = fs.readFileSync(INTEGRITY_SECRET_FILE, 'utf8').trim();
    } else {
        INTEGRITY_SECRET = crypto.randomBytes(64).toString('hex');
        try {
            fs.writeFileSync(INTEGRITY_SECRET_FILE, INTEGRITY_SECRET, { mode: 0o600 });
        } catch (e) {
            // fallback in-memory
        }
    }
}

const LEGACY_INTEGRITY_KEYS = new Set([INTEGRITY_SECRET]);

export function setRuntimeSecrets({ jwtSecret, integritySecret }) {
    if (jwtSecret && typeof jwtSecret === 'string' && jwtSecret.length >= 32) {
        JWT_SECRET = jwtSecret;
        try {
            fs.writeFileSync(JWT_SECRET_FILE, jwtSecret, { mode: 0o600 });
        } catch (e) {}
    }
    if (integritySecret && typeof integritySecret === 'string' && integritySecret.length >= 32) {
        LEGACY_INTEGRITY_KEYS.add(INTEGRITY_SECRET);
        LEGACY_INTEGRITY_KEYS.add(integritySecret);
        INTEGRITY_SECRET = integritySecret;
        try {
            fs.writeFileSync(INTEGRITY_SECRET_FILE, integritySecret, { mode: 0o600 });
        } catch (e) {}
    }
}

export function deriveTransportKey(material) {
    return crypto.createHash('sha256').update(String(material || INTEGRITY_SECRET)).digest();
}

export function encryptWithKey(plaintext, keyMaterial) {
    const key = deriveTransportKey(keyMaterial);
    const iv = crypto.randomBytes(12);
    const rawBuf = Buffer.from(plaintext, 'utf8');
    const compressed = rawBuf.length > 1024;
    const inputBuf = compressed ? zlib.gzipSync(rawBuf) : rawBuf;
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(inputBuf), cipher.final()]);
    const tag = cipher.getAuthTag();
    const checksum = crypto.createHmac('sha256', String(keyMaterial)).update(plaintext).digest('hex');
    return {
        encrypted: true,
        compressed,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted.toString('base64'),
        checksum
    };
}

export function decryptWithKey(record, keyMaterial) {
    if (!record || !record.data) return null;
    if (record.encrypted && record.iv && record.tag) {
        const key = deriveTransportKey(keyMaterial);
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            key,
            Buffer.from(record.iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
        let decryptedBuf = Buffer.concat([
            decipher.update(Buffer.from(record.data, 'base64')),
            decipher.final()
        ]);
        if (record.compressed) {
            decryptedBuf = zlib.gunzipSync(decryptedBuf);
        } else if (decryptedBuf.length >= 2 && decryptedBuf[0] === 0x1f && decryptedBuf[1] === 0x8b) {
            decryptedBuf = zlib.gunzipSync(decryptedBuf);
        }
        const decrypted = decryptedBuf.toString('utf8');
        if (record.checksum) {
            const expected = crypto.createHmac('sha256', String(keyMaterial)).update(decrypted).digest('hex');
            if (record.checksum !== expected) {
                throw new Error('BACKUP_CHECKSUM_MISMATCH');
            }
        }
        return decrypted;
    }
    return record.data;
}

export function encryptBackupPayload(plaintext) {
    return encryptWithKey(plaintext, INTEGRITY_SECRET);
}

export function decryptBackupPayload(record, extraCandidateKeys = []) {
    if (!record || !record.data) return null;
    if (!record.encrypted || !record.iv || !record.tag) {
        return record.data;
    }
    const candidates = Array.from(new Set([
        INTEGRITY_SECRET,
        ...Array.from(LEGACY_INTEGRITY_KEYS),
        ...extraCandidateKeys.filter(Boolean)
    ]));
    let lastError = null;
    for (const candidate of candidates) {
        try {
            return decryptWithKey(record, candidate);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('BACKUP_DECRYPT_FAILED');
}

// --- PASSWORD SECURITY (BCRYPT + NON-BLOCKING ASYNC + AUTO-MIGRATION) ---
export function hashPassword(plainPassword) {
    if (!plainPassword || typeof plainPassword !== 'string') return '';
    return bcrypt.hashSync(plainPassword, 10);
}

export async function hashPasswordAsync(plainPassword) {
    if (!plainPassword || typeof plainPassword !== 'string') return '';
    return new Promise((resolve, reject) => {
        bcrypt.hash(plainPassword, 10, (err, hash) => {
            if (err) reject(err);
            else resolve(hash);
        });
    });
}

export function verifyPassword(plainPassword, storedHash) {
    if (!plainPassword || !storedHash) return { valid: false, needsRehash: false };

    // Check if hash is bcrypt ($2a$, $2b$, $2y$)
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
        const isValid = bcrypt.compareSync(plainPassword, storedHash);
        return { valid: isValid, needsRehash: false };
    }

    // Legacy SHA-256 with static salt fallback (for seamless migration)
    const legacySalt = 'vinzx_usr_chain_salt_2026_';
    const legacySha256 = crypto.createHash('sha256').update(legacySalt + plainPassword).digest('hex');
    const simpleSha256 = crypto.createHash('sha256').update(plainPassword).digest('hex');

    if (storedHash === legacySha256 || storedHash === simpleSha256 || storedHash === plainPassword) {
        return { valid: true, needsRehash: true };
    }

    return { valid: false, needsRehash: false };
}

export async function verifyPasswordAsync(plainPassword, storedHash) {
    if (!plainPassword || !storedHash) return { valid: false, needsRehash: false };

    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
        const isValid = await new Promise((resolve, reject) => {
            bcrypt.compare(plainPassword, storedHash, (err, res) => {
                if (err) reject(err);
                else resolve(Boolean(res));
            });
        });
        return { valid: isValid, needsRehash: false };
    }

    const legacySalt = 'vinzx_usr_chain_salt_2026_';
    const legacySha256 = crypto.createHash('sha256').update(legacySalt + plainPassword).digest('hex');
    const simpleSha256 = crypto.createHash('sha256').update(plainPassword).digest('hex');

    if (storedHash === legacySha256 || storedHash === simpleSha256 || storedHash === plainPassword) {
        return { valid: true, needsRehash: true };
    }

    return { valid: false, needsRehash: false };
}

// --- JWT SESSION ENGINE ---
export function generateSessionToken(user) {
    const payload = {
        uid: user.id,
        username: user.username,
        role: user.role || 'USER',
        email: user.email || '',
        tier: user.membershipTier || 'NONE'
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifySessionToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

// --- AUTHENTICATION & RBAC MIDDLEWARES ---
export function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
    } else if (req.headers['x-dev-token']) {
        token = req.headers['x-dev-token'];
    }

    if (!token) {
        return res.status(401).json({ error: 'Akses Ditolak: Token Autentikasi Wajib Disertakan.' });
    }

    const decoded = verifySessionToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Sesi Tidak Valid atau Telah Kedaluwarsa. Silakan Login Ulang.' });
    }

    req.user = decoded;
    next();
}

export function optionalAuthenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
    } else if (req.headers['x-dev-token']) {
        token = req.headers['x-dev-token'];
    }

    if (token) {
        const decoded = verifySessionToken(token);
        if (decoded) req.user = decoded;
    }
    next();
}

export function requireAdmin(req, res, next) {
    authenticate(req, res, () => {
        const role = req.user?.role;
        const email = req.user?.email;
        const isMaster = email === 'mayasalfakihmukadam@gmail.com';

        if (role === 'DEV' || role === 'ADMIN' || isMaster) {
            return next();
        }
        return res.status(403).json({ error: 'Akses Ditolak: Hak Akses Administrator / Developer Diperlukan.' });
    });
}

// --- GOOGLE FIREBASE ID TOKEN VERIFIER (ZERO-TRUST BACKEND) ---
export async function verifyGoogleToken(idToken, firebaseApiKey = '') {
    if (!idToken || typeof idToken !== 'string') {
        return { valid: false, error: 'Token ID Google tidak ada atau format salah' };
    }

    // Method 1: Google OAuth tokeninfo
    try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (googleRes.ok) {
            const data = await googleRes.json();
            if (data && data.sub) {
                return {
                    valid: true,
                    uid: data.sub,
                    email: data.email,
                    emailVerified: data.email_verified === 'true' || data.email_verified === true,
                    name: data.name || data.email?.split('@')[0] || 'Google User'
                };
            }
        }
    } catch (e) {
        // Fallback to Firebase REST API
    }

    // Method 2: Firebase Identity Toolkit lookup
    if (firebaseApiKey) {
        try {
            const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            });
            if (fbRes.ok) {
                const fbData = await fbRes.json();
                const fbUser = fbData.users?.[0];
                if (fbUser) {
                    return {
                        valid: true,
                        uid: fbUser.localId,
                        email: fbUser.email,
                        emailVerified: fbUser.emailVerified === true,
                        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User'
                    };
                }
            }
        } catch (e) {
            // verification failed
        }
    }

    return { valid: false, error: 'Verifikasi Token Google Gagal. Token tidak valid atau kedaluwarsa.' };
}

// --- RATE LIMITER & BRUTE-FORCE SHIELD ---
const rateBuckets = new Map(); // key -> { count, firstHit, blockedUntil }

function extractClientIp(req) {
    const forwarded = req?.headers?.['x-forwarded-for'];
    if (forwarded) {
        return String(forwarded).split(',')[0].trim();
    }
    return req?.socket?.remoteAddress || '127.0.0.1';
}

export function rateLimitMiddleware(limit = 60, windowMs = 60 * 1000, prefix = 'general', options = {}) {
    const { failuresOnly = false } = options;
    return (req, res, next) => {
        const ip = extractClientIp(req);
        const identityPart = (failuresOnly && req.body?.username) ? `:${String(req.body.username).trim().toLowerCase()}` : '';
        const key = `${prefix}:${ip}${identityPart}`;
        const now = Date.now();
        const record = rateBuckets.get(key) || { count: 0, firstHit: now, blockedUntil: 0 };

        if (record.blockedUntil > now) {
            const waitSec = Math.ceil((record.blockedUntil - now) / 1000);
            return res.status(429).json({
                error: `Terlalu banyak percobaan gagal. Keamanan siber aktif, silakan coba lagi dalam ${waitSec} detik.`
            });
        }

        if (failuresOnly) {
            res.on('finish', () => {
                const finishNow = Date.now();
                if (res.statusCode < 400) {
                    rateBuckets.delete(key);
                } else if (res.statusCode === 401) {
                    const current = rateBuckets.get(key) || { count: 0, firstHit: finishNow, blockedUntil: 0 };
                    if (finishNow - current.firstHit > windowMs) {
                        current.count = 1;
                        current.firstHit = finishNow;
                        current.blockedUntil = 0;
                    } else {
                        current.count++;
                        if (current.count >= limit) {
                            current.blockedUntil = finishNow + windowMs;
                            logAuditEvent('RATE_LIMIT_BLOCKED', { ip, path: req.path, limit, windowMs }, req);
                        }
                    }
                    rateBuckets.set(key, current);
                }
            });
            return next();
        }

        if (now - record.firstHit > windowMs) {
            record.count = 1;
            record.firstHit = now;
            record.blockedUntil = 0;
        } else {
            record.count++;
            if (record.count > limit) {
                record.blockedUntil = now + windowMs;
                rateBuckets.set(key, record);
                logAuditEvent('RATE_LIMIT_BLOCKED', { ip, path: req.path, limit, windowMs }, req);
                return res.status(429).json({
                    error: `Batas kuota terlampaui. Akses ditangguhkan sementara demi keamanan.`
                });
            }
        }
        rateBuckets.set(key, record);
        next();
    };
}

export function clearRateLimitByIdentity(prefix = 'login', identity = '') {
    const cleanIdentity = String(identity || '').trim().toLowerCase();
    if (!cleanIdentity) return;
    const suffix = `:${cleanIdentity}`;
    for (const key of rateBuckets.keys()) {
        if (key.startsWith(`${prefix}:`) && key.endsWith(suffix)) {
            rateBuckets.delete(key);
        }
    }
}

// --- DATA SANITIZATION ---
export function sanitizeUser(user) {
    if (!user) return null;
    const { password, passwordHash, encryptedCredVault, manualPassword, plainPassword, ...safe } = user;
    return safe;
}

// --- HMAC DATABASE INTEGRITY SEAL ---
export function generateUserIntegritySignature(user) {
    if (!user) return '';
    const payload = [
        user.id || '',
        user.username || '',
        user.role || 'USER',
        user.membershipTier || 'NONE',
        String(user.membershipExpiresAt || 0),
        String(user.tokens || 0),
        user.deviceId || ''
    ].join('::');
    return crypto.createHmac('sha256', INTEGRITY_SECRET).update(payload).digest('hex');
}

export function verifyUserIntegrity(user) {
    if (!user || !user.integritySignature) return false;
    const expected = generateUserIntegritySignature(user);
    try {
        return crypto.timingSafeEqual(
            Buffer.from(user.integritySignature, 'utf8'),
            Buffer.from(expected, 'utf8')
        );
    } catch (e) {
        return false;
    }
}

// --- AUDIT LOGGING ---
const AUDIT_LOG_FILE = path.join(DB_DIR, 'audit_logs.json');

export function logAuditEvent(eventType, details = {}, req = null) {
    const entry = {
        timestamp: Date.now(),
        isoTime: new Date().toISOString(),
        event: eventType,
        ip: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || details.ip || 'internal',
        user: req?.user?.username || details.username || 'anonymous',
        role: req?.user?.role || details.role || 'NONE',
        details
    };

    try {
        let logs = [];
        if (fs.existsSync(AUDIT_LOG_FILE)) {
            try {
                logs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf8'));
                if (!Array.isArray(logs)) logs = [];
            } catch (e) {
                logs = [];
            }
        }
        logs.unshift(entry);
        if (logs.length > 5000) logs.pop(); // keep last 5000 entries
        fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error('Audit log write error:', e);
    }
}
