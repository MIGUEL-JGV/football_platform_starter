import Link from 'next/link';
import { Topbar } from '../../components/Topbar';
import { getSession } from '../../lib/auth';
import { listMyTournaments } from '../../lib/api';
import { listMyOrganizations, type MyOrganization } from '../../lib/manage';
import { formatFootball, formatStatus } from '../../lib/format';
import type { MyTournamentItem } from '../../lib/api';

const ORG_ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  editor: 'Editor',
};

const TOURN_ROLE_LABELS: Record<string, string> = {
  manager: 'Administrador',
  scorekeeper: 'Anotador',
  viewer: 'Consulta',
};

export default async function PanelPage() {
  const session = await getSession();
  let organizations: MyOrganization[] = [];
  let managed: MyTournamentItem[] = [];

  if (session) {
    const [orgs, tournaments] = await Promise.all([
      listMyOrganizations(session.token).catch(() => []),
      listMyTournaments(session.token).catch(() => []),
    ]);
    organizations = orgs;
    managed = tournaments.filter((t) => t.canManage);
  }

  return (
    <main className="page">
      <Topbar />
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PANEL DE GESTIÓN</p>
            <h2>Administración</h2>
          </div>
          {session ? (
            <Link className="light-button" href="/panel/torneos/nuevo">
              + Crear torneo
            </Link>
          ) : null}
        </div>

        {!session ? (
          <div>
            <p className="empty">Inicia sesión para administrar tus organizaciones y torneos.</p>
            <div className="account-ctas">
              <Link className="light-button" href="/login">Iniciar sesión</Link>
              <Link className="login" href="/register">Crear cuenta</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="d-block">
              <div className="section-heading">
                <h3>Mis organizaciones</h3>
                <span className="result-count">{organizations.length}</span>
              </div>
              {organizations.length === 0 ? (
                <p className="empty">No perteneces a ninguna organización todavía.</p>
              ) : (
                <ul className="panel-list">
                  {organizations.map((org) => (
                    <li className="panel-row" key={org.id}>
                      <div>
                        <strong>{org.name}</strong>
                        <p>{org._count.tournaments} torneos · {org._count.members} integrantes</p>
                      </div>
                      <span className={`role-tag role-${org.myRole}`}>
                        {ORG_ROLE_LABELS[org.myRole] ?? org.myRole}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="d-block">
              <div className="section-heading">
                <h3>Torneos que administro</h3>
                <span className="result-count">{managed.length}</span>
              </div>
              {managed.length === 0 ? (
                <p className="empty">No administras ningún torneo por ahora.</p>
              ) : (
                <ul className="panel-list">
                  {managed.map((t) => (
                    <li className="panel-row" key={t.id}>
                      <div>
                        <strong>{t.name}</strong>
                        <p>
                          {t.organization.name} · {formatFootball(t.format)} · {formatStatus(t.status)}
                          {t.maxTeams ? ` · Cupo ${t._count?.entries ?? 0}/${t.maxTeams}` : ''}
                        </p>
                      </div>
                      <div className="panel-row-actions">
                        <span className="role-tag">
                          {TOURN_ROLE_LABELS[t.myRole ?? ''] ?? (t.myOrgRole ? `Org · ${ORG_ROLE_LABELS[t.myOrgRole] ?? t.myOrgRole}` : 'Gestión')}
                        </span>
                        <Link className="panel-link" href={`/panel/tournaments/${t.id}`}>
                          Administrar ↗
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
