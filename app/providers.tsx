'use client';

import { PrivyProvider } from '@privy-io/react-auth';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

if (!PRIVY_APP_ID) {
  throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is not defined in environment variables');
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
    >
      {children}
    </PrivyProvider>
  );
}
