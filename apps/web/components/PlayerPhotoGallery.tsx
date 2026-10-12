'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deletePhotoAction,
  setPrimaryPhotoAction,
  uploadPhotoAction,
} from '../lib/manage-actions';
import type { PlayerPhoto } from '../lib/manage';

export function PlayerPhotoGallery({
  playerId,
  initialPhotos,
  canManage,
}: {
  playerId: string;
  initialPhotos: PlayerPhoto[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PlayerPhoto[]>(initialPhotos);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [state, formAction] = useActionState<PlayerPhoto | null, FormData>(
    async (_prev, formData) => {
      const result = await uploadPhotoAction(playerId, formData);
      if (result.ok && result.photo) {
        setPhotos((current) => [result.photo!, ...current]);
        router.refresh();
        return result.photo;
      }
      setMutationError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
      return null;
    },
    null,
  );

  if (!canManage) {
    return null;
  }

  function runMutation(photoId: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setMutationError(null);
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
      <h3>Galería de fotografías</h3>

      <form
        className="photo-upload"
        action={formAction}
        onSubmit={() => {
          setMutationError(null);
        }}
      >
        <label className="photo-input">
          <span>Agregar foto (JPG, PNG o WEBP, máx. 8 MB)</span>
          <input className="field-input" type="file" name="file" accept="image/jpeg,image/png,image/webp" />
        </label>
        <button className="btn-sm btn-approve" type="submit" disabled={pending}>
          {pending ? 'Subiendo…' : 'Subir'}
        </button>
      </form>

      {state ? <p className="photo-success">✓ Fotografía guardada.</p> : null}
      {mutationError ? <p className="d-follow-err">{mutationError}</p> : null}

      {photos.length === 0 ? (
        <p className="d-note">Aún no hay fotografías. Sube la primera con el formulario.</p>
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
              {photo.isPrimary ? (
                <span className="photo-badge">Principal</span>
              ) : null}
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