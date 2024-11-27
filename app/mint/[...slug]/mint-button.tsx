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
      if (!user?.wallet?.address) {
        throw new Error('No wallet connected');
      }

      // Check if contract address is configured
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      // Get the provider and signer
      if (!user.wallet) {
        throw new Error('No wallet available');
      }
      
      const provider = await user.wallet.getEthereumProvider();
      if (!provider) {
        throw new Error('Failed to get provider');
      }
      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();
      
      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        ['function mint() public'], // Add your actual contract ABI here
        signer
      );

      // Calculate gas limit (you may want to adjust this)
      const gasLimit = 600000;

      // Send the transaction
      const tx = await contract.mint({ gasLimit });
      console.log("Transaction sent:", tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);

      // Show success message
      alert('Successfully minted!');
    } catch (error: any) {
      console.error('Error minting:', error);
      
      // Handle specific error cases
      if (error.code === 'INSUFFICIENT_FUNDS') {
        alert('Insufficient funds to complete the transaction');
      } else if (error.code === 4001) {
        alert('Transaction rejected by user');
      } else if (error.message.includes('execution reverted')) {
        alert(error.error?.message || 'Contract error occurred');
      } else {
        alert('Failed to mint. Please check console for details.');
      }
    } finally {
      setIsMinting(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 rounded-lg shadow-lg max-w-md w-full bg-white">
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 rounded-lg shadow-lg max-w-md w-full bg-white">
        <h1 className="text-2xl font-bold mb-4">{product.decodedToken?.t}</h1>
        <div className="aspect-square relative mb-4 bg-gray-200 rounded-lg overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.id}
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="mb-4 space-y-2">
          <p className="text-lg font-semibold">Details:</p>
          <p className="text-gray-700">Product: {product.decodedToken?.t}</p>
          <p className="text-gray-700">Color: {product.decodedToken?.c}</p>
          <p className="text-gray-700">Number: #{product.decodedToken?.n}</p>
        </div>
        <button
          onClick={handleMint}
          disabled={isMinting}
          className={`w-full py-2 px-4 rounded ${
            isMinting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white font-semibold transition-colors`}
        >
          {!authenticated ? 'Connect Wallet' : (isMinting ? 'Minting...' : 'Mint Now')}
        </button>
      </div>
    </div>
  );
}
