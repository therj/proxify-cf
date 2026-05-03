import React, { useCallback, useEffect, useState } from 'react';
import { ADMIN_API_RETRY_EVENT } from '../context/AdminApiRetryContext';
import {
  clearFatalApiError,
  registerFatalApiClear,
  subscribeFatalApiError,
  type FatalApiErrorPayload,
} from '../lib/fatalApiError';
import { BlockingApiErrorModal } from './BlockingApiErrorModal';

export function ApiFatalErrorProvider({ children }: { children: React.ReactNode }) {
  const [fatal, setFatal] = useState<FatalApiErrorPayload | null>(null);

  useEffect(() => subscribeFatalApiError(setFatal), []);
  useEffect(() => registerFatalApiClear(() => setFatal(null)), []);

  const handleFatalTryAgain = useCallback(() => {
    clearFatalApiError();
    window.dispatchEvent(new CustomEvent(ADMIN_API_RETRY_EVENT));
  }, []);

  const title =
    fatal?.variant === 'session'
      ? 'Sign-in required'
      : fatal?.variant === 'server'
        ? 'Bad response'
        : fatal?.variant === 'network'
          ? 'Offline or blocked'
        : 'Error';

  return (
    <>
      {children}
      <BlockingApiErrorModal
        open={fatal != null}
        title={title}
        message={fatal?.message ?? ''}
        variant={fatal?.variant ?? 'network'}
        onTryAgain={handleFatalTryAgain}
      />
    </>
  );
}
