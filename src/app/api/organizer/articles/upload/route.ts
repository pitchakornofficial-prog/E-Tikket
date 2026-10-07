import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { putPrivateArtifact } from "@/lib/storage";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isAllowedImageType(mimeType: string, buffer: Buffer): boolean {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return false;
  }

  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const riff = buffer.toString("ascii", 0, 4);
    const webp = buffer.toString("ascii", 8, 12);
    return riff === "RIFF" && webp === "WEBP";
  }

  return false;
}

export async function POST(request: Request) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: { message: "กรุณาแนบไฟล์รูปภาพ" } },
        { status: 400 },
      );
    }

    // AC-28: Check file size (< 5MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            message: `ขนาดไฟล์เกินกำหนด (สูงสุด 5 MB) ไฟล์ปัจจุบันมีขนาด ${(
              file.size /
              (1024 * 1024)
            ).toFixed(2)} MB`,
          },
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // AC-28: Validate MIME type and magic bytes (JPEG, PNG, WebP)
    if (!isAllowedImageType(file.type, buffer)) {
      return NextResponse.json(
        {
          error: {
            message: "รองรับเฉพาะไฟล์รูปภาพประเภท JPEG, PNG และ WebP เท่านั้น",
          },
        },
        { status: 400 },
      );
    }

    let ext = "jpg";
    if (file.type === "image/png") ext = "png";
    if (file.type === "image/webp") ext = "webp";

    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const key = `articles/${Date.now()}-${randomSuffix}.${ext}`;

    // AC-27: Store image in storage infrastructure and return URL
    await putPrivateArtifact(key, buffer, file.type);

    const publicUrl = `/api/articles/images/${key}`;

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        key,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to upload organizer article image:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
