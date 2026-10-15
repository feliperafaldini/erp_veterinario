import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId: string;
  tenantId: string;
}

/** Requisição validada pelo `SelectionTokenGuard` (somente `userId`). */
export interface SelectionRequest extends Request {
  userId: string;
}
