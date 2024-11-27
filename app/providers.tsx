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
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'light',
          accentColor: '#000000',
          showWalletLoginFirst: true,
        },
        defaultChain: {
          name: 'Sepolia',
          id: 11155111,
          rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/demo']
        },
        supportedChains: [
          {
            name: 'Sepolia',
            id: 11155111,
            rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/demo']
          }
        ]
      }}
    >
      {children}
    </PrivyProvider>
  );
}
