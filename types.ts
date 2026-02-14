
export enum AppTab {
  SCAN = 'scan',
  HISTORY = 'history',
  WEATHER = 'weather',
  EXTRAS = 'extras'
}

export type Language = 'en' | 'hi' | 'mr';

export interface DiagnosisResult {
  plantName: string;
  diseaseName: string;
  confidence: number;
  description: string;
  organicTreatment: string;
  chemicalTreatment: string;
  preventiveMeasures: string[];
  severity: 'Low' | 'Medium' | 'High';
}

export interface ScanHistory {
  id: string;
  timestamp: number;
  imageUrl: string;
  result: DiagnosisResult;
}

export interface WeatherInfo {
  temp: number;
  condition: string;
  alert?: string;
}
