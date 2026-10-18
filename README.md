# 🎮 2048 - Modern, Responsive Web Browser Game

A sleek, production-ready, and fully responsive implementation of the classic **2048** puzzle game built with **pure HTML5, CSS3, and Vanilla JavaScript** — zero external dependencies, zero build steps, and zero frameworks.

---

### 🌐 Live Demo

<p align="center">
  <a href="https://2048-game.aarush-relhan3009.workers.dev" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/PLAY_NOW-Live_Game-success?style=for-the-badge&logo=cloudflare&logoColor=white&color=F38020" alt="Play Now - Live Demo" height="42" />
  </a>
</p>

<p align="center">
  👉 <strong>Play the live game right in your browser:</strong> <br />
  <a href="https://2048-game.aarush-relhan3009.workers.dev" target="_blank" rel="noopener noreferrer">
    <strong>https://2048-game.aarush-relhan3009.workers.dev</strong>
  </a>
</p>

---

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Vanilla JavaScript" />
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/Dependencies-0-brightgreen?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License" />
</p>

---

## ✨ Features

### 🎯 Authentic 2048 Core Engine & Strict Edge-Case Compliance
- **Standard 4x4 Board:** Generates 2 random tiles upon start with official spawn probabilities (90% chance of a `2`, 10% chance of a `4`).
- **Single Merge Per Turn:** A merged tile cannot merge again during the same move (e.g., `[2, 2, 4, 0]` sliding left becomes `[4, 4, 0, 0]`, not `[8, 0, 0, 0]`).
- **Directional Merge Priority:** Three identical tiles merge in the direction of movement (e.g., `[2, 2, 2, 0]` sliding left becomes `[4, 2, 0, 0]`; sliding right becomes `[0, 0, 2, 4]`).
- **Move Validation Check:** Random tiles only spawn if at least one tile actually changes coordinate or merges. Blocked swipes or presses never penalize the player.

### 🎬 Silky Smooth 60FPS Animations
- **Hardware-Accelerated CSS Transitions:** Tile coordinate shifts use `transform: translate(...)` driven by CSS variables (`--col`, `--row`) with a 120ms transition timing for true 60fps sliding across viewports.
- **Dedicated Inner Scale Animation:** Translating coordinates is decoupled from scaling animations using `.tile-inner`, avoiding transform keyframe conflicts.
- **Spawn & Merge Effects:** Distinct `appear` animation for new tiles and an elastic `pop` scale animation for merged combinations.
- **Floating `+Score` Indicators:** Merging tiles triggers an animated floating `+X` score popup over the scoreboard that fades away gracefully.
- **Fast Input Buffering:** Buffers rapid keyboard or touch inputs during the 120ms animation window so quick players never drop a stroke.

### 🕹️ User Experience & Quality-of-Life Enhancements
- **1-Step Undo:** Snapshot-based undo functionality that restores previous board state, score, and game flags (via on-screen button or `Ctrl+Z` / `Cmd+Z`). Even available directly on the **Game Over** screen!
- **Endless Mode (Past 2048):** Reaching the 2048 tile triggers a "You Win!" modal with options to start a **New Game** or **Keep Going** to chase `4096`, `8192`, `16384`, `32768`, and `65536+`.
- **Dynamic Tile Palette:** Custom warm, vibrant color palettes for each power of 2, complete with subtle radiant glows for higher-tier tiles.
- **Fluid Typography:** Tile font sizes automatically scale down based on character length (`data-digits`) so 3-, 4-, 5-, and 6-digit numbers fit comfortably.
- **Dark / Light Theme Toggle:** One-click Sun/Moon theme switcher with automatic fallback to system preferences (`prefers-color-scheme: dark`) and persistent storage.
- **LocalStorage State Persistence:** Automatically saves best score, active board layout, current score, undo history, and theme settings to `localStorage`. Refreshing or reopening the browser never loses your run.

---

## 📖 How to Play & Controls

### Objective
Slide numbered tiles across the 4x4 grid. When two tiles with the same number touch, they **merge into one with double the value**! Reach the **2048** tile to win, or keep playing for an even higher record score!

### Controls

| Input Method | Action | Description |
| :--- | :--- | :--- |
| **Arrow Keys** | `↑` `↓` `←` `→` | Slide tiles Up, Down, Left, or Right (browser scrolling prevented). |
| **WASD Keys** | `W` `A` `S` `D` | Alternative desktop controls for sliding tiles. |
| **Touch Swipes** | Swipe `Up` / `Down` / `Left` / `Right` | Swipe anywhere across the game board on touch devices (threshold ~30px, `touch-action: none` prevents screen pull). |
| **Undo Move** | `Ctrl + Z` or `Cmd + Z` | Reverts the last move and updates the score. |
| **Undo Button** | On-screen button | Reverts the last move; also appears on the Game Over overlay. |
| **New Game** | On-screen button | Resets the grid and starts a fresh game. |
| **Theme Toggle** | Sun / Moon button | Toggles between Dark Mode and Light Mode. |

---

## 🛠️ Tech Stack & Architecture

This application was engineered with a **zero-dependency philosophy** for maximum longevity, blazing-fast load speeds, and effortless hosting:

- **HTML5:** Clean, accessible, semantic structure with modal overlays and SVG iconography.
- **CSS3:** Modern CSS with custom properties (CSS variables), CSS Grid, Flexbox, hardware-accelerated transforms, and media queries.
- **Vanilla JavaScript (ES6+):** Pure object-oriented modular state machine, mathematical vector traversals, and touch gesture calculation.

### 📁 Repository Structure

```text
2048-game/
├── index.html        # Semantic layout, scoreboards, board container, and modal overlays
├── style.css         # Responsive styling, color palette, animations, and dark/light themes
├── script.js         # Complete game engine, grid logic, animations, input listeners, & localStorage
└── README.md         # Comprehensive project documentation and live links
```

### File Breakdown

- **`index.html`**: Defines the application layout, header score cards, 4x4 background cells, dynamic tile container layer, and overlay modals for "You Win!" and "Game Over".
- **`style.css`**: Powers the visual theme, handles responsive scaling (`--board-size`, `--cell-size`, `--grid-gap`), digit scaling rules, dark theme variables, and keyframe animations (`float-score`, `tile-appear`, `tile-pop`, `overlay-slide-up`).
- **`script.js`**: Contains the `Tile` model, vector-based slide/merge traversal algorithm, touch/keyboard event listeners, `localStorage` synchronization, and undo history management.

---

## 💻 Local Development

You can run this project locally with any static web server or simply open the file in your browser:

### 1. Clone the Repository
```bash
git clone https://github.com/Aarush-300/2048-game.git
cd 2048-game
```

### 2. Run Locally (Choose Any Option)

#### Option A: Direct File Open
Simply double-click `index.html` or open it with your browser:
```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

#### Option B: Python HTTP Server (Built-in)
```bash
# Python 3
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

#### Option C: Node.js / NPX
```bash
npx serve .
```

#### Option D: VS Code Live Server
Right-click `index.html` in VS Code and select **"Open with Live Server"**.

---

## 🚀 Deployment

Because the application contains **zero external dependencies** and no build compilation steps, it can be deployed to any static host in seconds:

- **Live Production Instance:** Hosted on Cloudflare at [**`https://2048-game.aarush-relhan3009.workers.dev`**](https://2048-game.aarush-relhan3009.workers.dev)
- **Alternative Static Hosts:**
  - **Cloudflare Pages / Workers:** Connect your GitHub repository and set the build directory to `/` (no build command needed).
  - **GitHub Pages:** Go to `Repository Settings -> Pages -> Deploy from Branch (main / root)`.
  - **Vercel / Netlify:** Import the repository as a static project without any build script.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ for classic puzzle enthusiasts. <br />
  <strong><a href="https://2048-game.aarush-relhan3009.workers.dev">Play the Live Game Now →</a></strong>
</p>

