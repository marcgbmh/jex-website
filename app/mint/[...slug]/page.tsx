"use server";

import Image from "next/image";
import MintButton from "./mint-button";
import { verifyTokenSignature, decodeToken } from "../../api/token/route";

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
      throw new Error("FABRICATED_TOKEN");
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
    if (error instanceof Error && error.message === "FABRICATED_TOKEN") {
      throw error;
    }
    return null;
  }
};

export default async function MintPage({
  params,
}: {
  params: { slug: string[] };
}) {
  let error = null;
  let product = null;

  try {
    product = await parseProductFromUrl(params.slug);
  } catch (e) {
    if (e instanceof Error && e.message === "FABRICATED_TOKEN") {
      error = "FABRICATED_TOKEN";
    }
  }

  if (error === "FABRICATED_TOKEN") {
    return (
      <div className="h-[90vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">
            Something went wrong.
          </h1>
          <p className="text-black">
            This token appears to be fabricated or tampered with.
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="h-[90vh] flex items-center justify-center">
        <p className="text-lg">Invalid product ID</p>
      </div>
    );
  }

  return <MintButton product={product} />;
}
