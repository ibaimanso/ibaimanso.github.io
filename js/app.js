// ============================================================
// app.js — Controlador principal de la aplicación
// ============================================================
import { store } from './store.js';
import { sync } from './sync.js';
import { shopping } from './shopping.js';
import { menu } from './menu.js';
import { settingsModule } from './settings.js';
import { ICONS } from './utils.js';

class App {
  constructor() {
    this.currentPage = 'shopping';
    this.pages = { shopping, menu, settings: settingsModule };
  }

  async init() {
    // Activar sincronización entre pestañas
    store.enableTabSync();

    // Aplicar tema oscuro si estaba activado
    const settings = store.getSettings();
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Inicializar navegación
    this._initNav();

    // Inicializar módulos
    shopping.init(document.getElementById('page-shopping'));
    menu.init(document.getElementById('page-menu'));
    settingsModule.init(document.getElementById('page-settings'));

    // Reconexión automática
    if (settings.roomId) {
      setTimeout(() => sync.autoReconnect(), 1000);
    }

    // Indicador de estado de sincronización
    sync.onStatusChange((status, detail) => {
      this._updateSyncIndicator(status, detail);
    });

    // Listeners para sincronizar cambios con otros peers
    store.on('settings', (s) => {
      if (s.darkMode !== undefined) {
        document.documentElement.setAttribute('data-theme', s.darkMode ? 'dark' : 'light');
      }
    });

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js');
      } catch { /* ignorar */ }
    }

    // Mostrar la página actual
    this.navigateTo(this.currentPage);
  }

  _initNav() {
    const nav = document.getElementById('app-nav');
    if (!nav) return;

    // Inyectar iconos en la nav
    const buttons = nav.querySelectorAll('[data-page]');
    buttons.forEach((btn) => {
      const page = btn.dataset.page;
      const iconEl = btn.querySelector('.nav-icon');
      if (iconEl) {
        switch (page) {
          case 'shopping': iconEl.innerHTML = ICONS.cart; break;
          case 'menu': iconEl.innerHTML = ICONS.calendar; break;
          case 'settings': iconEl.innerHTML = ICONS.settings; break;
        }
      }
      btn.addEventListener('click', () => this.navigateTo(page));
    });
  }

  navigateTo(page) {
    this.currentPage = page;

    // Actualizar páginas
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('page--active', p.id === `page-${page}`);
    });

    // Actualizar nav
    document.querySelectorAll('#app-nav [data-page]').forEach(btn => {
      btn.classList.toggle('nav-btn--active', btn.dataset.page === page);
    });

    // Actualizar título
    const titles = {
      shopping: 'Lista de la compra',
      menu: 'Menú semanal',
      settings: 'Ajustes'
    };
    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.textContent = titles[page] || 'FamiList';
  }

  _updateSyncIndicator(status, detail) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;

    const statusMap = {
      disconnected: { class: '', text: '', icon: '' },
      hosting: { class: 'sync--hosting', text: `Sala: ${detail}`, icon: ICONS.link },
      connected: { class: 'sync--connected', text: 'Conectado', icon: ICONS.link },
      connecting: { class: 'sync--connecting', text: 'Conectando...', icon: ICONS.refresh },
      reconnecting: { class: 'sync--reconnecting', text: 'Reconectando...', icon: ICONS.refresh },
      error: { class: 'sync--error', text: 'Error', icon: ICONS.x }
    };

    const s = statusMap[status] || statusMap.disconnected;
    indicator.className = `sync-indicator ${s.class}`;
    indicator.innerHTML = s.icon ? `<span class="sync-indicator__icon">${s.icon}</span><span class="sync-indicator__text">${s.text}</span>` : '';
  }
}

// Iniciar la app cuando el DOM esté listo
const app = new App();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
