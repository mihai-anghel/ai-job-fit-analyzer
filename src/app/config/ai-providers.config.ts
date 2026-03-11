// This file serves as the single source of truth for AI provider configuration.
// By centralizing this information, we can derive types and constants automatically,
// ensuring type safety and making it easy to add or modify providers in the future.

// 1. The Core Configuration Object
// To add a new provider, simply add a new entry to this object.
export const AI_PROVIDERS_CONFIG = {
  gemini: {
    models: ['gemini-2.5-flash'],
    defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    envApiUrlKey: 'GEMINI_API_URL',
  },
  openai: {
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultApiUrl: 'https://api.openai.com/v1/chat/completions',
    envApiUrlKey: 'OPENAI_API_URL',
  },
  anthropic: {
    models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    defaultApiUrl: 'https://api.anthropic.com/v1/messages',
    envApiUrlKey: 'ANTHROPIC_API_URL',
  }
} as const; // 'as const' is crucial for deriving a strict type.


// 2. Derived Type
// This generates the `AiProvider` type automatically from the keys of the config object.
// If you add a new provider to the config, it will automatically be included in this type.
export type AiProvider = keyof typeof AI_PROVIDERS_CONFIG;


// 3. Derived Constants
// These constants are derived from the single source of truth above, eliminating
// the need for hardcoded, parallel arrays or objects elsewhere in the application.

// An array of all available provider names.
export const AVAILABLE_PROVIDERS: AiProvider[] = Object.keys(AI_PROVIDERS_CONFIG) as AiProvider[];

// A map of providers to their available models.
export const AVAILABLE_MODELS = Object.entries(AI_PROVIDERS_CONFIG).reduce((acc, [provider, config]) => {
  acc[provider as AiProvider] = config.models;
  return acc;
}, {} as { [key in AiProvider]: readonly string[] });

// A map of providers to their default model (the first one in their list).
export const DEFAULT_MODELS = Object.entries(AI_PROVIDERS_CONFIG).reduce((acc, [provider, config]) => {
  acc[provider as AiProvider] = config.models[0];
  return acc;
}, {} as { [key in AiProvider]: string });

const runtimeEnv = (globalThis as any)?.process?.env as Record<string, string | undefined> | undefined;

export function getProviderApiUrl(provider: AiProvider): string {
  const config = AI_PROVIDERS_CONFIG[provider];
  const override = runtimeEnv?.[config.envApiUrlKey]?.trim();
  return override || config.defaultApiUrl;
}
