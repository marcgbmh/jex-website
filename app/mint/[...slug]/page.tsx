import MintButton from "./mint-button";
import { verifyTokenSignature, decodeToken } from "@/utils/token";
import { Metadata } from "next";

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
  decodedToken?: {
    n: number;
    c: string;
    t: string;
  };
  token: string;
}

const parseProductFromUrl = async (slug: string[]): Promise<Product | null> => {
  try {
    // Get the token from the URL
    const token = slug[0];
    if (!token) return null;

    // Server-side token verification
    if (!verifyTokenSignature(token)) {
      return null;
    }

    // Decode the token
    const decoded = decodeToken(token);
    if (!decoded) return null;

    // Create product info from decoded data
    return {
      id: `${decoded.t}-${decoded.c}-${decoded.n.toString().padStart(6, "0")}`,
      category: decoded.c,
      imageUrl: `/products/${decoded.t}.png`,
      decodedToken: decoded,
      token: token,
    };
  } catch (error) {
    console.error("Error parsing product:", error);
    return null;
  }
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Promise<Metadata> {
  const product = await parseProductFromUrl(params.slug);

  if (!product || !product.decodedToken) {
    return {
      title: "Invalid Product - Jex",
    };
  }

  const productName = formatProductName(product.decodedToken.t);
  return {
    title: `${productName} - Jex`,
  };
}

export default async function MintPage({
  params,
}: {
  params: { slug: string[] };
}) {
  const product = await parseProductFromUrl(params.slug);

  if (!product) {
    return (
      <div className="h-[90vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">
            Something went wrong.
          </h1>
          <p className="text-black">
            This token appears to be invalid or tampered with.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <MintButton product={product} />
    </div>
  );
}
