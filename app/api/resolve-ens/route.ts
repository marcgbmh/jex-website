import { NextResponse } from 'next/server';
import { JsonRpcProvider } from 'ethers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const address = searchParams.get('address');
  const input = query || address;

  if (!input) {
    return NextResponse.json({ error: 'Query or address parameter is required' }, { status: 400 });
  }

  try {
    const provider = new JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    );

    // Check if the input looks like an Ethereum address
    const isAddress = input.startsWith('0x') && input.length === 42;

    if (isAddress) {
      // Resolve address to ENS name
      const name = await provider.lookupAddress(input);
      return NextResponse.json({ name, address: input });
    } else {
      // Resolve ENS name to address
      const address = await provider.resolveName(input);
      return NextResponse.json({ name: input, address });
    }
  } catch (error) {
    console.error('Error resolving ENS:', error);
    return NextResponse.json({ error: 'Failed to resolve ENS' }, { status: 500 });
  }
}
