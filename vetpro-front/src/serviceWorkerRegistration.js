// serviceWorkerRegistration.js

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config = {}) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const baseUrl =
        (typeof import.meta !== 'undefined' &&
          import.meta.env &&
          import.meta.env.BASE_URL) ||
        '/';
      const swUrl = new URL('service-worker.js', window.location.origin + baseUrl)
        .toString();

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch(() => {
        // ignore unregister errors
      });
  }
}

function notifyUpdate(registration) {
  window.dispatchEvent(
    new CustomEvent('vetpro:sw-update-available', { detail: { registration } }),
  );
}

function registerValidSW(swUrl, config = {}) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Service Worker registrado');
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate(registration);
            if (typeof config.onUpdate === 'function') {
              config.onUpdate(registration);
            }
          }
        };
      };
      if (typeof config.onSuccess === 'function') {
        config.onSuccess(registration);
      }
    })
    .catch(error => {
      console.error('Erro ao registrar Service Worker:', error);
    });
}

function checkValidServiceWorker(swUrl, config = {}) {
  fetch(swUrl)
    .then(response => {
      if (
        response.status === 404 ||
        response.headers.get('content-type').indexOf('javascript') === -1
      ) {
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('Sem conexão. Rodando offline.');
    });
}
