"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Constants

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
  <div className="mb-6">
    <h1 className="text-2xl mb-2 sm:mb-6">{productName}</h1>
    <div className="space-y-2 sm:space-y-1">
      {!hideColor && productColor && (
        <p className="text-base">Color: {productColor}</p>
      )}
      <p className="text-base">
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
  </div>
);

const TransactionLinks = ({ serialNumber }: { serialNumber?: number }) => {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const [tokenId, setTokenId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTokenId = async () => {
      try {
        const response = await fetch(
          `/api/token-id?serialNumber=${serialNumber}`
        );
        if (response.ok) {
          const data = await response.json();
          setTokenId(data.tokenId);
        }
      } catch (error) {
        console.error("Error fetching token ID:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (serialNumber) {
      fetchTokenId();
    } else {
      setIsLoading(false);
    }
  }, [serialNumber]);

  if (!contractAddress) {
    throw new Error("Contract address not configured");
  }

  if (!serialNumber) {
    return null;
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading links...</div>;
  }

  if (!tokenId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={`https://testnets.opensea.io/assets/base_sepolia/${contractAddress}/${tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        View on OpenSea
      </a>
      <a
        href={`https://sepolia.basescan.org/token/${contractAddress}?a=${tokenId}`}
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
        placeholder="Enter your wallet address or ENS name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        aria-label="Ethereum address or ENS name input"
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
  const [validatedInput, setValidatedInput] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [tokenExists, setTokenExists] = useState(false);
  const { login, authenticated, ready, user } = usePrivy();

  console.log("User wallet:", user?.wallet?.address);
  console.log("Input Address:", inputAddress);

  const effectiveAddress = user?.wallet?.address || inputAddress;

  const resolveENS = async (input: string) => {
    if (!input) return null;

    try {
      const response = await fetch(
        `/api/resolve-ens?query=${encodeURIComponent(input)}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data.address;
    } catch (error) {
      console.error("ENS resolution error:", error);
      throw error;
    }
  };

  const handleRecipientChange = (value: string) => {
    setInputAddress(value);
    setValidatedInput(false);
    setError("");
  };

  const handleAddressSubmit = async () => {
    if (!inputAddress) return;

    try {
      // For regular Ethereum addresses
      if (ethers.isAddress(inputAddress)) {
        setValidatedInput(true);
        return;
      }

      // For ENS names
      if ((inputAddress as string).includes(".")) {
        const address = await resolveENS(inputAddress);
        if (address) {
          setInputAddress(address);
          setValidatedInput(true);
          return;
        }
      }

      setError("Invalid address or ENS name");
    } catch (error) {
      console.error("Error submitting address:", error);
      setError("Failed to resolve address");
    }
  };

  const handleAddressClick = () => {
    setValidatedInput(false);
  };

  useEffect(() => {
    console.log("Product category:", product.category);
    console.log("Product color:", product.decodedToken?.c);

    // Only run existence check on initial load
    if (!product.decodedToken?.t || !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
      return;
    }

    const checkExistence = async () => {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );
      const contractABI = [
        "function exists(uint64 collection, uint64 serialNumber) public view returns (bool)",
        "function ownerOf(uint256 tokenId) public view returns (address)",
        "function getTokenId(uint64 collection, uint64 serialNumber) public pure returns (uint256)",
      ];

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error("Contract address not configured");
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );
      if (!product.decodedToken) {
        console.error("Decoded token is missing");
        return;
      }

      const collectionMap: { [key: string]: number } = {
        CAMPLAMP: 0,
      };

      const collectionName = product.decodedToken.t.toUpperCase();
      const collectionId = collectionMap[collectionName];

      if (collectionId === undefined) {
        console.error("Invalid collection name:", collectionName);
        return;
      }

      const serialNumber = Number(product.decodedToken.n);

      try {
        const exists = await contract.exists(collectionId, serialNumber);
        if (exists) {
          setTokenExists(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    checkExistence();
  }, [product.decodedToken, product.category]);

  const handleMint = async () => {
    if (!effectiveAddress) {
      if (!authenticated) {
        login();
        return;
      }
      throw new Error("No wallet address available");
    }

    setIsMinting(true);
    setError("");

    try {
      const response = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: effectiveAddress,
          token: product.token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mint");
      }

      setMintSuccess(true);
      setTokenExists(true);
    } catch (error) {
      console.error("Mint error:", error);
      if (error instanceof Error) {
        if (error.message.includes("already minted")) {
          setTokenExists(true);
        }
        setError(error.message);
      } else {
        setError("Failed to mint");
      }
    } finally {
      setIsMinting(false);
    }
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

  const productName = product.decodedToken
    ? formatProductName(product.decodedToken.t)
    : "";

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col sm:justify-center">
      <div className="w-full flex-1 sm:flex-initial flex flex-col items-center justify-start sm:justify-center overflow-y-auto">
        <div className="w-full max-w-lg mx-auto p-4 sm:p-0">
          <div className="w-full flex flex-col sm:flex-row sm:gap-4 items-start sm:items-center">
            <ProductImage src={product.imageUrl} alt={productName} />
            <div className="w-full sm:w-auto">
              <ProductDetails
                productName={productName}
                productCategory={product.category}
                productColor={product.decodedToken?.c ?? ""}
                hideColor={product.decodedToken?.t === "CAMPLAMP"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full sticky bottom-0 bg-white p-4 sm:static shadow-t-sm border-t sm:border-0 sm:bg-transparent sm:p-0">
        <div className="w-full max-w-lg mx-auto">
          {mintSuccess ? (
            <div className="w-full">
              <div className="w-full rounded-lg">
                <h3 className="font-medium text-lg sm:text-xl mb-2">
                  Congratulations!
                </h3>
                <p className="mb-4 text-sm sm:text-base">
                  Your {productName} has been minted to your wallet.
                </p>
                <TransactionLinks serialNumber={product.decodedToken?.n} />
              </div>
            </div>
          ) : tokenExists && !mintSuccess ? (
            <div className="w-full">
              <div className="w-full rounded-lg">
                <p className="mb-4 text-sm sm:text-base">
                  {productName} has been minted.
                </p>
                <TransactionLinks serialNumber={product.decodedToken?.n} />
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4">
              <div className="w-full">
                {authenticated || validatedInput ? (
                  <div className="w-full">
                    <p className="w-full mb-2 text-sm sm:text-base">
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
                    >
                      {isMinting ? "Minting..." : "Mint"}
                    </Button>
                    {error && (
                      <p className="text-red-500 text-sm mt-2" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="w-full flex flex-col gap-4">
                      <AddressInput
                        value={inputAddress}
                        onChange={handleRecipientChange}
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
