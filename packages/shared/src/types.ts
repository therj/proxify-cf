import * as schemas from './schemas';
import { z } from 'zod';

export type Client = z.infer<typeof schemas.ClientSchema>;
export type Key = z.infer<typeof schemas.KeySchema>;
export type Route = z.infer<typeof schemas.RouteSchema>;
export type RouteHeader = z.infer<typeof schemas.RouteHeaderSchema>;
export type ClientRouteGrant = z.infer<typeof schemas.ClientRouteGrantSchema>;
export type IssuedToken = z.infer<typeof schemas.IssuedTokenSchema>;
export type AuditLog = z.infer<typeof schemas.AuditLogSchema>;
export type AccessLog = z.infer<typeof schemas.AccessLogSchema>;
export type AccessOutcome = (typeof schemas.ACCESS_OUTCOME_VALUES)[number];
