
import { SavedProject, SavedTrack, Track } from '../types';
import { encodeWAVBuffer, decodeAudioData, getAudioContext, createEmptyBuffer, generateDrumBeat } from './audioUtils';

const DB_NAME = 'SonicPocketDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject('IndexedDB error: ' + (event.target as IDBOpenDBRequest).error);
        };
    });
};

// Helper to convert Track to SavedTrack (handling recursion for crossfade metadata)
const convertTrackToSaved = (t: Track): SavedTrack => {
    const saved: SavedTrack = {
        id: t.id,
        name: t.name,
        data: encodeWAVBuffer(t.buffer),
        // Only save original if it differs and exists, to save space
        originalData: t.originalBuffer ? encodeWAVBuffer(t.originalBuffer) : undefined,
        startTime: t.startTime,
        trimStart: t.trimStart,
        duration: t.duration,
        lane: t.lane,
        volume: t.volume,
        isMuted: t.isMuted,
        isSolo: t.isSolo,
        color: t.color,
        bpm: t.bpm,
        activeEffects: t.activeEffects
    };

    if (t.crossfadeMetadata) {
        saved.crossfadeMetadata = {
            left: convertTrackToSaved(t.crossfadeMetadata.left),
            right: convertTrackToSaved(t.crossfadeMetadata.right),
            duration: t.crossfadeMetadata.duration
        };
    }

    return saved;
};

// Helper to load SavedTrack to Track (handling recursion)
const convertSavedToTrack = async (st: SavedTrack, ctx: AudioContext): Promise<Track | null> => {
    try {
        let audioBuffer: AudioBuffer | null = null;
        let originalBuffer: AudioBuffer | undefined = undefined;

        // 1. Load Main Audio
        if (st.data && st.data.byteLength > 0) {
            audioBuffer = await decodeAudioData(st.data);
        } else if (st.blob) {
            const ab = await st.blob.arrayBuffer();
            if (ab.byteLength > 0) audioBuffer = await decodeAudioData(ab);
        }

        // 2. Load Original Audio (if exists)
        if (st.originalData && st.originalData.byteLength > 0) {
            originalBuffer = await decodeAudioData(st.originalData);
        }

        if (!audioBuffer) return null;

        const track: Track = {
            id: st.id,
            name: st.name,
            buffer: audioBuffer,
            originalBuffer: originalBuffer,
            startTime: st.startTime,
            trimStart: st.trimStart ?? 0,
            duration: st.duration ?? audioBuffer.duration,
            lane: st.lane,
            volume: st.volume,
            isMuted: st.isMuted,
            isSolo: st.isSolo,
            color: st.color,
            bpm: st.bpm,
            activeEffects: st.activeEffects
        };

        // 3. Load Crossfade Metadata
        if (st.crossfadeMetadata) {
            const left = await convertSavedToTrack(st.crossfadeMetadata.left, ctx);
            const right = await convertSavedToTrack(st.crossfadeMetadata.right, ctx);
            if (left && right) {
                track.crossfadeMetadata = {
                    left,
                    right,
                    duration: st.crossfadeMetadata.duration
                };
            }
        }

        return track;
    } catch (e) {
        console.error("Error converting saved track:", e);
        return null;
    }
};

export const saveProject = async (
    id: string, 
    name: string, 
    tracks: Track[], 
    thumbnail: string = ''
): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Optimized Saving: Sequential processing
    const savedTracks: SavedTrack[] = [];
    
    for (const t of tracks) {
        const st = convertTrackToSaved(t);
        savedTracks.push(st);
    }

    const project: SavedProject = {
        id,
        name,
        lastModified: Date.now(),
        tracks: savedTracks,
        thumbnail
    };

    return new Promise((resolve, reject) => {
        const request = store.put(project);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const loadProjects = async (): Promise<SavedProject[]> => {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const projects = request.result as SavedProject[];
            projects.sort((a, b) => b.lastModified - a.lastModified);
            resolve(projects);
        };
        request.onerror = () => reject(request.error);
    });
};

export const loadProjectTracks = async (savedTracks: SavedTrack[]): Promise<Track[]> => {
    if (!savedTracks) return []; 
    
    const ctx = getAudioContext();
    const tracks: Track[] = [];
    
    for (const st of savedTracks) {
        if (!st) continue;
        
        const loadedTrack = await convertSavedToTrack(st, ctx);

        if (loadedTrack) {
            tracks.push(loadedTrack);
        } else {
            // Error/Placeholder logic
            const fallbackDuration = st.duration || 5.0;
            const errorBuffer = createEmptyBuffer(ctx, fallbackDuration);
            tracks.push({
                id: st.id,
                name: `⚠️ Missing Data: ${st.name}`,
                buffer: errorBuffer,
                startTime: st.startTime,
                trimStart: 0,
                duration: fallbackDuration,
                lane: st.lane,
                volume: st.volume,
                isMuted: true,
                isSolo: false,
                color: '#ef4444'
            });
        }
    }
    return tracks;
};

export const deleteProject = async (id: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const updateProjectName = async (id: string, newName: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const project = getRequest.result as SavedProject;
            if (project) {
                project.name = newName;
                store.put(project).onsuccess = () => resolve();
            } else {
                reject("Project not found");
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};
