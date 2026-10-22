import { GoogleGenerativeAI } from "@google/generative-ai";
import { t } from "elysia";
import { createElysia } from "@/libs/elysia";
import { checkPublicAiRateLimit, checkPublicDailyBudget, refundPublicDailyBudget } from "@/libs/aiRateLimit";
import { GEMINI_MODEL, GENERATION_CONFIG, finishedText } from "@/libs/geminiChat";
import logger from "@/libs/lokiLogger";
import { getClientIp } from "@/utils/clientIp";
import { detectImageType } from "@/utils/imageType";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB decoded

/**
 * Document-AI demo (a public analogue of the Bedrock Kimi/Qwen OCR pipeline): Gemini
 * Vision classifies a document image, then extracts structured fields as JSON. Strictly
 * rate-limited per IP, size + mime capped, and never stored.
 */
export default createElysia().post(
  "/ocr",
  async ({
    body,
    request,
    server,
    set,
  }: {
    body: { imageBase64: string; mimeType: string; mode: "classify" | "extract" };
    request: Request;
    server: any;
    set: { status?: number };
  }) => {
    if (!process.env.GENERATIVE_AI_API_KEY) {
      set.status = 500;
      return { status: 500, message: "AI is not configured", data: null };
    }

    // Validate before the rate/budget checks so a rejected upload never spends quota.
    if (!ALLOWED_MIME.includes(body.mimeType)) {
      set.status = 400;
      return { status: 400, message: "Unsupported image type (png, jpeg, webp only)", data: null };
    }

    // Accept either a raw base64 string or a full data URI.
    const bytes = Buffer.from(
      body.imageBase64.includes(",") ? body.imageBase64.slice(body.imageBase64.indexOf(",") + 1) : body.imageBase64,
      "base64"
    );
    if (bytes.byteLength > MAX_BYTES) {
      set.status = 413;
      return { status: 413, message: "Image too large (max 2MB)", data: null };
    }
    const detected = await detectImageType(bytes, ALLOWED_MIME);
    if (!detected || detected.mime !== body.mimeType) {
      set.status = 400;
      return { status: 400, message: "The file is not the image type it claims to be", data: null };
    }

    const ip = getClientIp(request, server);
    const rateCheck = checkPublicAiRateLimit(`ip-ocr:${ip}`);
    if (!rateCheck.allowed) {
      set.status = 429;
      return {
        status: 429,
        message: `Rate limit exceeded. Retry in ${rateCheck.retryAfterSeconds ?? 60}s.`,
        data: null,
      };
    }
    if (!checkPublicDailyBudget().allowed) {
      set.status = 429;
      return { status: 429, message: "Daily public AI limit reached. Try again tomorrow.", data: null };
    }

    const prompt =
      body.mode === "classify"
        ? `You are a document classifier. Classify this document image. Respond with ONLY JSON: {"documentType": string, "confidence": number, "language": string, "summary": string}.`
        : `You are a document data extractor. Classify the document, then extract its key fields. Respond with ONLY JSON: {"documentType": string, "fields": object, "summary": string}. Use null for fields that are not present.`;

    const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: GENERATION_CONFIG,
    });

    let raw: string;
    try {
      const result = await model.generateContent([
        { inlineData: { data: bytes.toString("base64"), mimeType: detected.mime } },
        { text: prompt },
      ]);
      // Throws on a cut-off/blocked/empty reply instead of returning 200 with nothing parsed.
      raw = finishedText(result.response);
    } catch (err) {
      refundPublicDailyBudget(err);
      logger.error({ err }, "OCR demo request failed");
      set.status = 502;
      return { status: 502, message: "OCR request failed. Please try again.", data: null };
    }

    // Strip ```json fences if the model added them, then attempt to parse.
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = null;
    }

    return { status: 200, message: "Success", data: { mode: body.mode, raw: cleaned, parsed } };
  },
  {
    body: t.Object({
      imageBase64: t.String({ minLength: 1, maxLength: 3_000_000 }),
      mimeType: t.String(),
      mode: t.Union([t.Literal("classify"), t.Literal("extract")]),
    }),
    detail: {
      tags: ["AI"],
      summary: "Document OCR / extraction demo (Gemini Vision)",
      description: "Public, strictly rate-limited document classification + structured extraction. No storage.",
    },
  }
);
