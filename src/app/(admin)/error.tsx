'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminError]', error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-2xl text-destructive">!</span>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Une erreur est survenue
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Le tableau de bord a rencontr&eacute; un probl&egrave;me. Veuillez r&eacute;essayer.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            R&eacute;essayer
          </button>
          <button
            onClick={() => (window.location.href = '/login')}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Retour au login
          </button>
        </div>
      </div>
    </div>
  );
}
