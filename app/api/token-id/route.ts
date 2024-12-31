import { NextResponse } from "next/server";

async function getNFTsForContract(contractAddress: string) {
  const baseURL = "https://base-sepolia.g.alchemy.com/nft/v3";
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error("Alchemy API key not configured");
  }

  const response = await fetch(
    `${baseURL}/${apiKey}/getNFTsForContract?contractAddress=${contractAddress}&withMetadata=true`,
    {
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.statusText}`);
  }

  return response.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get("serialNumber");
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!serialNumber || !contractAddress) {
      return new Response("Missing required parameters", { status: 400 });
    }

    const nftsData = await getNFTsForContract(contractAddress);
    
    // Find the NFT with matching serial number in traits
    const matchingNFT = nftsData.nfts.find((nft: any) => {
      const traits = nft.raw.metadata?.attributes || [];
      return traits.some((trait: any) => 
        trait.trait_type.toLowerCase() === "number" && 
        trait.value.toString() === serialNumber
      );
    });

    if (!matchingNFT) {
      return new Response("NFT not found", { status: 404 });
    }

    // Extract the token ID from the token URI or ID
    const tokenId = matchingNFT.tokenId;

    return Response.json({ tokenId });
  } catch (error) {
    console.error("Error fetching token ID:", error);
    return new Response("Error fetching token ID", { status: 500 });
  }
}
