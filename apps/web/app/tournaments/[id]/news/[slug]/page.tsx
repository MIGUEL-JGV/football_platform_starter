import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNewsPost, getTournamentDetail } from '../../../../../lib/api';
import { Topbar } from '../../../../../components/Topbar';
import { formatMatchDateTime } from '../../../../../lib/format';

type Params = Promise<{ id: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id, slug } = await params;
  try {
    const post = await getNewsPost(id, slug);
    return { title: post ? `${post.title} · CANCHA+` : 'Noticia · CANCHA+' };
  } catch {
    return { title: 'Noticia · CANCHA+' };
  }
}

export default async function NewsDetailPage({ params }: { params: Params }) {
  const { id, slug } = await params;

  let detail;
  let post;
  try {
    [detail, post] = await Promise.all([getTournamentDetail(id), getNewsPost(id, slug)]);
  } catch {
    notFound();
  }
  if (!post) {
    notFound();
  }

  return (
    <main className="page">
      <Topbar />

      <Link className="d-back" href={`/tournaments/${id}`}>
        ← Volver a {detail.name}
      </Link>

      <article className="d-block" style={{ marginTop: 28 }}>
        <h1 className="d-title" style={{ margin: '0 0 8px' }}>
          {post.title}
        </h1>
        <p className="d-note">
          {post.author.displayName}
          {post.publishedAt ? ` · ${formatMatchDateTime(post.publishedAt)}` : ' · Borrador'}
        </p>
        <div className="d-news-body">
          {post.body.split('\n').map((paragraph, index) =>
            paragraph.trim() === '' ? (
              <br key={index} />
            ) : (
              <p key={index}>{paragraph}</p>
            ),
          )}
        </div>
      </article>
    </main>
  );
}
