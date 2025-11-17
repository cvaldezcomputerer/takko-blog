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
// DOM elements (will be initialized when DOM is ready)
let elBoard;
let elCards = [];
let elProgress;
let elToast;
let elNext;
let elSettingsToggle;
let elSettingsPanel;
let elRandomize;

// Initialize DOM elements
function initializeDOMElements() {
  elBoard = document.querySelector(".letter-game__board");
  elCards = elBoard
    ? Array.from(elBoard.querySelectorAll(".letter-game__card"))
    : [];
  elProgress = document.querySelector(".letter-game__progress");
  elToast = document.querySelector(".letter-game__toast");
  elNext = document.querySelector(".letter-game__next");
  elSettingsToggle = document.querySelector(".letter-game__settings-toggle");
  elSettingsPanel = document.querySelector("#lg-settings-panel");
  elRandomize = document.querySelector("#lg-randomize");
}

// Game state
let currentPair = ["", ""]; // Image URLs
let currentLetters = ["", ""]; // Letters for card fronts
let currentCategory = "";
let flippedCards = [false, false];
let roundCount = 0;
let recentImages = []; // Track recently used images for cooldown (3 turns = 6 images)
let currentSeed = Math.floor(Math.random() * 1000000); // Generate random seed for each session
let preloadedImages = []; // Cache for preloaded images

// Random colors for cards
const cardColors = [
  "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
  "linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)",
  "linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)",
];

let config = loadSettings(defaultConfig);

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

// Initialize the game once
function initializeGame() {
  if (gameInitialized) return; // Prevent multiple initializations

  // Initialize DOM elements first
  initializeDOMElements();

  // Initialize settings UI
  if (elRandomize) {
    elRandomize.checked = config.randomize;
  }

  if (elSettingsToggle && elSettingsPanel) {
    elSettingsToggle.addEventListener("click", () => {
      const isHidden = elSettingsPanel.hasAttribute("hidden");
      if (isHidden) elSettingsPanel.removeAttribute("hidden");
      else elSettingsPanel.setAttribute("hidden", "");
      elSettingsToggle.setAttribute("aria-expanded", String(isHidden));
    });
  }

  if (elRandomize) {
    elRandomize.addEventListener("change", () => {
      config.randomize = elRandomize.checked;
      saveSettings({ randomize: config.randomize });
      resetGame();
    });
  }

  const checkboxesReady = initializeLetterCheckboxes();
  if (checkboxesReady) {
    initializeEventListeners();
    resetGame();
    gameInitialized = true;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeGame);
} else {
  initializeGame();
}

function updateProgress() {
  if (elProgress) {
    const categoryText = currentCategory
      ? ` - ${currentCategory.toUpperCase()}`
      : "";
    elProgress.textContent = `Round ${roundCount + 1}${categoryText}`;
  }
}

// Preload images to make flipping instant
function preloadImages(imageUrls) {
  imageUrls.forEach((url) => {
    if (!url) return;
    
    // Check if already preloaded
    const alreadyLoaded = preloadedImages.find((img) => img.src === url);
    if (alreadyLoaded) return;
    
    const img = new Image();
    img.src = url;
    preloadedImages.push(img);
  });
  
  // Keep cache reasonable size (only last 20 images)
  if (preloadedImages.length > 20) {
    preloadedImages = preloadedImages.slice(-20);
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

  // Filter out images that are in cooldown (recently used)
  const availableImages = categoryImages.filter(
    (img) => !recentImages.includes(img)
  );

  // If we don't have enough available images, use all images (fallback)
  const imagesToUse = availableImages.length >= 2 ? availableImages : categoryImages;

  // Select two random images from available images
  const shuffled = config.randomize
    ? seededShuffle(imagesToUse.slice(), currentSeed + roundCount)
    : imagesToUse.slice();
  const image1 = shuffled[Math.floor(Math.random() * shuffled.length)];
  let image2;
  do {
    image2 = shuffled[Math.floor(Math.random() * shuffled.length)];
  } while (image2 === image1 && shuffled.length > 1);

  currentPair = [image1, image2];

  // Preload the current pair of images
  preloadImages([image1, image2]);

  // Add current images to recent images queue
  recentImages.push(image1, image2);

  // Keep only the last 6 images (3 turns × 2 images per turn)
  if (recentImages.length > 6) {
    recentImages = recentImages.slice(-6);
  }
}

// Generate two random letters for the front of the cards
function generateLetterPair() {
  const shuffled = config.randomize
    ? seededShuffle(config.letters.slice(), currentSeed + roundCount)
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
    // Add the content and ensure it has proper styling
    card.appendChild(content);
    if (content.tagName === "IMG") {
      content.style.cssText =
        "width: 100%; height: 100%; object-fit: cover; border-radius: 1rem; position: absolute; top: 0; left: 0;";
    }
  }
}

function setRandomCardColors() {
  if (!elCards || elCards.length < 2) return;

  // Set random colors for each card
  elCards.forEach((card) => {
    const randomColor =
      cardColors[Math.floor(Math.random() * cardColors.length)];
    card.style.background = randomColor;
  });
}

function renderCurrentPair() {
  if (!elCards || elCards.length < 2) return;

  const [letter1, letter2] = currentLetters;

  // Set random colors for the cards
  setRandomCardColors();

  // Show letters on cards initially
  setCardContent(elCards[0], letter1);
  setCardContent(elCards[1], letter2);

  elCards[0].classList.remove("letter-game__card--flipped");
  elCards[1].classList.remove("letter-game__card--flipped");
  elCards[0].disabled = false;
  elCards[1].disabled = false;
  flippedCards = [false, false];

  // Remove both-flipped class from board
  if (elBoard) {
    elBoard.classList.remove("both-flipped");
  }

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

  // Check if both cards are flipped and add class to board
  if (flippedCards[0] && flippedCards[1] && elBoard) {
    elBoard.classList.add("both-flipped");
  }

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
  
  // Preload next round's images in background for even smoother experience
  preloadNextRound();
}

// Preload the next round's images in the background
function preloadNextRound() {
  // Simulate what the next round would generate
  const categories = Object.keys(config.images);
  const categoryWithImages = categories.filter(
    (cat) => config.images[cat].length >= 2
  );
  
  if (categoryWithImages.length === 0) return;
  
  // Pick a random category for next round
  const nextCategory =
    categoryWithImages[Math.floor(Math.random() * categoryWithImages.length)];
  const categoryImages = config.images[nextCategory];
  
  // Filter out images in cooldown
  const availableImages = categoryImages.filter(
    (img) => !recentImages.includes(img)
  );
  
  const imagesToUse = availableImages.length >= 2 ? availableImages : categoryImages;
  
  // Preload a few random images from this category
  const samplesToPreload = Math.min(4, imagesToUse.length);
  for (let i = 0; i < samplesToPreload; i++) {
    const randomImg = imagesToUse[Math.floor(Math.random() * imagesToUse.length)];
    if (randomImg) {
      preloadImages([randomImg]);
    }
  }
}

function resetGame() {
  flippedCards = [false, false];
  roundCount = 0;
  recentImages = []; // Clear cooldown queue on reset
  currentSeed = Math.floor(Math.random() * 1000000); // Generate new random seed
  preloadedImages = []; // Clear preload cache
  generateNewPair();
  updateProgress();
  renderCurrentPair();
  updateNextDisabled();
  if (elToast) elToast.textContent = "";
  
  // Preload next round in background
  preloadNextRound();
}

// Wire up event listeners for game controls
function initializeEventListeners() {
  // Wire buttons
  if (elCards.length >= 2) {
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
  }

  if (elNext) {
    elNext.addEventListener("click", () => goNext());
  }
}
