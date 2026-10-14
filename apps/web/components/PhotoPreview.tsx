/* eslint-disable @next/next/no-img-element */

export function PhotoPreview({
  src,
  alt,
  name,
}: {
  src: string;
  alt: string;
  name?: string;
}) {
  return (
    <div className="photo-preview">
      <div className="photo-preview-item">
        <span className="photo-preview-label">Ficha de jugador</span>
        <div className="photo-preview-card">
          <img className="photo-preview-figure" src={src} alt={alt} />
          {name ? <span className="photo-preview-name">{name}</span> : null}
        </div>
      </div>

      <div className="photo-preview-item">
        <span className="photo-preview-label">Listado de plantilla</span>
        <div className="photo-preview-row">
          <img className="photo-preview-thumb" src={src} alt={alt} />
          <span className="photo-preview-row-name">{name ?? 'Jugador'}</span>
        </div>
      </div>

      <div className="photo-preview-item">
        <span className="photo-preview-label">Credencial digital</span>
        <div className="photo-preview-credential">
          <img className="photo-preview-credential-photo" src={src} alt={alt} />
          <div className="photo-preview-credential-body">
            <span className="photo-preview-credential-eyebrow">CREDENCIAL</span>
            <strong>{name ?? 'Jugador'}</strong>
            <span className="photo-preview-credential-line" />
            <span className="photo-preview-credential-line short" />
          </div>
        </div>
      </div>
    </div>
  );
}
