/**
 * @file auth.routes.ts
 * @description Authentication routes — customer-facing.
 * PRD §6.2: register, login, OTP, Google SSO, Facebook SSO, refresh, logout,
 * forgot-password, reset-password.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  RegisterSchema,
  LoginSchema,
  OtpSendSchema,
  OtpVerifySchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RefreshTokenSchema,
} from '@pawroute/types';
import * as authService from './auth.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { appConfig } from '@pawroute/config';

async function authRoutes(app: FastifyInstance) {
  // ── POST /auth/register ──────────────────────────────────────────────────
  app.post('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Register a new customer account',
    },
    handler: async (req, reply) => {
      const result = await authService.register(req.body as z.infer<typeof RegisterSchema>);
      reply.code(201).send({ success: true, data: result });
    },
  });

  // ── POST /auth/login ─────────────────────────────────────────────────────
  app.post('/login', {
    schema: {
      tags: ['auth'],
      summary: 'Login with email/phone + password',
    },
    handler: async (req, reply) => {
      const { identifier, password } = req.body as z.infer<typeof LoginSchema>;
      // identifier can be email or phone — normalize to email lookup
      const result = await authService.login({ email: identifier, password });
      reply.send({ success: true, data: result });
    },
  });

  // ── POST /auth/otp/send ──────────────────────────────────────────────────
  app.post('/otp/send', {
    schema: {
      tags: ['auth'],
      summary: 'Send OTP via email or WhatsApp',
    },
    handler: async (req, reply) => {
      const { target, type: channel, name } = req.body as z.infer<typeof OtpSendSchema> & { name: string };

      if (channel === 'whatsapp' && !appConfig.features.whatsappOtp) {
        return reply.code(400).send({ success: false, error: 'WhatsApp OTP is not enabled' });
      }
      if (channel === 'email' && !appConfig.features.emailOtp) {
        return reply.code(400).send({ success: false, error: 'Email OTP is not enabled' });
      }

      await authService.sendOtp(target, channel, name);
      reply.send({ success: true, message: 'OTP sent' });
    },
  });

  // ── POST /auth/otp/verify ────────────────────────────────────────────────
  app.post('/otp/verify', {
    schema: {
      tags: ['auth'],
      summary: 'Verify OTP code',
    },
    handler: async (req, reply) => {
      const { target, otp, channel } = req.body as z.infer<typeof OtpVerifySchema> & { channel: 'email' | 'whatsapp' };
      const valid = await authService.verifyOtp(target, otp, channel);
      if (!valid) {
        return reply.code(400).send({ success: false, error: 'Invalid or expired OTP' });
      }
      reply.send({ success: true, message: 'OTP verified' });
    },
  });

  // ── POST /auth/refresh ───────────────────────────────────────────────────
  app.post('/refresh', {
    schema: {
      tags: ['auth'],
      summary: 'Rotate access + refresh token pair',
    },
    handler: async (req, reply) => {
      const { refreshToken } = req.body as z.infer<typeof RefreshTokenSchema>;
      const result = await authService.refreshAccessToken(refreshToken);
      reply.send({ success: true, data: result });
    },
  });

  // ── POST /auth/logout ────────────────────────────────────────────────────
  app.post('/logout', {
    preHandler: [requireAuth],
    schema: { tags: ['auth'], summary: 'Revoke refresh token and log out' },
    handler: async (req, reply) => {
      await authService.logout(req.user!.id);
      reply.send({ success: true, message: 'Logged out' });
    },
  });

  // ── POST /auth/forgot-password ───────────────────────────────────────────
  app.post('/forgot-password', {
    schema: {
      tags: ['auth'],
      summary: 'Send password reset email',
    },
    handler: async (req, reply) => {
      const { email } = req.body as z.infer<typeof ForgotPasswordSchema>;
      await authService.forgotPassword(email);
      // Always 200 — prevents email enumeration
      reply.send({
        success: true,
        message: 'If that email is registered, a reset link has been sent.',
      });
    },
  });

  // ── POST /auth/reset-password ────────────────────────────────────────────
  app.post('/reset-password', {
    schema: {
      tags: ['auth'],
      summary: 'Reset password using token from email',
    },
    handler: async (req, reply) => {
      const { token, newPassword } = req.body as z.infer<typeof ResetPasswordSchema>;
      await authService.resetPassword(token, newPassword);
      reply.send({ success: true, message: 'Password reset successfully' });
    },
  });

  // ── POST /auth/google ────────────────────────────────────────────────────
  app.post('/google', {
    schema: {
      tags: ['auth'],
      summary: 'Sign in / sign up with Google ID token',
    },
    handler: async (req, reply) => {
      if (!appConfig.features.googleSso) {
        return reply.code(400).send({ success: false, error: 'Google SSO is not enabled' });
      }
      const { idToken } = req.body as { idToken: string };
      const profile = await verifyGoogleToken(idToken);
      const result = await authService.googleSso(profile);
      reply.send({ success: true, data: result });
    },
  });

  // ── POST /auth/facebook ──────────────────────────────────────────────────
  app.post('/facebook', {
    schema: {
      tags: ['auth'],
      summary: 'Sign in / sign up with Facebook access token',
    },
    handler: async (req, reply) => {
      if (!appConfig.features.facebookSso) {
        return reply.code(400).send({ success: false, error: 'Facebook SSO is not enabled' });
      }
      const { accessToken: fbToken } = req.body as { accessToken: string };
      const profile = await verifyFacebookToken(fbToken);
      const result = await authService.facebookSso(profile);
      reply.send({ success: true, data: result });
    },
  });

  // ── GET /auth/me ─────────────────────────────────────────────────────────
  app.get('/me', {
    preHandler: [requireAuth],
    schema: { tags: ['auth'], summary: 'Get current authenticated user' },
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profilePhoto: true,
          otpVerified: true,
          createdAt: true,
        },
      });
      if (!user) return reply.code(404).send({ success: false, error: 'User not found' });
      reply.send({ success: true, data: user });
    },
  });
}

// ─── OAuth token verification helpers ────────────────────────────────────────

async function verifyGoogleToken(idToken: string): Promise<authService.GoogleProfile> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  if (!res.ok) throw Object.assign(new Error('Invalid Google token'), { statusCode: 401 });

  const data = (await res.json()) as {
    sub: string;
    email: string;
    name: string;
    picture?: string;
    email_verified?: string;
  };

  if (!data.sub) throw Object.assign(new Error('Invalid Google token'), { statusCode: 401 });

  return {
    googleId: data.sub,
    email: data.email,
    name: data.name,
    avatarUrl: data.picture,
    emailVerified: data.email_verified === 'true',
  };
}

async function verifyFacebookToken(accessToken: string): Promise<authService.FacebookProfile> {
  const res = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
  );
  if (!res.ok) throw Object.assign(new Error('Invalid Facebook token'), { statusCode: 401 });

  const data = (await res.json()) as {
    id: string;
    name: string;
    email: string;
    picture?: { data?: { url?: string } };
  };

  return {
    facebookId: data.id,
    email: data.email,
    name: data.name,
    avatarUrl: data.picture?.data?.url,
  };
}

export default authRoutes;
