import { NextResponse } from 'next/server';
import { JsonRpcProvider } from 'ethers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const provider = new JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    );
    const name = await provider.lookupAddress(address);
    return NextResponse.json({ name });
  } catch (error) {
    console.error('Error resolving ENS:', error);
    return NextResponse.json({ error: 'Failed to resolve ENS name' }, { status: 500 });
  }
}
