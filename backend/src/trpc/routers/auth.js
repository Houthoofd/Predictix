import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { authenticateUser, changeUserPassword } from '../../services/authService.js';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email('Adresse email invalide'),
        password: z.string().min(4, 'Le mot de passe doit comporter au moins 4 caractères'),
        rememberMe: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const clientIp = ctx.clientIp || '127.0.0.1';
      const result = await authenticateUser(input.email, input.password, clientIp);
      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error || 'Identifiants invalides',
        });
      }

      // Secure HTTP-Only cookie emission
      if (ctx.res && ctx.res.cookie) {
        const isHttps = ctx.req?.secure || ctx.req?.headers?.['x-forwarded-proto'] === 'https';
        ctx.res.cookie('predictix_session', result.token, {
          httpOnly: true,
          secure: isHttps || process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: input.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        });
      }

      return {
        user: result.user,
        token: result.token,
      };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
        newPassword: z.string().min(8, 'Le nouveau mot de passe doit comporter au moins 8 caractères'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await changeUserPassword(ctx.user.id, input.currentPassword, input.newPassword);
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Impossible de mettre à jour le mot de passe',
        });
      }
      return { success: true };
    }),

  loginWithGoogle: publicProcedure
    .input(
      z.object({
        email: z.string().email('Adresse email Google invalide'),
        name: z.string().optional(),
        googleId: z.string().optional(),
        idToken: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { authenticateOrRegisterGoogleUser } = await import('../../services/authService.js');
      const result = await authenticateOrRegisterGoogleUser(input);
      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error || 'Erreur lors de la connexion Google',
        });
      }

      // Secure HTTP-Only cookie emission
      if (ctx.res && ctx.res.cookie) {
        const isHttps = ctx.req?.secure || ctx.req?.headers?.['x-forwarded-proto'] === 'https';
        ctx.res.cookie('predictix_session', result.token, {
          httpOnly: true,
          secure: isHttps || process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }

      return {
        user: result.user,
        token: result.token,
      };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user || null;
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.res && ctx.res.clearCookie) {
      ctx.res.clearCookie('predictix_session');
    }
    return { success: true };
  }),
});

