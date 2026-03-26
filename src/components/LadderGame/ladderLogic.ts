import { Ladder, LadderRung, PathPoint } from '../../types/ladder';

export function generateLadder(columns: number, rowCount: number): Ladder {
  const rungs: LadderRung[] = [];

  for (let row = 0; row < rowCount; row++) {
    // For each row, randomly add rungs between adjacent columns
    // Ensure no two adjacent rungs in the same row (they'd overlap)
    const usedCols = new Set<number>();

    for (let col = 0; col < columns - 1; col++) {
      if (usedCols.has(col)) continue;

      // ~40% chance of a rung at each position
      if (Math.random() < 0.4) {
        rungs.push({ row, leftCol: col });
        usedCols.add(col);
        usedCols.add(col + 1); // prevent adjacent rung
      }
    }
  }

  // Ensure every gap between adjacent columns has at least one rung
  // This prevents any column from being completely isolated
  for (let col = 0; col < columns - 1; col++) {
    const hasRung = rungs.some((r) => r.leftCol === col);
    if (!hasRung) {
      const row = Math.floor(Math.random() * rowCount);
      rungs.push({ row, leftCol: col });
    }
  }

  return { columns, rows: rowCount, rungs };
}

export function tracePath(ladder: Ladder, startCol: number): PathPoint[] {
  const path: PathPoint[] = [{ col: startCol, row: -1 }];
  let currentCol = startCol;

  // Build a lookup: row -> Map<leftCol, true>
  const rungMap = new Map<number, Set<number>>();
  for (const rung of ladder.rungs) {
    if (!rungMap.has(rung.row)) {
      rungMap.set(rung.row, new Set());
    }
    rungMap.get(rung.row)!.add(rung.leftCol);
  }

  for (let row = 0; row < ladder.rows; row++) {
    // Move down to this row
    path.push({ col: currentCol, row });

    const rowRungs = rungMap.get(row);
    if (rowRungs) {
      // Check if there's a rung going right (currentCol is leftCol)
      if (rowRungs.has(currentCol)) {
        currentCol += 1;
        path.push({ col: currentCol, row });
      }
      // Check if there's a rung going left (currentCol - 1 is leftCol)
      else if (rowRungs.has(currentCol - 1)) {
        currentCol -= 1;
        path.push({ col: currentCol, row });
      }
    }
  }

  // Final point at the bottom
  path.push({ col: currentCol, row: ladder.rows });

  return path;
}

export function determineResult(ladder: Ladder, startCol: number): number {
  const path = tracePath(ladder, startCol);
  return path[path.length - 1].col;
}

export function getRungsForRendering(ladder: Ladder): LadderRung[] {
  return [...ladder.rungs].sort((a, b) => a.row - b.row || a.leftCol - b.leftCol);
}
