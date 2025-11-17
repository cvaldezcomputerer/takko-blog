// Jeopardy Game Script - 5th Grade

// Game data - customize this with your own categories, questions, and answers
const gameData = {
  categories: [
    "ソング＆チャント\nチャレンジ",
    "みちあんない\nゲーム",
    "なにこれBOX",
    "英語チャレンジ",
    "キャラクタークイズ",
  ],
  questions: [
    // Column 1: Song and Chant Challenge (ソング＆チャントチャレンジ)
    [
      {
        points: 100,
        question: "このダンスは何？\nWhat dance is this?",
      },
      {
        points: 200,
        question: "このダンスは何？\nWhat dance is this?",
      },
      {
        points: 300,
        question: "このダンスは何？\nWhat dance is this?",
      },
      {
        points: 400,
        question: "歌を続けて\nFinish the song",
      },
      {
        points: 500,
        question: "歌を続けて\nFinish the song",
      },
      {
        points: 1000,
        question: "オスカーはどんな人？\nWhat kind of person is Oscar?",
      },
    ],
    // Column 2: Directions Game (みちあんないゲーム)
    [
      {
        points: 100,
        question: "みちあんないして\nGuide me",
      },
      {
        points: 200,
        question: "みちあんないして\nGuide me",
      },
      {
        points: 300,
        question: "みちあんないして\nGuide me",
      },
      {
        points: 400,
        question: "みちあんないして\nGuide me",
      },
      {
        points: 500,
        question: "みちあんないして\nGuide me",
      },
      {
        points: 1000,
        question: "みちあんないして\nGuide me",
      },
    ],
    // Column 3: Nani Kore Box (なにこれBOX)
    [
      {
        points: 100,
        question: "なにこれ？\nNani kore?",
      },
      {
        points: 200,
        question: "なにこれ？\nNani kore?",
      },
      {
        points: 300,
        question: "なにこれ？\nNani kore?",
      },
      {
        points: 400,
        question: "なにこれ？\nNani kore?",
      },
      {
        points: 500,
        question: "なにこれ？\nNani kore?",
      },
      {
        points: 1000,
        question: "なにこれ？\nNani kore?",
      },
    ],
    // Column 4: English Challenge (英語チャレンジ)
    [
      {
        points: 100,
        question: "よくきいて\nListen carefully",
      },
      {
        points: 200,
        question: "よくきいて\nListen carefully",
      },
      {
        points: 300,
        question: "よくきいて\nListen carefully",
      },
      {
        points: 400,
        question: "よくきいて\nListen carefully",
      },
      {
        points: 500,
        question: "よくきいて\nListen carefully",
      },
      {
        points: 1000,
        question: "よくきいて\nListen carefully",
      },
    ],
    // Column 5: Character Quiz (キャラクタークイズ)
    [
      {
        points: 100,
        question: "これはだれ？\nWho is this?",
      },
      {
        points: 200,
        question: "これはだれ？\nWho is this?",
      },
      {
        points: 300,
        question: "これはだれ？\nWho is this?",
      },
      {
        points: 400,
        question: "これはだれ？\nWho is this?",
      },
      {
        points: 500,
        question: "これはだれ？\nWho is this?",
      },
      {
        points: 1000,
        question: "これはだれ？\nWho is this?",
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
  const closeBtn = document.getElementById("close-modal-btn");

  // Set content
  modalCategory.textContent = category;
  modalPoints.textContent = `$${questionData.points}`;
  modalQuestion.textContent = questionData.question;

  // Show modal
  modal.hidden = false;

  // Store current cell info for when we close
  modal.dataset.cellId = cellId;
  modal.dataset.cellElement = cellElement;
}

// Set up modal event listeners
function setupModalListeners() {
  const modal = document.getElementById("jeopardy-modal");
  const closeBtn = document.getElementById("close-modal-btn");

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
const STORAGE_KEY = "jeopardy5th-scores";
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
