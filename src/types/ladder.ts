export interface LadderRung {
  row: number;
  leftCol: number;
}

export interface Ladder {
  columns: number;
  rows: number;
  rungs: LadderRung[];
}

export interface PathPoint {
  col: number;
  row: number;
}
