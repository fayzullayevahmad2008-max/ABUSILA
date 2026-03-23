const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const score1El = document.getElementById("score1");
const score2El = document.getElementById("score2");
const overlayEl = document.getElementById("gameOverlay");
const resultEl = document.getElementById("gameResult");
const summaryEl = document.getElementById("gameSummary");
const restartButton = document.getElementById("restartButton");

const tileCount = 20;
const tileSize = canvas.width / tileCount;
const baseSpeed = 140;

let gameInterval = null;
let gameActive = true;
let food = null;
let snakes = [];

function createSnake(segments, direction, color, scoreEl, name) {
  return {
    name,
    segments,
    direction,
    queuedDirection: direction,
    color,
    scoreEl,
    score: 0,
    alive: true
  };
}

function resetGame() {
  // Start both snakes facing each other from opposite sides of the board.
  snakes = [
    createSnake(
      [
        { x: 4, y: 10 },
        { x: 3, y: 10 },
        { x: 2, y: 10 }
      ],
      { x: 1, y: 0 },
      "#2d9c74",
      score1El,
      "Player 1"
    ),
    createSnake(
      [
        { x: 15, y: 10 },
        { x: 16, y: 10 },
        { x: 17, y: 10 }
      ],
      { x: -1, y: 0 },
      "#d96a3a",
      score2El,
      "Player 2"
    )
  ];

  snakes.forEach((snake) => {
    snake.score = 0;
    snake.scoreEl.textContent = "0";
  });

  gameActive = true;
  overlayEl.classList.add("hidden");
  placeFood();
  restartLoop();
  draw();
}

function restartLoop() {
  if (gameInterval) {
    clearInterval(gameInterval);
  }

  gameInterval = setInterval(update, baseSpeed);
}

function placeFood() {
  let validSpot = false;

  while (!validSpot) {
    const candidate = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };

    validSpot = snakes.every((snake) =>
      snake.segments.every((segment) => segment.x !== candidate.x || segment.y !== candidate.y)
    );

    if (validSpot) {
      food = candidate;
    }
  }
}

function setDirection(snakeIndex, nextDirection) {
  const snake = snakes[snakeIndex];

  if (!snake.alive || !gameActive) {
    return;
  }

  const sameAxis =
    snake.direction.x + nextDirection.x === 0 &&
    snake.direction.y + nextDirection.y === 0;

  if (!sameAxis) {
    snake.queuedDirection = nextDirection;
  }
}

function update() {
  if (!gameActive) {
    return;
  }

  // Apply the latest valid input once per tick so turns stay predictable.
  snakes.forEach((snake) => {
    snake.direction = snake.queuedDirection;
  });

  const nextHeads = snakes.map((snake) => ({
    x: snake.segments[0].x + snake.direction.x,
    y: snake.segments[0].y + snake.direction.y
  }));

  const grows = nextHeads.map((head) => head.x === food.x && head.y === food.y);
  const crashStates = [false, false];

  nextHeads.forEach((head, index) => {
    const snake = snakes[index];

    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
      crashStates[index] = true;
      return;
    }

    // Ignore the last tail tile when the snake is not growing because it moves away this tick.
    const ownBody = snake.segments.slice(0, grows[index] ? snake.segments.length : -1);
    if (ownBody.some((segment) => segment.x === head.x && segment.y === head.y)) {
      crashStates[index] = true;
    }
  });

  if (nextHeads[0].x === nextHeads[1].x && nextHeads[0].y === nextHeads[1].y) {
    crashStates[0] = true;
    crashStates[1] = true;
  }

  nextHeads.forEach((head, index) => {
    const otherSnake = snakes[(index + 1) % snakes.length];
    const otherBody = otherSnake.segments.slice(0, grows[(index + 1) % snakes.length] ? otherSnake.segments.length : -1);

    if (otherBody.some((segment) => segment.x === head.x && segment.y === head.y)) {
      crashStates[index] = true;
    }
  });

  snakes.forEach((snake, index) => {
    if (crashStates[index]) {
      snake.alive = false;
      return;
    }

    snake.segments.unshift(nextHeads[index]);

    if (grows[index]) {
      snake.score += 1;
      snake.scoreEl.textContent = String(snake.score);
    } else {
      snake.segments.pop();
    }
  });

  if (crashStates.some(Boolean)) {
    finishGame(crashStates);
    draw();
    return;
  }

  if (grows.some(Boolean)) {
    placeFood();
  }

  draw();
}

function finishGame(crashStates) {
  gameActive = false;
  clearInterval(gameInterval);

  const [playerOneCrashed, playerTwoCrashed] = crashStates;

  if (playerOneCrashed && playerTwoCrashed) {
    resultEl.textContent = "Draw";
    summaryEl.textContent = "Both snakes crashed at the same time.";
  } else if (playerOneCrashed) {
    resultEl.textContent = "Player 2 Wins";
    summaryEl.textContent = "Player 1 crashed. Press restart to try again.";
  } else {
    resultEl.textContent = "Player 1 Wins";
    summaryEl.textContent = "Player 2 crashed. Press restart to try again.";
  }

  overlayEl.classList.remove("hidden");
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawFood() {
  ctx.fillStyle = "#d7263d";
  ctx.beginPath();
  ctx.roundRect(
    food.x * tileSize + tileSize * 0.15,
    food.y * tileSize + tileSize * 0.15,
    tileSize * 0.7,
    tileSize * 0.7,
    10
  );
  ctx.fill();
}

function drawSnake(snake) {
  snake.segments.forEach((segment, index) => {
    ctx.fillStyle = snake.color;
    ctx.beginPath();
    ctx.roundRect(
      segment.x * tileSize + 2,
      segment.y * tileSize + 2,
      tileSize - 4,
      tileSize - 4,
      index === 0 ? 10 : 7
    );
    ctx.fill();
  });
}

function draw() {
  drawBoard();
  drawFood();
  snakes.forEach(drawSnake);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  // Prevent the page from scrolling when Player 2 uses the arrow keys.
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }

  switch (key) {
    case "w":
      setDirection(0, { x: 0, y: -1 });
      break;
    case "a":
      setDirection(0, { x: -1, y: 0 });
      break;
    case "s":
      setDirection(0, { x: 0, y: 1 });
      break;
    case "d":
      setDirection(0, { x: 1, y: 0 });
      break;
    case "arrowup":
      setDirection(1, { x: 0, y: -1 });
      break;
    case "arrowleft":
      setDirection(1, { x: -1, y: 0 });
      break;
    case "arrowdown":
      setDirection(1, { x: 0, y: 1 });
      break;
    case "arrowright":
      setDirection(1, { x: 1, y: 0 });
      break;
    default:
      break;
  }
});

restartButton.addEventListener("click", resetGame);

resetGame();
