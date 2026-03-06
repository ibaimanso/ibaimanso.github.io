// ============================================================
// shopping.js — Módulo de lista de la compra
// ============================================================
import { store } from './store.js';
import { sync } from './sync.js';
import { h, showToast, CATEGORIES, CATEGORY_EMOJI, ICONS } from './utils.js';

export class ShoppingModule {
  constructor() {
    this.container = null;
    this.filterCategory = 'all';
    this._unsubscribe = null;
  }

  init(container) {
    this.container = container;
    this.render();
    this._unsubscribe = store.on('shopping', () => this.render());
  }

  destroy() {
    if (this._unsubscribe) this._unsubscribe();
  }

  render() {
    if (!this.container) return;
    const items = store.getShoppingList();
    const unchecked = items.filter(i => !i.checked);
    const checked = items.filter(i => i.checked);

    // Agrupar no comprados por categoría
    const grouped = {};
    for (const item of unchecked) {
      const cat = item.category || 'Otros';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    // Ordenar categorías según el orden predefinido
    const sortedCats = CATEGORIES.filter(c => grouped[c]);

    this.container.innerHTML = '';

    // Header de la sección
    const header = h('div', { class: 'section-header' },
      h('div', { class: 'section-header__left' },
        h('h2', { class: 'section-title' }, 'Lista de la compra'),
        h('span', { class: 'badge' }, `${unchecked.length} pendiente${unchecked.length !== 1 ? 's' : ''}`)
      ),
      h('div', { class: 'section-header__actions' },
        items.length > 0 ? h('button', {
          class: 'btn btn--ghost btn--sm',
          title: 'Limpiar comprados',
          onClick: () => this._clearChecked()
        }, 'Limpiar ✓') : null,
        items.length > 0 ? h('button', {
          class: 'btn btn--ghost btn--sm btn--danger',
          title: 'Borrar todo',
          onClick: () => this._clearAll()
        }, 'Borrar todo') : null
      )
    );
    this.container.appendChild(header);

    // Input para añadir
    const addForm = this._buildAddForm();
    this.container.appendChild(addForm);

    // Lista vacía
    if (items.length === 0) {
      this.container.appendChild(
        h('div', { class: 'empty-state' },
          h('div', { class: 'empty-state__icon' }, '🛒'),
          h('p', { class: 'empty-state__text' }, 'Tu lista de la compra está vacía'),
          h('p', { class: 'empty-state__subtext' }, 'Añade productos usando el campo de arriba')
        )
      );
      return;
    }

    // Categorías con items
    const listEl = h('div', { class: 'shopping-list' });
    for (const cat of sortedCats) {
      const catItems = grouped[cat];
      const emoji = CATEGORY_EMOJI[cat] || '📦';

      const catSection = h('div', { class: 'category-group' },
        h('div', { class: 'category-group__header' },
          h('span', { class: 'category-group__emoji' }, emoji),
          h('span', { class: 'category-group__name' }, cat),
          h('span', { class: 'category-group__count' }, `${catItems.length}`)
        )
      );

      for (const item of catItems) {
        catSection.appendChild(this._buildItemEl(item));
      }
      listEl.appendChild(catSection);
    }
    this.container.appendChild(listEl);

    // Sección de comprados
    if (checked.length > 0) {
      const checkedSection = h('div', { class: 'checked-section' },
        h('button', {
          class: 'checked-section__toggle',
          onClick: (e) => {
            const list = e.currentTarget.nextElementSibling;
            list.classList.toggle('collapsed');
            e.currentTarget.classList.toggle('open');
          }
        },
          h('span', {}, `Comprados (${checked.length})`),
          h('span', { class: 'chevron-icon' }, '▼')
        ),
        h('div', { class: 'checked-section__list collapsed' },
          ...checked.map(item => this._buildItemEl(item, true))
        )
      );
      this.container.appendChild(checkedSection);
    }
  }

  _buildAddForm() {
    let nameInput, quantityInput;
    let selectedCategory = CATEGORIES[0];

    const form = h('form', {
      class: 'add-form',
      onSubmit: (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        if (!name) return;
        store.addShoppingItem({
          name,
          category: selectedCategory,
          quantity: parseInt(quantityInput.value) || 1
        });
        sync.broadcastChange('shopping', store.getShoppingList());
        nameInput.value = '';
        quantityInput.value = '1';
        nameInput.focus();
        showToast(`${name} añadido`, 'success');
      }
    });

    const inputRow = h('div', { class: 'add-form__row' });

    nameInput = h('input', {
      type: 'text',
      class: 'input add-form__name',
      placeholder: 'Añadir producto...',
      autocomplete: 'off'
    });

    const submitBtn = h('button', {
      type: 'submit',
      class: 'btn btn--primary btn--icon add-form__submit'
    });
    submitBtn.innerHTML = ICONS.plus;

    inputRow.appendChild(nameInput);
    inputRow.appendChild(submitBtn);
    form.appendChild(inputRow);

    // Cantidad
    const qtyRow = h('div', { class: 'add-form__qty-row' },
      h('span', { class: 'add-form__qty-label' }, 'Cantidad:'),
      quantityInput = h('input', {
        type: 'number',
        class: 'input add-form__qty',
        min: '1',
        max: '99',
        value: '1'
      })
    );
    form.appendChild(qtyRow);

    // Categoría visual
    const catGrid = h('div', { class: 'cat-picker' });
    for (const cat of CATEGORIES) {
      const emoji = CATEGORY_EMOJI[cat] || '📦';
      const btn = h('button', {
        type: 'button',
        class: `cat-picker__btn ${cat === selectedCategory ? 'cat-picker__btn--active' : ''}`,
        title: cat,
        onClick: () => {
          selectedCategory = cat;
          catGrid.querySelectorAll('.cat-picker__btn').forEach(b => b.classList.remove('cat-picker__btn--active'));
          btn.classList.add('cat-picker__btn--active');
        }
      },
        h('span', { class: 'cat-picker__emoji' }, emoji),
        h('span', { class: 'cat-picker__label' }, cat)
      );
      catGrid.appendChild(btn);
    }
    form.appendChild(catGrid);

    return form;
  }

  _buildItemEl(item, isChecked = false) {
    const el = h('div', {
      class: `shopping-item ${isChecked ? 'shopping-item--checked' : ''}`,
      dataset: { id: item.id }
    });

    // Checkbox
    const checkbox = h('button', {
      class: `shopping-item__check ${item.checked ? 'checked' : ''}`,
      onClick: () => {
        store.toggleShoppingItem(item.id);
        sync.broadcastChange('shopping', store.getShoppingList());
      }
    });
    if (item.checked) checkbox.innerHTML = ICONS.check;
    el.appendChild(checkbox);

    // Info
    const info = h('div', { class: 'shopping-item__info' },
      h('span', { class: 'shopping-item__name' }, item.name),
      item.quantity > 1 ? h('span', { class: 'shopping-item__qty' }, `×${item.quantity}`) : null
    );
    el.appendChild(info);

    // Acciones
    if (!isChecked) {
      const editBtn = h('button', {
        class: 'shopping-item__action',
        onClick: () => this._editItem(item)
      });
      editBtn.innerHTML = ICONS.edit;
      el.appendChild(editBtn);
    }

    const deleteBtn = h('button', {
      class: 'shopping-item__action shopping-item__action--delete',
      onClick: () => {
        el.classList.add('shopping-item--removing');
        setTimeout(() => {
          store.removeShoppingItem(item.id);
          sync.broadcastChange('shopping', store.getShoppingList());
        }, 250);
      }
    });
    deleteBtn.innerHTML = ICONS.trash;
    el.appendChild(deleteBtn);

    return el;
  }

  _editItem(item) {
    const overlay = h('div', { class: 'modal-overlay', onClick: (e) => {
      if (e.target === overlay) overlay.remove();
    }});

    let nameInput, qtyInput;
    let selectedCategory = item.category || CATEGORIES[0];

    const catGrid = h('div', { class: 'cat-picker' });
    for (const cat of CATEGORIES) {
      const emoji = CATEGORY_EMOJI[cat] || '📦';
      const btn = h('button', {
        type: 'button',
        class: `cat-picker__btn ${cat === selectedCategory ? 'cat-picker__btn--active' : ''}`,
        title: cat,
        onClick: () => {
          selectedCategory = cat;
          catGrid.querySelectorAll('.cat-picker__btn').forEach(b => b.classList.remove('cat-picker__btn--active'));
          btn.classList.add('cat-picker__btn--active');
        }
      },
        h('span', { class: 'cat-picker__emoji' }, emoji),
        h('span', { class: 'cat-picker__label' }, cat)
      );
      catGrid.appendChild(btn);
    }

    const modal = h('div', { class: 'modal' },
      h('div', { class: 'modal__header' },
        h('h3', {}, 'Editar producto'),
        h('button', { class: 'btn btn--ghost btn--icon', onClick: () => overlay.remove() })
      ),
      h('div', { class: 'modal__body' },
        h('label', { class: 'form-label' }, 'Nombre'),
        nameInput = h('input', { type: 'text', class: 'input', value: item.name }),
        h('label', { class: 'form-label' }, 'Cantidad'),
        qtyInput = h('input', { type: 'number', class: 'input', min: '1', value: String(item.quantity || 1) }),
        h('label', { class: 'form-label' }, 'Categoría'),
        catGrid
      ),
      h('div', { class: 'modal__footer' },
        h('button', { class: 'btn btn--ghost', onClick: () => overlay.remove() }, 'Cancelar'),
        h('button', { class: 'btn btn--primary', onClick: () => {
          store.updateShoppingItem(item.id, {
            name: nameInput.value.trim() || item.name,
            quantity: parseInt(qtyInput.value) || 1,
            category: selectedCategory
          });
          sync.broadcastChange('shopping', store.getShoppingList());
          overlay.remove();
          showToast('Producto actualizado', 'success');
        }}, 'Guardar')
      )
    );

    // Header close button
    modal.querySelector('.btn--ghost.btn--icon').innerHTML = ICONS.x;

    overlay.appendChild(modal);
    document.getElementById('modal-container').appendChild(overlay);
    nameInput.focus();
    nameInput.select();
  }

  _clearChecked() {
    store.clearCheckedItems();
    sync.broadcastChange('shopping', store.getShoppingList());
    showToast('Productos comprados eliminados', 'info');
  }

  _clearAll() {
    // Confirmación
    const overlay = h('div', { class: 'modal-overlay', onClick: (e) => {
      if (e.target === overlay) overlay.remove();
    }});
    const modal = h('div', { class: 'modal modal--sm' },
      h('div', { class: 'modal__body modal__body--center' },
        h('p', { class: 'text-lg' }, '¿Borrar toda la lista?'),
        h('p', { class: 'text-muted' }, 'Esta acción no se puede deshacer')
      ),
      h('div', { class: 'modal__footer' },
        h('button', { class: 'btn btn--ghost', onClick: () => overlay.remove() }, 'Cancelar'),
        h('button', { class: 'btn btn--danger', onClick: () => {
          store.clearShoppingList();
          sync.broadcastChange('shopping', store.getShoppingList());
          overlay.remove();
          showToast('Lista borrada', 'info');
        }}, 'Borrar todo')
      )
    );
    overlay.appendChild(modal);
    document.getElementById('modal-container').appendChild(overlay);
  }

  // Añadir ingredientes de recetas al carrito
  addRecipeIngredients(recipe, servings = 4) {
    const familySize = store.getSettings().familySize || 4;
    const ratio = familySize / (recipe.servings || 4);

    for (const [name, qty, unit, cat] of recipe.ingredients) {
      // Evitar duplicados
      const existing = store.getShoppingList().find(
        i => i.name.toLowerCase() === name.toLowerCase() && !i.checked
      );
      if (!existing) {
        store.addShoppingItem({
          name,
          category: cat || 'Otros',
          quantity: Math.ceil(qty * ratio),
          unit
        });
      }
    }
    sync.broadcastChange('shopping', store.getShoppingList());
    showToast('Ingredientes añadidos a la lista', 'success');
  }
}

export const shopping = new ShoppingModule();
