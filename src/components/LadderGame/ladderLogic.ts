import { Ladder, LadderRung, PathPoint } from '../../types/ladder';

export function generateLadder(columns: number, rawRowCount: number): Ladder {
  // Ensure enough rows for a proper ladder — at least 10 rows
  const rowCount = Math.max(rawRowCount, 10);
  const gaps = columns - 1;
  const rungs: LadderRung[] = [];

  // Target: each gap gets roughly equal number of rungs
  // Higher density for fewer columns so the ladder looks full
  const density = gaps <= 1 ? 0.6 : 0.4;
  const targetPerGap = Math.max(4, Math.floor(rowCount * density));

  // Divide rows into zones of equal size, one zone per target rung per gap
  // This ensures rungs are vertically spread out, not clustered
  for (let gap = 0; gap < gaps; gap++) {
    // Pick `targetPerGap` rows for this gap, spread evenly across the height
    const zoneSize = rowCount / targetPerGap;
    for (let i = 0; i < targetPerGap; i++) {
      const zoneStart = Math.floor(i * zoneSize);
      const zoneEnd = Math.floor((i + 1) * zoneSize);
      const row = zoneStart + Math.floor(Math.random() * (zoneEnd - zoneStart));
      rungs.push({ row, leftCol: gap });
    }
  }

  // Remove duplicates (same row + leftCol) and adjacency conflicts
  // (two rungs in the same row sharing a column endpoint)
  const seen = new Map<string, LadderRung>();
  const shuffled = rungs.sort(() => Math.random() - 0.5);

  for (const rung of shuffled) {
    const key = `${rung.row}-${rung.leftCol}`;
    // Check adjacency: no rung at (row, leftCol-1) or (row, leftCol+1) already placed
    const adjLeft = `${rung.row}-${rung.leftCol - 1}`;
    const adjRight = `${rung.row}-${rung.leftCol + 1}`;
    if (!seen.has(key) && !seen.has(adjLeft) && !seen.has(adjRight)) {
      seen.set(key, rung);
    }
  }

  const finalRungs = Array.from(seen.values());

  // Safety: ensure every gap has at least 2 rungs so no column is isolated
  for (let gap = 0; gap < gaps; gap++) {
    const count = finalRungs.filter((r) => r.leftCol === gap).length;
    const needed = Math.max(0, 2 - count);
    for (let i = 0; i < needed; i++) {
      // Find an empty row for this gap
      const usedRows = new Set(finalRungs.filter((r) => r.leftCol === gap).map((r) => r.row));
      for (let row = 0; row < rowCount; row++) {
        if (!usedRows.has(row)) {
          // Check no adjacency conflict
          const hasAdj = finalRungs.some(
            (r) => r.row === row && (r.leftCol === gap - 1 || r.leftCol === gap + 1)
          );
          if (!hasAdj) {
            finalRungs.push({ row, leftCol: gap });
            break;
          }
        }
      }
    }
  }

  return { columns, rows: rowCount, rungs: finalRungs };
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
