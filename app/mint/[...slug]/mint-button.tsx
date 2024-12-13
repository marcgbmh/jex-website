"use client";

import Image from "next/image";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/utils";

const formatProductName = (name: string): string => {
  const productNames: { [key: string]: string } = {
    HUGMUG: "Hugmug",
    STRAPBOX: "Strapbox",
    CAMPLAMP: "Camplamp",
  };
  return productNames[name] || name;
};

interface Product {
  id: string;
  category: string;
  imageUrl: string;
  token: string;
  decodedToken?: {
    n: number;
    c: string;
    t: string;
  };
}

export default function MintButton({ product }: { product: Product }) {
  const [isMinting, setIsMinting] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [inputAddress, setInputAddress] = useState("");
  const [error, setError] = useState("");
  const [mintSuccess, setMintSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [tokenId, setTokenId] = useState("");
  const { login, authenticated, ready, user } = usePrivy();

  // Get the effective address - prioritize manual input over connected wallet
  const effectiveAddress = walletAddress || user?.wallet?.address;

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleMint = async () => {
    if (!authenticated && !walletAddress) {
      login();
      return;
    }

    setIsMinting(true);
    try {
      console.log("Sending token:", product.token);

      const response = await fetch("/api/mint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: product.token,
          walletAddress: authenticated ? user?.wallet?.address : walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mint");
      }

      // Success!
      setMintSuccess(true);
      setTxHash(data.txHash);
      setTokenId(data.tokenId);
      setIsMinting(false);
    } catch (error: any) {
      console.error("Minting error:", error);
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
    } catch (e) {
      setError("Please enter valid Ethereum address");
    }
  };

  const handleAddressClick = () => {
    setWalletAddress("");
    setInputAddress("");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center flex-col">
      <div className="">
        <div className="flex items-center justify-center gap-8 ">
          <div>
            <div className="aspect-square relative mb-6 w-64">
              <Image
                src={product.imageUrl}
                alt={product.id}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl mb-6">
              {product.decodedToken?.t
                ? formatProductName(product.decodedToken.t)
                : ""}
            </h1>
            <div className="mb-6 space-y-1 ">
              <p>
                Product:{" "}
                {product.decodedToken?.t
                  ? formatProductName(product.decodedToken.t)
                  : ""}
              </p>
              <p>Color: {product.decodedToken?.c ?? ""}</p>
              <p>Number: #{product.decodedToken?.n ?? ""}</p>
              {mintSuccess && (
                <>
                  <p>Owner: {formatAddress(effectiveAddress ?? "")}</p>
                  <div className="mt-4">
                    <p className="font-bold text-green-600 mb-2">
                      Congratulations! 🎉
                    </p>
                    <div className="space-y-2">
                      {txHash && (
                        <a
                          href={`https://etherscan.io/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block"
                        >
                          View on Etherscan
                        </a>
                      )}
                      {tokenId && (
                        <a
                          href={`https://opensea.io/assets/ethereum/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}/${tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block"
                        >
                          View on OpenSea
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className=" flex flex-col gap-4 w-full">
          {!authenticated && !walletAddress ? (
            <div className="flex flex-col gap-4 ">
              <p className="font-medium">Claim</p>
              <div className="flex gap-2 flex-col">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter your address"
                    value={inputAddress}
                    onChange={(e) => {
                      setInputAddress(e.target.value);
                      setError("");
                    }}
                  />
                  <Button
                    onClick={handleAddressSubmit}
                    className="border border-black p-2 px-4"
                  >
                    Enter
                  </Button>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
              <p className="text-center">or</p>
              <Button onClick={login} className="border border-black p-2 px-4 ">
                Login
              </Button>
            </div>
          ) : (
            <div>
              <p className="font-medium mb-4">
                Claim to{" "}
                <span
                  className="hover:opacity-50 cursor-pointer transition-opacity"
                  onClick={handleAddressClick}
                >
                  {formatAddress(effectiveAddress ?? "")}
                </span>
              </p>
              <Button
                onClick={handleMint}
                className="border border-black p-2 px-4 w-full"
              >
                {isMinting ? "Claiming..." : `Claim`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
