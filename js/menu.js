// ============================================================
// menu.js — Módulo de menú semanal (v3 — primer + segundo plato)
// ============================================================
import { store } from './store.js';
import { sync } from './sync.js';
import { shopping } from './shopping.js';
import { RECIPES } from './recipes.js';
import { h, showToast, DAYS, DAYS_DISPLAY, MEALS, ICONS, getMonday, formatDateKey, parseLocalDate } from './utils.js';

// ─── Visual helpers ──────────────────────────────────────────
const CATEGORY_VISUAL = {
  legumbres:  { emoji: '🫘', light: { color: '#92400E', bg: '#FEF3C7' }, dark: { color: '#FDE68A', bg: '#78350F' } },
  carne:      { emoji: '🥩', light: { color: '#991B1B', bg: '#FEE2E2' }, dark: { color: '#FCA5A5', bg: '#7F1D1D' } },
  pescado:    { emoji: '🐟', light: { color: '#1E40AF', bg: '#DBEAFE' }, dark: { color: '#93C5FD', bg: '#1E3A5F' } },
  verdura:    { emoji: '🥦', light: { color: '#166534', bg: '#DCFCE7' }, dark: { color: '#86EFAC', bg: '#14532D' } },
  pasta:      { emoji: '🍝', light: { color: '#B45309', bg: '#FEF3C7' }, dark: { color: '#FCD34D', bg: '#78350F' } },
  arroz:      { emoji: '🍚', light: { color: '#854D0E', bg: '#FEF9C3' }, dark: { color: '#FDE047', bg: '#713F12' } },
  huevos:     { emoji: '🍳', light: { color: '#A16207', bg: '#FEF9C3' }, dark: { color: '#FDE047', bg: '#713F12' } },
  sopa:       { emoji: '🍲', light: { color: '#0E7490', bg: '#CFFAFE' }, dark: { color: '#67E8F9', bg: '#164E63' } },
  crema:      { emoji: '🥣', light: { color: '#0E7490', bg: '#CFFAFE' }, dark: { color: '#67E8F9', bg: '#164E63' } },
  ensalada:   { emoji: '🥗', light: { color: '#15803D', bg: '#DCFCE7' }, dark: { color: '#86EFAC', bg: '#14532D' } },
};

const CATEGORY_PRIORITY = ['pescado','carne','legumbres','verdura','ensalada','pasta','arroz','huevos','sopa','crema'];

// Tags que definen un primer plato (base/carbohidrato/entrante)
const PRIMERO_TAGS = new Set(['legumbres','sopa','crema','ensalada','verdura','pasta','arroz']);
// Tags que definen un segundo plato (proteína principal)
const SEGUNDO_TAGS = new Set(['carne','pescado','huevos']);

function getMealVisual(recipe) {
  if (!recipe) return { emoji: '➕', color: '#9CA3AF', bg: 'transparent' };
  const fullRecipe = RECIPES.find(r => r.id === recipe.id);
  if (!fullRecipe) return { emoji: '🍽️', color: '#6B7280', bg: 'transparent' };
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  for (const cat of CATEGORY_PRIORITY) {
    if (fullRecipe.tags.includes(cat)) {
      const v = CATEGORY_VISUAL[cat];
      if (!v) continue;
      const t = isDark ? v.dark : v.light;
      return { emoji: v.emoji, color: t.color, bg: t.bg };
    }
  }
  return { emoji: '🍽️', color: '#6B7280', bg: 'transparent' };
}

// Clasificar si una receta es adecuada como primer plato, segundo o ambos
function isRecipePrimero(r) {
  return r.tags.some(t => PRIMERO_TAGS.has(t));
}
function isRecipeSegundo(r) {
  return r.tags.some(t => SEGUNDO_TAGS.has(t)) && !r.tags.some(t => PRIMERO_TAGS.has(t));
}

export class MenuModule {
  constructor() {
    this.container = null;
    this._unsubscribe = null;
    this._unsubTheme = null;
  }

  init(container) {
    this.container = container;
    this.render();
    this._unsubscribe = store.on('menu', () => this.render());
    this._unsubTheme = store.on('settings', () => this.render());
  }

  destroy() {
    if (this._unsubscribe) this._unsubscribe();
    if (this._unsubTheme) this._unsubTheme();
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  render() {
    if (!this.container) return;
    const menu = store.getMenu();
    this.container.innerHTML = '';

    // Header
    const weekLabel = this._getWeekLabel(menu.weekStart);
    const header = h('div', { class: 'section-header' },
      h('div', { class: 'section-header__left' },
        h('h2', { class: 'section-title' }, 'Menú Semanal'),
        h('span', { class: 'badge badge--secondary' }, weekLabel)
      ),
      h('div', { class: 'section-header__actions' },
        h('button', {
          class: 'btn btn--primary btn--sm',
          onClick: () => this._generateMenu()
        }, h('span', { class: 'icon icon--sm' }), 'Generar'),
        h('button', {
          class: 'btn btn--ghost btn--sm',
          onClick: () => this._addAllToShopping()
        }, h('span', { class: 'icon icon--sm' }), 'Compra')
      )
    );
    const btns = header.querySelectorAll('.icon');
    if (btns[0]) btns[0].innerHTML = ICONS.refresh;
    if (btns[1]) btns[1].innerHTML = ICONS.shoppingBag;
    this.container.appendChild(header);

    // Days grid
    const grid = h('div', { class: 'menu-grid' });

    DAYS.forEach((day, i) => {
      const dayData = menu.days[day] || { primero: null, segundo: null, cena: null };
      const isToday = this._isToday(menu.weekStart, i);
      const isWeekend = i >= 5;

      const primeroVisual = getMealVisual(dayData.primero);
      const segundoVisual = getMealVisual(dayData.segundo);
      const cenaVisual = getMealVisual(dayData.cena);

      const card = h('div', {
        class: `menu-card ${isToday ? 'menu-card--today' : ''} ${isWeekend ? 'menu-card--weekend' : ''}`
      },
        // Day header
        h('div', { class: 'menu-card__header' },
          h('div', { class: 'menu-card__day-group' },
            h('span', { class: 'menu-card__day-abbr' }, DAYS_DISPLAY[i].substring(0, 3).toUpperCase()),
            h('span', { class: 'menu-card__day-full' }, DAYS_DISPLAY[i])
          ),
          isToday ? h('span', { class: 'badge badge--accent' }, '✦ Hoy') : null
        ),
        // Meals
        h('div', { class: 'menu-card__meals' },
          // ── Comida (primer + segundo) ──
          h('div', { class: 'menu-card__meal-group' },
            h('span', { class: 'menu-card__group-label' }, '☀️ Comida'),
            this._buildMealSlot(day, 'primero', dayData.primero, primeroVisual, '1°'),
            this._buildMealSlot(day, 'segundo', dayData.segundo, segundoVisual, '2°')
          ),
          h('div', { class: 'menu-card__separator' }),
          // ── Cena ──
          h('div', { class: 'menu-card__meal-group' },
            h('span', { class: 'menu-card__group-label' }, '🌙 Cena'),
            this._buildMealSlot(day, 'cena', dayData.cena, cenaVisual, '')
          )
        )
      );
      grid.appendChild(card);
    });

    this.container.appendChild(grid);
  }

  _buildMealSlot(day, meal, recipe, visual, prefix) {
    const isEmpty = !recipe;
    const labels = { primero: '1er plato', segundo: '2do plato', cena: 'Plato' };
    const slot = h('div', {
      class: `menu-meal-slot ${isEmpty ? 'menu-meal-slot--empty' : ''}`,
      onClick: () => this._editMeal(day, meal, recipe)
    },
      h('div', { class: 'menu-meal-slot__icon' }, visual.emoji),
      h('div', { class: 'menu-meal-slot__content' },
        prefix ? h('span', { class: 'menu-meal-slot__label' }, labels[meal] || meal) : null,
        h('span', { class: 'menu-meal-slot__name' }, recipe ? recipe.name : 'Toca para elegir')
      )
    );
    if (!isEmpty) {
      slot.querySelector('.menu-meal-slot__icon').style.cssText =
        `background: ${visual.bg}; color: ${visual.color};`;
    }
    return slot;
  }

  _getWeekLabel(weekStart) {
    if (!weekStart) return 'Esta semana';
    const start = parseLocalDate(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const opts = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('es-ES', opts)} — ${end.toLocaleDateString('es-ES', opts)}`;
  }

  _isToday(weekStart, dayIndex) {
    if (!weekStart) return false;
    const start = parseLocalDate(weekStart);
    start.setDate(start.getDate() + dayIndex);
    const today = new Date();
    return start.getFullYear() === today.getFullYear() &&
           start.getMonth() === today.getMonth() &&
           start.getDate() === today.getDate();
  }

  // ═══════════════════════════════════════════════════════════
  // ALGORITMO DE GENERACIÓN DE MENÚ INTELIGENTE
  // ═══════════════════════════════════════════════════════════

  _generateMenu() {
    const overlay = h('div', { class: 'modal-overlay', onClick: (e) => {
      if (e.target === overlay) overlay.remove();
    }});
    const modal = h('div', { class: 'modal modal--sm' },
      h('div', { class: 'modal__body modal__body--center' },
        h('p', { class: 'text-lg' }, '¿Generar nuevo menú semanal?'),
        h('p', { class: 'text-muted' }, 'Se creará un menú equilibrado con primer y segundo plato')
      ),
      h('div', { class: 'modal__footer' },
        h('button', { class: 'btn btn--ghost', onClick: () => overlay.remove() }, 'Cancelar'),
        h('button', { class: 'btn btn--primary', onClick: () => {
          overlay.remove();
          this._doGenerateMenu();
        }}, 'Generar')
      )
    );
    overlay.appendChild(modal);
    document.getElementById('modal-container').appendChild(overlay);
  }

  _doGenerateMenu() {
    const settings = store.getSettings();
    const excludedTags = settings.excludedTags || [];
    const preferredTags = settings.preferredTags || [];

    const available = RECIPES.filter(r =>
      !excludedTags.some(t => r.tags.includes(t))
    );

    // Pool para primer plato: recipes with base/carb/entrante tags
    const primeroPool = available.filter(r =>
      (r.type === 'comida' || r.type === 'ambos') && isRecipePrimero(r)
    );
    // Pool para segundo plato: recipes that are primarily protein
    const segundoPool = available.filter(r =>
      (r.type === 'comida' || r.type === 'ambos') && isRecipeSegundo(r)
    );
    // Pool para cena
    const cenaPool = available.filter(r => r.type === 'cena' || r.type === 'ambos');

    // Plan semanal de categorías principales para primeros platos
    const primeroCategorySlots = this._buildWeeklyPlan(preferredTags);
    // Plan de proteínas para segundos platos
    const segundoCategorySlots = this._buildProteinPlan(preferredTags);

    const menu = {
      weekStart: formatDateKey(getMonday()),
      days: {}
    };

    const usedPrimeroIds = new Set();
    const usedSegundoIds = new Set();
    const usedCenaIds = new Set();

    // Generar primeros platos
    DAYS.forEach((day, i) => {
      const targetCat = primeroCategorySlots[i];
      const primero = this._pickMealByCategory(primeroPool, targetCat, usedPrimeroIds, preferredTags);
      menu.days[day] = { primero, segundo: null, cena: null };
    });

    // Generar segundos platos (no repetir proteína del primer plato)
    DAYS.forEach((day, i) => {
      const targetCat = segundoCategorySlots[i];
      const primero = menu.days[day].primero;
      const primeroRecipe = primero ? RECIPES.find(r => r.id === primero.id) : null;
      const primeroTags = primeroRecipe ? primeroRecipe.tags : [];

      // Si el primer plato ya tiene proteína (ej. lentejas con chorizo), evitar repetir
      const avoidProtein = primeroTags.find(t => SEGUNDO_TAGS.has(t));

      const segundo = this._pickSegundo(segundoPool, targetCat, usedSegundoIds, preferredTags, avoidProtein);
      menu.days[day].segundo = segundo;
    });

    // Generar cenas (complementarias)
    DAYS.forEach((day, i) => {
      const dayData = menu.days[day];
      const allDayTags = [];
      for (const slot of ['primero', 'segundo']) {
        const ref = dayData[slot];
        if (ref) {
          const r = RECIPES.find(x => x.id === ref.id);
          if (r) allDayTags.push(...r.tags);
        }
      }
      menu.days[day].cena = this._pickSmartDinner(cenaPool, allDayTags, usedCenaIds, preferredTags, i);
    });

    // Reutilización de sobras (1 cena)
    this._addLeftoverReuse(menu);

    store.setMenu(menu);
    sync.broadcastChange('menu', menu);
    showToast('Menú generado correctamente', 'success');
  }

  // Plan de categorías para primeros platos (7 días)
  _buildWeeklyPlan(preferredTags) {
    // Variado: legumbres, sopa/crema, ensalada, verdura, pasta, arroz...
    let plan = ['legumbres', 'ensalada', 'sopa', 'verdura', 'pasta', 'arroz', 'legumbres'];

    // Mezclar días centrales para variedad
    const swappable = [1, 2, 3, 4, 5];
    for (let i = 0; i < 2; i++) {
      const a = swappable[Math.floor(Math.random() * swappable.length)];
      const b = swappable[Math.floor(Math.random() * swappable.length)];
      if (a !== b) [plan[a], plan[b]] = [plan[b], plan[a]];
    }
    return plan;
  }

  // Plan de proteínas para segundos platos (7 días)
  _buildProteinPlan(preferredTags) {
    // Equilibrio: carne x3, pescado x2, huevos x2
    let plan = ['carne', 'pescado', 'carne', 'huevos', 'pescado', 'carne', 'huevos'];

    const swappable = [0, 1, 2, 3, 4, 5, 6];
    for (let i = 0; i < 3; i++) {
      const a = swappable[Math.floor(Math.random() * swappable.length)];
      const b = swappable[Math.floor(Math.random() * swappable.length)];
      if (a !== b) [plan[a], plan[b]] = [plan[b], plan[a]];
    }

    // Preferencias del usuario
    if (preferredTags.includes('pescado')) {
      const nonFish = plan.map((c, i) => c !== 'pescado' ? i : -1).filter(i => i >= 0);
      if (nonFish.length) plan[nonFish[Math.floor(Math.random() * nonFish.length)]] = 'pescado';
    }
    return plan;
  }

  _pickMealByCategory(pool, targetCategory, usedIds, preferredTags) {
    let candidates = pool.filter(r => r.tags.includes(targetCategory) && !usedIds.has(r.id));
    if (!candidates.length) candidates = pool.filter(r => !usedIds.has(r.id));
    if (!candidates.length) candidates = [...pool];

    const scored = candidates.map(r => {
      let score = Math.random() * 10;
      if (r.tags.includes(targetCategory)) score += 8;
      if (preferredTags.some(t => r.tags.includes(t))) score += 5;
      return { recipe: r, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const recipe = scored[0].recipe;
    usedIds.add(recipe.id);
    return { id: recipe.id, name: recipe.name };
  }

  _pickSegundo(pool, targetCategory, usedIds, preferredTags, avoidProtein) {
    let candidates = pool.filter(r => r.tags.includes(targetCategory) && !usedIds.has(r.id));
    if (!candidates.length) candidates = pool.filter(r => !usedIds.has(r.id));
    if (!candidates.length) candidates = [...pool];

    const scored = candidates.map(r => {
      let score = Math.random() * 10;
      if (r.tags.includes(targetCategory)) score += 8;
      if (preferredTags.some(t => r.tags.includes(t))) score += 5;
      // Penalizar si el primer plato ya tiene esa proteína
      if (avoidProtein && r.tags.includes(avoidProtein)) score -= 6;
      return { recipe: r, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const recipe = scored[0].recipe;
    usedIds.add(recipe.id);
    return { id: recipe.id, name: recipe.name };
  }

  _pickSmartDinner(pool, dayTags, usedIds, preferredTags, dayIndex) {
    const isWeekend = dayIndex >= 4;
    const dayHeavy = dayTags.some(t => ['legumbres', 'carne'].includes(t));
    const dayProteins = dayTags.filter(t => ['carne', 'pescado'].includes(t));

    let candidates = pool.filter(r => !usedIds.has(r.id));
    if (!candidates.length) candidates = [...pool];

    const scored = candidates.map(r => {
      let score = Math.random() * 5;
      // No repetir proteínas del día
      for (const p of dayProteins) {
        if (r.tags.includes(p)) score -= 8;
      }
      // Si el día fue pesado → cena ligera
      if (dayHeavy) {
        if (['ligero','ensalada','crema','sopa'].some(t => r.tags.includes(t))) score += 8;
        if (['verdura','huevos'].some(t => r.tags.includes(t))) score += 5;
        if (r.tags.includes('legumbres')) score -= 8;
      } else {
        if (['huevos','carne'].some(t => r.tags.includes(t))) score += 3;
      }
      if (r.type === 'cena') score += 2;
      if (isWeekend && r.time <= 30) score += 2;
      if (preferredTags.some(t => r.tags.includes(t))) score += 3;
      return { recipe: r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topN = Math.min(3, scored.length);
    const recipe = scored[Math.floor(Math.random() * topN)].recipe;
    usedIds.add(recipe.id);
    return { id: recipe.id, name: recipe.name };
  }

  _addLeftoverReuse(menu) {
    const eligibleDays = [1, 2, 3, 4, 5, 6];
    const shuffled = eligibleDays.sort(() => Math.random() - 0.5);
    let applied = 0;
    for (const dayIdx of shuffled) {
      if (applied >= 1) break;
      // Reutilizar primer plato del día anterior (legumbres, arroces, pastas)
      const prevPrimero = menu.days[DAYS[dayIdx - 1]]?.primero;
      if (!prevPrimero) continue;
      const prevRecipe = RECIPES.find(r => r.id === prevPrimero.id);
      if (prevRecipe && prevRecipe.tags.some(t => ['legumbres','arroz','pasta'].includes(t))) {
        menu.days[DAYS[dayIdx]].cena = {
          id: prevPrimero.id,
          name: `${prevPrimero.name} (sobras)`,
          isLeftover: true
        };
        applied++;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // EDITAR COMIDA
  // ═══════════════════════════════════════════════════════════

  _editMeal(day, meal, currentRecipe) {
    let searchInput, resultsDiv;
    const dayDisplay = DAYS_DISPLAY[DAYS.indexOf(day)];
    const mealLabels = { primero: '☀️ 1er plato', segundo: '☀️ 2do plato', cena: '🌙 Cena' };
    const mealDisplay = mealLabels[meal] || meal;

    const overlay = h('div', { class: 'modal-overlay', onClick: (e) => {
      if (e.target === overlay) overlay.remove();
    }});

    const modal = h('div', { class: 'modal modal--lg' },
      h('div', { class: 'modal__header' },
        h('h3', {}, `${dayDisplay} — ${mealDisplay}`),
        h('button', { class: 'btn btn--ghost btn--icon', onClick: () => overlay.remove() })
      ),
      h('div', { class: 'modal__body' },
        h('div', { class: 'search-box' },
          searchInput = h('input', {
            type: 'text',
            class: 'input',
            placeholder: 'Buscar receta...',
            autocomplete: 'off'
          })
        ),
        resultsDiv = h('div', { class: 'recipe-list' })
      ),
      h('div', { class: 'modal__footer' },
        currentRecipe ? h('button', {
          class: 'btn btn--ghost btn--danger',
          onClick: () => {
            store.setMeal(day, meal, null);
            sync.broadcastChange('menu', store.getMenu());
            overlay.remove();
            showToast('Plato eliminado', 'info');
          }
        }, 'Quitar') : null,
        h('button', { class: 'btn btn--ghost', onClick: () => overlay.remove() }, 'Cancelar')
      )
    );

    modal.querySelector('.btn--ghost.btn--icon').innerHTML = ICONS.x;

    // Filtros según el tipo de slot
    const typeFilter = (r) => {
      if (meal === 'cena') return r.type === 'cena' || r.type === 'ambos';
      return r.type === 'comida' || r.type === 'ambos';
    };

    // Función de puntuación para ordenar las recetas más adecuadas arriba
    const suitabilityScore = (r) => {
      if (meal === 'primero') return isRecipePrimero(r) ? 10 : 0;
      if (meal === 'segundo') return isRecipeSegundo(r) ? 10 : 0;
      return 0;
    };

    const showRecipes = (query = '') => {
      const q = query.toLowerCase().trim();
      let recipes = RECIPES.filter(typeFilter);
      if (q) {
        recipes = recipes.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.tags.some(t => t.includes(q))
        );
      }
      // Ordenar por adecuación
      recipes.sort((a, b) => suitabilityScore(b) - suitabilityScore(a));

      resultsDiv.innerHTML = '';
      if (recipes.length === 0) {
        resultsDiv.appendChild(h('p', { class: 'text-muted text-center' }, 'No se encontraron recetas'));
        return;
      }
      for (const recipe of recipes.slice(0, 50)) {
        const visual = getMealVisual({ id: recipe.id });
        const item = h('button', {
          class: `recipe-item ${currentRecipe && currentRecipe.id === recipe.id ? 'recipe-item--active' : ''}`,
          onClick: () => {
            store.setMeal(day, meal, { id: recipe.id, name: recipe.name });
            sync.broadcastChange('menu', store.getMenu());
            overlay.remove();
            showToast(`${recipe.name} asignado`, 'success');
          }
        },
          h('span', { class: 'recipe-item__emoji' }, visual.emoji),
          h('span', { class: 'recipe-item__name' }, recipe.name),
          h('span', { class: 'recipe-item__tags' },
            ...recipe.tags.slice(0, 3).map(t => h('span', { class: 'tag' }, t))
          ),
          h('span', { class: 'recipe-item__time' }, `${recipe.time}'`)
        );
        resultsDiv.appendChild(item);
      }
    };

    searchInput.addEventListener('input', () => showRecipes(searchInput.value));
    showRecipes();

    overlay.appendChild(modal);
    document.getElementById('modal-container').appendChild(overlay);
    searchInput.focus();
  }

  // ═══════════════════════════════════════════════════════════
  // AÑADIR A LISTA DE COMPRA
  // ═══════════════════════════════════════════════════════════

  _addAllToShopping() {
    const menu = store.getMenu();
    let count = 0;

    for (const day of DAYS) {
      const dayData = menu.days[day];
      if (!dayData) continue;
      for (const meal of MEALS) {
        const recipeRef = dayData[meal];
        if (!recipeRef || recipeRef.isLeftover) continue;
        const recipe = RECIPES.find(r => r.id === recipeRef.id);
        if (recipe) {
          shopping.addRecipeIngredients(recipe);
          count++;
        }
      }
    }

    if (count > 0) {
      showToast(`Ingredientes de ${count} platos añadidos`, 'success');
    } else {
      showToast('No hay platos asignados en el menú', 'info');
    }
  }
}

export const menu = new MenuModule();
