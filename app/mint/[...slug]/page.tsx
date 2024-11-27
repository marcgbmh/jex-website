'use client';

import Image from "next/image";
import { useState, use } from 'react';
import { decodeToken } from './token';
import MintButton from './mint-button';

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

const parseProductFromUrl = (slug: string[]): Product | null => {
  try {
    // Get the token from the URL
    const token = slug[0];
    if (!token) return null;

    // Decode the token
    const decoded = decodeToken(token);
    if (!decoded) return null;

    // Create product info from decoded data
    return {
      id: `${decoded.t}-${decoded.c}-${decoded.n.toString().padStart(6, '0')}`,
      category: decoded.c,
      imageUrl: `/products/${decoded.t}-${decoded.c}-${decoded.n.toString().padStart(6, '0')}.png`,
      decodedToken: decoded
    };
  } catch (error) {
    console.error('Error parsing product from URL:', error);
    return null;
  }
};

export default function MintPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const resolvedParams = use(params);
  const product = parseProductFromUrl(resolvedParams.slug);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Invalid product ID</p>
      </div>
    );
  }

  return <MintButton product={product} />;
}
