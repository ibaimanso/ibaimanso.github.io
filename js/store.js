// ============================================================
// store.js — Gestión de estado local con localStorage
// ============================================================
import { generateId, getMonday, formatDateKey } from './utils.js';

const STORAGE_KEY = 'familist_data';
const VERSION = 1;

// Estado por defecto
function defaultState() {
  return {
    version: VERSION,
    shopping: [],      // [{id, name, category, quantity, unit, checked, addedAt, checkedAt}]
    menu: {
      weekStart: formatDateKey(getMonday()),
      days: {
        lunes:    { primero: null, segundo: null, cena: null },
        martes:   { primero: null, segundo: null, cena: null },
        miércoles:{ primero: null, segundo: null, cena: null },
        jueves:   { primero: null, segundo: null, cena: null },
        viernes:  { primero: null, segundo: null, cena: null },
        sábado:   { primero: null, segundo: null, cena: null },
        domingo:  { primero: null, segundo: null, cena: null }
      }
    },
    settings: {
      familySize: 4,
      darkMode: false,
      roomId: null,
      deviceId: generateId(),
      isHost: false,
      excludedTags: [],
      preferredTags: ['proteína']
    },
    lastModified: Date.now()
  };
}

class Store {
  constructor() {
    this._state = null;
    this._listeners = new Map();
    this._load();
  }

  // Cargar estado de localStorage
  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._state = { ...defaultState(), ...parsed };
        // Asegurar que deviceId existe
        if (!this._state.settings.deviceId) {
          this._state.settings.deviceId = generateId();
        }
      } else {
        this._state = defaultState();
      }
    } catch {
      this._state = defaultState();
    }
    this._save();
  }

  // Guardar estado en localStorage
  _save() {
    this._state.lastModified = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch { /* storage full — ignorar */ }
  }

  // Obtener el estado completo (copia)
  getAll() {
    return JSON.parse(JSON.stringify(this._state));
  }

  // Obtener un valor
  get(key) {
    return JSON.parse(JSON.stringify(this._state[key]));
  }

  // ─── Shopping List ──────────────────────────

  getShoppingList() {
    return [...this._state.shopping];
  }

  addShoppingItem(item) {
    const newItem = {
      id: generateId(),
      name: item.name,
      category: item.category || 'Otros',
      quantity: item.quantity || 1,
      unit: item.unit || 'ud',
      checked: false,
      addedAt: Date.now(),
      checkedAt: null
    };
    this._state.shopping.push(newItem);
    this._save();
    this._emit('shopping');
    return newItem;
  }

  updateShoppingItem(id, updates) {
    const idx = this._state.shopping.findIndex(i => i.id === id);
    if (idx === -1) return null;
    Object.assign(this._state.shopping[idx], updates);
    if (updates.checked !== undefined) {
      this._state.shopping[idx].checkedAt = updates.checked ? Date.now() : null;
    }
    this._save();
    this._emit('shopping');
    return this._state.shopping[idx];
  }

  removeShoppingItem(id) {
    this._state.shopping = this._state.shopping.filter(i => i.id !== id);
    this._save();
    this._emit('shopping');
  }

  toggleShoppingItem(id) {
    const item = this._state.shopping.find(i => i.id === id);
    if (!item) return;
    item.checked = !item.checked;
    item.checkedAt = item.checked ? Date.now() : null;
    this._save();
    this._emit('shopping');
  }

  clearShoppingList() {
    this._state.shopping = [];
    this._save();
    this._emit('shopping');
  }

  clearCheckedItems() {
    this._state.shopping = this._state.shopping.filter(i => !i.checked);
    this._save();
    this._emit('shopping');
  }

  // ─── Weekly Menu ────────────────────────────

  getMenu() {
    return JSON.parse(JSON.stringify(this._state.menu));
  }

  setMenu(menu) {
    this._state.menu = menu;
    this._save();
    this._emit('menu');
  }

  setMeal(day, meal, recipe) {
    if (!this._state.menu.days[day]) return;
    this._state.menu.days[day][meal] = recipe;
    this._save();
    this._emit('menu');
  }

  // ─── Settings ───────────────────────────────

  getSettings() {
    return { ...this._state.settings };
  }

  updateSettings(updates) {
    Object.assign(this._state.settings, updates);
    this._save();
    this._emit('settings');
  }

  // ─── Sincronización ─────────────────────────

  // Importar estado completo (desde otro peer)
  importState(remoteState) {
    if (!remoteState) return;
    // Merging shopping lists (unión por id)
    if (remoteState.shopping) {
      const localMap = new Map(this._state.shopping.map(i => [i.id, i]));
      for (const item of remoteState.shopping) {
        const local = localMap.get(item.id);
        if (!local) {
          localMap.set(item.id, item);
        } else {
          // LWW por item
          const localTime = local.checkedAt || local.addedAt;
          const remoteTime = item.checkedAt || item.addedAt;
          if (remoteTime > localTime) {
            localMap.set(item.id, item);
          }
        }
      }
      this._state.shopping = Array.from(localMap.values());
    }
    // Menu: LWW
    if (remoteState.menu && remoteState.lastModified > this._state.lastModified) {
      this._state.menu = remoteState.menu;
    }
    // Settings parciales (preservar deviceId y roomId locales)
    if (remoteState.settings) {
      const localDeviceId = this._state.settings.deviceId;
      const localRoomId = this._state.settings.roomId;
      const localIsHost = this._state.settings.isHost;
      this._state.settings = {
        ...this._state.settings,
        familySize: remoteState.settings.familySize,
        darkMode: remoteState.settings.darkMode,
        excludedTags: remoteState.settings.excludedTags || [],
        preferredTags: remoteState.settings.preferredTags || ['proteína']
      };
      this._state.settings.deviceId = localDeviceId;
      this._state.settings.roomId = localRoomId;
      this._state.settings.isHost = localIsHost;
    }
    this._save();
    this._emit('shopping');
    this._emit('menu');
    this._emit('settings');
  }

  // Exportar estado para sync
  exportState() {
    return this.getAll();
  }

  // ─── Event system ───────────────────────────

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event).delete(callback);
  }

  _emit(event) {
    const cbs = this._listeners.get(event);
    if (cbs) cbs.forEach(cb => cb(this._state[event]));
    // BroadcastChannel para sincronizar pestañas
    if (this._bc) {
      this._bc.postMessage({ event, data: this._state[event], ts: Date.now() });
    }
  }

  // Activar sincronización entre pestañas
  enableTabSync() {
    if (typeof BroadcastChannel === 'undefined') return;
    this._bc = new BroadcastChannel('familist_sync');
    this._bc.onmessage = (e) => {
      const { event, data } = e.data;
      if (event && data) {
        this._state[event] = data;
        this._save();
        const cbs = this._listeners.get(event);
        if (cbs) cbs.forEach(cb => cb(data));
      }
    };
  }
}

// Singleton
export const store = new Store();
