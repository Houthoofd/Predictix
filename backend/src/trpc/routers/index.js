import { router } from '../trpc.js';
import { authRouter } from './auth.js';
import { sportsRouter } from './sports.js';

export const appRouter = router({
  auth: authRouter,
  sports: sportsRouter,
});

export default appRouter;
