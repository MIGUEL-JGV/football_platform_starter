import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Topbar } from '../../../../components/Topbar';
import { CreateTournamentForm } from '../../../../components/CreateTournamentForm';
import { getSession } from '../../../../lib/auth';

export default async function NewTournamentPage() {
  const session = await getSession();
  if (!session) {
    notFound();
  }

  return (
    <main className="page">
      <Topbar />
      <section className="section">
        <Link className="d-back" href="/panel">← Panel</Link>
        <div className="section-heading">
          <div>
            <p className="eyebrow">NUEVO TORNEO</p>
            <h2>Crear torneo</h2>
            <p className="panel-subtitle">
              Se creará bajo tu organización personal. Después podrás invitar equipos y gestionarlo.
            </p>
          </div>
        </div>
        <CreateTournamentForm />
      </section>
    </main>
  );
}
