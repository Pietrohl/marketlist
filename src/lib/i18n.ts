export type Locale = 'en' | 'pt-BR';
export type Messages = Record<string, string>;

export function getPreferredLocale(): Locale {
  try {
    const saved = localStorage.getItem('gather-language-v1');
    if (saved === 'en' || saved === 'pt-BR') return saved;
  } catch { /* Browser storage may be unavailable. */ }
  const browserLocale = navigator.languages?.[0] ?? navigator.language ?? 'en';
  return browserLocale.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export async function loadMessages(locale: Locale): Promise<Messages> {
  const response = await fetch(`${import.meta.env.BASE_URL}locales/${locale}.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Translation asset failed: ${response.status}`);
  const messages: unknown = await response.json();
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) throw new Error('Invalid translation asset');
  for (const value of Object.values(messages)) {
    if (typeof value !== 'string') throw new Error('Invalid translation message');
  }
  return messages as Messages;
}

export function translate(messages: Messages, key: string, values: Record<string, string | number> = {}): string {
  const template = messages[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
