"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Constants
enum CollectionId {
  HUGMUG = 0,
  STRAPBOX = 1,
  CAMPLAMP = 2,
}

// Types
interface DecodedToken {
  n: number;
  c: string;
  t: string;
}

interface Product {
  id: string;
  category: string;
  imageUrl: string;
  token: string;
  decodedToken?: DecodedToken;
}

interface MintButtonProps {
  product: Product;
}

// Components
const ProductImage = ({ src, alt }: { src: string; alt: string }) => (
  <div className="aspect-square relative mb-6 w-64">
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      priority
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  </div>
);

const ProductDetails = ({
  productName,
  color,
  number,
  owner,
}: {
  productName: string;
  color: string;
  number: string;
  owner?: string;
}) => (
  <div className="mb-6 space-y-1">
    <h1 className="text-2xl mb-6">{productName}</h1>
    <p>Product: {productName}</p>
    <p>Color: {color}</p>
    <p>Number: #{number}</p>
    {owner && <p>Owner: {formatAddress(owner)}</p>}
  </div>
);

const TransactionLinks = ({
  txHash,
  tokenId,
  contractAddress,
}: {
  txHash?: string;
  tokenId?: string;
  contractAddress: string;
}) => (
  <div className="flex gap-2 justify-center mt-4">
    {txHash && (
      <a
        href={`https://basescan.org/tx/${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
        aria-label="View transaction on BaseScan"
      >
        View on BaseScan
      </a>
    )}
    {tokenId && (
      <a
        href={`https://opensea.io/assets/base/${contractAddress}/${tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
        aria-label="View NFT on OpenSea"
      >
        View on OpenSea
      </a>
    )}
  </div>
);

const AddressInput = ({
  value,
  onChange,
  onSubmit,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error?: string;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder="Enter your address"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Ethereum address input"
        aria-invalid={!!error}
      />
      <Button
        onClick={onSubmit}
        className="border border-black p-2 px-4"
        aria-label="Submit address"
      >
        Enter
      </Button>
    </div>
    {error && (
      <p className="text-red-500 text-sm" role="alert">
        {error}
      </p>
    )}
  </div>
);

// Utilities
const formatProductName = (name: string): string => {
  const productNames: Record<string, string> = {
    HUGMUG: "Hugmug",
    STRAPBOX: "Strapbox",
    CAMPLAMP: "Camplamp",
  };
  return productNames[name] || name;
};

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Main Component
export default function MintButton({ product }: MintButtonProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [inputAddress, setInputAddress] = useState("");
  const [error, setError] = useState("");
  const [mintSuccess, setMintSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [tokenExists, setTokenExists] = useState(false);
  const { login, authenticated, ready, user } = usePrivy();
  const effectiveAddress = walletAddress || user?.wallet?.address;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  // Only check existence on mount
  useEffect(() => {
    if (!product?.decodedToken || !contractAddress || isMinting || mintSuccess)
      return;

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL
    );
    const contractABI = [
      "function exists(uint64 collection, uint64 serialNumber) public view returns (bool)",
      "function getTokenId(uint64 collection, uint64 serialNumber) public pure returns (uint256)",
    ];

    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );
    const collectionName = product.decodedToken.t.toUpperCase();

    if (!(collectionName in CollectionId)) {
      console.error("Invalid collection name:", collectionName);
      return;
    }

    const collectionId =
      CollectionId[collectionName as keyof typeof CollectionId];
    const serialNumber = Number(product.decodedToken.n);

    contract
      .exists(collectionId, serialNumber)
      .then(async (exists) => {
        if (exists) {
          setTokenExists(true);
          const tokenId = await contract.getTokenId(collectionId, serialNumber);
          setTokenId(tokenId.toString());
        }
      })
      .catch(console.error);
  }, [contractAddress, isMinting, mintSuccess, product.decodedToken]);

  // Set token state on mint success
  useEffect(() => {
    if (mintSuccess && effectiveAddress) {
      setTokenExists(true);
    }
  }, [mintSuccess, effectiveAddress]);

  const handleMint = async () => {
    if (!authenticated && !walletAddress) {
      login();
      return;
    }

    setIsMinting(true);
    setError("");

    try {
      const mintWalletAddress = effectiveAddress;
      if (!mintWalletAddress) {
        throw new Error("No wallet address available");
      }

      const response = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: product.token,
          walletAddress: mintWalletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 400 &&
          data.error === "Token already minted or not available"
        ) {
          // Only set tokenExists if we're not already in a success state
          if (!mintSuccess) {
            setTokenExists(true);
            throw new Error("This item has already been claimed");
          }
        }
        throw new Error(data.error || "Failed to mint");
      }

      // Clear any existing states and set success
      setTokenExists(false);
      setError("");
      setMintSuccess(true);
      setTxHash(data.txHash);
      if (data.tokenId) setTokenId(data.tokenId);
    } catch (error) {
      console.error("Mint error:", error);
      setError(error instanceof Error ? error.message : "Failed to mint");
    } finally {
      setIsMinting(false);
    }
  };

  const handleAddressSubmit = () => {
    try {
      if (ethers.isAddress(inputAddress)) {
        setWalletAddress(inputAddress);
        setError("");
      } else {
        setError("Please enter valid Ethereum address");
      }
    } catch {
      setError("Please enter valid Ethereum address");
    }
  };

  const handleAddressClick = () => {
    setWalletAddress("");
    setInputAddress("");
  };

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        role="status"
      >
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  const productName = product.decodedToken?.t
    ? formatProductName(product.decodedToken.t)
    : "";

  return (
    <div className="min-h-[90vh] flex items-center justify-center flex-col">
      <div className="flex  gap-8 w-full max-w-md items-center mx-auto">
        <ProductImage src={product.imageUrl} alt={productName} />
        <div>
          <ProductDetails
            productName={productName}
            color={product.decodedToken?.c ?? ""}
            number={product.decodedToken?.n?.toString() ?? ""}
            owner={mintSuccess ? effectiveAddress : undefined}
          />
          {mintSuccess && (
            <TransactionLinks
              txHash={txHash}
              tokenId={tokenId}
              contractAddress={contractAddress ?? ""}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2 w-full max-w-md mx-auto">
        {mintSuccess ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="font-medium text-xl mb-2">Congratulations!</h3>
              <p className="text-gray-700 mb-4">
                Your item has been successfully claimed.
              </p>
              <TransactionLinks
                txHash={txHash}
                tokenId={tokenId}
                contractAddress={contractAddress ?? ""}
              />
            </div>
          </div>
        ) : tokenExists ? (
          <div>
            <p>Object has already been claimed.</p>
            <TransactionLinks
              tokenId={tokenId}
              contractAddress={contractAddress ?? ""}
            />
          </div>
        ) : !authenticated && !walletAddress ? (
          <div>
            <p className=" mb-4">Enter address or login to claim</p>
            <div className="flex flex-col gap-4">
              <AddressInput
                value={inputAddress}
                onChange={(value) => {
                  setInputAddress(value);
                  setError("");
                }}
                onSubmit={handleAddressSubmit}
                error={error}
              />
              <p className="text-center">or</p>
              <Button
                onClick={login}
                className="border border-black p-2 px-4"
                aria-label="Login with wallet"
              >
                Login
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-medium mb-4">
              Claim to{" "}
              <button
                className="hover:opacity-50 cursor-pointer transition-opacity"
                onClick={handleAddressClick}
                aria-label="Change address"
              >
                {formatAddress(effectiveAddress ?? "")}
              </button>
            </p>
            <Button
              onClick={handleMint}
              className="border border-black p-2 px-4 w-full"
              disabled={isMinting}
              aria-busy={isMinting}
            >
              {isMinting ? "Claiming..." : "Claim"}
            </Button>
            {error && (
              <p className="text-red-500 text-sm mt-2" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
