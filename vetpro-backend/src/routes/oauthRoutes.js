const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const oauthService = require('../services/oauthService');
const authService = require('../services/authService');
const logger = require('../utils/logger');

const { issueTokensForUser } = authService;

const OAUTH_CODE_TTL_MS = 5 * 60 * 1000;
const oauthCodeStore = new Map();

function createOauthCode(payload) {
  const now = Date.now();
  for (const [storedCode, stored] of oauthCodeStore.entries()) {
    if (now > Number(stored?.expiresAt || 0)) {
      oauthCodeStore.delete(storedCode);
    }
  }

  const code = randomUUID().replace(/-/g, '');
  oauthCodeStore.set(code, {
    payload,
    expiresAt: now + OAUTH_CODE_TTL_MS,
  });
  return code;
}

function consumeOauthCode(code = '') {
  const key = String(code || '').trim();
  if (!key) return null;
  const stored = oauthCodeStore.get(key);
  if (!stored) return null;
  oauthCodeStore.delete(key);
  if (Date.now() > Number(stored.expiresAt || 0)) return null;
  return stored.payload || null;
}

const router = express.Router();

// Inicializa OAuth
oauthService.initialize();
oauthService.serializeUser();
oauthService.deserializeUser();

// Rota de configuração pública
router.get('/config', (req, res) => {
  res.json(oauthService.getPublicConfig());
});

// Rota para iniciar login Google
router.get('/google', (req, res) => {
  const authUrl = oauthService.getAuthUrl();
  if (!authUrl) {
    return res.status(503).json({ error: 'Google OAuth não configurado' });
  }
  return res.json({ url: authUrl });
});

// Callback do Google
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const { user } = req;

      // Se é novo usuário, redireciona para completar cadastro
      if (user.isNew) {
        const tempToken = jwt.sign({ tempUser: user }, process.env.JWT_SECRET, {
          expiresIn: '15m',
        });
        const code = createOauthCode({
          type: 'complete-register',
          token: tempToken,
        });
        return res.redirect(
          `${process.env.FRONTEND_URL}/oauth/complete-register?code=${code}`,
        );
      }

      // Gera tokens
      const tokens = await issueTokensForUser(user, req, {
        twoFactorVerified: !user.twoFactorEnabled,
      });
      const code = createOauthCode({
        type: 'auth',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      // Redireciona sem token em query (somente code de uso unico)
      return res.redirect(
        `${process.env.FRONTEND_URL}/oauth/callback?code=${code}`,
      );
    } catch (error) {
      logger.error('OAuth callback error', { error: error.message });
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
      );
    }
  },
);

// Troca code por payload de auth/registro (uso unico)
router.post('/exchange-code', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Code e obrigatorio.' });
    }

    const payload = consumeOauthCode(code);
    if (!payload) {
      return res.status(400).json({ error: 'Code invalido ou expirado.' });
    }

    return res.json(payload);
  } catch (error) {
    logger.error('OAuth exchange-code error', { error: error.message });
    return res.status(500).json({ error: 'Erro ao trocar code OAuth.' });
  }
});

// Completar registro (para novos usuários)
router.post('/complete-register', async (req, res) => {
  try {
    const { token, clinicName, clinicCnpj, clinicAddress } = req.body;

    // Verifica token temporário
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.tempUser) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Cria usuário com clínica
    const user = await oauthService.createUserWithClinic(decoded.tempUser, {
      name: clinicName,
      cnpj: clinicCnpj,
      address: clinicAddress,
    });

    // Gera tokens
    const tokens = await issueTokensForUser(user, req, {
      twoFactorVerified: !user.twoFactorEnabled,
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clinic: user.clinic,
      },
      ...tokens,
    });
  } catch (error) {
    logger.error('Complete register error', { error: error.message });
    return res.status(500).json({ error: 'Erro ao completar registro' });
  }
});

module.exports = router;
