import { Injectable } from '@angular/core';
import { PersistenceService, PersistenceSaveOptions } from './persistence.service';

@Injectable({ providedIn: 'root' })
export class LocalStoragePersistenceService implements PersistenceService {

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  private _obfuscateKey(key: string): string {
    return btoa(key.split('').reverse().join(''));
  }

  private _deobfuscateKey(obfuscated: string): string {
    return atob(obfuscated).split('').reverse().join('');
  }

  save<T>(key: string, value: T, options?: PersistenceSaveOptions): void {
    if (!this.isLocalStorageAvailable()) return;

    if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
      this.remove(key);
      return;
    }

    // First, get a string representation of the value.
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Then, obfuscate if required.
    const valueToStore = options?.obfuscate ? this._obfuscateKey(stringValue) : stringValue;
    
    localStorage.setItem(key, valueToStore);
  }

  load<T>(key: string, options?: PersistenceSaveOptions): T | null {
    if (!this.isLocalStorageAvailable()) return null;

    const storedValue = localStorage.getItem(key);
    if (!storedValue) return null;

    try {
      // Deobfuscate if required.
      const stringValue = options?.obfuscate ? this._deobfuscateKey(storedValue) : storedValue;

      // Now, try to parse it. If it fails, it's likely a raw string that was stored.
      try {
        return JSON.parse(stringValue) as T;
      } catch (jsonError) {
        // This handles simple strings that were stored without being JSON.stringified.
        return stringValue as T;
      }
    } catch(e) {
        // This outer catch handles errors from deobfuscation (like atob).
        console.error(`Failed to process item from local storage with key "${key}". Clearing it.`, e);
        this.remove(key);
        return null;
    }
  }

  remove(key: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
  }
}