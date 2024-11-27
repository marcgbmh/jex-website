export const decodeToken = (token: string) => {
  try {
    const [payload] = token.split(".");
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const payloadBuffer = Buffer.from(base64, "base64");
    const hex = payloadBuffer.toString("hex");

    const numberSection = hex.match(/a16e([0-9a-f]+?)(?:a1|$)/i);
    if (!numberSection) {
      console.error("Could not find number section");
      return null;
    }
    const numHex = numberSection[1];
    let finalNum: number;

    if (numHex.startsWith("cd")) {
      finalNum = parseInt(numHex.slice(2), 16);
    } else {
      finalNum = parseInt(numHex, 16);
    }

    const colorMatch = hex.match(/a163[a-f0-9]{2}([a-f0-9]+?)(?:a1|$)/i);
    const typeMatch = hex.match(/a174[a-f0-9]{2}([a-f0-9]+?)(?:a1|$)/i);

    if (!colorMatch || !typeMatch) {
      console.error("Failed to match pattern in hex:", hex);
      return null;
    }

    return {
      n: finalNum,
      c: Buffer.from(colorMatch[1], "hex").toString(),
      t: Buffer.from(typeMatch[1], "hex").toString(),
    };
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};
