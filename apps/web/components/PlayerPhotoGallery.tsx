'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deletePhotoAction,
  setPrimaryPhotoAction,
  uploadPhotoAction,
} from '../lib/manage-actions';
import type { PlayerPhoto } from '../lib/manage';
import { PhotoEditor } from './PhotoEditor';
import { PhotoPreview } from './PhotoPreview';

export function PlayerPhotoGallery({
  playerId,
  initialPhotos,
  canManage,
  playerName,
  playerAge,
}: {
  playerId: string;
  initialPhotos: PlayerPhoto[];
  canManage: boolean;
  playerName?: string;
  playerAge?: number | null;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PlayerPhoto[]>(initialPhotos);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!canManage) {
    return null;
  }

  const canPublish = playerAge == null || playerAge >= 18;
  const previewPhoto = photos.find((photo) => photo.isPrimary) ?? photos[0];

  async function handleSave(blob: Blob, makePublic: boolean) {
    setMutationError(null);
    setSuccess(false);
    const formData = new FormData();
    formData.append('file', blob, 'photo.webp');
    formData.append('makePublic', makePublic ? 'true' : 'false');
    const result = await uploadPhotoAction(playerId, formData);
    if (result.ok && result.photo) {
      setPhotos((current) => [result.photo!, ...current]);
      setEditing(false);
      setSuccess(true);
      router.refresh();
    } else {
      setMutationError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
    }
  }

  function runMutation(photoId: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setMutationError(null);
    setSuccess(false);
    setPendingAction(photoId);
    setPending(true);
    action().then((result) => {
      if (!result.ok) {
        setMutationError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
      } else {
        router.refresh();
      }
      setPending(false);
      setPendingAction(null);
    });
  }

  function setPrimary(photoId: string) {
    runMutation(photoId, () => {
      return setPrimaryPhotoAction(playerId, photoId).then((result) => {
        if (result.ok) {
          setPhotos((current) =>
            current.map((photo) => ({ ...photo, isPrimary: photo.id === photoId })),
          );
        }
        return result;
      });
    });
  }

  function remove(photoId: string) {
    runMutation(photoId, () => {
      return deletePhotoAction(playerId, photoId).then((result) => {
        if (result.ok) {
          setPhotos((current) => current.filter((photo) => photo.id !== photoId));
        }
        return result;
      });
    });
  }

  return (
    <section className="d-block">
      <div className="section-heading">
        <h3>Galería de fotografías</h3>
        <button className="btn-sm btn-approve" onClick={() => setEditing(true)} disabled={pending}>
          Agregar fotografía
        </button>
      </div>

      {success ? <p className="photo-success">✓ Fotografía guardada.</p> : null}
      {mutationError ? <p className="d-follow-err">{mutationError}</p> : null}

      {editing ? (
        <PhotoEditor
          canPublish={canPublish}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : null}

      {previewPhoto ? (
        <div className="photo-preview-wrap">
          <h4>Vista previa</h4>
          <PhotoPreview
            src={previewPhoto.credentialUrl || previewPhoto.url}
            alt={`Fotografía de ${playerName ?? 'jugador'}`}
            name={playerName}
          />
        </div>
      ) : null}

      {photos.length === 0 ? (
        <p className="d-note">Aún no hay fotografías. Agrega la primera con el editor.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <div key={photo.id} className={`photo-card${photo.isPrimary ? ' photo-primary' : ''}`}>
              <a href={photo.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="photo-thumb"
                  src={photo.thumbUrl}
                  alt={`Fotografía de jugador ${photo.width}x${photo.height}`}
                  loading="lazy"
                />
              </a>
              {photo.isPrimary ? <span className="photo-badge">Principal</span> : null}
              <span className={`photo-visibility ${photo.visibility}`}>
                {photo.visibility === 'public' ? 'Pública' : 'Privada'}
              </span>
              <div className="photo-actions">
                {!photo.isPrimary ? (
                  <button
                    className="btn-sm btn-approve"
                    disabled={pending}
                    onClick={() => setPrimary(photo.id)}
                  >
                    {pending && pendingAction === photo.id ? '…' : 'Portada'}
                  </button>
                ) : null}
                <button
                  className="btn-sm btn-reject"
                  disabled={pending}
                  onClick={() => remove(photo.id)}
                >
                  {pending && pendingAction === photo.id ? '…' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
