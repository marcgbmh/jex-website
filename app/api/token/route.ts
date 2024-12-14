import { verifyTokenSignature, decodeToken } from "@/utils/token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response("Token is required", { status: 400 });
  }

  const isValid = await verifyTokenSignature(token);
  if (!isValid) {
    return new Response("Invalid token", { status: 401 });
  }

  const decodedToken = await decodeToken(token);
  return Response.json(decodedToken);
}
