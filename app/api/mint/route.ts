import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { decodeToken, verifyTokenSignature } from "../token/route";

const WALLET_ADDRESS = "0x9B8082423Cca2c0ddcf447A765890b6FD0a6069a";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Verify token signature first
    if (!verifyTokenSignature(token)) {
      return NextResponse.json({ error: "Invalid token signature" }, { status: 401 });
    }

    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    const { n: serialNumber, t: collection, c: color } = decodedToken;

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
      WALLET_ADDRESS,
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
  } catch (error: any) {
    console.error("Minting error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mint" },
      { status: 500 }
    );
  }
}
