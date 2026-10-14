'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Aspect = { w: number; h: number };

const DEFAULT_ASPECT: Aspect = { w: 3, h: 4 };
const FRAME_WIDTH = 300;

export interface PhotoEditorProps {
  onSave: (blob: Blob, makePublic: boolean) => void | Promise<void>;
  onCancel: () => void;
  canPublish?: boolean;
  defaultPublic?: boolean;
  busy?: boolean;
  aspect?: Aspect;
}

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  image: HTMLImageElement,
  transform: Transform,
  frameW: number,
): void {
  const factor = canvasW / frameW;
  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#eef0f0';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.translate(canvasW / 2 + transform.offsetX * factor, canvasH / 2 + transform.offsetY * factor);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.scale * factor, transform.scale * factor);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.restore();
}

function rotatedBounds(image: HTMLImageElement, rotation: number) {
  const swap = rotation % 180 !== 0;
  return {
    width: swap ? image.naturalHeight : image.naturalWidth,
    height: swap ? image.naturalWidth : image.naturalHeight,
  };
}

export function PhotoEditor({
  onSave,
  onCancel,
  canPublish = true,
  defaultPublic = false,
  busy = false,
  aspect = DEFAULT_ASPECT,
}: PhotoEditorProps) {
  const frameHeight = Math.round((FRAME_WIDTH * aspect.h) / aspect.w);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0, rotation: 0 });
  const [cameraOn, setCameraOn] = useState(false);
  const [makePublic, setMakePublic] = useState(defaultPublic);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fitImage = useCallback(
    (img: HTMLImageElement) => {
      const bounds = rotatedBounds(img, 0);
      const scale = Math.max(FRAME_WIDTH / bounds.width, frameHeight / bounds.height);
      setTransform({ scale, offsetX: 0, offsetY: 0, rotation: 0 });
      setImage(img);
    },
    [frameHeight],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawScene(ctx, canvas.width, canvas.height, img, transform, FRAME_WIDTH);
  }, [transform]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function loadFile(file: File) {
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError('Formato no permitido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('La imagen supera el límite de 8 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      imageRef.current = img;
      fitImage(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError('No se pudo leer la imagen.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError('No se pudo acceder a la cámara. Puedes seleccionar un archivo.');
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/webp', 0.9);
    const img = new window.Image();
    img.onload = () => {
      imageRef.current = img;
      fitImage(img);
      closeCamera();
    };
    img.src = dataUrl;
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!image) return;
    (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      ox: transform.offsetX,
      oy: transform.offsetY,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setTransform((current) => ({
      ...current,
      offsetX: dragRef.current!.ox + dx,
      offsetY: dragRef.current!.oy + dy,
    }));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function zoom(delta: number) {
    setTransform((current) => ({ ...current, scale: Math.min(6, Math.max(0.2, current.scale + delta)) }));
  }

  function rotate() {
    setTransform((current) => ({ ...current, rotation: (current.rotation + 90) % 360 }));
  }

  function reset() {
    if (image) fitImage(image);
  }

  function save() {
    const img = imageRef.current;
    if (!img) {
      setError('Selecciona o toma una fotografía primero.');
      return;
    }
    setSaving(true);
    const output = document.createElement('canvas');
    output.width = 600;
    output.height = Math.round((600 * aspect.h) / aspect.w);
    const ctx = output.getContext('2d');
    if (!ctx) {
      setSaving(false);
      setError('No se pudo procesar la imagen.');
      return;
    }
    drawScene(ctx, output.width, output.height, img, transform, FRAME_WIDTH);
    output.toBlob(
      (blob) => {
        if (!blob) {
          setSaving(false);
          setError('No se pudo generar la fotografía recortada.');
          return;
        }
        Promise.resolve(onSave(blob, makePublic)).finally(() => setSaving(false));
      },
      'image/webp',
      0.85,
    );
  }

  const disabled = busy || saving;

  return (
    <div className="photo-editor" role="dialog" aria-label="Editor de fotografía">
      <div className="photo-editor-panel">
        <h3>Editor de fotografía</h3>
        <p className="photo-editor-hint">
          Ajusta el encuadre: arrastra para mover, usa el zoom y gira si es necesario. La guía es 3:4
          (rostro centrado, cabeza y hombros visibles).
        </p>

        {cameraOn ? (
          <div className="photo-editor-video">
            <video ref={videoRef} playsInline muted />
            <div className="photo-editor-actions">
              <button type="button" className="btn-sm btn-approve" onClick={capturePhoto}>
                Capturar
              </button>
              <button type="button" className="btn-sm btn-ghost" onClick={closeCamera}>
                Cerrar cámara
              </button>
            </div>
          </div>
        ) : (
          <div className="photo-editor-stage" style={{ height: frameHeight }}>
            <canvas
              ref={canvasRef}
              width={FRAME_WIDTH}
              height={frameHeight}
              className="photo-editor-canvas"
              style={{ cursor: image ? 'grab' : 'default', touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {!image ? <p className="photo-editor-empty">Sin imagen seleccionada.</p> : null}
          </div>
        )}

        <div className="photo-editor-controls">
          <button
            type="button"
            className="btn-sm btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Elegir imagen
          </button>
          <button type="button" className="btn-sm btn-ghost" onClick={openCamera} disabled={disabled}>
            Tomar foto
          </button>
          <button type="button" className="btn-sm btn-ghost" onClick={() => zoom(0.1)} disabled={disabled}>
            Acercar
          </button>
          <button type="button" className="btn-sm btn-ghost" onClick={() => zoom(-0.1)} disabled={disabled}>
            Alejar
          </button>
          <button type="button" className="btn-sm btn-ghost" onClick={rotate} disabled={disabled}>
            Girar
          </button>
          <button type="button" className="btn-sm btn-ghost" onClick={reset} disabled={disabled || !image}>
            Restablecer
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="photo-editor-file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) loadFile(file);
            event.target.value = '';
          }}
        />

        {canPublish ? (
          <label className="photo-editor-public">
            <input
              type="checkbox"
              checked={makePublic}
              onChange={(event) => setMakePublic(event.target.checked)}
              disabled={disabled}
            />
            <span>Publicar en el perfil público (requiere consentimiento para menores)</span>
          </label>
        ) : (
          <p className="d-note">La fotografía se guardará como privada.</p>
        )}

        {error ? <p className="d-follow-err">{error}</p> : null}

        <div className="photo-editor-actions">
          <button
            type="button"
            className="btn-sm btn-approve"
            onClick={save}
            disabled={disabled || !image}
          >
            {saving ? 'Guardando…' : 'Guardar fotografía'}
          </button>
          <button type="button" className="btn-sm btn-reject" onClick={onCancel} disabled={disabled}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
