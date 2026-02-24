const express = require('express');
const passport = require('passport');
const oauthService = require('../services/oauthService');
const authService = require('../services/authService');
const { generateTokens } = authService;

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
  res.json({ url: authUrl });
});

// Callback do Google
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      // Se é novo usuário, redireciona para completar cadastro
      if (user.isNew) {
        const tempToken = require('jsonwebtoken').sign(
          { tempUser: user },
          process.env.JWT_SECRET,
          { expiresIn: '15m' },
        );
        return res.redirect(
          `${process.env.FRONTEND_URL}/oauth/complete-register?token=${tempToken}`,
        );
      }

      // Gera tokens
      const tokens = generateTokens(user);

      // Redireciona com tokens
      res.redirect(
        `${process.env.FRONTEND_URL}/oauth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`,
      );
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  },
);

// Completar registro (para novos usuários)
router.post('/complete-register', async (req, res) => {
  try {
    const { token, clinicName, clinicCnpj, clinicAddress } = req.body;

    // Verifica token temporário
    const decoded = require('jsonwebtoken').verify(
      token,
      process.env.JWT_SECRET,
    );

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
    const tokens = generateTokens(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clinic: user.clinic,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Complete register error:', error);
    res.status(500).json({ error: 'Erro ao completar registro' });
  }
});

module.exports = router;
