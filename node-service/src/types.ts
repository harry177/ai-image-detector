export type InputCsvRow = {
  id: string;
  fileName: string;
};

export type DetectionResultItem = {
  label: string;
  score: number;
};

export type DetectionResponse = {
  ok: boolean;
  results: DetectionResultItem[];
  topLabel?: string;
  topScore?: number;
  aiScore?: number;
  realScore?: number;
  error?: string;
};

export type OutputCsvRow = {
  id: string;
  file_name: string;
  ai_generated_percent: string;
};
