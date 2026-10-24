import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import App from './App';
import './styles.css';
import { getPreferredLocale, loadMessages, translate, type Locale } from './lib/i18n';
import { loadStoredState, resetStoredState } from './lib/storage';
import type { Messages } from './lib/i18n';

const root = document.getElementById('root')!;
const shell = (title: string, body: string, action?: string, onClick?: () => void) => {
  root.innerHTML = `<main class="startup-state"><h1>${title}</h1><p>${body}</p>${action ? '<button id="startup-retry" type="button">' + action + '</button>' : ''}</main>`;
  if (onClick) document.getElementById('startup-retry')?.addEventListener('click', onClick);
};

async function start() {
  shell('Loading Gather…', '');
  const locale = getPreferredLocale();
  try {
    const messages = await loadMessages(locale);
    const stored = loadStoredState();
    const [currentLocale, setCurrentLocale] = createSignal<Locale>(locale);
    const [currentMessages, setCurrentMessages] = createSignal<Messages>(messages);
    const t = (key: string, values: Record<string, string | number> = {}) => translate(currentMessages(), key, values);
    const setPageLanguage = (nextLocale: Locale) => {
      document.documentElement.lang = nextLocale;
      document.title = translate(currentMessages(), 'appTitle');
      document.querySelector('meta[name="description"]')?.setAttribute('content', translate(currentMessages(), 'pageDescription'));
    };
    const toggleLocale = async () => {
      const next: Locale = currentLocale() === 'en' ? 'pt-BR' : 'en';
      try {
        const nextMessages = await loadMessages(next);
        setCurrentMessages(nextMessages);
        setCurrentLocale(next);
        document.documentElement.lang = next;
        document.title = translate(nextMessages, 'appTitle');
        document.querySelector('meta[name="description"]')?.setAttribute('content', translate(nextMessages, 'pageDescription'));
        try { localStorage.setItem('gather-language-v1', next); } catch { /* Language still changes for this session. */ }
      } catch {
        // Keep the current language active if the other asset cannot be loaded.
      }
    };
    setPageLanguage(locale);
    root.replaceChildren();
    render(() => <App
      initialState={stored.state}
      storageCorrupt={stored.corrupt}
      storageUnavailable={stored.unavailable}
      locale={currentLocale}
      t={t}
      onToggleLocale={toggleLocale}
      onReset={() => { resetStoredState(); window.location.reload(); }}
    />, root);
  } catch {
    shell('Gather could not start', 'The language file could not be loaded. Check your connection and try again.', 'Try again', () => void start());
  }
}

void start();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => undefined);
  });
}
