export enum Phase {
  DEFINE = 'Define',
  MEASURE = 'Measure',
  ANALYZE = 'Analyze',
  IMPROVE = 'Improve',
  CONTROL = 'Control'
}

export interface SixSigmaTool {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  recommended: boolean; // If true, recommended for all projects
}

export interface User {
  id: string;
  name: string;
}

export interface HistoryEntry {
  id: number;
  project_id: string;
  user_id: string;
  user_name: string;
  change_summary: string;
  timestamp: string;
}

export interface FMEARow {
  id: string;
  step: string;
  failureMode: string;
  effect: string;
  severity: number;
  cause: string;
  occurrence: number;
  controls: string;
  detection: number;
  rpn: number;
}

export interface ProjectData {
  id: string;
  name: string;
  problemStatement: string;
  businessCase: string;
  stakeholders: string;
  goal: string;
  scope: string;
  measurements: number[];
  rootCauses: { id: string; cause: string; category: string; probability: number }[];
  improvements: { id: string; action: string; status: 'Planned' | 'In Progress' | 'Done' }[];
  selectedTools: string[]; // Array of Tool IDs enabled for this project
  toolData: Record<string, any>; // Dynamic storage for generic tools
  tollgateStatus: Record<Phase, 'Not Started' | 'In Progress' | 'Approved'>; // New field
}

export interface SPCPoint {
  sample: number;
  value: number;
  mean: number;
  ucl: number;
  lcl: number;
}

export interface ParetoPoint {
  name: string;
  count: number;
  cumulativePercentage: number;
}

export interface CapabilityData {
  cp: number;
  cpk: number;
  mean: number;
  stdDev: number;
  usl: number;
  lsl: number;
}

export interface ANOVAData {
  groups: { id: string; name: string; values: number[] }[];
  fStat: number;
  pValue: number;
  dfBetween: number;
  dfWithin: number;
}

export interface IshikawaData {
  problem: string;
  categories: {
    name: string;
    causes: string[];
  }[];
}
