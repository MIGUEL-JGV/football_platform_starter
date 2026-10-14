import { apiRequest, apiUpload, UploadFile } from './client';

export interface PlayerPhoto {
  id: string;
  playerId: string;
  isPrimary: boolean;
  visibility: 'public' | 'private';
  width: number;
  height: number;
  sizeBytes: number;
  url: string;
  thumbUrl: string;
  credentialUrl: string;
  createdAt: string;
}

export function listPlayerPhotos(token: string, playerId: string): Promise<PlayerPhoto[]> {
  return apiRequest<PlayerPhoto[]>(`/players/${playerId}/photos`, { token });
}

export function uploadPlayerPhoto(
  token: string,
  playerId: string,
  file: UploadFile,
  makePublic: boolean,
): Promise<PlayerPhoto> {
  return apiUpload<PlayerPhoto>(`/players/${playerId}/photos`, token, file, {
    makePublic: makePublic ? 'true' : 'false',
  });
}

export function setPrimaryPlayerPhoto(
  token: string,
  playerId: string,
  photoId: string,
): Promise<PlayerPhoto> {
  return apiRequest<PlayerPhoto>(`/players/${playerId}/photos/${photoId}/primary`, {
    method: 'POST',
    token,
  });
}

export function deletePlayerPhoto(
  token: string,
  playerId: string,
  photoId: string,
): Promise<{ removed: boolean }> {
  return apiRequest<{ removed: boolean }>(`/players/${playerId}/photos/${photoId}`, {
    method: 'DELETE',
    token,
  });
}
