export type DetectionResultItem = {
  label: string;
  score: number;
};

export type DetectionResponse = {
  ok: boolean;
  results: DetectionResultItem[];
  topLabel?: string;
  topScore?: number;
  error?: string;
};
