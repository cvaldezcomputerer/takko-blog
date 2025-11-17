// Jeopardy Game Script

// Game data - customize this with your own categories, questions, and answers
const gameData = {
  categories: [
    "Kit Card",
    "Country Draw",
    "Nani Kore Box",
    "English Challenge 1",
    "English Challenge 2",
  ],
  questions: [
    // Column 1: Kit Card
    [
      {
        points: 100,
        question: "Question for Kit Card 100",
        answer: "Answer here",
      },
      {
        points: 200,
        question: "Question for Kit Card 200",
        answer: "Answer here",
      },
      {
        points: 300,
        question: "Question for Kit Card 300",
        answer: "Answer here",
      },
      {
        points: 400,
        question: "Question for Kit Card 400",
        answer: "Answer here",
      },
      {
        points: 500,
        question: "Question for Kit Card 500",
        answer: "Answer here",
      },
      {
        points: 600,
        question: "Question for Kit Card 600",
        answer: "Answer here",
      },
    ],
    // Column 2: Country Draw
    [
      {
        points: 100,
        question: "Question for Country Draw 100",
        answer: "Answer here",
      },
      {
        points: 200,
        question: "Question for Country Draw 200",
        answer: "Answer here",
      },
      {
        points: 300,
        question: "Question for Country Draw 300",
        answer: "Answer here",
      },
      {
        points: 400,
        question: "Question for Country Draw 400",
        answer: "Answer here",
      },
      {
        points: 500,
        question: "Question for Country Draw 500",
        answer: "Answer here",
      },
      {
        points: 600,
        question: "Question for Country Draw 600",
        answer: "Answer here",
      },
    ],
    // Column 3: Nani Kore Box
    [
      {
        points: 100,
        question: "Question for Nani Kore Box 100",
        answer: "Answer here",
      },
      {
        points: 200,
        question: "Question for Nani Kore Box 200",
        answer: "Answer here",
      },
      {
        points: 300,
        question: "Question for Nani Kore Box 300",
        answer: "Answer here",
      },
      {
        points: 400,
        question: "Question for Nani Kore Box 400",
        answer: "Answer here",
      },
      {
        points: 500,
        question: "Question for Nani Kore Box 500",
        answer: "Answer here",
      },
      {
        points: 600,
        question: "Question for Nani Kore Box 600",
        answer: "Answer here",
      },
    ],
    // Column 4: English Challenge 1
    [
      {
        points: 100,
        question: "Question for English Challenge 1 - 100",
        answer: "Answer here",
      },
      {
        points: 200,
        question: "Question for English Challenge 1 - 200",
        answer: "Answer here",
      },
      {
        points: 300,
        question: "Question for English Challenge 1 - 300",
        answer: "Answer here",
      },
      {
        points: 400,
        question: "Question for English Challenge 1 - 400",
        answer: "Answer here",
      },
      {
        points: 500,
        question: "Question for English Challenge 1 - 500",
        answer: "Answer here",
      },
      {
        points: 600,
        question: "Question for English Challenge 1 - 600",
        answer: "Answer here",
      },
    ],
    // Column 5: English Challenge 2
    [
      {
        points: 100,
        question: "Question for English Challenge 2 - 100",
        answer: "Answer here",
      },
      {
        points: 200,
        question: "Question for English Challenge 2 - 200",
        answer: "Answer here",
      },
      {
        points: 300,
        question: "Question for English Challenge 2 - 300",
        answer: "Answer here",
      },
      {
        points: 400,
        question: "Question for English Challenge 2 - 400",
        answer: "Answer here",
      },
      {
        points: 500,
        question: "Question for English Challenge 2 - 500",
        answer: "Answer here",
      },
      {
        points: 600,
        question: "Question for English Challenge 2 - 600",
        answer: "Answer here",
      },
    ],
  ],
};

// Game state
let revealedCells = new Set();

// Initialize the game
function initGame() {
  const board = document.getElementById("jeopardy-board");

  // Create category headers
  gameData.categories.forEach((category) => {
    const categoryElement = document.createElement("div");
    categoryElement.className = "jeopardy__category";
    categoryElement.textContent = category;
    board.appendChild(categoryElement);
  });

  // Create cells for each question
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = document.createElement("button");
      cell.className = "jeopardy__cell";
      cell.textContent = `$${gameData.questions[col][row].points}`;
      cell.dataset.col = col;
      cell.dataset.row = row;

      cell.addEventListener("click", () => handleCellClick(col, row, cell));

      board.appendChild(cell);
    }
  }

  // Set up modal event listeners
  setupModalListeners();
}

// Handle cell click
function handleCellClick(col, row, cellElement) {
  const cellId = `${col}-${row}`;

  // Don't open if already revealed
  if (revealedCells.has(cellId)) {
    return;
  }

  const questionData = gameData.questions[col][row];
  const category = gameData.categories[col];

  // Show modal with question
  showModal(category, questionData, cellId, cellElement);
}

// Show modal
function showModal(category, questionData, cellId, cellElement) {
  const modal = document.getElementById("jeopardy-modal");
  const modalCategory = document.getElementById("modal-category");
  const modalPoints = document.getElementById("modal-points");
  const modalQuestion = document.getElementById("modal-question");
  const modalAnswer = document.getElementById("modal-answer");
  const revealBtn = document.getElementById("reveal-answer-btn");
  const closeBtn = document.getElementById("close-modal-btn");

  // Set content
  modalCategory.textContent = category;
  modalPoints.textContent = `$${questionData.points}`;
  modalQuestion.textContent = questionData.question;
  modalAnswer.textContent = `Answer: ${questionData.answer}`;

  // Reset visibility
  modalAnswer.hidden = true;
  revealBtn.hidden = false;

  // Show modal
  modal.hidden = false;

  // Store current cell info for when we close
  modal.dataset.cellId = cellId;
  modal.dataset.cellElement = cellElement;
}

// Set up modal event listeners
function setupModalListeners() {
  const modal = document.getElementById("jeopardy-modal");
  const revealBtn = document.getElementById("reveal-answer-btn");
  const closeBtn = document.getElementById("close-modal-btn");
  const modalAnswer = document.getElementById("modal-answer");

  // Reveal answer button
  revealBtn.addEventListener("click", () => {
    modalAnswer.hidden = false;
    revealBtn.hidden = true;
  });

  // Close button
  closeBtn.addEventListener("click", () => {
    const cellId = modal.dataset.cellId;
    const cellElements = document.querySelectorAll(".jeopardy__cell");

    // Find and mark the cell as revealed
    cellElements.forEach((cell) => {
      if (`${cell.dataset.col}-${cell.dataset.row}` === cellId) {
        cell.classList.add("jeopardy__cell--revealed");
        cell.textContent = "";
        cell.disabled = true;
      }
    });

    // Add to revealed set
    revealedCells.add(cellId);

    // Hide modal
    modal.hidden = true;
  });

  // Close on background click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeBtn.click();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) {
      closeBtn.click();
    }
  });
}

// Score tracking system
const STORAGE_KEY = "jeopardy-scores";
const NUM_TEAMS = 6;

let teamScores = [];

// Initialize scores
function initScores() {
  // Load scores from localStorage or create new
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    teamScores = JSON.parse(saved);
  } else {
    teamScores = Array.from({ length: NUM_TEAMS }, (_, i) => ({
      name: `Team ${i + 1}`,
      score: 0,
    }));
  }
  renderScores();
}

// Save scores to localStorage
function saveScores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teamScores));
}

// Render score grid
function renderScores() {
  const scoreGrid = document.getElementById("score-grid");
  scoreGrid.innerHTML = "";

  teamScores.forEach((team, index) => {
    const teamDiv = document.createElement("div");
    teamDiv.className = "jeopardy__team";
    teamDiv.innerHTML = `
      <div class="jeopardy__team-header">
        <span class="jeopardy__team-name">${team.name}</span>
        <span class="jeopardy__team-score">$${team.score}</span>
      </div>
      <div class="jeopardy__team-controls">
        <button class="jeopardy__team-btn jeopardy__team-btn--subtract" data-team="${index}" data-amount="100">-$100</button>
        <button class="jeopardy__team-btn jeopardy__team-btn--subtract" data-team="${index}" data-amount="50">-$50</button>
        <button class="jeopardy__team-btn jeopardy__team-btn--add" data-team="${index}" data-amount="50">+$50</button>
        <button class="jeopardy__team-btn jeopardy__team-btn--add" data-team="${index}" data-amount="100">+$100</button>
      </div>
    `;
    scoreGrid.appendChild(teamDiv);
  });

  // Add event listeners to buttons
  document.querySelectorAll(".jeopardy__team-btn--add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const teamIndex = parseInt(e.target.dataset.team);
      const amount = parseInt(e.target.dataset.amount);
      teamScores[teamIndex].score += amount;
      saveScores();
      renderScores();
    });
  });

  document.querySelectorAll(".jeopardy__team-btn--subtract").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const teamIndex = parseInt(e.target.dataset.team);
      const amount = parseInt(e.target.dataset.amount);
      teamScores[teamIndex].score -= amount;
      saveScores();
      renderScores();
    });
  });
}

// Set up score modal event listeners
function setupScoreModal() {
  const scoreModal = document.getElementById("score-modal");
  const openBtn = document.getElementById("open-score-modal");
  const closeBtn = document.getElementById("close-score-modal");

  openBtn.addEventListener("click", () => {
    scoreModal.hidden = false;
  });

  closeBtn.addEventListener("click", () => {
    scoreModal.hidden = true;
  });

  // Close on background click
  scoreModal.addEventListener("click", (e) => {
    if (e.target === scoreModal) {
      scoreModal.hidden = true;
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !scoreModal.hidden) {
      scoreModal.hidden = true;
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initGame();
    initScores();
    setupScoreModal();
  });
} else {
  initGame();
  initScores();
  setupScoreModal();
}
