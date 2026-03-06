// ============================================================
// settings.js — Módulo de ajustes
// ============================================================
import { store } from './store.js';
import { sync } from './sync.js';
import { h, showToast, ICONS } from './utils.js';
import { RECIPE_TAGS } from './recipes.js';

export class SettingsModule {
  constructor() {
    this.container = null;
    this._unsubscribe = null;
  }

  init(container) {
    this.container = container;
    this.render();
    this._unsubscribe = store.on('settings', () => this.render());
    sync.onStatusChange(() => this.render());
  }

  destroy() {
    if (this._unsubscribe) this._unsubscribe();
  }

  render() {
    if (!this.container) return;
    const settings = store.getSettings();
    this.container.innerHTML = '';

    // Title
    this.container.appendChild(
      h('div', { class: 'section-header' },
        h('h2', { class: 'section-title' }, 'Ajustes')
      )
    );

    // ─── Sincronización ─────────────────────────────
    const syncCard = h('div', { class: 'settings-card' },
      h('div', { class: 'settings-card__header' },
        h('span', { class: 'icon icon--md' }),
        h('h3', {}, 'Sincronización')
      )
    );
    syncCard.querySelector('.icon').innerHTML = ICONS.link;

    const syncBody = h('div', { class: 'settings-card__body' });

    if (settings.roomId) {
      // Mostrar estado de sala
      syncBody.appendChild(
        h('div', { class: 'sync-status-card' },
          h('div', { class: 'sync-status-card__info' },
            h('span', { class: 'sync-status-card__label' }, 'Código de sala'),
            h('span', { class: 'sync-status-card__code' }, settings.roomId),
            h('span', { class: `sync-status-card__badge ${settings.isHost ? 'badge--host' : 'badge--guest'}` },
              settings.isHost ? 'Host' : 'Invitado'
            )
          ),
          h('div', { class: 'sync-status-card__meta' },
            h('span', {}, `${sync.getConnectionCount()} dispositivo(s) conectado(s)`)
          )
        )
      );

      // Botón copiar código
      syncBody.appendChild(
        h('button', {
          class: 'btn btn--ghost btn--full',
          onClick: () => {
            navigator.clipboard.writeText(settings.roomId).then(() => {
              showToast('Código copiado', 'success');
            }).catch(() => {
              showToast(settings.roomId, 'info');
            });
          }
        }, h('span', { class: 'icon icon--sm' }), 'Copiar código')
      );
      syncBody.querySelector('.btn--ghost .icon').innerHTML = ICONS.copy;

      // Botón desconectar
      syncBody.appendChild(
        h('button', {
          class: 'btn btn--danger btn--full mt-2',
          onClick: () => sync.disconnect()
        }, 'Desconectar')
      );
    } else {
      // Opciones de crear/unirse
      syncBody.appendChild(
        h('p', { class: 'text-muted mb-3' },
          'Conecta varios dispositivos para sincronizar la lista de la compra y el menú en tiempo real.'
        )
      );

      syncBody.appendChild(
        h('button', {
          class: 'btn btn--primary btn--full mb-2',
          onClick: async () => {
            try {
              await sync.createRoom();
              this.render();
            } catch {
              showToast('Error al crear la sala', 'error');
            }
          }
        }, 'Crear sala')
      );

      let joinInput;
      const joinRow = h('div', { class: 'join-row' },
        joinInput = h('input', {
          type: 'text',
          class: 'input join-row__input',
          placeholder: 'Código de sala',
          maxLength: '6'
        }),
        h('button', {
          class: 'btn btn--secondary',
          onClick: async () => {
            try {
              const ok = await sync.joinRoom(joinInput.value);
              if (ok) this.render();
            } catch {
              showToast('Error al unirse', 'error');
            }
          }
        }, 'Unirse')
      );
      joinInput.addEventListener('input', () => {
        joinInput.value = joinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
      syncBody.appendChild(joinRow);
    }

    syncCard.appendChild(syncBody);
    this.container.appendChild(syncCard);

    // ─── Familia ────────────────────────────────────
    const familyCard = h('div', { class: 'settings-card' },
      h('div', { class: 'settings-card__header' },
        h('span', { class: 'icon icon--md' }),
        h('h3', {}, 'Familia')
      )
    );
    familyCard.querySelector('.icon').innerHTML = ICONS.users;

    const familyBody = h('div', { class: 'settings-card__body' });

    // Número de personas
    const familySizeRow = h('div', { class: 'setting-row' },
      h('span', { class: 'setting-row__label' }, 'Personas en la familia'),
      h('div', { class: 'stepper' },
        h('button', {
          class: 'stepper__btn',
          onClick: () => {
            const current = store.getSettings().familySize;
            if (current > 1) {
              store.updateSettings({ familySize: current - 1 });
              sync.broadcastChange('settings', store.getSettings());
            }
          }
        }, '−'),
        h('span', { class: 'stepper__value' }, String(settings.familySize)),
        h('button', {
          class: 'stepper__btn',
          onClick: () => {
            const current = store.getSettings().familySize;
            if (current < 12) {
              store.updateSettings({ familySize: current + 1 });
              sync.broadcastChange('settings', store.getSettings());
            }
          }
        }, '+')
      )
    );
    familyBody.appendChild(familySizeRow);
    familyCard.appendChild(familyBody);
    this.container.appendChild(familyCard);

    // ─── Preferencias del menú ──────────────────────
    const menuCard = h('div', { class: 'settings-card' },
      h('div', { class: 'settings-card__header' },
        h('span', { class: 'icon icon--md' }),
        h('h3', {}, 'Preferencias del menú')
      )
    );
    menuCard.querySelector('.icon').innerHTML = ICONS.calendar;

    const menuBody = h('div', { class: 'settings-card__body' });

    // Tags preferidos
    menuBody.appendChild(h('p', { class: 'setting-subtitle' }, 'Priorizar en el menú:'));
    const prefContainer = h('div', { class: 'tag-selector' });
    const displayTags = ['proteína','legumbres','pescado','verdura','económico','rápido','ligero','tradicional','carne','arroz','pasta'];
    for (const tag of displayTags) {
      const isActive = (settings.preferredTags || []).includes(tag);
      const chip = h('button', {
        class: `tag-chip ${isActive ? 'tag-chip--active' : ''}`,
        onClick: () => {
          const current = store.getSettings().preferredTags || [];
          const updated = isActive ? current.filter(t => t !== tag) : [...current, tag];
          store.updateSettings({ preferredTags: updated });
          sync.broadcastChange('settings', store.getSettings());
        }
      }, tag);
      prefContainer.appendChild(chip);
    }
    menuBody.appendChild(prefContainer);

    // Tags excluidos
    menuBody.appendChild(h('p', { class: 'setting-subtitle mt-3' }, 'Excluir del menú:'));
    const exclContainer = h('div', { class: 'tag-selector' });
    for (const tag of displayTags) {
      const isExcluded = (settings.excludedTags || []).includes(tag);
      const chip = h('button', {
        class: `tag-chip tag-chip--exclude ${isExcluded ? 'tag-chip--excluded' : ''}`,
        onClick: () => {
          const current = store.getSettings().excludedTags || [];
          const updated = isExcluded ? current.filter(t => t !== tag) : [...current, tag];
          store.updateSettings({ excludedTags: updated });
          sync.broadcastChange('settings', store.getSettings());
        }
      }, tag);
      exclContainer.appendChild(chip);
    }
    menuBody.appendChild(exclContainer);

    menuCard.appendChild(menuBody);
    this.container.appendChild(menuCard);

    // ─── Apariencia ─────────────────────────────────
    const themeCard = h('div', { class: 'settings-card' },
      h('div', { class: 'settings-card__header' },
        h('span', { class: 'icon icon--md' }),
        h('h3', {}, 'Apariencia')
      )
    );
    themeCard.querySelector('.icon').innerHTML = settings.darkMode ? ICONS.moon : ICONS.sun;

    const themeBody = h('div', { class: 'settings-card__body' });
    const themeRow = h('div', { class: 'setting-row' },
      h('span', { class: 'setting-row__label' }, 'Modo oscuro'),
      h('label', { class: 'toggle' },
        h('input', {
          type: 'checkbox',
          ...(settings.darkMode ? { checked: '' } : {}),
          onChange: (e) => {
            const dark = e.target.checked;
            store.updateSettings({ darkMode: dark });
            document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
            sync.broadcastChange('settings', store.getSettings());
          }
        }),
        h('span', { class: 'toggle__slider' })
      )
    );
    themeBody.appendChild(themeRow);
    themeCard.appendChild(themeBody);
    this.container.appendChild(themeCard);

    // ─── Datos ──────────────────────────────────────
    const dataCard = h('div', { class: 'settings-card' },
      h('div', { class: 'settings-card__header' },
        h('span', { class: 'icon icon--md' }),
        h('h3', {}, 'Datos')
      )
    );
    dataCard.querySelector('.icon').innerHTML = ICONS.trash;

    const dataBody = h('div', { class: 'settings-card__body' });
    dataBody.appendChild(
      h('button', {
        class: 'btn btn--danger btn--full',
        onClick: () => this._confirmReset()
      }, 'Borrar todos los datos')
    );
    dataCard.appendChild(dataBody);
    this.container.appendChild(dataCard);

    // Footer info
    this.container.appendChild(
      h('div', { class: 'settings-footer' },
        h('p', {}, 'FamiList v1.0'),
        h('p', {}, 'Lista de la compra y menú semanal familiar')
      )
    );
  }

  _confirmReset() {
    const overlay = h('div', { class: 'modal-overlay', onClick: (e) => {
      if (e.target === overlay) overlay.remove();
    }});
    const modal = h('div', { class: 'modal modal--sm' },
      h('div', { class: 'modal__body modal__body--center' },
        h('p', { class: 'text-lg' }, '¿Borrar todos los datos?'),
        h('p', { class: 'text-muted' }, 'Se perderá la lista de compra, el menú y los ajustes.')
      ),
      h('div', { class: 'modal__footer' },
        h('button', { class: 'btn btn--ghost', onClick: () => overlay.remove() }, 'Cancelar'),
        h('button', { class: 'btn btn--danger', onClick: () => {
          localStorage.clear();
          location.reload();
        }}, 'Borrar todo')
      )
    );
    overlay.appendChild(modal);
    document.getElementById('modal-container').appendChild(overlay);
  }
}

export const settingsModule = new SettingsModule();
