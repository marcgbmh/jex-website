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

interface ProductDetailsProps {
  productName: string;
  productCategory: string;
  productColor: string;
  hideColor: boolean;
}

// Components
const ProductImage = ({ src, alt }: { src: string; alt: string }) => (
  <div className="aspect-square relative mb-6 w-full sm:w-64 sm:mr-4 p-4 sm:p-0">
    <Image
      src={src}
      alt={alt}
      fill
      className="object-contain"
      priority
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  </div>
);

const ProductDetails = ({
  productName,
  productColor,
  hideColor,
}: ProductDetailsProps) => (
  <div className="mb-6 space-y-2 sm:space-y-1">
    <h1 className="text-2xl mb-6">{productName}</h1>
    {!hideColor && productColor && (
      <p className="text-lg sm:text-base">Color: {productColor}</p>
    )}
    <p className="text-lg sm:text-base">
      Contract:{" "}
      <a
        href={`https://basescan.org/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-50 transition-opacity underline break-all"
      >
        {formatAddress(
          process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
            "Contract address not found"
        )}
      </a>
    </p>
  </div>
);

const TransactionLinks = ({ tokenId }: { tokenId?: string }) => {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  return (
    <div className="flex flex-col gap-2">
      <a
        href={`https://opensea.io/assets/base/${contractAddress}/${tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        View on OpenSea
      </a>
      <a
        href={`https://basescan.org/address/${contractAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        View on BaseScan
      </a>
    </div>
  );
};

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
        placeholder="Enter your wallet address"
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
    HUGMUG: "Hug Mug",
    STRAPBOX: "Strap Box",
    CAMPLAMP: "Camp Lamp",
    // Add any new two-word products here following the same pattern
  };
  // First check if we have a direct mapping
  if (productNames[name]) {
    return productNames[name];
  }
  // If no direct mapping, try to split camelCase or uppercase words
  return name.replace(/([A-Z])/g, " $1").trim();
};

const formatAddress = (address: string) => {
  if (!address) return "No address available";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Main Component
export default function MintButton({ product }: MintButtonProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [inputAddress, setInputAddress] = useState("");
  const [error, setError] = useState("");
  const [mintSuccess, setMintSuccess] = useState(false);
  const [tokenId, setTokenId] = useState<string>();
  const [tokenExists, setTokenExists] = useState(false);
  const { login, authenticated, ready, user } = usePrivy();

  console.log("User wallet:", user?.wallet?.address);
  console.log("Input Address:", inputAddress);

  const effectiveAddress = user?.wallet?.address || inputAddress;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const decodedToken = product.decodedToken;

  useEffect(() => {
    console.log("Product category:", product.category);
    console.log("Product color:", decodedToken?.c);
    // Don't run existence check right after minting
    if (!decodedToken?.t || !contractAddress || isMinting) {
      return;
    }

    // Add a delay if we just completed minting
    const delay = mintSuccess ? 2000 : 0;

    const checkExistence = async () => {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );
      const contractABI = [
        "function exists(uint64 collection, uint64 serialNumber) public view returns (bool)",
        "function ownerOf(uint256 tokenId) public view returns (address)",
        "function getTokenId(uint64 collection, uint64 serialNumber) public pure returns (uint256)",
      ];

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );
      const collectionName = decodedToken.t.toUpperCase();

      if (!(collectionName in CollectionId)) {
        console.error("Invalid collection name:", collectionName);
        return;
      }

      const collectionId =
        CollectionId[collectionName as keyof typeof CollectionId];
      const serialNumber = Number(decodedToken.n);

      try {
        const exists = await contract.exists(collectionId, serialNumber);
        if (exists && !mintSuccess) {
          setTokenExists(true);
          const tokenId = await contract.getTokenId(collectionId, serialNumber);
          setTokenId(tokenId.toString());
          await contract.ownerOf(tokenId);
        }
      } catch (error) {
        console.error(error);
      }
    };

    setTimeout(checkExistence, delay);
  }, [
    contractAddress,
    isMinting,
    mintSuccess,
    decodedToken?.t,
    product.category,
  ]);

  useEffect(() => {
    if (mintSuccess && effectiveAddress) {
      setTokenExists(true);
    }
  }, [mintSuccess, effectiveAddress]);

  const handleMint = async () => {
    if (!authenticated) {
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
          walletAddress: mintWalletAddress,
          token: product.token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to mint");
      }

      const { tokenId: newTokenId } = await response.json();
      setTokenId(newTokenId);
      setMintSuccess(true);
      setTokenExists(true);
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
        setInputAddress("");
        setError("");
      } else {
        setError("Please enter valid Ethereum address");
      }
    } catch {
      setError("Please enter valid Ethereum address");
    }
  };

  const handleAddressClick = () => {
    setMintSuccess(false);
    setTokenExists(false);
    setInputAddress("");
    setError("");
    setTokenId(undefined);
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

  const productName = decodedToken ? formatProductName(decodedToken.t) : "";

  return (
    <div className="w-full min-h-[90vh] flex flex-col justify-between sm:justify-center">
      <div className="w-full flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-lg mx-auto p-4 sm:p-0">
          <div className="w-full flex flex-col sm:flex-row sm:gap-8 items-center mb-6">
            <div className="w-full sm:w-auto order-2 sm:order-1">
              <ProductDetails
                productName={productName}
                productCategory={product.category}
                productColor={decodedToken?.c ?? ""}
                hideColor={decodedToken?.t === "CAMPLAMP"}
              />
            </div>
            <ProductImage src={product.imageUrl} alt={productName} />
          </div>
          <div className="w-full hidden sm:block">
            {mintSuccess ? (
              <div className="w-full text-center">
                <div className="w-full bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200">
                  <h3 className="font-medium text-lg sm:text-xl mb-2">
                    Congratulations!
                  </h3>
                  <p className="text-gray-700 mb-4 text-sm sm:text-base">
                    Your item has been successfully minted.
                  </p>
                  <TransactionLinks tokenId={tokenId} />
                </div>
              </div>
            ) : tokenExists ? (
              <div className="w-full">
                <p className="w-full text-sm sm:text-base mb-2">
                  Object has been minted!
                </p>
                <TransactionLinks tokenId={tokenId} />
              </div>
            ) : !authenticated ? (
              <div className="w-full">
                <p className="w-full mb-2 text-sm sm:text-base">
                  Enter wallet address or connect to mint
                </p>
                <div className="w-full flex flex-col gap-2">
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
                    className="w-full"
                    aria-label="Connect with wallet"
                  >
                    Connect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <p className="w-full font-medium mb-2 text-sm sm:text-base">
                  Mint to{" "}
                  <button
                    onClick={handleAddressClick}
                    className="break-all font-normal hover:opacity-50 transition-opacity underline"
                  >
                    {formatAddress(effectiveAddress)}
                  </button>
                </p>
                <Button
                  onClick={handleMint}
                  className="w-full"
                  disabled={isMinting}
                  aria-busy={isMinting}
                >
                  {isMinting ? "Minting..." : "Mint"}
                </Button>
                {error && (
                  <p
                    className="w-full text-red-500 text-sm mt-2 break-words"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="w-full sm:hidden flex justify-center w-full">
        {mintSuccess ? (
          <div className="w-full text-center">
            <div className="w-full bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200">
              <h3 className="font-medium text-lg sm:text-xl mb-2">
                Congratulations!
              </h3>
              <p className="text-gray-700 mb-4 text-sm sm:text-base">
                Your item has been successfully minted.
              </p>
              <TransactionLinks tokenId={tokenId} />
            </div>
          </div>
        ) : tokenExists ? (
          <div className="w-full">
            <p className="w-full text-sm sm:text-base mb-2 px-4">
              Object has already been minted.
            </p>
            <div className="w-full flex flex-col gap-2 p-4">
              <TransactionLinks tokenId={tokenId} />
            </div>
          </div>
        ) : !authenticated ? (
          <div className="w-full p-4">
            <p className="w-full mb-2 text-sm sm:text-base">
              Enter address or login to mint
            </p>
            <div className="w-full flex flex-col gap-2">
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
                className="w-full border border-black"
                aria-label="Connect with wallet"
              >
                Connect
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full p-4 sm:p-0 ">
            <p className="w-full font-medium mb-2 text-sm sm:text-base ">
              Mint to{" "}
              <button
                onClick={handleAddressClick}
                className="break-all font-normal hover:opacity-50 transition-opacity underline"
              >
                {formatAddress(effectiveAddress)}
              </button>
            </p>
            <Button
              onClick={handleMint}
              className="w-full"
              disabled={isMinting}
              aria-busy={isMinting}
            >
              {isMinting ? "Minting..." : "Mint"}
            </Button>
            {error && (
              <p
                className="w-full text-red-500 text-sm mt-2 break-words"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
