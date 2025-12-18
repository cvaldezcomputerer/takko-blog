// Card Game Script (Points-only)

// Game data - customize events
const gameData = {
  events: [
    "SWAP: ランダムなチームとポイントを交換",
    "Double Points: ポイント2倍",
    "Steal 5 Points: 選んだチームから5ポイント奪う",
    "Gift 5 Points: 他のチームに5ポイントあげる",
    "Mystery Box: コイン表+10／裏-5",
    "Lottery: 全チームから1ポイントもらう",
    "Oh no!: ポイントはゼロになった",
  ],
};

// Game state
let pointsRevealing = false;

// DOM elements
const pointsCard = document.getElementById("points-card");
const pointsContent = document.getElementById("points-content");
const resetBtn = document.getElementById("reset-btn");

// Generate a random points or event card
function generatePointsCard() {
  const rand = Math.random();

  if (rand < 0.8) {
    // 80% - Normal points card (1-5 points)
    const choices = [-2, -1, 1, 3, 5];
    const points = choices[Math.floor(Math.random() * choices.length)];

    return {
      type: "points",
      value: points,
      display: `${points}`,
    };
  } else {
    // 20% - Event card
    const event =
      gameData.events[Math.floor(Math.random() * gameData.events.length)];
    return { type: "event", value: event, display: event };
  }
}

// Initialize game
function initGame() {
  pointsRevealing = false;

  // Reset card state
  pointsCard.classList.remove(
    "card-game__card--revealed",
    "card-game__card--revealing",
    "card-game__card--event"
  );
  pointsCard.style.removeProperty("--event-glow");
  pointsContent.textContent = "";
}

// Reveal card with 1 second buildup
function revealCard(card, content) {
  // Don't reveal if currently revealing
  if (card.classList.contains("card-game__card--revealing")) {
    return;
  }

  // Reset card if it was previously revealed
  card.classList.remove("card-game__card--revealed", "card-game__card--event");
  card.style.removeProperty("--event-glow");
  content.textContent = "";

  // Add revealing class for buildup animation
  card.classList.add("card-game__card--revealing");

  pointsRevealing = true;

  // After 1 second, reveal the content
  setTimeout(() => {
    card.classList.remove("card-game__card--revealing");
    card.classList.add("card-game__card--revealed");

    // Generate a random card
    const cardData = generatePointsCard();
    content.textContent = cardData.display;

    if (cardData.type === "event") {
      // Random glow color for event cards
      const hue = Math.floor(Math.random() * 360);
      const glowColor = `hsla(${hue}, 100%, 65%, 0.95)`;
      card.style.setProperty("--event-glow", glowColor);
      card.classList.add("card-game__card--event");
    }

    pointsRevealing = false;
  }, 1000);
}

// Handle points card click
pointsCard.addEventListener("click", () => {
  if (!pointsRevealing) {
    revealCard(pointsCard, pointsContent);
  }
});

// Handle reset button
resetBtn.addEventListener("click", () => {
  initGame();
});

// Keyboard support
pointsCard.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !pointsRevealing) {
    e.preventDefault();
    revealCard(pointsCard, pointsContent);
  }
});

// Initialize game when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGame);
} else {
  initGame();
}
