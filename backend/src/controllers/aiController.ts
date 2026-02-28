import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getErrorMessage } from "../utils/getErrorMessage";

type InitialDraftResponse = {
  text: string;
  keyword: string;
  images: string[];
};

type ParsedInitialDraft = {
  text: string;
  keywords: string[];
};

const getGeminiApiKey = () => normalizeEnvValue(getEnvValue("GEMINI_API_KEY"));

const getUnsplashApiKey = () =>
  normalizeEnvValue(getEnvValue("UNSPLASH_ACCESS_KEY"));

const parsedEnvCache = new Map<string, Record<string, string>>();
const backendEnvFilePath = path.resolve(__dirname, "backend/.env");

const normalizeEnvValue = (value: string) => value.trim().replace(/^"|"$/g, "");

const loadEnvFile = (envFilePath: string) => {
  if (parsedEnvCache.has(envFilePath)) {
    return parsedEnvCache.get(envFilePath) || {};
  }

  if (!fs.existsSync(envFilePath)) {
    parsedEnvCache.set(envFilePath, {});
    return {};
  }

  try {
    const fileContent = fs.readFileSync(envFilePath, "utf8");
    const parsed = dotenv.parse(fileContent);
    parsedEnvCache.set(envFilePath, parsed);
    return parsed;
  } catch {
    parsedEnvCache.set(envFilePath, {});
    return {};
  }
};

const getEnvValue = (key: string) => {
  const fromProcess = process.env[key];
  if (fromProcess && fromProcess.trim()) {
    return fromProcess;
  }

  const parsed = loadEnvFile(backendEnvFilePath);
  const value = parsed[key];
  if (value && value.trim()) {
    return value;
  }

  return "";
};

const candidateModels = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash",
];

const generateWithGemini = async (prompt: string) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenerativeAI(apiKey);
  let lastErrorMessage = "";

  for (const modelName of candidateModels) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim() || "";

      if (text) {
        return text;
      }
    } catch (error: unknown) {
      lastErrorMessage = getErrorMessage(error);
    }
  }

  throw new Error(lastErrorMessage || "No supported Gemini model succeeded");
};

const extractDraftJson = (raw: string): ParsedInitialDraft => {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const jsonText =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  const parsed = JSON.parse(jsonText) as {
    text?: string;
    keywords?: string[];
    keyword?: string;
  };

  const rawKeywords = Array.isArray(parsed.keywords)
    ? parsed.keywords
    : parsed.keyword
      ? [parsed.keyword]
      : [];

  const normalizedKeywords = rawKeywords
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .filter((value) => Boolean(value))
    .map((value) => value.replace(/\s+/g, " "))
    .slice(0, 4);

  return {
    text: (parsed.text || "").trim(),
    keywords: normalizedKeywords,
  };
};

const fetchUnsplashImages = async (keyword: string): Promise<string[]> => {
  const unsplashKey = getUnsplashApiKey();
  if (!unsplashKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is not configured");
  }

  const response = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
      keyword,
    )}&count=4&client_id=${unsplashKey}`,
  );

  if (!response.ok) {
    throw new Error(`Unsplash request failed with status ${response.status}`);
  }

  const data = (await response.json()) as Array<{
    urls?: { regular?: string };
  }>;

  return (Array.isArray(data) ? data : [])
    .map((item) => item?.urls?.regular)
    .filter((value): value is string => Boolean(value));
};

const fetchUnsplashImagesSafe = async (
  keyword: string,
  unsplashKey: string,
): Promise<string[]> => {
  try {
    const response = await axios.get("https://api.unsplash.com/photos/random", {
      params: {
        query: keyword,
        count: 4,
        client_id: unsplashKey,
      },
    });

    const responseData = response.data as
      | Array<{ urls?: { regular?: string } }>
      | { results?: Array<{ urls?: { regular?: string } }> };

    const imageItems = Array.isArray(responseData)
      ? responseData
      : Array.isArray(responseData?.results)
        ? responseData.results
        : [];

    return imageItems
      .map((item) => item?.urls?.regular)
      .filter((value): value is string => Boolean(value));
  } catch {
    return [];
  }
};

export const generateInitialDraft = async (req: Request, res: Response) => {
  try {
    const { prompt, includeImages } = req.body as {
      prompt?: string;
      includeImages?: boolean;
    };

    if (!prompt || !prompt.trim()) {
      return res.status(422).json({ error: "Prompt is required" });
    }

    const aiPrompt = `You are writing social media drafts. Return strictly valid JSON and nothing else in this exact shape: {\"text\":\"post content\",\"keywords\":[\"phrase1\",\"phrase2\",\"phrase3\",\"phrase4\"]}. The keywords must be short, highly relevant search terms for stock photos (1-3 words max). Crucially, order the keywords from the most specific and exact match first, down to the broadest, most generic fallback last (e.g., ['react framework', 'javascript code', 'programming', 'computer']). Create content for this topic: ${prompt.trim()}`;

    const aiRaw = await generateWithGemini(aiPrompt);
    const parsed = extractDraftJson(aiRaw);

    if (!parsed.text) {
      return res
        .status(500)
        .json({ error: "AI did not return valid text/keywords JSON" });
    }

    const defaultKeywords = ["nature", "lifestyle", "travel", "people"];
    const keywords =
      parsed.keywords.length > 0 ? parsed.keywords : defaultKeywords;

    let fetchedImages: string[] = [];
    let successfulKeyword = "";

    if (includeImages) {
      const unsplashKey = getUnsplashApiKey();

      if (unsplashKey) {
        for (const keyword of keywords) {
          const mappedImages = await fetchUnsplashImagesSafe(
            keyword,
            unsplashKey,
          );

          if (mappedImages.length > 0) {
            fetchedImages = mappedImages;
            successfulKeyword = keyword;
            break;
          }
        }
      }
    }

    const response: InitialDraftResponse = {
      text: parsed.text,
      keyword: successfulKeyword || keywords[0],
      images: fetchedImages,
    };

    return res.status(200).json(response);
  } catch (error: unknown) {
    return res.status(500).json({
      error: getErrorMessage(error) || "Failed to generate initial draft",
    });
  }
};

export const refineText = async (req: Request, res: Response) => {
  try {
    const { currentText, instruction } = req.body as {
      currentText?: string;
      instruction?: string;
    };

    if (!currentText || !currentText.trim()) {
      return res.status(422).json({ error: "currentText is required" });
    }

    if (!instruction || !instruction.trim()) {
      return res.status(422).json({ error: "instruction is required" });
    }

    const aiPrompt =
      "Rewrite this text based on the instruction. Return ONLY the new text string. " +
      `Text: ${currentText.trim()}. Instruction: ${instruction.trim()}.`;

    const updatedText = (await generateWithGemini(aiPrompt))
      .replace(/```/g, "")
      .trim();

    return res.json({ text: updatedText });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ error: getErrorMessage(error) || "Failed to refine text" });
  }
};

export const getMoreImages = async (req: Request, res: Response) => {
  try {
    const { keyword } = req.body as { keyword?: string };

    if (!keyword || !keyword.trim()) {
      return res.status(422).json({ error: "keyword is required" });
    }

    const images = await fetchUnsplashImages(keyword.trim());
    return res.json({ images });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ error: getErrorMessage(error) || "Failed to fetch more images" });
  }
};
