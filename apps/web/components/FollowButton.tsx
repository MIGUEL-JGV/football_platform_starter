'use client';

import { useState, useTransition } from 'react';
import { toggleFollowAction } from '../lib/actions';

export function FollowButton({ tournamentId, following: initial }: { tournamentId: string; following: boolean }) {
  const [following, setFollowing] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleToggle = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await toggleFollowAction(tournamentId, following);
      if (result.error === 'auth') {
        setMessage('Inicia sesión para seguir este torneo.');
        return;
      }
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setFollowing(result.following);
    });
  };

  return (
    <div className="d-follow-wrap">
      <button className="d-follow" disabled={pending} onClick={handleToggle} type="button">
        {pending ? '…' : following ? 'Dejar de seguir' : 'Seguir torneo'}
      </button>
      {message ? <p className="d-follow-err">{message}</p> : null}
    </div>
  );
}