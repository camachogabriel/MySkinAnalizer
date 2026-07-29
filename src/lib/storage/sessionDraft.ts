import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { PhotoAngle } from '@/types/capture';

// MySkinAnalyzer — borrador de sesión en memoria, compartido entre
// CaptureScreen y ProcessingScreen sin necesidad de un backend ni de
// serializar ImageBitmaps a través del router. Se limpia después de procesar.

export interface DraftPhoto {
  angle: PhotoAngle;
  bitmap: ImageBitmap;
  landmarks: NormalizedLandmark[];
  lightingScore: number;
  sharpnessScore: number;
  faceCoverageScore: number;
  previewUrl: string;
}

class SessionDraftStore {
  private photos = new Map<PhotoAngle, DraftPhoto>();

  addPhoto(photo: DraftPhoto) {
    this.photos.set(photo.angle, photo);
  }

  getPhotos(): DraftPhoto[] {
    return Array.from(this.photos.values());
  }

  getPhoto(angle: PhotoAngle): DraftPhoto | undefined {
    return this.photos.get(angle);
  }

  isComplete(): boolean {
    return this.photos.has('frontal') && this.photos.has('left45') && this.photos.has('right45');
  }

  clear() {
    this.photos.clear();
  }
}

export const sessionDraft = new SessionDraftStore();
