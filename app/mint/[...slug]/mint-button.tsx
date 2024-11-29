'use client';

import Image from "next/image";
import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';

interface Product {
  id: string;
  category: string;
  imageUrl: string;
  decodedToken?: {
    n: number;
    c: string;
    t: string;
  };
}

export default function MintButton({ product }: { product: Product }) {
  const [isMinting, setIsMinting] = useState(false);
  const { login, authenticated, ready, user } = usePrivy();

  const handleMint = async () => {
    if (!authenticated) {
      login();
      return;
    }

    setIsMinting(true);
    try {
      const collectionMap: any = {
        'HUGMUG': 0,
        'STRAPBOX': 1,
        'CAMPLAMP': 2
      };

      const colorMap: any = {
        'HUGMUG': {
          'Black': 0,
          'White': 1,
          'Blue': 2,
          'Pink': 3
        },
        'STRAPBOX': {
          'Natural': 0,
          'Black': 1
        },
        'CAMPLAMP': {
          'Port': 0
        }
      };

      // parameters from product
      const serialNumber = BigInt(product.decodedToken?.n || 0);
      const collection = collectionMap[product.decodedToken?.t || ''] || 0;
      const color = colorMap[product.decodedToken?.c || ''] || 0;

      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serialNumber: Number(serialNumber),
          color,
          collection,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to mint');
      }

      // Success!
      setIsMinting(false);

    } catch (error: any) {
      console.error('Minting error:', error);
      setIsMinting(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-full max-w-md px-4">
        <h1 className="text-2xl mb-6 text-center">{product.decodedToken?.t}</h1>
        <div className="aspect-square relative mb-6 w-64 mx-auto">
          <Image
            src={product.imageUrl}
            alt={product.id}
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="mb-6 space-y-1 text-center">
          <p>Product: {product.decodedToken?.t}</p>
          <p>Color: {product.decodedToken?.c}</p>
          <p>Number: #{product.decodedToken?.n}</p>
        </div>
        <button
          onClick={handleMint}
        >
        Mint Now
        </button>
      </div>
    </div>
  );
}
