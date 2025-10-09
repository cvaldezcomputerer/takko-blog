// Types
type Config = {
  letters: string[];
  images: Record<string, string[]>; // category -> images mapping
  randomize: boolean;
  seed?: number;
};

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
  food: Object.values(foodImages) as string[],
  animals: Object.values(animalsImages) as string[],
  objects: Object.values(objectsImages) as string[],
  nature: Object.values(natureImages) as string[],
};

// Defaults (edit for your project)
const defaultConfig: Config = {
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
} as const;

function loadSettings(cfg: Config): Config {
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
function saveSettings(partial: Partial<Config>) {
  if (partial.letters)
    localStorage.setItem(LS_KEYS.letters, partial.letters.join(","));
  if (typeof partial.randomize === "boolean")
    localStorage.setItem(LS_KEYS.randomize, String(partial.randomize));
}

// Seeded shuffle (Fisher–Yates)
function seededShuffle<T>(arr: T[], seed = 1): T[] {
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

// Pair generation removed - now generating pairs individually as needed

// DOM refs
const elBoard = document.querySelector(".letter-game__board") as HTMLElement;
const elCards = Array.from(
  elBoard.querySelectorAll(".letter-game__card")
) as HTMLButtonElement[];
const elProgress = document.querySelector(
  ".letter-game__progress"
) as HTMLElement;
const elToast = document.querySelector(".letter-game__toast") as HTMLElement;
const elNext = document.querySelector(
  ".letter-game__next"
) as HTMLButtonElement;
const elSettingsToggle = document.querySelector(
  ".letter-game__settings-toggle"
) as HTMLButtonElement;
const elSettingsPanel = document.querySelector(
  "#lg-settings-panel"
) as HTMLDivElement;
const elRandomize = document.querySelector("#lg-randomize") as HTMLInputElement;

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
  ) as NodeListOf<HTMLInputElement>;
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
  const checkboxes = document.querySelectorAll(
    'input[name="lg-letter"]'
  ) as NodeListOf<HTMLInputElement>;

  checkboxes.forEach((checkbox) => {
    // Set checked state based on saved settings
    checkbox.checked = savedLetters.includes(checkbox.value);

    // Add event listener
    checkbox.addEventListener("change", updateLetterSelection);
  });
}

// Call initialization after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeLetterCheckboxes();
  // Initialize the game after checkboxes are set up
  resetGame();
});

// Game state
let currentPair: [string, string] = ["", ""]; // Image URLs
let currentLetters: [string, string] = ["", ""]; // Letters for card fronts
let currentCategory: string = "";
let flippedCards: boolean[] = [false, false];
let roundCount = 0;
// Local image selection; simple cache not required now

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
function generateLetterPair(): [string, string] {
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

function setCardContent(
  card: HTMLButtonElement,
  content: HTMLElement | string
) {
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

function getImageForCard(side: 0 | 1): string {
  if (side === 0) return currentPair[0] || "";
  if (side === 1) return currentPair[1] || "";
  return "";
}

// Audio functionality removed

// Selection - flip a card to reveal image
function handleSelect(side: 0 | 1) {
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
      handleSelect(idx as 0 | 1);
    }
  });
});
elNext.addEventListener("click", () => goNext());

// Keyboard support removed (mouse only)

console.log("[letter-game] client script loaded - waiting for DOM");
