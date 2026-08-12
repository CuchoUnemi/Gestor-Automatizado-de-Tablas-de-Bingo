export const checkWin = (matrix, calledNumbers, mode) => {
  // matrix is a 5x5 array
  // calledNumbers is an array of integers
  
  const isMarked = (cell) => cell === "COMODIN" || calledNumbers.includes(cell);
  const checkLine = (line) => line.every(isMarked);

  switch (mode) {
    case 'tabla_llena':
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (!isMarked(matrix[r][c])) return false;
        }
      }
      return true;

    case 'linea_horizontal':
      for (let r = 0; r < 5; r++) {
        if (checkLine(matrix[r])) return true;
      }
      return false;

    case 'linea_vertical':
      for (let c = 0; c < 5; c++) {
        const col = [matrix[0][c], matrix[1][c], matrix[2][c], matrix[3][c], matrix[4][c]];
        if (checkLine(col)) return true;
      }
      return false;

    case 'diagonal':
      const diag1 = [matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3], matrix[4][4]];
      const diag2 = [matrix[0][4], matrix[1][3], matrix[2][2], matrix[3][1], matrix[4][0]];
      return checkLine(diag1) || checkLine(diag2);

    case 'letra_x':
      const d1 = [matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3], matrix[4][4]];
      const d2 = [matrix[0][4], matrix[1][3], matrix[2][2], matrix[3][1], matrix[4][0]];
      return checkLine(d1) && checkLine(d2);

    case 'cuatro_esquinas':
      const esquinas = [matrix[0][0], matrix[0][4], matrix[4][0], matrix[4][4]];
      return checkLine(esquinas);

    case 'cuadro_grande':
    case 'cuadrado':
      for (let c = 0; c < 5; c++) {
        if (!isMarked(matrix[0][c]) || !isMarked(matrix[4][c])) return false;
      }
      for (let r = 1; r < 4; r++) {
        if (!isMarked(matrix[r][0]) || !isMarked(matrix[r][4])) return false;
      }
      return true;

    case 'cruz':
      for (let c = 0; c < 5; c++) {
        if (!isMarked(matrix[2][c])) return false;
      }
      for (let r = 0; r < 5; r++) {
        if (!isMarked(matrix[r][2])) return false;
      }
      return true;

    default:
      return false;
  }
};

export const checkNearWin = (matrix, calledNumbers, mode) => {
  const isMarked = (cell) => cell === "COMODIN" || calledNumbers.includes(cell);
  
  // Helper: returns true if exactly 1 element in the line is NOT marked
  const isOneAway = (line) => {
    let unmarkedCount = 0;
    for (let cell of line) {
      if (!isMarked(cell)) unmarkedCount++;
    }
    return unmarkedCount === 1;
  };

  switch (mode) {
    case 'tabla_llena':
      let totalUnmarked = 0;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (!isMarked(matrix[r][c])) totalUnmarked++;
        }
      }
      return totalUnmarked === 1;

    case 'linea_horizontal':
      for (let r = 0; r < 5; r++) {
        if (isOneAway(matrix[r])) return true;
      }
      return false;

    case 'linea_vertical':
      for (let c = 0; c < 5; c++) {
        const col = [matrix[0][c], matrix[1][c], matrix[2][c], matrix[3][c], matrix[4][c]];
        if (isOneAway(col)) return true;
      }
      return false;

    case 'diagonal':
      const diag1 = [matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3], matrix[4][4]];
      const diag2 = [matrix[0][4], matrix[1][3], matrix[2][2], matrix[3][1], matrix[4][0]];
      return isOneAway(diag1) || isOneAway(diag2);

    case 'letra_x':
      const d1 = [matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3], matrix[4][4]];
      const d2 = [matrix[0][4], matrix[1][3], matrix[2][2], matrix[3][1], matrix[4][0]];
      // Letra X is a single pattern. We must check how many total are unmarked among both diagonals.
      let set = new Set([...d1, ...d2]);
      let unmarked = 0;
      for(let val of set) {
         if(!isMarked(val)) unmarked++;
      }
      return unmarked === 1;

    case 'cuatro_esquinas':
      const esquinas = [matrix[0][0], matrix[0][4], matrix[4][0], matrix[4][4]];
      return isOneAway(esquinas);

    case 'cuadro_grande':
    case 'cuadrado':
      let p_unmarked = 0;
      for (let c = 0; c < 5; c++) {
        if (!isMarked(matrix[0][c])) p_unmarked++;
        if (!isMarked(matrix[4][c])) p_unmarked++;
      }
      for (let r = 1; r < 4; r++) {
        if (!isMarked(matrix[r][0])) p_unmarked++;
        if (!isMarked(matrix[r][4])) p_unmarked++;
      }
      return p_unmarked === 1;

    case 'cruz':
      let cruz_unmarked = 0;
      for (let c = 0; c < 5; c++) {
        if (!isMarked(matrix[2][c])) cruz_unmarked++;
      }
      for (let r = 0; r < 5; r++) {
        if (r !== 2 && !isMarked(matrix[r][2])) cruz_unmarked++;
      }
      return cruz_unmarked === 1;

    default:
      return false;
  }
};

