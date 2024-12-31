"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { JsonRpcProvider } from "ethers";
import Image from "next/image";

// Types for NFTs
interface NFT {
  title: string;
  tokenId: string;
  imageUrl: string;
}

export default function AccountPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const [ensName, setEnsName] = useState<string | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveEns = async () => {
      if (!walletAddress) return;
      try {
        console.log("Resolving ENS for address:", walletAddress);
        const response = await fetch(
          `/api/resolve-ens?address=${walletAddress}`
        );
        const data = await response.json();
        console.log("ENS lookup result:", data);
        if (data.name) setEnsName(data.name);
      } catch (error) {
        console.error("Error resolving ENS:", error);
      }
    };

    resolveEns();
  }, [walletAddress]);

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!walletAddress) return;
      try {
        const response = await fetch(`/api/get-nfts?address=${walletAddress}`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        console.log("NFT data from Alchemy:", data.ownedNfts[0]);

        const formattedNFTs = data.ownedNfts.map(
          (nft: {
            title: string;
            id: { tokenId: string };
            media: Array<{ gateway: string }>;
          }) => ({
            title: nft.title,
            tokenId: parseInt(nft.id.tokenId, 16).toString(),
            imageUrl: nft.media[0]?.gateway || "/placeholder.png",
          })
        );

        setNfts(formattedNFTs);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [walletAddress]);

  const formatAddress = (address: string | undefined) => {
    if (!address) return "No wallet connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <main className="flex min-h-screen flex-col mt-8 p-4 bg-background">
      <h1 className="text-3xl font-bold text-center mb-4">
        {ensName || formatAddress(walletAddress)}
      </h1>
      <p className="text-center mb-16 text-gray-500">
        {ensName && formatAddress(walletAddress)}
      </p>
      {loading ? (
        <div className="text-center">Loading NFTs...</div>
      ) : (
        <div className="grid grid-cols-1 gap-8 max-w-6xl mx-auto px-4">
          {nfts.length > 0 ? (
            nfts.map((nft) => (
              <div
                key={`${nft.tokenId}-${nft.title}`}
                className="overflow-hidden"
              >
                <div className="aspect-square relative w-80">
                  <a
                    href={`https://testnets.opensea.io/assets/base_sepolia/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}/${nft.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <Image
                      src={nft.imageUrl}
                      alt={nft.title}
                      priority={true}
                      fill
                      className="object-cover"
                    />
                  </a>
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold">{nft.title}</h3>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500">
              No JEX NFTs owned yet
            </div>
          )}
        </div>
      )}
    </main>
  );
}
