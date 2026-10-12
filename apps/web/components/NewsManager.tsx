'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createNewsAction,
  deleteNewsAction,
  publishNewsAction,
  unpublishNewsAction,
  updateNewsAction,
} from '../lib/manage-actions';
import type { ManageNewsPost } from '../lib/manage';
import { formatDateTime } from '../lib/format';

function NewsRow({ tournamentId, post }: { tournamentId: string; post: ManageNewsPost }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <li className="news-row">
      <div className="news-head">
        <strong>{post.title}</strong>
        <span className={`status-pill ${post.status === 'published' ? 'consent-ok' : 'consent-warn'}`}>
          {post.status === 'published' ? 'Publicada' : 'Borrador'}
        </span>
      </div>
      <p className="news-date">
        {post.author.displayName} · {formatDateTime(post.publishedAt ?? post.createdAt)}
      </p>
      {error ? <p className="d-follow-err">{error}</p> : null}
      {editing ? (
        <div className="news-body">
          <input
            className="field-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título"
            maxLength={200}
          />
          <textarea
            className="field-input news-textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Contenido de la noticia"
          />
          <div className="news-actions">
            <button
              className="btn-sm btn-approve"
              disabled={pending || title.trim().length < 2 || body.trim() === ''}
              onClick={() =>
                run(() => updateNewsAction(tournamentId, post.id, { title, body }))
              }
            >
              Guardar
            </button>
            <button className="btn-sm btn-ghost" disabled={pending} onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="news-actions">
        <button className="btn-sm btn-ghost" disabled={pending} onClick={() => setEditing(true)}>
          Editar
        </button>
        {post.status === 'draft' ? (
          <button
            className="btn-sm btn-approve"
            disabled={pending}
            onClick={() => run(() => publishNewsAction(tournamentId, post.id))}
          >
            Publicar
          </button>
        ) : (
          <button
            className="btn-sm btn-ghost"
            disabled={pending}
            onClick={() => run(() => unpublishNewsAction(tournamentId, post.id))}
          >
            Despublicar
          </button>
        )}
        <button
          className="btn-sm btn-reject"
          disabled={pending}
          onClick={() => {
            if (confirm('¿Eliminar esta noticia?')) {
              run(() => deleteNewsAction(tournamentId, post.id));
            }
          }}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

export function NewsManager({
  tournamentId,
  posts,
}: {
  tournamentId: string;
  posts: ManageNewsPost[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(posts.length === 0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [publish, setPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (title.trim().length < 2 || body.trim() === '') {
      setError('Escribe un título y contenido para la noticia.');
      return;
    }
    startTransition(async () => {
      const result = await createNewsAction(tournamentId, {
        title,
        body,
        ...(publish ? { status: 'published' as const } : {}),
      });
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setTitle('');
      setBody('');
      setPublish(false);
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div className="d-block">
      <div className="section-heading">
        <h3>Noticias</h3>
        <button className="btn-sm btn-ghost" onClick={() => setShowForm((value) => !value)}>
          {showForm ? 'Ocultar formulario' : 'Nueva noticia'}
        </button>
      </div>

      {showForm ? (
        <div className="news-body">
          <input
            className="field-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título"
            maxLength={200}
          />
          <textarea
            className="field-input news-textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Contenido de la noticia"
          />
          <label className="squad-consent-check">
            <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} />
            Publicar de inmediato
          </label>
          {error ? <p className="d-follow-err">{error}</p> : null}
          <div className="news-actions">
            <button
              className="btn-sm btn-approve"
              disabled={pending}
              onClick={submit}
            >
              {pending ? '…' : 'Guardar noticia'}
            </button>
          </div>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <p className="empty">Todavía no hay noticias para este torneo.</p>
      ) : (
        <ul className="news-list">
          {posts.map((post) => (
            <NewsRow key={post.id} tournamentId={tournamentId} post={post} />
          ))}
        </ul>
      )}
    </div>
  );
}