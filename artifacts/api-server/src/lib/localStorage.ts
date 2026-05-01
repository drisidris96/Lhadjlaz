import { promises as fs, createReadStream, statSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
const SUBDIR = "uploads";

if (!existsSync(path.join(UPLOAD_DIR, SUBDIR))) {
  mkdirSync(path.join(UPLOAD_DIR, SUBDIR), { recursive: true });
}

const FILENAME_RE = /^[a-f0-9-]{36}\.[a-z0-9]{1,8}$/i;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

function extFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
  };
  return map[contentType.toLowerCase()] || "bin";
}

function extFromFilename(name: string): string | null {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return null;
  const ext = name.slice(idx + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : null;
}

export function generateUploadFilename(originalName: string, contentType: string): string {
  const ext = extFromFilename(originalName) || extFromContentType(contentType);
  return `${randomUUID()}.${ext}`;
}

export function isValidUploadFilename(filename: string): boolean {
  return FILENAME_RE.test(filename);
}

export function getUploadFullPath(filename: string): string {
  if (!isValidUploadFilename(filename)) {
    throw new Error("Invalid filename");
  }
  return path.join(UPLOAD_DIR, SUBDIR, filename);
}

export async function saveUploadedFile(filename: string, data: Buffer): Promise<void> {
  const full = getUploadFullPath(filename);
  await fs.writeFile(full, data);
}

export function getStoredFileMime(filename: string): string {
  const ext = extFromFilename(filename) || "bin";
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export function streamStoredFile(filename: string) {
  const full = getUploadFullPath(filename);
  const stat = statSync(full);
  return {
    stream: createReadStream(full),
    size: stat.size,
    mime: getStoredFileMime(filename),
  };
}

export function storedFileExists(filename: string): boolean {
  if (!isValidUploadFilename(filename)) return false;
  return existsSync(getUploadFullPath(filename));
}

export function buildPublicUploadUrl(req: { protocol: string; get: (h: string) => string | undefined }, filename: string): string {
  const base = process.env.PUBLIC_BASE_URL;
  if (base) {
    return `${base.replace(/\/$/, "")}/api/storage/upload-blob/${filename}`;
  }
  const proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0]!.trim();
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
  return `${proto}://${host}/api/storage/upload-blob/${filename}`;
}

export function getObjectPath(filename: string): string {
  return `/objects/uploads/${filename}`;
}
