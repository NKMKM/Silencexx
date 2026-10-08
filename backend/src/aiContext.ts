import { AsyncLocalStorage } from 'async_hooks';

export interface AIContext { userId?: number; feature?: string; }
export const aiContext = new AsyncLocalStorage<AIContext>();
