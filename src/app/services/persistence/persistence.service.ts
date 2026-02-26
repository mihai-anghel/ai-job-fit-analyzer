import { InjectionToken } from '@angular/core';

export interface PersistenceSaveOptions {
  obfuscate?: boolean;
}

export interface PersistenceService {
  save<T>(key: string, value: T, options?: PersistenceSaveOptions): void;
  load<T>(key: string, options?: PersistenceSaveOptions): T | null;
  remove(key: string): void;
}

export const PERSISTENCE_SERVICE = new InjectionToken<PersistenceService>('PERSISTENCE_SERVICE');
