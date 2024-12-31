import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { verifyTokenSignature, decodeToken } from "@/utils/token";

interface EthereumError extends Error {
  code?: string;
  reason?: string;
  data?: unknown;
  transaction?: unknown;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, walletAddress } = body;

    console.log("API: Starting mint process", { walletAddress });

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    console.log("API: Verifying token signature");
    const isValid = await verifyTokenSignature(token);
    if (!isValid) {
      console.log("API: Token signature verification failed");
      return NextResponse.json(
        { error: "Invalid token signature" },
        { status: 401 }
      );
    }

    console.log("API: Decoding token");
    const decodedToken = await decodeToken(token);
    if (!decodedToken) {
      console.log("API: Token decoding failed");
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    console.log("API: Token decoded successfully", { decodedToken });

    const { n: serialNumber, t: collectionName, c: colorName } = decodedToken;

    // Map collection and color names to their numeric values
    const collectionMap: { [key: string]: number } = {
      CAMPLAMP: 0,
    };

    const colorMap: { [key: string]: { [key: string]: number } } = {
      HUGMUG: {
        Black: 0,
        White: 1,
        Blue: 2,
        Pink: 3,
      },
      STRAPBOX: {
        Natural: 0,
        Black: 1,
      },
      CAMPLAMP: {
        Port: 0,
      },
    };

    const collection = collectionMap[collectionName] || 0;
    const color = colorMap[collectionName]?.[colorName] || 0;

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL,
      {
        name: "Base Sepolia",
        chainId: 84532,
      }
    );

    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("Private key not configured");
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!contractAddress) {
      throw new Error("Contract address not found");
    }

    const contract = new ethers.Contract(
      contractAddress,
      [
        "function mintFor(address recipient, uint64 collection, uint64 serialNumber, uint64 color) public",
        "function getTokenId(uint64 collection, uint64 serialNumber) public pure returns (uint256)",
      ],
      wallet
    );

    console.log(provider);

    console.log("API: Minting with params:", {
      walletAddress,
      collection,
      serialNumber,
      color,
    });

    const tx = await contract.mintFor(
      walletAddress,
      collection,
      serialNumber,
      color,
      { gasLimit: 600000 }
    );

    console.log("API: Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("API: Transaction receipt:", receipt);

    let tokenId;
    try {
      // Calculate tokenId
      tokenId = await contract.getTokenId(collection, serialNumber);
    } catch (error) {
      console.error("API: Error getting tokenId:", error);
      // If we can't get the tokenId, we can calculate it ourselves since it's a pure function
      tokenId = BigInt(collection) * BigInt(2 ** 32) + BigInt(serialNumber);
    }

    return NextResponse.json({
      success: true,
      txHash: receipt.transactionHash,
      tokenId: tokenId.toString(),
    });
  } catch (error: unknown) {
    const ethError = error as EthereumError;
    console.error("API: Minting error:", {
      error,
      message: ethError.message,
      code: ethError.code,
      data: ethError.data,
      reason: ethError.reason,
      transaction: ethError.transaction,
    });

    // Check if the error is because the token already exists
    if (ethError.code === "CALL_EXCEPTION") {
      return NextResponse.json(
        { error: "Token already minted or not available" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: ethError.message }, { status: 500 });
  }
}
