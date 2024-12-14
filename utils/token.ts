import { createHmac } from "crypto";

function base64Decode(data: string): Buffer {
  const padding = 4 - (data.length % 4);
  const paddedData = data + "=".repeat(padding);
  return Buffer.from(paddedData, "base64url");
}

async function sign(packedData: Buffer, secret: string): Promise<Buffer> {
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(packedData);
    return hmac.digest();
  } catch (error) {
    console.error("Error in sign function:", error);
    throw error;
  }
}

export const verifyTokenSignature = async (token: string): Promise<boolean> => {
  try {
    console.log("Environment check:", {
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      secretLength: process.env.JWT_SECRET?.length,
    });

    const [encodedData, encodedSignature] = token.split(".");
    if (!encodedData || !encodedSignature) {
      console.log("Token verification failed: Invalid token format");
      return false;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.log("Token verification failed: JWT_SECRET not configured");
      return false;
    }

    // Decode the base64url data
    const packedData = base64Decode(encodedData);
    const providedSignature = base64Decode(encodedSignature);

    // Calculate expected signature
    const expectedSignature = await sign(packedData, secret);
    const expectedSignatureBuffer = expectedSignature.subarray(0, 16);

    // Compare signatures using timing-safe comparison
    const isValid = expectedSignatureBuffer.equals(providedSignature);
    console.log("Token verification details:", {
      hasEncodedData: !!encodedData,
      hasEncodedSignature: !!encodedSignature,
      signatureLength: providedSignature.length,
      expectedLength: expectedSignatureBuffer.length,
      encodedDataLength: encodedData.length,
      isValid,
    });
    console.log("Token verification result:", isValid);
    return isValid;
  } catch (error) {
    console.log("Token verification failed with error:", error);
    return false;
  }
};

export const decodeToken = async (token: string) => {
  try {
    if (!(await verifyTokenSignature(token))) return null;

    const [payload] = token.split(".");
    const packedData = base64Decode(payload);

    const hex = packedData.toString("hex");

    const numberSection = hex.match(/a16e([0-9a-f]+?)(?:a1|$)/i);
    if (!numberSection) return null;

    const numHex = numberSection[1];
    let finalNum: number;

    if (numHex.startsWith("cd")) {
      finalNum = parseInt(numHex.slice(2), 16);
    } else {
      finalNum = parseInt(numHex, 16);
    }

    const colorMatch = hex.match(/a163[a-f0-9]{2}([a-f0-9]+?)(?:a1|$)/i);
    const typeMatch = hex.match(/a174[a-f0-9]{2}([a-f0-9]+?)(?:a1|$)/i);

    if (!colorMatch || !typeMatch) return null;

    return {
      n: finalNum,
      c: Buffer.from(colorMatch[1], "hex").toString(),
      t: Buffer.from(typeMatch[1], "hex").toString(),
    };
  } catch {
    return null;
  }
};
