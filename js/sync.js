// ============================================================
// sync.js — Sincronización P2P entre dispositivos con PeerJS
// ============================================================
import { store } from './store.js';
import { showToast, generateRoomCode } from './utils.js';

class SyncManager {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.roomId = null;
    this.isHost = false;
    this._statusCallback = null;
    this._reconnectTimer = null;
    this._peerReady = false;
  }

  // Callback para actualizar UI de estado de conexión
  onStatusChange(cb) {
    this._statusCallback = cb;
  }

  _setStatus(status, detail = '') {
    if (this._statusCallback) this._statusCallback(status, detail);
  }

  // ─── Crear sala (modo host) ─────────────────

  async createRoom() {
    const code = generateRoomCode();
    this.roomId = code;
    this.isHost = true;
    store.updateSettings({ roomId: code, isHost: true });

    await this._initPeer(`familist-${code}`);
    this._setStatus('hosting', code);
    showToast(`Sala creada: ${code}`, 'success');
    return code;
  }

  // ─── Unirse a sala (modo guest) ─────────────

  async joinRoom(code) {
    if (!code || code.length < 4) {
      showToast('Código de sala no válido', 'error');
      return false;
    }
    code = code.toUpperCase().trim();
    this.roomId = code;
    this.isHost = false;
    store.updateSettings({ roomId: code, isHost: false });

    await this._initPeer();
    this._connectToHost(code);
    return true;
  }

  // ─── Desconectar ────────────────────────────

  disconnect() {
    clearInterval(this._reconnectTimer);
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.roomId = null;
    this.isHost = false;
    this._peerReady = false;
    store.updateSettings({ roomId: null, isHost: false });
    this._setStatus('disconnected');
    showToast('Desconectado de la sala', 'info');
  }

  // ─── Reconectar automáticamente ─────────────

  autoReconnect() {
    const settings = store.getSettings();
    if (!settings.roomId) return;

    if (settings.isHost) {
      this.roomId = settings.roomId;
      this.isHost = true;
      this._initPeer(`familist-${settings.roomId}`).then(() => {
        this._setStatus('hosting', settings.roomId);
      });
    } else {
      this.roomId = settings.roomId;
      this.isHost = false;
      this._initPeer().then(() => {
        this._connectToHost(settings.roomId);
      });
    }
  }

  // ─── Enviar cambio a todos los peers ────────

  broadcast(change) {
    const msg = JSON.stringify(change);
    this.connections.forEach((conn) => {
      if (conn.open) {
        try { conn.send(msg); } catch { /* ignore */ }
      }
    });
  }

  // Enviar cambio específico
  broadcastChange(type, data) {
    this.broadcast({
      type: 'change',
      key: type,
      data: data,
      ts: Date.now(),
      from: store.getSettings().deviceId
    });
  }

  // ─── Internals ──────────────────────────────

  async _initPeer(id) {
    return new Promise((resolve, reject) => {
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }
      this._peerReady = false;

      const opts = {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      };

      try {
        this.peer = id ? new Peer(id, opts) : new Peer(opts);
      } catch {
        this._setStatus('error');
        reject(new Error('PeerJS no disponible'));
        return;
      }

      const timeout = setTimeout(() => {
        if (!this._peerReady) {
          this._setStatus('error');
          reject(new Error('Timeout'));
        }
      }, 15000);

      this.peer.on('open', () => {
        clearTimeout(timeout);
        this._peerReady = true;

        // Host escucha conexiones entrantes
        if (this.isHost) {
          this.peer.on('connection', (conn) => this._handleConnection(conn));
        }
        resolve();
      });

      this.peer.on('error', (err) => {
        clearTimeout(timeout);
        if (err.type === 'unavailable-id') {
          showToast('Esa sala ya está ocupada. Intenta con otro código.', 'error');
          this._setStatus('error');
        } else if (err.type === 'peer-unavailable') {
          showToast('No se encontró la sala. Verifica el código.', 'error');
          this._setStatus('error');
        } else {
          this._setStatus('error');
        }
      });

      this.peer.on('disconnected', () => {
        this._setStatus('reconnecting');
        if (this.peer && !this.peer.destroyed) {
          setTimeout(() => {
            try { this.peer.reconnect(); } catch { /* ignore */ }
          }, 3000);
        }
      });
    });
  }

  _connectToHost(code) {
    if (!this.peer || !this._peerReady) return;

    this._setStatus('connecting');
    const conn = this.peer.connect(`familist-${code}`, { reliable: true });

    conn.on('open', () => {
      this._handleConnection(conn);
      // Solicitar sincronización completa
      conn.send(JSON.stringify({ type: 'sync-request' }));
      this._setStatus('connected', code);
      showToast('Conectado a la sala', 'success');
    });

    conn.on('error', () => {
      this._setStatus('error');
      showToast('Error al conectar', 'error');
    });

    // Reconexión periódica
    this._reconnectTimer = setInterval(() => {
      if (this.connections.size === 0 && this.roomId) {
        this._setStatus('reconnecting');
        const retry = this.peer.connect(`familist-${this.roomId}`, { reliable: true });
        retry.on('open', () => {
          this._handleConnection(retry);
          retry.send(JSON.stringify({ type: 'sync-request' }));
          this._setStatus('connected', this.roomId);
        });
      }
    }, 10000);
  }

  _handleConnection(conn) {
    const peerId = conn.peer;
    this.connections.set(peerId, conn);
    this._updateConnectionCount();

    conn.on('data', (raw) => {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch { return; }
      this._handleMessage(msg, conn);
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
      this._updateConnectionCount();
    });

    conn.on('error', () => {
      this.connections.delete(peerId);
      this._updateConnectionCount();
    });
  }

  _handleMessage(msg, fromConn) {
    switch (msg.type) {
      case 'sync-request':
        // Enviar estado completo
        fromConn.send(JSON.stringify({
          type: 'sync-response',
          data: store.exportState()
        }));
        break;

      case 'sync-response':
        // Importar estado del peer
        store.importState(msg.data);
        break;

      case 'change':
        // Aplicar cambio individual
        this._applyChange(msg);
        // Si soy host, reenviar a otros peers
        if (this.isHost) {
          this.connections.forEach((conn, peerId) => {
            if (peerId !== fromConn.peer && conn.open) {
              try { conn.send(JSON.stringify(msg)); } catch { /* ignore */ }
            }
          });
        }
        break;
    }
  }

  _applyChange(msg) {
    const { key, data } = msg;
    switch (key) {
      case 'shopping':
        // Reconstruir lista de la compra
        if (Array.isArray(data)) {
          const localMap = new Map(store.getShoppingList().map(i => [i.id, i]));
          for (const item of data) {
            const local = localMap.get(item.id);
            if (!local || (item.addedAt || 0) >= (local.addedAt || 0)) {
              localMap.set(item.id, item);
            }
          }
          store._state.shopping = Array.from(localMap.values());
          store._save();
          const cbs = store._listeners.get('shopping');
          if (cbs) cbs.forEach(cb => cb(store._state.shopping));
        }
        break;

      case 'menu':
        if (data) {
          store._state.menu = data;
          store._save();
          const cbs2 = store._listeners.get('menu');
          if (cbs2) cbs2.forEach(cb => cb(data));
        }
        break;

      case 'settings':
        if (data) {
          const localDeviceId = store._state.settings.deviceId;
          const localRoomId = store._state.settings.roomId;
          const localIsHost = store._state.settings.isHost;
          store._state.settings = {
            ...store._state.settings,
            familySize: data.familySize ?? store._state.settings.familySize,
            darkMode: data.darkMode ?? store._state.settings.darkMode,
            excludedTags: data.excludedTags ?? store._state.settings.excludedTags,
            preferredTags: data.preferredTags ?? store._state.settings.preferredTags
          };
          store._state.settings.deviceId = localDeviceId;
          store._state.settings.roomId = localRoomId;
          store._state.settings.isHost = localIsHost;
          store._save();
          const cbs3 = store._listeners.get('settings');
          if (cbs3) cbs3.forEach(cb => cb(store._state.settings));
        }
        break;
    }
  }

  _updateConnectionCount() {
    const count = this.connections.size;
    if (this.isHost) {
      this._setStatus(count > 0 ? 'hosting' : 'hosting', this.roomId);
    } else {
      this._setStatus(count > 0 ? 'connected' : 'reconnecting', this.roomId);
    }
  }

  getConnectionCount() {
    return this.connections.size;
  }

  isConnected() {
    return this.connections.size > 0 || this.isHost;
  }
}

export const sync = new SyncManager();
