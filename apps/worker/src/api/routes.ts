import { Hono } from 'hono';
import type { Env } from '../env';
import { healthRoutes } from '../health/routes';

/** Unauthenticated JSON under `/api/*`. Mount segments with `publicApiRoutes.route('/x', subApp)`. */
export const publicApiRoutes = new Hono<{ Bindings: Env }>();

publicApiRoutes.route('/health', healthRoutes);
