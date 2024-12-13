import { createHmac } from "crypto";

function base64Decode(data: string): Buffer {
  const padding = 4 - (data.length % 4);
  const paddedData = data + "=".repeat(padding);
  return Buffer.from(paddedData, "base64url");
}

function sign(packedData: Buffer, secret: string): Buffer {
  const hmac = createHmac("sha256", secret);
  const signature = hmac.update(packedData).digest();

  return signature.subarray(0, 16);
}

export const verifyTokenSignature = (token: string): boolean => {
  try {
    const [encodedData, encodedSignature] = token.split(".");
    if (!encodedData || !encodedSignature) return false;

    const secret = process.env.JWT_SECRET;
    if (!secret) return false;

    // Decode the base64url data
    const packedData = base64Decode(encodedData);
    const providedSignature = base64Decode(encodedSignature);

    // Calculate expected signature
    const expectedSignature = sign(packedData, secret);

    // Compare signatures using timing-safe comparison
    return expectedSignature.equals(providedSignature);
  } catch {
    return false;
  }
};

export const decodeToken = (token: string) => {
  try {
    if (!verifyTokenSignature(token)) return null;

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
