import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { authenticateUser } from '../../services/authService.js';
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
    .mutation(async ({ input }) => {
      const result = await authenticateUser(input.email, input.password);
      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error || 'Identifiants invalides',
        });
      }

      return {
        user: result.user,
        token: result.token,
      };
    }),

  loginWithGoogle: publicProcedure
    .input(
      z.object({
        email: z.string().email('Adresse email Google invalide'),
        name: z.string().optional(),
        googleId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { authenticateOrRegisterGoogleUser } = await import('../../services/authService.js');
      const result = await authenticateOrRegisterGoogleUser(input);
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Erreur lors de la connexion Google',
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

  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),
});
