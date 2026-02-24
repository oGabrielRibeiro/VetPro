/**
 * OAuth Service - VetPro
 * Implementa login com Google OAuth 2.0
 */

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const prisma = require('../lib/prisma');

class OAuthService {
  constructor() {
    this.clientID = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.callbackURL = process.env.GOOGLE_CALLBACK_URL;
    this.initialized = false;
  }

  /**
   * Inicializa a estratégia Google OAuth
   */
  initialize() {
    if (!this.clientID || !this.clientSecret) {
      console.log('ℹ️ Google OAuth não configurado (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)');
      return false;
    }

    try {
      const strategy = new GoogleStrategy(
        {
          clientID: this.clientID,
          clientSecret: this.clientSecret,
          callbackURL: this.callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await this.findOrCreateUser(profile);
            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        },
      );

      passport.use(strategy);
      this.initialized = true;
      console.log('✅ Google OAuth configurado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar Google OAuth:', error);
      return false;
    }
  }

  /**
   * Busca ou cria usuário baseado no perfil Google
   */
  async findOrCreateUser(profile) {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const displayName = profile.displayName;
    const givenName = profile.name?.givenName;
    const familyName = profile.name?.familyName;
    const photo = profile.photos?.[0]?.value;

    if (!email) {
      throw new Error('Email não disponível no perfil Google');
    }

    // Busca usuário existente pelo Google ID
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { clinic: true },
    });

    if (user) {
      // Atualiza Google ID se não existir
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, profilePhoto: photo || user.profilePhoto },
          include: { clinic: true },
        });
      }
      return user;
    }

    // Novo usuário - requer clínica
    // Retorna dados para criação com clínica
    return {
      isNew: true,
      googleId,
      email,
      name: displayName || `${givenName} ${familyName}`.trim(),
      firstName: givenName,
      lastName: familyName,
      photo,
    };
  }

  /**
   * Cria novo usuário com clínica padrão
   */
  async createUserWithClinic(userData, clinicData) {
    const { Clinic, User } = prisma;

    // Cria clínica se não existir
    let clinic = await Clinic.findFirst({
      where: { name: clinicData.name },
    });

    if (!clinic) {
      clinic = await Clinic.create({
        data: {
          name: clinicData.name || 'Minha Clínica',
          cnpj: clinicData.cnpj,
          address: clinicData.address,
        },
      });
    }

    // Cria usuário vinculado à clínica
    const user = await User.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: 'oauth_google', // Senha placeholder para OAuth
        googleId: userData.googleId,
        profilePhoto: userData.photo,
        clinicId: clinic.id,
      },
      include: { clinic: true },
    });

    return user;
  }

  /**
   * Serializa usuário para sessão
   */
  serializeUser() {
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });
  }

  /**
   * Deserializa usuário da sessão
   */
  deserializeUser() {
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id },
          include: { clinic: true },
        });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Gera URL de autorização Google
   */
  getAuthUrl() {
    if (!this.initialized) {
      return null;
    }

    const scope = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientID,
      redirect_uri: this.callbackURL,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Verifica se OAuth está configurado
   */
  isConfigured() {
    return this.initialized;
  }

  /**
   * Retorna configuração pública
   */
  getPublicConfig() {
    return {
      googleOAuthEnabled: this.initialized,
    };
  }
}

module.exports = new OAuthService();
