// Console replaced by logger
const bcrypt = require('bcryptjs');
const fs = require('fs/promises');
const path = require('path');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { refreshAccessToken } = require('../services/authService');
const { getJwtSecret } = require('../config/jwtConfig');
const { verifyCaptcha } = require('../services/captchaService');
const {
  isLockedOut,
  registerFailure,
  registerSuccess,
  getLockoutMeta,
} = require('../services/authSecurityService');
const { recordSecurityEvent } = require('../services/securityEventService');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

function isValidEmail(email = '') {
  return /^\S+@\S+\.\S+$/.test(String(email).trim());
}

function signToken(user) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET ausente');
  }
  return jwt.sign(
    {
      userId: user.id,
      clinicId: user.clinicId,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

function serializeUser(user) {
  const publicBase = process.env.PUBLIC_URL
    ? String(process.env.PUBLIC_URL).replace(/\/$/, '')
    : null;
  const normalizeLogo = (logo) => {
    if (!logo) return null;
    if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
    if (publicBase) return `${publicBase}${logo}`;
    return logo;
  };

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || null,
    specialty: user.specialty || null,
    profilePhoto: user.profilePhoto || null,
    signature: user.signature || null,
    crmv: user.crmv || null,
    clinicId: user.clinicId,
    clinicName: user.clinic?.name || null,
    clinic: user.clinic
      ? {
          id: user.clinic.id,
          name: user.clinic.name,
          address: user.clinic.address,
          cnpj: user.clinic.cnpj,
          phone: user.clinic.phone,
          email: user.clinic.email,
          prescriptionTemplate: user.clinic.prescriptionTemplate || null,
          logoUrl: normalizeLogo(user.clinic.logoUrl || null),
        }
      : null,
  };
}

async function register(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '');
    const clinicName = String(req.body?.clinicName || '').trim();

    if (isLockedOut(email, req.ip)) {
      const meta = getLockoutMeta(email, req.ip);
      recordSecurityEvent('auth.register.locked', {
        email,
        ip: req.ip,
        ...meta,
      });
      return res.status(429).json({
        error: `Muitas tentativas. Tente novamente em ${meta?.remainingMinutes || 15} minutos.`,
        lockoutUntil: meta?.lockoutUntil,
      });
    }

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Preencha nome, e-mail e senha para continuar.' });
    }

    if (name.length < 2) {
      return res
        .status(400)
        .json({ error: 'Nome deve ter ao menos 2 caracteres' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Informe um e-mail valido.' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'A senha deve ter no minimo 6 caracteres.' });
    }

    if (!getJwtSecret()) {
      return res.status(500).json({
        error: 'Erro de configuracao do servidor. Tente novamente mais tarde.',
      });
    }

    if (process.env.CAPTCHA_ENABLED === 'true') {
      const captchaToken = String(req.body?.captchaToken || '');
      const captchaValid = await verifyCaptcha(captchaToken, req.ip);
      if (!captchaValid) {
        recordSecurityEvent('auth.register.captcha_failed', {
          email,
          ip: req.ip,
        });
        return res.status(400).json({ error: 'Captcha invalido.' });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      registerFailure(email, req.ip);
      recordSecurityEvent('auth.register.email_exists', {
        email,
        ip: req.ip,
      });
      return res.status(409).json({ error: 'Este e-mail ja esta cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName || `Clinica de ${name}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        clinicId: clinic.id,
      },
      include: { clinic: true },
    });

    const token = signToken(user);
    registerSuccess(email, req.ip);
    recordSecurityEvent('auth.register.success', {
      email,
      ip: req.ip,
      userId: user.id,
    });

    return res.status(201).json({
      message: 'Cadastro realizado com sucesso.',
      token,
      data: {
        user: serializeUser(user),
        token,
      },
    });
  } catch (err) {
    logger.error('register error:', err);
    registerFailure(req.body?.email, req.ip);
    recordSecurityEvent('auth.register.error', {
      email: req.body?.email,
      ip: req.ip,
    });
    const details =
      process.env.NODE_ENV === 'production'
        ? undefined
        : String(err?.message || 'Erro desconhecido');
    return res.status(500).json({
      error: 'Nao foi possivel concluir o cadastro. Tente novamente.',
      ...(details ? { details } : {}),
    });
  }
}

async function login(req, res) {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '');

    if (isLockedOut(email, req.ip)) {
      const meta = getLockoutMeta(email, req.ip);
      recordSecurityEvent('auth.login.locked', {
        email,
        ip: req.ip,
        ...meta,
      });
      return res.status(429).json({
        error: `Muitas tentativas. Tente novamente em ${meta?.remainingMinutes || 15} minutos.`,
        lockoutUntil: meta?.lockoutUntil,
      });
    }

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Informe e-mail e senha para continuar.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Informe um e-mail valido.' });
    }

    if (!getJwtSecret()) {
      return res.status(500).json({
        error: 'Erro de configuracao do servidor. Tente novamente mais tarde.',
      });
    }

    if (process.env.CAPTCHA_ENABLED === 'true') {
      const captchaToken = String(req.body?.captchaToken || '');
      const captchaValid = await verifyCaptcha(captchaToken, req.ip);
      if (!captchaValid) {
        registerFailure(email, req.ip);
        recordSecurityEvent('auth.login.captcha_failed', {
          email,
          ip: req.ip,
        });
        return res.status(400).json({ error: 'Captcha invalido.' });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { clinic: true },
    });

    if (!user) {
      registerFailure(email, req.ip);
      recordSecurityEvent('auth.login.invalid_user', {
        email,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      const state = registerFailure(email, req.ip);
      recordSecurityEvent('auth.login.invalid_password', {
        email,
        ip: req.ip,
        attempts: state?.list?.length || null,
      });
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = signToken(user);
    registerSuccess(email, req.ip);
    recordSecurityEvent('auth.login.success', {
      email,
      ip: req.ip,
      userId: user.id,
    });

    return res.json({
      message: 'Login realizado com sucesso.',
      token,
      data: {
        user: serializeUser(user),
        token,
      },
    });
  } catch (err) {
    logger.error('login error:', err);
    registerFailure(req.body?.email, req.ip);
    recordSecurityEvent('auth.login.error', {
      email: req.body?.email,
      ip: req.ip,
    });
    return res
      .status(500)
      .json({ error: 'Nao foi possivel concluir o login. Tente novamente.' });
  }
}

async function recoverPassword(req, res) {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Informe um e-mail valido.' });
    }

    if (process.env.CAPTCHA_ENABLED === 'true') {
      const captchaToken = String(req.body?.captchaToken || '');
      const captchaValid = await verifyCaptcha(captchaToken, req.ip);
      if (!captchaValid) {
        recordSecurityEvent('auth.recover.captcha_failed', {
          email,
          ip: req.ip,
        });
        return res.status(400).json({ error: 'Captcha invalido.' });
      }
    }

    recordSecurityEvent('auth.recover.request', {
      email,
      ip: req.ip,
    });

    return res.json({
      message:
        'Se o e-mail existir, enviaremos instrucoes para redefinicao da senha.',
    });
  } catch (err) {
    logger.error('recover error:', err);
    recordSecurityEvent('auth.recover.error', {
      email: req.body?.email,
      ip: req.ip,
    });
    return res.status(500).json({
      error: 'Nao foi possivel processar a recuperacao no momento.',
    });
  }
}

async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { clinic: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }

    return res.json(serializeUser(user));
  } catch (err) {
    logger.error('me error:', err);
    return res
      .status(500)
      .json({ error: 'Nao foi possivel carregar sua sessao.' });
  }
}

async function updateProfile(req, res) {
  try {
    const {
      name,
      email,
      crmvNumber,
      crmvState,
      clinicName,
      clinicAddress,
      clinicCNPJ,
      clinicPhone,
      clinicEmail,
      clinicPrescriptionTemplate,
      phone,
      specialty,
      profilePhoto,
      signature,
    } = req.body || {};

    if (!name || !email) {
      return res
        .status(400)
        .json({ error: 'Preencha nome e e-mail para salvar o perfil.' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        email,
        phone: phone || null,
        specialty: specialty || null,
        profilePhoto: profilePhoto || null,
        signature: signature || null,
        crmv: crmvNumber
          ? `${crmvState || ''}${crmvState ? '-' : ''}${crmvNumber}`
          : undefined,
      },
      include: { clinic: true },
    });

    const clinic = await prisma.clinic.update({
      where: { id: user.clinicId },
      data: {
        name: clinicName || user.clinic.name,
        address: clinicAddress ?? user.clinic.address,
        cnpj: clinicCNPJ ?? user.clinic.cnpj,
        phone: clinicPhone ?? user.clinic.phone,
        email: clinicEmail ?? user.clinic.email,
        prescriptionTemplate:
          clinicPrescriptionTemplate ?? user.clinic.prescriptionTemplate,
      },
    });

    const absoluteLogo =
      clinic.logoUrl && !clinic.logoUrl.startsWith('http')
        ? `${req.protocol}://${req.get('host')}${clinic.logoUrl}`
        : clinic.logoUrl || null;

    return res.json({
      ...serializeUser({
        ...user,
        clinic: { ...clinic, logoUrl: absoluteLogo },
      }),
      crmvState: crmvState || null,
      crmvNumber: crmvNumber || null,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        cnpj: clinic.cnpj,
        phone: clinic.phone,
        email: clinic.email,
        prescriptionTemplate: clinic.prescriptionTemplate || null,
        logoUrl: absoluteLogo,
      },
      profilePhoto: profilePhoto || user.profilePhoto || null,
      signature: signature || user.signature || null,
      specialty: specialty || user.specialty || null,
      phone: phone || user.phone || null,
    });
  } catch (err) {
    logger.error('updateProfile error:', err);
    return res
      .status(500)
      .json({ error: 'Nao foi possivel salvar o perfil. Tente novamente.' });
  }
}

function resolveLocalPath(filePath) {
  if (!filePath) return null;
  const cleaned = String(filePath).replace(/^\/+/, '');
  return path.resolve(process.cwd(), cleaned);
}

async function safeDeleteFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      throw err;
    }
  }
}

async function deleteAccount(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Sessao invalida.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { clinic: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }

    const consultationFiles = await prisma.consultationFile.findMany({
      where: { consultation: { userId } },
      select: { path: true, thumbnailPath: true },
    });

    const clinicLogoPath = user.clinic?.logoUrl || null;

    const { clinicId } = user;
    let shouldDeleteClinic = false;

    await prisma.$transaction(async (tx) => {
      await tx.consultationFile.deleteMany({
        where: { consultation: { userId } },
      });
      await tx.consultation.deleteMany({ where: { userId } });
      await tx.patient.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });

      const remaining = await tx.user.count({ where: { clinicId } });
      if (remaining === 0) {
        await tx.clinic.delete({ where: { id: clinicId } });
        shouldDeleteClinic = true;
      }
    });

    const filesToDelete = consultationFiles.flatMap((file) => [
      file.path,
      file.thumbnailPath,
    ]);

    await Promise.all(
      filesToDelete.map(async (filePath) => {
        const resolved = resolveLocalPath(filePath);
        if (!resolved) return;
        try {
          await safeDeleteFile(resolved);
        } catch (err) {
          logger.warn(
            'Falha ao remover arquivo:',
            resolved,
            err?.message || err,
          );
        }
      }),
    );

    if (shouldDeleteClinic && clinicLogoPath) {
      const resolvedLogo = resolveLocalPath(clinicLogoPath);
      try {
        await safeDeleteFile(resolvedLogo);
      } catch (err) {
        logger.warn('Falha ao remover logo da clinica:', err?.message || err);
      }
    }

    return res.json({ message: 'Conta excluida com sucesso.' });
  } catch (err) {
    logger.error('deleteAccount error:', err);
    return res
      .status(500)
      .json({ error: 'Nao foi possivel excluir sua conta. Tente novamente.' });
  }
}

async function refreshToken(req, res) {
  try {
    const refreshTokenValue = req.body?.refreshToken;

    if (!refreshTokenValue) {
      return res.status(400).json({ error: 'Refresh token e obrigatorio.' });
    }

    const result = await refreshAccessToken(refreshTokenValue);

    return res.json({
      message: 'Token atualizado com sucesso.',
      ...result,
    });
  } catch (err) {
    logger.error('refreshToken error:', err);
    const message = err?.message || '';
    if (message.includes('expired')) {
      return res
        .status(401)
        .json({ error: 'Refresh token expirado. Faca login novamente.' });
    }
    return res.status(401).json({ error: 'Refresh token invalido.' });
  }
}

module.exports = {
  register,
  login,
  recoverPassword,
  me,
  updateProfile,
  deleteAccount,
  refreshToken,
};
