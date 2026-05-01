import { Router, type IRouter, type Request, type Response, raw } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import {
  generateUploadFilename,
  isValidUploadFilename,
  saveUploadedFile,
  streamStoredFile,
  storedFileExists,
  buildPublicUploadUrl,
  getObjectPath,
} from "../lib/localStorage";

const router: IRouter = Router();
const STORAGE_MODE = (process.env.STORAGE_MODE || "object").toLowerCase();
const USE_LOCAL = STORAGE_MODE === "local";

let objectStorageService: ObjectStorageService | null = null;
function getObjectService(): ObjectStorageService {
  if (!objectStorageService) objectStorageService = new ObjectStorageService();
  return objectStorageService;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned URL.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;

  if (!contentType.startsWith("image/")) {
    res.status(400).json({ error: "Only image uploads are allowed" });
    return;
  }

  if (size > MAX_UPLOAD_BYTES) {
    res.status(400).json({ error: "File too large (max 10 MB)" });
    return;
  }

  try {
    let uploadURL: string;
    let objectPath: string;

    if (USE_LOCAL) {
      const filename = generateUploadFilename(name, contentType);
      uploadURL = buildPublicUploadUrl(req, filename);
      objectPath = getObjectPath(filename);
    } else {
      const svc = getObjectService();
      uploadURL = await svc.getObjectEntityUploadURL();
      objectPath = svc.normalizeObjectEntityPath(uploadURL);
    }

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * PUT /storage/upload-blob/:filename
 *
 * Local-storage only: receives raw file bytes and stores them on disk.
 * The filename was generated and returned by the request-url endpoint.
 */
router.put(
  "/storage/upload-blob/:filename",
  raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }),
  async (req: Request, res: Response) => {
    if (!USE_LOCAL) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { filename } = req.params;
    if (!isValidUploadFilename(filename)) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Empty body" });
      return;
    }
    if (req.body.length > MAX_UPLOAD_BYTES) {
      res.status(400).json({ error: "File too large" });
      return;
    }
    try {
      await saveUploadedFile(filename, req.body);
      res.status(200).json({ ok: true });
    } catch (error) {
      req.log.error({ err: error }, "Error saving uploaded file");
      res.status(500).json({ error: "Failed to save file" });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets. In object-storage mode this hits Replit search paths.
 * In local mode this returns 404 (no public bucket concept).
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  if (USE_LOCAL) {
    res.status(404).json({ error: "Not available in local storage mode" });
    return;
  }
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const svc = getObjectService();
    const file = await svc.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await svc.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * In local mode: serves /objects/uploads/<filename> from disk.
 * In object-storage mode: delegates to Replit object storage.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

  if (USE_LOCAL) {
    const segments = wildcardPath.split("/").filter(Boolean);
    if (segments.length !== 2 || segments[0] !== "uploads") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const filename = segments[1]!;
    if (!storedFileExists(filename)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    try {
      const { stream, size, mime } = streamStoredFile(filename);
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", String(size));
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      stream.pipe(res);
    } catch (error) {
      req.log.error({ err: error }, "Error streaming local file");
      res.status(500).json({ error: "Failed to serve file" });
    }
    return;
  }

  try {
    const objectPath = `/objects/${wildcardPath}`;
    const svc = getObjectService();
    const objectFile = await svc.getObjectEntityFile(objectPath);
    const response = await svc.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
