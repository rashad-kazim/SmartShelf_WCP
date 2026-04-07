'use client';

import AppErrorFallback from '@/components/feedback/AppErrorFallback';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <AppErrorFallback error={error} reset={reset} fullScreen />
      </body>
    </html>
  );
}
