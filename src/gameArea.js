const gameArea = {
  wrapper: document.getElementById("game-area"),
  gamePages: {
    intro: document.getElementById("game-intro"),
    setDifficulty: document.getElementById("difficulty-setting"),
    pause: document.getElementById("game-pause"),
    gameOver: document.getElementById("game-over"),
    youWin: document.getElementById("game-over"),
  },
  gameButtons: {
    toSetDifficulty: document.getElementById("select-difficulty-btn"),
    toChooseDifficulty: document.querySelectorAll(".difficulty-options"),
    toStart: document.querySelectorAll(".start-btn"),
    toPause: document.querySelectorAll(".pause-btn"),
    toContinue: document.querySelectorAll(".continue-btn"),
    toRestart: document.querySelectorAll(".restart-btn"),
    toQuit: document.querySelectorAll(".quit-btn"),
  },
  gameDisplays: {
    timerBar: document.getElementById("time-bar"),
    scoreTile: document.getElementById("score-tile"),
    starDifficulty: document.getElementById("display-star-difficulty"),
    textDisplay: document.getElementById("display-info"),
  },
  canvas: document.createElement("canvas"),
  context: null,
  x: 0,
  y: 0,
  paddingTop: null,
  paddingLeft: null,
  borderTop: null,
  borderLeft: null,
  isHovered: false,
  isStarted: false,
  isPaused: false,
  specifyLayoutProperties: function () {
    this.paddingTop = parseInt(
      getComputedStyle(this.canvas, null).getPropertyValue("padding-top")
    );
    this.paddingLeft = parseInt(
      getComputedStyle(this.canvas, null).getPropertyValue("padding-left")
    );
    this.borderTop = this.canvas.clientTop;
    this.borderLeft = this.canvas.clientLeft;
  },
  openGameArea: function () {
    const { nRow, nCol, rowHeight, columnWidth } = tileGridOptions;
    gameArea.canvas.height = nRow * rowHeight;
    gameArea.canvas.width = nCol * columnWidth;
    gameArea.context = gameArea.canvas.getContext("2d");

    gameArea.wrapper.append(gameArea.canvas);
    gameArea.specifyLayoutProperties();
    gameArea.wrapper.width = `${
      gameArea.canvas.width + 2 * gameArea.paddingLeft
    }px`;
    gameArea.wrapper.height = `${
      gameArea.canvas.height + 2 * gameArea.paddingTop
    }px`;

    gameArea.openPage("intro");

    addGameEventListeners();
  },
  start: function () {
    gameArea.closeAllPage();
    initializeSampleTile();

    gameArea.isStarted = true;
    gameArea.intervalId = window.requestAnimationFrame(reRenderGameArea);
    gameArea.newRowTimeoutId = setTimeout(
      insertNewTileRow,
      gameArea.newRowInterval
    );
    gameArea.nextNewRowTime = performance.now() + gameArea.newRowInterval;

    const { toPause } = gameArea.gameButtons;
    toPause.forEach((button) => {
      button.disabled = false;
    });
  },
  pause: function () {
    const { toPause } = gameArea.gameButtons;
    toPause.forEach((button) => {
      button.disabled = true;
    });
    gameArea.canvas.style.filter = "blur(5px)";
    gameArea.isPaused = true;
    clearTimeout(gameArea.newRowTimeoutId);
    gameArea.timeRemaining = gameArea.nextNewRowTime - performance.now();
    gameArea.openPage("pause");
  },
  continue: function () {
    const { toPause } = gameArea.gameButtons;
    toPause.forEach((button) => {
      button.disabled = false;
    });
    gameArea.canvas.style.filter = "";
    gameArea.isPaused = false;
    gameArea.intervalId = requestAnimationFrame(reRenderGameArea);
    gameArea.newRowTimeoutId = setTimeout(
      insertNewTileRow,
      gameArea.timeRemaining
    );
    gameArea.nextNewRowTime = performance.now() + gameArea.timeRemaining;
    gameArea.closeAllPage();
  },
  restart: function () {
    gameArea.canvas.style.filter = "";
    gameArea.isPaused = false;
    gameArea.isStarted = true;
    gameArea.start();
  },
  quit: function () {
    gameArea.clear();

    const { timerBar, scoreTile, starDifficulty } = gameArea.gameDisplays;
    timerBar.style.backgroundImage = "none";
    scoreTile.style.backgroundImage = "";
    starDifficulty.innerHTML = "";
    gameArea.starDifficulty = null;

    gameArea.canvas.style.filter = "";
    gameArea.isPaused = false;
    gameArea.isStarted = false;
    gameArea.openPage("intro");
  },
  terminateGame: function () {
    const { toPause } = gameArea.gameButtons;
    toPause.forEach((button) => {
      button.disabled = true;
    });

    gameArea.canvas.style.filter = "blur(5px)";

    gameArea.isStarted = false;
    clearTimeout(gameArea.newRowTimeoutId);

    if (gameArea.score < 15) {
      gameArea.openPage("gameOver");
    } else {
      gameArea.openPage("youWin");
    }
  },
  intervalId: null,
  clear: function () {
    const [canvasWidth, canvasHeight] = [this.canvas.width, this.canvas.height];
    this.context.clearRect(0, 0, canvasWidth, canvasHeight);
  },
  tileGrid: [[]],
  fallingTiles: [],
  activeTile: null,
  getCursorXYPosition: function () {
    return [gameArea.x, gameArea.y];
  },
  getCenterPointOfGrid: function (row, column) {
    return [
      (column + 0.5) * tileGridOptions.columnWidth,
      (row + 0.5) * tileGridOptions.rowHeight - gameArea.gridOffsetY,
    ];
  },
  getCursorRowColumnPosition: function () {
    const column = Math.min(
      Math.floor(gameArea.x / tileGridOptions.columnWidth),
      tileGridOptions.nCol - 1
    );
    const row = Math.min(
      Math.floor((gameArea.y + this.gridOffsetY) / tileGridOptions.rowHeight),
      tileGridOptions.nRow - 1
    );
    return [row, column];
  },
  getTileInGrid: function (row, col) {
    return gameArea.tileGrid[row] && gameArea.tileGrid[row][col];
  },
  isValidGrid: function (row, col) {
    return (
      0 <= row &&
      row < tileGridOptions.nRow &&
      0 <= col &&
      col < tileGridOptions.nCol
    );
  },
  addFallingTiles: function (...addedGroupTiles) {
    addedGroupTiles.forEach((groupTile) => {
      this.fallingTiles.push(groupTile);
      groupTile.forEach((tile) => {
        tile.isFalling = true;
        tile.speedY = 0;
      });
    });
  },
  fallingTilesContains: function (testedGroupTile) {
    let isContains = this.fallingTiles.some((groupTile) => {
      return groupTile.every((tile) => testedGroupTile.includes(tile));
    });

    return isContains;
  },
  removeFallingTiles: function (...removedGroupTile) {
    removedGroupTile.forEach((groupTile) => {
      const removedIndex = gameArea.fallingTiles.findIndex((gTile) =>
        gTile.every((tile) => groupTile.includes(tile))
      );
      if (removedIndex !== -1) {
        gameArea.fallingTiles.splice(removedIndex, 1);
        groupTile[0].snapToGrid();

        groupTile.forEach((tile) => {
          tile.isFalling = false;
          tile.speedY = null;
        });
      }
    });
  },
  detectFallingTiles: function () {
    gameArea.tileGrid
      .slice()
      .reverse()
      .flat()
      .filter((item) => item instanceof Tile)
      .forEach((checkedTile) => {
        if (!checkedTile.isFalling) {
          if (
            gameArea.activeTile &&
            gameArea.activeTile.getAllGroupMembers().includes(checkedTile)
          ) {
            return;
          }
          const { bottomFree } = checkedTile.checkGroupMoveability();
          if (bottomFree && !checkedTile.onDelayedCombine) {
            const tiles = checkedTile.getAllGroupMembers();
            let stackedTiles = checkedTile.getAllTilesStackedAbove();
            stackedTiles = stackedTiles.filter(
              (groupTile) => !groupTile[0].isFalling
            );
            gameArea.addFallingTiles(tiles, ...stackedTiles);
          }
        }
      });
  },
  score: null,
  newRowTimeoutId: null,
  newRowBaseInterval: 12000,
  newRowInterval: 12000,
  newRowAnimationDuration: 1000,
  nextNewRowTime: null,
  timeRemaining: null,
  updateScore: function () {
    let prevScore = this.score;
    let arrayOfTileNumber = this.tileGrid
      .flat()
      .filter((tile) => tile instanceof Tile)
      .map((tile) => tile.number);
    this.score = Math.max(...arrayOfTileNumber);
    if (prevScore !== this.score) {
      this.gameDisplays.scoreTile.style.backgroundImage = `url(../tiles/tile${this.score}.png)`;
    }
    if (gameArea.score === 30) {
      gameArea.terminateGame();
    }
  },
  onNewRowTransition: false,
  gridOffsetY: 0,
  mode: null,
  starDifficulty: null,
  renderTimer: function () {
    const { nextNewRowTime, newRowInterval, newRowBaseInterval } = gameArea;
    const { timerBar } = gameArea.gameDisplays;
    const timeLeft = nextNewRowTime - performance.now();

    const color1 = "#C0C0C0";
    const color2 = "#989898";
    const color3 = "#484848";

    const color1Stop = (timeLeft / newRowBaseInterval) * 100;
    const color2Stop = (newRowInterval / newRowBaseInterval) * 100;

    if (color1Stop < color2Stop) {
      timerBar.style.backgroundImage = `linear-gradient(to right, ${color1} ${color1Stop}%, ${color2} ${color1Stop}%, ${color2} ${color2Stop}%, ${color3} ${color2Stop}%)`;
    } else {
      timerBar.style.backgroundImage = `linear-gradient(to right, ${color1} ${color2Stop}%, ${color3} ${color2Stop}%)`;
    }
  },
  updateDifficulty: function () {
    let prevDifficulty = gameArea.starDifficulty;
    let newDifficulty = gameArea.determineDifficulty();
    if (newDifficulty !== prevDifficulty) {
      gameArea.starDifficulty = newDifficulty;
      gameArea.gameDisplays.starDifficulty.innerHTML =
        displayStar(newDifficulty);
      gameArea.newRowInterval = timePerNewRowPerDifficulty[newDifficulty];
      if (prevDifficulty) {
        newDifficulty > prevDifficulty
          ? gameArea.logTextDisplay("Difficulty Increased!!")
          : gameArea.logTextDisplay("Difficulty Decreased!!");
      }
    }
  },
  determineDifficulty: function () {
    let baseDifficulty;
    let additionalDifficulty = Math.max(0, Math.floor(this.score / 5) - 1);
    switch (this.mode) {
      case "normal":
        baseDifficulty = 1;
        break;
      case "hard":
        baseDifficulty = 2;
        break;
      case "very hard":
        baseDifficulty = 3;
        break;
      default:
        new Error("no difficulty available");
    }

    return additionalDifficulty + baseDifficulty;
  },
  getRandomTileInNewRow: function () {
    return gameArea.tileGrid[gameArea.tileGrid.length - 1][
      Math.floor(Math.random() * tileGridOptions.nCol)
    ];
  },
  openPage: function (pageName) {
    const targetPage = gameArea.gamePages[pageName];
    gameArea.closeAllPage();
    if (!targetPage) {
      new Error("no page available");
    }
    targetPage.classList.replace("d-none", "d-block");
  },
  closeAllPage: function () {
    const pagesArray = Object.values(gameArea.gamePages);
    for (let page of pagesArray) {
      page.classList.add("d-none");
    }
  },
  logTextDisplay: function (text) {
    const { textDisplay } = gameArea.gameDisplays;
    textDisplay.innerText = text;
    setTimeout(() => (textDisplay.innerText = ""), 3000);
  },
};

function initializeGame() {
  gameArea.openGameArea();
  addButtonsFunctionality();
}

function addGameEventListeners() {
  window.addEventListener("mousedown", (e) => {
    if (
      e.button == 0 &&
      gameArea.isHovered &&
      gameArea.isStarted &&
      !gameArea.isPaused
    ) {
      grabTile();
    }
  });

  window.addEventListener("mousemove", (e) => {
    gameArea.x =
      e.clientX -
      gameArea.paddingLeft -
      gameArea.borderLeft -
      gameArea.canvas.getBoundingClientRect().left;
    gameArea.y =
      e.clientY -
      gameArea.paddingTop -
      gameArea.borderTop -
      gameArea.canvas.getBoundingClientRect().top;

    gameArea.x = Math.min(gameArea.x, gameArea.canvas.width);
    gameArea.x = Math.max(0, gameArea.x);

    gameArea.y = Math.min(gameArea.y, gameArea.canvas.height);
    gameArea.y = Math.max(0, gameArea.y);
  });

  window.addEventListener("mouseup", (e) => {
    if (
      e.button == 0 &&
      gameArea.activeTile &&
      gameArea.isStarted &&
      !gameArea.isPaused
    ) {
      releaseTile(gameArea.activeTile);
    }
  });

  gameArea.canvas.addEventListener("mouseover", (e) => {
    gameArea.isHovered = true;
  });

  gameArea.canvas.addEventListener("mouseout", (e) => {
    gameArea.isHovered = false;
  });
}

function addButtonsFunctionality() {
  const {
    toSetDifficulty,
    toChooseDifficulty,
    toStart,
    toPause,
    toContinue,
    toRestart,
    toQuit,
  } = gameArea.gameButtons;

  toSetDifficulty.onclick = () => {
    gameArea.openPage("setDifficulty");
  };

  const [chooseNormal, chooseHard, chooseVeryHard] = toChooseDifficulty;
  resetDifficulty = () => {
    toChooseDifficulty.forEach((btn) => {
      btn.classList.remove("selected");
    });
  };
  chooseNormal.onclick = () => {
    gameArea.mode = "normal";
    resetDifficulty();
    chooseNormal.classList.add("selected");
    toStart[0].disabled = false;
  };
  chooseHard.onclick = () => {
    gameArea.mode = "hard";
    resetDifficulty();
    chooseHard.classList.add("selected");
    toStart[0].disabled = false;
  };
  chooseVeryHard.onclick = () => {
    gameArea.mode = "very hard";
    resetDifficulty();
    chooseVeryHard.classList.add("selected");
    toStart[0].disabled = false;
  };

  toStart.forEach((button) => {
    button.onclick = gameArea.start;
  });

  toPause.forEach((button) => {
    button.onclick = gameArea.pause;
  });

  toContinue.forEach((button) => {
    button.onclick = gameArea.continue;
  });

  toRestart.forEach((button) => {
    button.onclick = gameArea.restart;
  });

  toQuit.forEach((button) => {
    button.onclick = gameArea.quit;
  });
}

function reRenderGameArea() {
  gameArea.clear();

  gameArea.updateScore();
  gameArea.updateDifficulty();
  gameArea.renderTimer();
  checkForNoMatchAvailable();

  if (gameArea.onNewRowTransition) {
    renderNewRowTransition();
  }

  if (gameArea.activeTile) {
    handleActiveTile(gameArea.activeTile);
  }

  if (gameArea.fallingTiles.length > 0) {
    handleFallingTiles(gameArea.fallingTiles);
  }

  addLastRowWarning();

  gameArea.tileGrid
    .flat()
    .filter((item) => item instanceof Tile)
    .forEach((tile) => tile.renderTies());

  gameArea.tileGrid
    .flat()
    .filter((item) => item instanceof Tile)
    .forEach((tile) => tile.render());

  gameArea.fallingTiles
    .flat()
    .filter((item) => item instanceof Tile)
    .forEach((tile) => tile.render());

  if (!gameArea.isPaused && gameArea.isStarted) {
    gameArea.intervalId = window.requestAnimationFrame(reRenderGameArea);
  }
}

function insertNewTileRow() {
  let newTiles = Array(tileGridOptions.nCol)
    .fill()
    .map(
      (el, idx) =>
        new Tile(
          tileGridOptions.nRow,
          idx,
          getRandomTileNumber(gameArea.score),
          getRandomLightColor()
        )
    );

  gameArea.tileGrid.push(newTiles);

  insertNewTies();

  tileGridOptions.nRow += 1;

  gameArea.detectFallingTiles();

  gameArea.onNewRowTransition = true;
  gameArea.newRowTimeoutId = setTimeout(
    insertNewTileRow,
    gameArea.newRowInterval
  );
  gameArea.nextNewRowTime = performance.now() + gameArea.newRowInterval;
}

function insertNewTies() {
  // for difficulty
  switch (gameArea.starDifficulty) {
    case 1:
      // no ties
      break;
    case 2: {
      insertTies(2, 2, 2);
      break;
    }
    case 3: {
      insertTies(3, 3, 2);
      break;
    }
    case 4: {
      insertTies(4, 4, 2);
      break;
    }
    case 5: {
      insertTies(6, 4, 3);
      break;
    }
    case 6: {
      insertTies(6, 4, 3);
      break;
    }
    case 7: {
      insertTies(6, 4, 3);
      break;
    }
    default: {
    }
  }
}

function insertTies(maxNumOfTies, maxNumOfMemberGroup, numOfRowAffected = 2) {
  function getAllowedTiles() {
    return gameArea.tileGrid
      .slice(-numOfRowAffected + 1)
      .flat()
      .filter((item) => item instanceof Tile)
      .filter((tile) => tile.getAllGroupMembers().length < maxNumOfMemberGroup);
  }

  let numOfTiesLeft = maxNumOfTies;
  let allowedTiles = getAllowedTiles();
  while (numOfTiesLeft > 0 && allowedTiles.length > 0) {
    let selectedTile =
      allowedTiles[Math.floor(Math.random() * allowedTiles.length)];
    if (Math.random() < 0.5) {
      let { rightTile } = selectedTile.getAdjacentTile();
      if (rightTile && rightTile.isSameGroupWith(selectedTile)) {
        continue;
      }
      if (
        rightTile &&
        rightTile.getAllGroupMembers().length +
          selectedTile.getAllGroupMembers().length <=
          maxNumOfMemberGroup
      ) {
        selectedTile.tieWithRightTile();
        numOfTiesLeft -= 1;
        allowedTiles = getAllowedTiles();
      }
    } else {
      let { topTile } = selectedTile.getAdjacentTile();
      if (topTile && topTile.isSameGroupWith(selectedTile)) {
        continue;
      }
      if (
        topTile &&
        topTile.getAllGroupMembers().length +
          selectedTile.getAllGroupMembers().length <=
          maxNumOfMemberGroup
      ) {
        if (
          topTile.isFalling ||
          (gameArea.activeTile &&
            topTile.getAllGroupMembers().includes(gameArea.activeTile))
        ) {
          continue;
        }
        selectedTile.tieWithTopTile();
        numOfTiesLeft -= 1;
        allowedTiles = getAllowedTiles();
      }
    }
  }
}

function checkForNoMatchAvailable() {
  let arrayOfNumber = gameArea.tileGrid
    .flat()
    .filter((tile) => tile instanceof Tile)
    .map((tile) => tile.number);
  let noAvailableMove = new Set(arrayOfNumber).size === arrayOfNumber.length;
  if (noAvailableMove) {
    console.log("test");
    forceInsertNewTileRow();
  }
}

function forceInsertNewTileRow() {
  clearTimeout(gameArea.newRowTimeoutId);
  insertNewTileRow();
}

function renderNewRowTransition() {
  let elapsed =
    performance.now() - (gameArea.nextNewRowTime - gameArea.newRowInterval);
  if (elapsed > gameArea.newRowAnimationDuration) {
    // end transition
    gameArea.gridOffsetY = 0;
    gameArea.onNewRowTransition = false;
    gameArea.tileGrid
      .flat()
      .filter((tile) => tile instanceof Tile)
      .forEach((tile) => {
        if (!tile.isFalling) {
          tile.row -= 1;
          if (
            gameArea.activeTile &&
            gameArea.activeTile.getAllGroupMembers().includes(tile)
          ) {
            return;
          }
          tile.snapToGrid();
        }
      });
    gameArea.fallingTiles.flat().forEach((tile) => {
      tile.row -= 1;
    });
    tileGridOptions.nRow -= 1;
    let topRowTiles = gameArea.tileGrid.shift();
    if (topRowTiles.some((tile) => tile instanceof Tile)) {
      if (gameArea.activeTile.getAllGroupMembers().includes(tile)) {
        return;
      }
      gameArea.terminateGame();
    }
    return;
  }
  gameArea.gridOffsetY = (elapsed / 1000) * tileGridOptions.rowHeight;

  gameArea.tileGrid
    .flat()
    .filter((tile) => tile instanceof Tile)
    .forEach((tile) => {
      if (!tile.isFalling) {
        if (
          gameArea.activeTile &&
          gameArea.activeTile.getAllGroupMembers().includes(tile)
        ) {
          return;
        }
        tile.snapToGrid();
      }
    });
}

function displayStar(number) {
  let innerHTML = ``;
  for (let i = 0; i < number; i++) {
    innerHTML += `<i class="fas fa-star"></i>`;
  }
  return innerHTML;
}

function getRandomTileNumber(currentScore) {
  let { min, max } = tileNumberDistributionOptions[currentScore];
  let arrayOfNumber = gameArea.tileGrid
    .flat()
    .filter((tile) => tile instanceof Tile)
    .map((tile) => tile.number);
  let leastNumberInGameArea = Math.min(...arrayOfNumber);
  min = Math.min(min, leastNumberInGameArea);
  return Math.floor(Math.random() * (max - min)) + min;
}

function addLastRowWarning() {
  const warningColor = "#ad0000";
  const warningTime = 4000;
  const warnedTiles = gameArea.tileGrid
    .flat()
    .filter((tile) => tile instanceof Tile)
    .filter((tile) => tile.row === 0);
  const timeRemaining = gameArea.nextNewRowTime - performance.now();
  gameArea.context.globalAlpha =
    1 - 0.5 * (Math.cos((timeRemaining / 1000) * 2 * Math.PI) + 1);
  gameArea.context.fillStyle = warningColor;
  warnedTiles.forEach((tile) => {
    if (timeRemaining < warningTime || gameArea.onNewRowTransition) {
      gameArea.context.fillRect(
        tile.x,
        tile.y,
        tileGridOptions.columnWidth,
        tileGridOptions.rowHeight
      );
    }
  });
  gameArea.context.globalAlpha = 1;
}

initializeGame();
