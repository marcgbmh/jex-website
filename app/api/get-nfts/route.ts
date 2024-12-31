import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('address');
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  if (!walletAddress || !contractAddress) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}/getNFTs?owner=${walletAddress}&contractAddresses[]=${contractAddress}`
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return NextResponse.json({ error: 'Failed to fetch NFTs' }, { status: 500 });
  }
}
