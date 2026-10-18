/**
 * 2048 - Classic Number Puzzle Game
 * Complete game state management, grid logic, animations, and persistence.
 * Zero external dependencies (Pure Vanilla JavaScript).
 */

(function () {
  'use strict';

  // --- Constants & Configuration ---
  const GRID_SIZE = 4;
  const ANIMATION_DURATION = 120; // Matches CSS transition speed
  const STORAGE_KEY_STATE = '2048_game_state_v1';
  const STORAGE_KEY_BEST = '2048_best_score_v1';
  const STORAGE_KEY_THEME = '2048_theme_v1';

  // --- DOM Elements ---
  const boardEl = document.getElementById('game-board');
  const tileContainer = document.getElementById('tile-container');
  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('best-score');
  const scorePopupContainer = document.getElementById('score-popup-container');
  const undoBtn = document.getElementById('undo-btn');
  const newGameBtn = document.getElementById('new-game-btn');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const winOverlay = document.getElementById('win-overlay');
  const gameOverOverlay = document.getElementById('gameover-overlay');
  const keepGoingBtn = document.getElementById('keep-going-btn');
  const winRestartBtn = document.getElementById('win-restart-btn');
  const tryAgainBtn = document.getElementById('try-again-btn');
  const overlayUndoBtn = document.getElementById('overlay-undo-btn');

  // --- Game State ---
  let grid = [];           // 4x4 array of Tile objects or null
  let tiles = [];          // Array of active Tile instances
  let score = 0;
  let bestScore = 0;
  let hasWon = false;
  let keepGoing = false;
  let isGameOver = false;
  let undoState = null;    // 1-step history snapshot
  let isMoving = false;    // Input lock while animating slide
  let bufferedMove = null; // Buffer 1 input during transition
  let tileIdCounter = 0;

  // --- Tile Model ---
  class Tile {
    constructor(row, col, value, id = null) {
      this.id = id || ++tileIdCounter;
      this.row = row;
      this.col = col;
      this.value = value;
      this.mergedInto = null; // Target Tile if this tile merged into another
      this.mergedFrom = null; // [Tile, Tile] if this tile was formed from a merge
      this.element = null;
    }
  }

  // --- Initialization ---
  function init() {
    loadBestScore();
    initTheme();
    setupEventListeners();

    const savedState = loadSavedState();
    if (savedState && savedState.tiles && savedState.tiles.length > 0) {
      restoreState(savedState);
    } else {
      startNewGame();
    }
  }

  // --- Game Lifecycle ---

  function startNewGame() {
    // Reset state
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    tiles = [];
    score = 0;
    hasWon = false;
    keepGoing = false;
    isGameOver = false;
    undoState = null;
    bufferedMove = null;
    isMoving = false;

    // Reset UI
    tileContainer.innerHTML = '';
    updateScoreDisplay(score);
    updateUndoButton();
    hideOverlays();

    // Spawn 2 initial tiles
    spawnRandomTile();
    spawnRandomTile();

    saveState();
  }

  function spawnRandomTile() {
    const emptyCells = getEmptyCells();
    if (emptyCells.length === 0) return null;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    // 90% chance of 2, 10% chance of 4
    const value = Math.random() < 0.9 ? 2 : 4;

    const tile = new Tile(randomCell.row, randomCell.col, value);
    grid[tile.row][tile.col] = tile;
    tiles.push(tile);

    createTileDOM(tile, { isNew: true });
    return tile;
  }

  function getEmptyCells() {
    const empty = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) {
          empty.push({ row: r, col: c });
        }
      }
    }
    return empty;
  }

  // --- DOM & Render Handling ---

  function createTileDOM(tile, { isNew = false, isMerged = false } = {}) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.value = tile.value;
    el.dataset.digits = String(tile.value).length;
    el.style.setProperty('--col', tile.col);
    el.style.setProperty('--row', tile.row);

    const inner = document.createElement('div');
    inner.className = 'tile-inner';
    inner.textContent = tile.value;
    el.appendChild(inner);

    if (isNew) {
      el.classList.add('tile-new');
    }
    if (isMerged) {
      el.classList.add('tile-merged');
    }

    tileContainer.appendChild(el);
    tile.element = el;
    return el;
  }

  function updateTilePositionDOM(tile) {
    if (!tile.element) return;
    tile.element.style.setProperty('--col', tile.col);
    tile.element.style.setProperty('--row', tile.row);
    tile.element.classList.add('tile-moving');
  }

  // --- Movement & Merge Engine ---

  /**
   * Direction vectors and traversal orders
   */
  const VECTORS = {
    up:    { r: -1, c:  0 },
    down:  { r:  1, c:  0 },
    left:  { r:  0, c: -1 },
    right: { r:  0, c:  1 }
  };

  function buildTraversals(direction) {
    const traversals = {
      row: [0, 1, 2, 3],
      col: [0, 1, 2, 3]
    };
    if (direction === 'down') traversals.row = [3, 2, 1, 0];
    if (direction === 'right') traversals.col = [3, 2, 1, 0];
    return traversals;
  }

  function isWithinBounds(r, c) {
    return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
  }

  function findFarthestPosition(cell, vector) {
    let previous;
    let current = { row: cell.row, col: cell.col };

    do {
      previous = current;
      current = { row: previous.row + vector.r, col: previous.col + vector.c };
    } while (isWithinBounds(current.row, current.col) && grid[current.row][current.col] === null);

    return {
      farthest: previous,
      next: current
    };
  }

  /**
   * Executes a slide move in the given direction.
   * Strictly enforces:
   * 1. Single merge per turn
   * 2. Merge priority in movement direction
   * 3. Valid move verification before spawning
   */
  function move(direction) {
    if (isGameOver || (hasWon && !keepGoing)) return;

    if (isMoving) {
      // Buffer the next move if player presses keys quickly
      bufferedMove = direction;
      return;
    }

    const vector = VECTORS[direction];
    if (!vector) return;

    const traversals = buildTraversals(direction);
    let moved = false;
    let scoreGained = 0;
    let reached2048InThisTurn = false;

    // Track merged tiles created this turn to instantiate after slide animation
    const newMergedTiles = [];
    const movingTiles = [];

    // Snapshot state before making any changes for Undo
    const previousSnapshot = captureStateSnapshot();

    // Reset transient merge flags
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c]) {
          grid[r][c].mergedInto = null;
          grid[r][c].mergedFrom = null;
        }
      }
    }

    // Traverse grid according to direction
    for (const r of traversals.row) {
      for (const c of traversals.col) {
        const tile = grid[r][c];
        if (!tile) continue;

        const positions = findFarthestPosition({ row: r, col: c }, vector);
        const nextCell = positions.next;
        const nextTile = isWithinBounds(nextCell.row, nextCell.col) ? grid[nextCell.row][nextCell.col] : null;

        // Check if merge is possible:
        // Must match value, nextTile must not have merged yet this turn, and current tile must not have merged.
        if (nextTile && nextTile.value === tile.value && !nextTile.mergedFrom && !nextTile.mergedInto) {
          // Merge collision!
          const mergedValue = tile.value * 2;
          const mergedTile = new Tile(nextCell.row, nextCell.col, mergedValue);
          mergedTile.mergedFrom = [nextTile, tile];

          tile.mergedInto = mergedTile;
          nextTile.mergedInto = mergedTile;

          // Update grid references
          grid[r][c] = null;
          grid[nextCell.row][nextCell.col] = mergedTile; // Claimed by merged tile

          // Moving tile slides to target cell
          tile.row = nextCell.row;
          tile.col = nextCell.col;

          movingTiles.push(tile);
          newMergedTiles.push(mergedTile);

          scoreGained += mergedValue;
          if (mergedValue === 2048) {
            reached2048InThisTurn = true;
          }
          moved = true;
        } else {
          // No merge: slide as far as possible
          const farthest = positions.farthest;
          if (farthest.row !== r || farthest.col !== c) {
            grid[r][c] = null;
            grid[farthest.row][farthest.col] = tile;
            tile.row = farthest.row;
            tile.col = farthest.col;

            movingTiles.push(tile);
            moved = true;
          }
        }
      }
    }

    // If nothing moved or merged, move is invalid
    if (!moved) {
      return;
    }

    // Commit Undo Snapshot only on valid move
    undoState = previousSnapshot;
    updateUndoButton();

    // Trigger visual slide transitions
    isMoving = true;
    for (const tile of movingTiles) {
      updateTilePositionDOM(tile);
    }

    // Update score
    if (scoreGained > 0) {
      score += scoreGained;
      updateScoreDisplay(score);
      showScorePopup(scoreGained);

      if (score > bestScore) {
        bestScore = score;
        updateBestScoreDisplay(bestScore);
        saveBestScore();
      }
    }

    // Wait for slide animation (120ms) then finalize merge & spawn
    setTimeout(() => {
      // 1. Remove tiles that were merged away
      for (const t of tiles) {
        if (t.mergedInto && t.element) {
          t.element.remove();
        } else if (t.element) {
          t.element.classList.remove('tile-moving');
        }
      }

      // 2. Create DOM elements for newly merged tiles with pop animation
      for (const mergedTile of newMergedTiles) {
        createTileDOM(mergedTile, { isMerged: true });
      }

      // 3. Update the active tiles list
      tiles = tiles.filter(t => !t.mergedInto).concat(newMergedTiles);

      // 4. Spawn a new random tile
      const spawned = spawnRandomTile();

      // 5. Check Win Condition
      if (reached2048InThisTurn && !hasWon && !keepGoing) {
        hasWon = true;
        showWinOverlay();
      }

      // 6. Check Game Over Condition
      if (checkGameOver()) {
        isGameOver = true;
        showGameOverOverlay();
      }

      // 7. Persist to localStorage
      saveState();

      // 8. Release input lock and process buffered move if any
      isMoving = false;
      if (bufferedMove) {
        const nextDir = bufferedMove;
        bufferedMove = null;
        move(nextDir);
      }
    }, ANIMATION_DURATION);
  }

  // --- Win & Game Over Detection ---

  function checkGameOver() {
    // 1. Any empty cells remaining?
    if (getEmptyCells().length > 0) {
      return false;
    }

    // 2. Any horizontal merges possible?
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        if (grid[r][c].value === grid[r][c + 1].value) {
          return false;
        }
      }
    }

    // 3. Any vertical merges possible?
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 1; r++) {
        if (grid[r][c].value === grid[r + 1][c].value) {
          return false;
        }
      }
    }

    // No empty cells and no matches: Game Over!
    return true;
  }

  function showWinOverlay() {
    winOverlay.classList.add('active');
    winOverlay.setAttribute('aria-hidden', 'false');
  }

  function showGameOverOverlay() {
    gameOverOverlay.classList.add('active');
    gameOverOverlay.setAttribute('aria-hidden', 'false');
    // If undo is available, offer it in the game over screen
    if (undoState) {
      overlayUndoBtn.style.display = 'inline-flex';
    } else {
      overlayUndoBtn.style.display = 'none';
    }
  }

  function hideOverlays() {
    winOverlay.classList.remove('active');
    winOverlay.setAttribute('aria-hidden', 'true');
    gameOverOverlay.classList.remove('active');
    gameOverOverlay.setAttribute('aria-hidden', 'true');
    overlayUndoBtn.style.display = 'none';
  }

  // --- Undo Feature ---

  function captureStateSnapshot() {
    return {
      tiles: tiles.map(t => ({
        id: t.id,
        row: t.row,
        col: t.col,
        value: t.value
      })),
      score: score,
      hasWon: hasWon,
      keepGoing: keepGoing,
      isGameOver: isGameOver
    };
  }

  function undo() {
    if (!undoState || isMoving) return;

    restoreState(undoState);
    undoState = null;
    updateUndoButton();
    saveState();
  }

  function updateUndoButton() {
    undoBtn.disabled = !undoState;
    if (undoState && isGameOver) {
      overlayUndoBtn.style.display = 'inline-flex';
    } else {
      overlayUndoBtn.style.display = 'none';
    }
  }

  function restoreState(saved) {
    // Clear board and DOM
    tileContainer.innerHTML = '';
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    tiles = [];

    // Restore tiles
    for (const item of saved.tiles) {
      const tile = new Tile(item.row, item.col, item.value, item.id);
      grid[tile.row][tile.col] = tile;
      tiles.push(tile);
      createTileDOM(tile);
    }

    // Restore scores and flags
    score = saved.score || 0;
    hasWon = !!saved.hasWon;
    keepGoing = !!saved.keepGoing;
    isGameOver = !!saved.isGameOver;

    updateScoreDisplay(score);

    // Update overlay visibility
    hideOverlays();
    if (isGameOver) {
      showGameOverOverlay();
    } else if (hasWon && !keepGoing) {
      showWinOverlay();
    }

    updateUndoButton();
  }

  // --- Score UI & Floating Indicators ---

  function updateScoreDisplay(val) {
    scoreEl.textContent = val;
  }

  function updateBestScoreDisplay(val) {
    bestScoreEl.textContent = val;
  }

  function showScorePopup(points) {
    if (points <= 0) return;
    const popup = document.createElement('div');
    popup.className = 'score-addition';
    popup.textContent = `+${points}`;
    scorePopupContainer.appendChild(popup);

    popup.addEventListener('animationend', () => {
      popup.remove();
    });
  }

  // --- LocalStorage Persistence ---

  function saveBestScore() {
    try {
      localStorage.setItem(STORAGE_KEY_BEST, bestScore.toString());
    } catch (e) {
      console.warn('LocalStorage error saving best score:', e);
    }
  }

  function loadBestScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BEST);
      if (saved !== null) {
        bestScore = parseInt(saved, 10) || 0;
        updateBestScoreDisplay(bestScore);
      }
    } catch (e) {
      console.warn('LocalStorage error loading best score:', e);
    }
  }

  function saveState() {
    try {
      const state = {
        tiles: tiles.map(t => ({
          id: t.id,
          row: t.row,
          col: t.col,
          value: t.value
        })),
        score: score,
        hasWon: hasWon,
        keepGoing: keepGoing,
        isGameOver: isGameOver,
        undoState: undoState ? {
          tiles: undoState.tiles,
          score: undoState.score,
          hasWon: undoState.hasWon,
          keepGoing: undoState.keepGoing,
          isGameOver: undoState.isGameOver
        } : null
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
    } catch (e) {
      console.warn('LocalStorage error saving game state:', e);
    }
  }

  function loadSavedState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_STATE);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.tiles)) {
        if (parsed.undoState) {
          undoState = parsed.undoState;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage error parsing game state:', e);
    }
    return null;
  }

  // --- Dark Mode / Theme Handling ---

  function initTheme() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme) {
        setTheme(savedTheme);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    } catch (e) {
      setTheme('light');
    }
  }

  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (e) {
      // Storage unavailable
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'light' : 'dark');
  }

  // --- Input Listeners (Keyboard & Touch) ---

  function setupEventListeners() {
    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      // Avoid intercepting if focus is on form elements
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const key = e.key;

      // Undo shortcut: Ctrl+Z / Cmd+Z
      if ((key === 'z' || key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
        return;
      }

      // Arrow keys and WASD mappings
      const keyMap = {
        ArrowUp: 'up',
        KeyW: 'up',
        w: 'up',
        W: 'up',

        ArrowDown: 'down',
        KeyS: 'down',
        s: 'down',
        S: 'down',

        ArrowLeft: 'left',
        KeyA: 'left',
        a: 'left',
        A: 'left',

        ArrowRight: 'right',
        KeyD: 'right',
        d: 'right',
        D: 'right'
      };

      const direction = keyMap[key] || keyMap[e.code];
      if (direction) {
        // Prevent default browser scroll on arrow keys / WASD
        e.preventDefault();
        move(direction);
      }
    });

    // Mobile Touch Swipe Handling
    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 30; // Minimum px distance for a swipe

    boardEl.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) return; // Ignore multi-touch gestures
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    boardEl.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 0) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) >= SWIPE_THRESHOLD) {
        if (absDx > absDy) {
          // Horizontal dominant swipe
          move(dx > 0 ? 'right' : 'left');
        } else {
          // Vertical dominant swipe
          move(dy > 0 ? 'down' : 'up');
        }
      }
    }, { passive: true });

    // Buttons
    newGameBtn.addEventListener('click', startNewGame);
    undoBtn.addEventListener('click', undo);
    themeToggleBtn.addEventListener('click', toggleTheme);

    keepGoingBtn.addEventListener('click', () => {
      keepGoing = true;
      hideOverlays();
      saveState();
    });

    winRestartBtn.addEventListener('click', startNewGame);
    tryAgainBtn.addEventListener('click', startNewGame);
    overlayUndoBtn.addEventListener('click', undo);
  }

  // --- Boot Game on DOM ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

