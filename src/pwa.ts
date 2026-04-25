/**
 * Registers the service worker that powers offline and install-to-home-screen.
 *
 * Only runs in production builds. In development Vite's own hot-module runtime
 * would be cached by the SW, which breaks HMR.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // Don't crash the app if registration fails — the site still works
      // as a regular SPA. Log so it shows up in Sentry etc. once wired.
      console.warn('[sushi] service worker registration failed', err);
    });
  });
}
