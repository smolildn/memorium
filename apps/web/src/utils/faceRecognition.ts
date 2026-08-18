import type { Person, MemoryItem } from "../api";
import { mediaUrl } from "../mediaUrl";
import { generateId } from "./id";
import { getItemFaces, type FaceRegion } from "./photos";

/** Default euclidean distance threshold — lower distance = more similar (face-api convention) */
export const FACE_MATCH_THRESHOLD = 0.6;

export interface PersonFaceSample {
  personId: string;
  embedding: Float32Array;
  source: "labeled-face" | "portrait";
}

type FaceApiModule = typeof import("@vladmandic/face-api");

let faceApiModule: FaceApiModule | null = null;
let modelsReady = false;
let modelsLoading: Promise<void> | null = null;

function modelBaseUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}face-models`;
}

async function getFaceApi(): Promise<FaceApiModule> {
  if (!faceApiModule) {
    faceApiModule = await import("@vladmandic/face-api");
  }
  return faceApiModule;
}

/** Load SSD MobileNet + landmarks + recognition nets (cached after first call). */
export async function ensureFaceModels(): Promise<void> {
  if (modelsReady) return;
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    const faceapi = await getFaceApi();
    const url = modelBaseUrl();
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(url),
      faceapi.nets.faceLandmark68Net.loadFromUri(url),
      faceapi.nets.faceRecognitionNet.loadFromUri(url),
    ]);
    modelsReady = true;
  })();

  return modelsLoading;
}

export function isFaceRecognitionAvailable(): boolean {
  return modelsReady;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Detect faces with 128-d embeddings using face-api (runs fully in the browser). */
export async function detectFacesWithEmbeddings(img: HTMLImageElement): Promise<FaceRegion[]> {
  await ensureFaceModels();
  const faceapi = await getFaceApi();

  if (!img.complete || img.naturalWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image failed to load"));
    });
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d): FaceRegion => {
    const box = d.detection.box;
    return {
      id: generateId(),
      x: box.x / w,
      y: box.y / h,
      width: box.width / w,
      height: box.height / h,
      confidence: d.detection.score,
      embedding: Array.from(d.descriptor),
    };
  });
}

/** Fallback when face-api models are unavailable — browser FaceDetector API. */
export async function detectFacesBasic(img: HTMLImageElement): Promise<FaceRegion[]> {
  if (!window.FaceDetector) {
    throw new Error(
      "Face detection unavailable. Run npm install && node scripts/setup-face-models.mjs, then use Chrome or Edge.",
    );
  }

  await ensureImageReady(img);
  const detector = new window.FaceDetector({ maxDetectedFaces: 12 });
  const faces = await detector.detect(img);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  return faces.map(
    (face): FaceRegion => ({
      id: generateId(),
      x: face.boundingBox.x / w,
      y: face.boundingBox.y / h,
      width: face.boundingBox.width / w,
      height: face.boundingBox.height / h,
      confidence: 0.85,
    }),
  );
}

async function ensureImageReady(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
  });
}

/** Primary entry: embeddings when models loaded, else basic detection. */
export async function detectFacesInImage(img: HTMLImageElement): Promise<FaceRegion[]> {
  try {
    return await detectFacesWithEmbeddings(img);
  } catch {
    return detectFacesBasic(img);
  }
}

export function buildFaceGallery(items: MemoryItem[], people: Person[]): PersonFaceSample[] {
  const samples: PersonFaceSample[] = [];

  for (const person of people) {
    if (person.faceEmbedding?.length === 128) {
      samples.push({
        personId: person.id,
        embedding: new Float32Array(person.faceEmbedding),
        source: "portrait",
      });
    }
  }

  for (const item of items) {
    for (const face of getItemFaces(item)) {
      if (face.personId && face.embedding?.length === 128) {
        samples.push({
          personId: face.personId,
          embedding: new Float32Array(face.embedding),
          source: "labeled-face",
        });
      }
    }
  }

  return samples;
}

export async function matchFaceEmbedding(
  embedding: Float32Array,
  gallery: PersonFaceSample[],
  threshold = FACE_MATCH_THRESHOLD,
): Promise<{ personId: string; distance: number } | null> {
  if (gallery.length === 0) return null;
  const faceapi = await getFaceApi();

  let best: { personId: string; distance: number } | null = null;
  for (const sample of gallery) {
    const distance = faceapi.euclideanDistance(embedding, sample.embedding);
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { personId: sample.personId, distance };
    }
  }
  return best;
}

export function applyRecognitionToFaces(
  faces: FaceRegion[],
  gallery: PersonFaceSample[],
  threshold = FACE_MATCH_THRESHOLD,
): FaceRegion[] {
  if (gallery.length === 0) return faces;

  return faces.map((face) => {
    if (face.personId || !face.embedding?.length) return face;
    const embedding = new Float32Array(face.embedding);
    let best: { personId: string; distance: number } | null = null;

    for (const sample of gallery) {
      const distance = euclideanDistance(embedding, sample.embedding);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { personId: sample.personId, distance };
      }
    }

    if (!best) return face;
    return {
      ...face,
      personId: best.personId,
      matchDistance: best.distance,
    };
  });
}

function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Compute embedding from a person's portrait photo and return it for storage. */
export async function learnFaceFromPortrait(person: Person): Promise<number[] | null> {
  if (!person.avatarPath) return null;
  const img = await loadImageElement(mediaUrl({ vaultPath: person.avatarPath }));
  const faces = await detectFacesWithEmbeddings(img);
  if (faces.length === 0) return null;
  const best = faces.reduce((a, b) => ((b.confidence ?? 0) > (a.confidence ?? 0) ? b : a));
  return best.embedding ?? null;
}

export interface ScanPhotoResult {
  itemId: string;
  facesFound: number;
  suggested: number;
  updated: MemoryItem;
}

export function collectLabeledFaces(
  items: MemoryItem[],
): Array<{ face: FaceRegion; personId: string; itemId: string }> {
  const results: Array<{ face: FaceRegion; personId: string; itemId: string }> = [];
  for (const item of items) {
    for (const face of getItemFaces(item)) {
      if (face.personId) {
        results.push({ face, personId: face.personId, itemId: item.id });
      }
    }
  }
  return results;
}

/** Scan one photo: detect faces, match against gallery, return updated item (not persisted). */
export async function scanPhotoForFaces(
  item: MemoryItem,
  gallery: PersonFaceSample[],
): Promise<ScanPhotoResult | null> {
  const ref = item.mediaRefs?.[0];
  if (!ref?.mimeType?.startsWith("image/")) return null;

  const existing = getItemFaces(item);
  if (existing.length > 0) {
    return { itemId: item.id, facesFound: existing.length, suggested: 0, updated: item };
  }

  const img = await loadImageElement(mediaUrl(ref));
  let faces = await detectFacesInImage(img);
  faces = applyRecognitionToFaces(faces, gallery);

  const suggested = faces.filter((f) => f.personId).length;
  const personIds = [
    ...new Set([
      ...item.personIds,
      ...faces.map((f) => f.personId).filter((id): id is string => Boolean(id)),
    ]),
  ];

  const updated: MemoryItem = {
    ...item,
    personIds,
    metadata: { ...item.metadata, faces },
  };

  return { itemId: item.id, facesFound: faces.length, suggested, updated };
}

declare global {
  interface Window {
    FaceDetector?: new (options?: { maxDetectedFaces?: number }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
    };
  }
}
