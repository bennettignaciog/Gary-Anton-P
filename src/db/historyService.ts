import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ModuleSettings, ProcessingStats } from '../types/audio';

export interface HistoryRecord {
  id: string;
  fileName: string;
  format: string;
  sampleRate: number;
  bitDepth: number;
  createdAt: string;
  statsSummary: string;
  stats?: ProcessingStats;
  settings: ModuleSettings;
}

export interface PresetRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  settings: ModuleSettings;
}

const HISTORY_COLLECTION = 'history';
const PRESETS_COLLECTION = 'presets';

export async function saveHistoryToFirestore(record: HistoryRecord): Promise<void> {
  const path = `${HISTORY_COLLECTION}/${record.id}`;
  try {
    const docRef = doc(db, HISTORY_COLLECTION, record.id);
    await setDoc(docRef, {
      id: record.id,
      fileName: record.fileName,
      format: record.format,
      sampleRate: record.sampleRate,
      bitDepth: record.bitDepth,
      createdAt: record.createdAt,
      statsSummary: record.statsSummary,
      settings: JSON.parse(JSON.stringify(record.settings)),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function loadHistoryFromFirestore(): Promise<HistoryRecord[]> {
  try {
    const q = query(collection(db, HISTORY_COLLECTION), limit(25));
    const snapshot = await getDocs(q);
    const results: HistoryRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      results.push({
        id: data.id || docSnap.id,
        fileName: data.fileName || 'Audio Track',
        format: data.format || 'WAV',
        sampleRate: data.sampleRate || 48000,
        bitDepth: data.bitDepth || 24,
        createdAt: data.createdAt || new Date().toISOString(),
        statsSummary: data.statsSummary || '',
        settings: data.settings,
      });
    });
    // Sort descending by createdAt
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Could not load history from Firestore (falling back to local):', error);
    return [];
  }
}

export async function deleteHistoryFromFirestore(id: string): Promise<void> {
  const path = `${HISTORY_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, HISTORY_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePresetToFirestore(preset: PresetRecord): Promise<void> {
  const path = `${PRESETS_COLLECTION}/${preset.id}`;
  try {
    const docRef = doc(db, PRESETS_COLLECTION, preset.id);
    await setDoc(docRef, {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      createdAt: preset.createdAt,
      settings: JSON.parse(JSON.stringify(preset.settings)),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function loadPresetsFromFirestore(): Promise<PresetRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, PRESETS_COLLECTION));
    const results: PresetRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      results.push({
        id: data.id || docSnap.id,
        name: data.name || 'Custom Preset',
        description: data.description || '',
        createdAt: data.createdAt || new Date().toISOString(),
        settings: data.settings,
      });
    });
    return results;
  } catch (error) {
    console.warn('Could not load presets from Firestore:', error);
    return [];
  }
}
