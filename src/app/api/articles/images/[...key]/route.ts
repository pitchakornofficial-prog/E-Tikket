import { NextResponse } from "next/server";
import { getPrivateArtifact } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ key: string[] }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  if (!key) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const artifact = await getPrivateArtifact(key);

    if (!artifact) {
      return new NextResponse("Image Not Found", { status: 404 });
    }

    return new NextResponse(new Uint8Array(artifact.data), {
      status: 200,
      headers: {
        "Content-Type": artifact.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve article image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
