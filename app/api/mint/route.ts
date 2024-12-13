import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { verifyTokenSignature, decodeToken } from "@/utils/token";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, walletAddress } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    console.log("Received token:", token);

    // Verify token signature first
    if (!verifyTokenSignature(token)) {
      return NextResponse.json(
        { error: "Invalid token signature" },
        { status: 401 }
      );
    }

    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    const { n: serialNumber, t: collectionName, c: colorName } = decodedToken;

    // Map collection and color names to their numeric values
    const collectionMap: { [key: string]: number } = {
      HUGMUG: 0,
      STRAPBOX: 1,
      CAMPLAMP: 2,
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
      ],
      wallet
    );

    console.log(provider);

    const tx = await contract.mintFor(
      walletAddress,
      collection,
      serialNumber,
      color,
      { gasLimit: 600000 }
    );

    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.transactionHash,
    });
  } catch (error: Error | ethers.ErrorDescription | unknown) {
    console.error("Minting error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mint" },
      { status: 500 }
    );
  }
}
