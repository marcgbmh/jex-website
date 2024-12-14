"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function AccountPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;

  const formatAddress = (address: string | undefined) => {
    if (!address) return "No wallet connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <main className="flex min-h-screen flex-col p-4 bg-background">
      <h1 className="text-3xl font-bold text-center mb-16">
        {formatAddress(walletAddress)}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="bg-gray-200 rounded-lg aspect-square w-full min-h-[300px] flex items-center justify-center"
          >
            <span className="text-gray-500"></span>
          </div>
        ))}
      </div>
    </main>
  );
}
