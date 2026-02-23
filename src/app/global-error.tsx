'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div
          style={{
            display: 'flex',
            height: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            padding: '1rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div
              style={{
                margin: '0 auto 1rem',
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#fde8e8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: '#dc2626',
              }}
            >
              !
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
              Une erreur est survenue
            </h2>
            <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
              Veuillez r&eacute;essayer ou recharger la page.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#171717',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                R&eacute;essayer
              </button>
              <button
                onClick={() => (window.location.href = '/login')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'transparent',
                  color: '#171717',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Retour au login
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
