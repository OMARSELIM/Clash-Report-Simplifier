export enum ClashStatus {
  NEW = 'New',
  ACTIVE = 'Active',
  REVIEWED = 'Reviewed',
  APPROVED = 'Approved',
  RESOLVED = 'Resolved',
  UNKNOWN = 'Unknown'
}

export interface ClashItem {
  id: string;
  name: string;
  status: ClashStatus;
  distance: number;
  item1: string; // Layer or Element name
  item2: string; // Layer or Element name
  layer1: string;
  layer2: string;
  discipline1?: string; // AI Enriched
  discipline2?: string; // AI Enriched
  point: { x: number; y: number; z: number };
  gridLocation: string;
}

export interface ClassificationMap {
  [layerName: string]: string; // e.g., "M_Exhaust_Air": "Mechanical"
}

export type ProcessingState = 'idle' | 'parsing' | 'classifying' | 'complete' | 'error';
