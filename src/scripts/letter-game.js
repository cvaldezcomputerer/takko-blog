// Types removed - using plain JavaScript

/*
RECOMMENDED IMAGE HOSTING OPTIONS:
=================================

OPTION 1: Cloudflare R2 (Recommended)
- Free tier: 10GB storage, 1M requests/month
- No egress fees, global CDN
- Proper image optimization
- Instant cache updates
- Designed for this use case

OPTION 2: Imgur (Simple alternative)
- Unlimited free uploads
- Direct image URLs
- No setup complexity
- Good for testing

OPTION 3: Local Astro assets (Simplest)
- Use Astro's built-in image optimization
- Keep images in src/assets/images/letter-game/
- No external dependencies
- Best performance with proper optimization

NOTE: jsDelivr is not recommended as it's against their AUP for non-package hosting
and lacks proper image optimization features.
*/

// Build image pools from category folders at build time
// Structure: src/assets/images/letter-game/{category}/
const foodImages = import.meta.glob(
  "/src/assets/images/letter-game/food/*.{jpg,jpeg,png,webp,gif}",
  { eager: true, query: "?url", import: "default" }
);

const animalsImages = import.meta.glob(
  "/src/assets/images/letter-game/animals/*.{jpg,jpeg,png,webp,gif}",
  { eager: true, query: "?url", import: "default" }
);

const objectsImages = import.meta.glob(
  "/src/assets/images/letter-game/objects/*.{jpg,jpeg,png,webp,gif}",
  { eager: true, query: "?url", import: "default" }
);

const natureImages = import.meta.glob(
  "/src/assets/images/letter-game/nature/*.{jpg,jpeg,png,webp,gif}",
  { eager: true, query: "?url", import: "default" }
);

// Organize images by category
const imagesFromGlob = {
  food: Object.values(foodImages),
  animals: Object.values(animalsImages),
  objects: Object.values(objectsImages),
  nature: Object.values(natureImages),
};

// Defaults (edit for your project)
const defaultConfig = {
  letters: [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ],
  images: {
    food: [...imagesFromGlob.food],
    animals: [...imagesFromGlob.animals],
    objects: [...imagesFromGlob.objects],
    nature: [...imagesFromGlob.nature],
  },
  randomize: true,
  seed: 42,
};

// Persist settings
const LS_KEYS = {
  randomize: "lg-randomize",
  letters: "lg-letters",
};

function loadSettings(cfg) {
  try {
    const lettersStr = localStorage.getItem(LS_KEYS.letters);
    const letters = lettersStr
      ? lettersStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : cfg.letters;
    const randomize = JSON.parse(
      localStorage.getItem(LS_KEYS.randomize) || "null"
    );

    return {
      ...cfg,
      letters,
      randomize: typeof randomize === "boolean" ? randomize : cfg.randomize,
    };
  } catch {
    return cfg;
  }
}

function saveSettings(partial) {
  if (partial.letters)
    localStorage.setItem(LS_KEYS.letters, partial.letters.join(","));
  if (typeof partial.randomize === "boolean")
    localStorage.setItem(LS_KEYS.randomize, String(partial.randomize));
}

// Seeded shuffle (Fisher–Yates)
function seededShuffle(arr, seed = 1) {
  const a = arr.slice();
  let s = seed >>> 0;
  function rnd() {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// DOM refs
const elBoard = document.querySelector(".letter-game__board");
const elCards = elBoard
  ? Array.from(elBoard.querySelectorAll(".letter-game__card"))
  : [];
const elProgress = document.querySelector(".letter-game__progress");
const elToast = document.querySelector(".letter-game__toast");
const elNext = document.querySelector(".letter-game__next");
const elSettingsToggle = document.querySelector(
  ".letter-game__settings-toggle"
);
const elSettingsPanel = document.querySelector("#lg-settings-panel");
const elRandomize = document.querySelector("#lg-randomize");

let config = loadSettings(defaultConfig);

// Initialize settings UI
elRandomize.checked = config.randomize;

elSettingsToggle.addEventListener("click", () => {
  const isHidden = elSettingsPanel.hasAttribute("hidden");
  if (isHidden) elSettingsPanel.removeAttribute("hidden");
  else elSettingsPanel.setAttribute("hidden", "");
  elSettingsToggle.setAttribute("aria-expanded", String(isHidden));
});

elRandomize.addEventListener("change", () => {
  config.randomize = elRandomize.checked;
  saveSettings({ randomize: config.randomize });
  resetGame();
});

// Letters input - now handled by checkbox system
function updateLetterSelection() {
  const checkboxes = document.querySelectorAll(
    'input[name="lg-letter"]:checked'
  );
  const selectedLetters = Array.from(checkboxes).map((cb) => cb.value);
  if (selectedLetters.length > 0) {
    config.letters = selectedLetters;
    saveSettings({ letters: config.letters });
    resetGame();
  }
}

// Initialize letter checkboxes from saved settings
function initializeLetterCheckboxes() {
  const savedLetters = config.letters;
  const checkboxes = document.querySelectorAll('input[name="lg-letter"]');

  if (checkboxes.length === 0) {
    return false;
  }

  checkboxes.forEach((checkbox) => {
    // Set checked state based on saved settings
    checkbox.checked = savedLetters.includes(checkbox.value);

    // Add event listener
    checkbox.addEventListener("change", updateLetterSelection);
  });

  return true;
}

// Track if game is already initialized
let gameInitialized = false;

// Initialize the game - multiple strategies to handle navigation
function initializeGame() {
  if (gameInitialized) return; // Prevent multiple initializations

  // Wait a bit for DOM elements to be available
  setTimeout(() => {
    if (gameInitialized) return; // Double-check

    const checkboxesReady = initializeLetterCheckboxes();
    if (checkboxesReady) {
      resetGame();
      gameInitialized = true;
    }
  }, 100);
}

// Try immediate initialization first
if (document.readyState === "loading") {
  // Document is still loading
  document.addEventListener("DOMContentLoaded", initializeGame);
} else {
  // Document is already loaded (navigation from another page)
  initializeGame();
}

// Also try initialization after a short delay as backup
setTimeout(initializeGame, 500);

// Game state
let currentPair = ["", ""]; // Image URLs
let currentLetters = ["", ""]; // Letters for card fronts
let currentCategory = "";
let flippedCards = [false, false];
let roundCount = 0;

function resetGame() {
  flippedCards = [false, false];
  roundCount = 0;
  generateNewPair();
  updateProgress();
  renderCurrentPair();
  updateNextDisabled();
  if (elToast) elToast.textContent = "";
}

function updateProgress() {
  if (elProgress) {
    const categoryText = currentCategory
      ? ` - ${currentCategory.toUpperCase()}`
      : "";
    elProgress.textContent = `Round ${roundCount + 1}${categoryText}`;
  }
}

function generateNewPair() {
  // Generate random letters for the front of the cards
  currentLetters = generateLetterPair();

  // First, select a random category
  const categories = Object.keys(config.images);
  const categoryWithImages = categories.filter(
    (cat) => config.images[cat].length >= 2
  );

  if (categoryWithImages.length === 0) {
    currentCategory = "";
    currentPair = ["", ""];
    return;
  }

  currentCategory =
    categoryWithImages[Math.floor(Math.random() * categoryWithImages.length)];
  const categoryImages = config.images[currentCategory];

  // Select two random images from the chosen category
  const shuffled = config.randomize
    ? seededShuffle(categoryImages.slice(), config.seed)
    : categoryImages.slice();
  const image1 = shuffled[Math.floor(Math.random() * shuffled.length)];
  let image2;
  do {
    image2 = shuffled[Math.floor(Math.random() * shuffled.length)];
  } while (image2 === image1 && shuffled.length > 1);

  currentPair = [image1, image2];
}

// Generate two random letters for the front of the cards
function generateLetterPair() {
  const shuffled = config.randomize
    ? seededShuffle(config.letters.slice(), config.seed)
    : config.letters.slice();
  const letter1 = shuffled[Math.floor(Math.random() * shuffled.length)];
  let letter2;
  do {
    letter2 = shuffled[Math.floor(Math.random() * shuffled.length)];
  } while (letter2 === letter1 && shuffled.length > 1);

  return [letter1, letter2];
}

function updateNextDisabled() {
  if (elNext) elNext.disabled = false; // Always allow next
}

function setCardContent(card, content) {
  card.innerHTML = "";
  if (typeof content === "string") {
    card.textContent = content;
  } else {
    card.appendChild(content);
  }
}

function renderCurrentPair() {
  if (!elCards || elCards.length < 2) return;

  const [letter1, letter2] = currentLetters;

  // Show letters on cards initially
  setCardContent(elCards[0], letter1);
  setCardContent(elCards[1], letter2);

  elCards[0].classList.remove("letter-game__card--flipped");
  elCards[1].classList.remove("letter-game__card--flipped");
  elCards[0].disabled = false;
  elCards[1].disabled = false;
  flippedCards = [false, false];
  updateNextDisabled();
}

function getImageForCard(side) {
  if (side === 0) return currentPair[0] || "";
  if (side === 1) return currentPair[1] || "";
  return "";
}

// Selection - flip a card to reveal image
function handleSelect(side) {
  if (flippedCards[side]) return; // Already flipped

  const imageUrl = getImageForCard(side);
  if (!imageUrl) return;

  flippedCards[side] = true;
  updateNextDisabled();

  // Visual flip to image
  elCards[side].classList.add("letter-game__card--flipped");

  // Try to load the image
  const img = new Image();
  img.alt = `${currentCategory} image`;
  img.decoding = "async";

  // Handle image loading errors gracefully
  img.onload = () => {
    setCardContent(elCards[side], img);
    const letter = currentLetters[side];
    elToast.textContent = `${letter} flipped - ${currentCategory} image revealed!`;
  };

  img.onerror = () => {
    // Fallback to text when image fails to load
    const letter = currentLetters[side];
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = "text-align: center; padding: 1rem; color: #666;";
    errorDiv.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 0.5rem;">${letter}</div>
      <div style="font-size: 0.9rem;">Image not available</div>
    `;
    setCardContent(elCards[side], errorDiv);
    elToast.textContent = `${letter} flipped - no image available.`;
  };

  img.src = imageUrl;
}

// Next
function goNext() {
  // Always allow next - generate new pair
  roundCount++;
  generateNewPair();
  updateProgress();
  renderCurrentPair();
}

// Wire buttons
elCards[0].addEventListener("click", () => handleSelect(0));
elCards[1].addEventListener("click", () => handleSelect(1));

// Keyboard activation for cards: Enter/Space
elCards.forEach((card, idx) => {
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(idx);
    }
  });
});

elNext.addEventListener("click", () => goNext());
