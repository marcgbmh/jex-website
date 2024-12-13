"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function AccountPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;

  return (
    <main className="flex min-h-screen flex-col p-4 bg-background">
      <h1 className="text-3xl font-bold text-center mb-16">
        {" "}
        {walletAddress || "No wallet connected"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4  max-w-7xl mx-auto">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="bg-gray-200 rounded-lg p-6 h-60 w-60 flex items-center justify-center"
          >
            <span className="text-gray-500">{index + 1}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
