import request from "supertest";

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));
const mockGoogleGenerativeAI = jest.fn(() => ({
  getGenerativeModel: mockGetGenerativeModel,
}));

const mockAxiosGet = jest.fn();

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI,
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: mockAxiosGet,
  },
}));

import app from "../index";
import { Express } from "express";
import { cleanupDatabase, registerTestUser, TestUser } from "./testUtils";

let testApp: Express;
let testUser: TestUser;

const authHeader = (user: TestUser) => ({
  Authorization: `Bearer ${user.accessToken}`,
});

beforeAll(async () => {
  testApp = app;
  await cleanupDatabase();
  testUser = await registerTestUser(testApp);
}, 30000);

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.UNSPLASH_ACCESS_KEY = "test-unsplash-key";

  mockGenerateContent.mockResolvedValue({
    response: {
      text: () => '{"text":"Draft from AI","keywords":["react app","coding"]}',
    },
  });

  mockAxiosGet.mockResolvedValue({
    data: [{ urls: { regular: "https://images.example.com/one.jpg" } }],
  });

  (global as typeof globalThis & { fetch: jest.Mock }).fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { urls: { regular: "https://images.example.com/two.jpg" } },
      ],
    });
});

afterAll(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.UNSPLASH_ACCESS_KEY;
});

describe("AI API", () => {
  test("POST /api/ai/generateInitialDraft should require auth", async () => {
    const response = await request(testApp)
      .post("/api/ai/generateInitialDraft")
      .send({ prompt: "hello" });

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/ai/generateInitialDraft should validate prompt", async () => {
    const response = await request(testApp)
      .post("/api/ai/generateInitialDraft")
      .set(authHeader(testUser))
      .send({});

    expect(response.statusCode).toBe(422);
    expect(response.body).toEqual({ error: "Prompt is required" });
  });

  test("POST /api/ai/generateInitialDraft should return draft and optional images", async () => {
    const noImages = await request(testApp)
      .post("/api/ai/generateInitialDraft")
      .set(authHeader(testUser))
      .send({ prompt: "Write about React", includeImages: false });

    expect(noImages.statusCode).toBe(200);
    expect(noImages.body).toHaveProperty("text", "Draft from AI");
    expect(noImages.body).toHaveProperty("keyword");
    expect(Array.isArray(noImages.body.images)).toBe(true);

    mockAxiosGet.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({
      data: [{ urls: { regular: "https://images.example.com/fallback.jpg" } }],
    });

    const withImages = await request(testApp)
      .post("/api/ai/generateInitialDraft")
      .set(authHeader(testUser))
      .send({ prompt: "Write about coding", includeImages: true });

    expect(withImages.statusCode).toBe(200);
    expect(withImages.body.images.length).toBe(1);
    expect(mockAxiosGet).toHaveBeenCalled();

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '{"text":"Draft with keyword","keyword":"fitness"}',
      },
    });
    mockAxiosGet.mockResolvedValueOnce({
      data: {
        results: [
          { urls: { regular: "https://images.example.com/object.jpg" } },
        ],
      },
    });

    const keywordObject = await request(testApp)
      .post("/api/ai/generateInitialDraft")
      .set(authHeader(testUser))
      .send({ prompt: "Write about fitness", includeImages: true });

    expect(keywordObject.statusCode).toBe(200);
    expect(keywordObject.body).toHaveProperty("keyword", "fitness");
  });

  test("POST /api/ai/generateInitialDraft should fail when GEMINI key is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await request(testApp)
      .post("/api/ai/generateInitialDraft")
      .set(authHeader(testUser))
      .send({ prompt: "Write about tech" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("error");
  });

  test("POST /api/ai/generateInitialDraft should return 500 when AI JSON has empty text", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '{"text":"","keywords":["tech"]}',
      },
    });

    const response = await request(testApp)
      .post("/api/ai/generateInitialDraft")
      .set(authHeader(testUser))
      .send({ prompt: "Write about tech" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      error: "AI did not return valid text/keywords JSON",
    });
  });

  test("POST /api/ai/refine-text should require auth", async () => {
    const response = await request(testApp)
      .post("/api/ai/refine-text")
      .send({ text: "Improve this text" });

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/ai/refine-text should validate input and refine quick text", async () => {
    const missingText = await request(testApp)
      .post("/api/ai/refine-text")
      .set(authHeader(testUser))
      .send({ instruction: "shorten" });

    expect(missingText.statusCode).toBe(422);
    expect(missingText.body).toEqual({ error: "text is required" });

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "```Refined post text```",
      },
    });

    const refined = await request(testApp)
      .post("/api/ai/refine-text")
      .set(authHeader(testUser))
      .send({ text: "today i learned hooks" });

    expect(refined.statusCode).toBe(200);
    expect(refined.body).toEqual({ text: "Refined post text" });
  });

  test("POST /api/ai/refine-text should refine instruction-based text", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error("first model failed"))
      .mockResolvedValueOnce({
        response: {
          text: () => "Recovered refined text",
        },
      });

    const refined = await request(testApp)
      .post("/api/ai/refine-text")
      .set(authHeader(testUser))
      .send({
        currentText: "This is a long sentence",
        instruction: "Make it short",
      });

    expect(refined.statusCode).toBe(200);
    expect(refined.body).toEqual({ text: "Recovered refined text" });
  });

  test("POST /api/ai/refine-text should return 500 when Gemini fails", async () => {
    mockGenerateContent.mockRejectedValue(new Error("all models failed"));

    const response = await request(testApp)
      .post("/api/ai/refine-text")
      .set(authHeader(testUser))
      .send({ text: "hello world" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("error", "all models failed");
  });

  test("POST /api/ai/generateInitialDraft should continue when Unsplash safe fetch fails", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          '{"text":"Draft from AI","keywords":["react app","coding"]}',
      },
    });
    mockAxiosGet.mockRejectedValue(new Error("unsplash down"));

    const response = await request(testApp)
      .post("/api/ai/generateInitialDraft")
      .set(authHeader(testUser))
      .send({ prompt: "Write about coding", includeImages: true });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("keyword", "react app");
    expect(response.body).toHaveProperty("images");
    expect(response.body.images).toHaveLength(0);
  });

  test("POST /api/ai/getMoreImages should validate keyword and return/fail correctly", async () => {
    const missingKeyword = await request(testApp)
      .post("/api/ai/getMoreImages")
      .set(authHeader(testUser))
      .send({});

    expect(missingKeyword.statusCode).toBe(422);

    const success = await request(testApp)
      .post("/api/ai/getMoreImages")
      .set(authHeader(testUser))
      .send({ keyword: "nature" });

    expect(success.statusCode).toBe(200);
    expect(Array.isArray(success.body.images)).toBe(true);

    delete process.env.UNSPLASH_ACCESS_KEY;

    const missingUnsplash = await request(testApp)
      .post("/api/ai/getMoreImages")
      .set(authHeader(testUser))
      .send({ keyword: "nature" });

    expect(missingUnsplash.statusCode).toBe(500);
    expect(missingUnsplash.body).toHaveProperty("error");

    process.env.UNSPLASH_ACCESS_KEY = "test-unsplash-key";

    (global as typeof globalThis & { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

    const failure = await request(testApp)
      .post("/api/ai/getMoreImages")
      .set(authHeader(testUser))
      .send({ keyword: "nature" });

    expect(failure.statusCode).toBe(500);
    expect(failure.body).toHaveProperty("error");
  });

  test("POST /api/ai/search should require auth", async () => {
    const response = await request(testApp).post("/api/ai/search").send({
      query: "Which user has the most posts?",
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/ai/search should validate query", async () => {
    const response = await request(testApp)
      .post("/api/ai/search")
      .set(authHeader(testUser))
      .send({ query: "   " });

    expect(response.statusCode).toBe(422);
    expect(response.body).toEqual({ error: "Query is required" });
  });

  test("POST /api/ai/search should validate excessive query length", async () => {
    const response = await request(testApp)
      .post("/api/ai/search")
      .set(authHeader(testUser))
      .send({ query: "a".repeat(501) });

    expect(response.statusCode).toBe(422);
    expect(response.body).toEqual({
      error: "Query must be 500 characters or fewer",
    });
  });

  test("POST /api/ai/search should rewrite very long answers to concise output", async () => {
    const veryLongAnswer = "A".repeat(700);

    mockGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () => veryLongAnswer,
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => "Top users by comments per post: www. Others are currently tied at 0.",
        },
      });

    const response = await request(testApp)
      .post("/api/ai/search")
      .set(authHeader(testUser))
      .send({ query: "Which users get the most comments per post?" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("result");
    expect(response.body.result).toBe(
      "Top users by comments per post: www. Others are currently tied at 0.",
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  test("POST /api/ai/search should strip markdown formatting characters", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          "The most active users are: **Shani B** (2 posts), **Itay Ram** (3 posts) and **www** (1 post).",
      },
    });

    const response = await request(testApp)
      .post("/api/ai/search")
      .set(authHeader(testUser))
      .send({ query: "Who are the most active users?" });

    expect(response.statusCode).toBe(200);
    expect(response.body.result).toBe(
      "The most active users are: Shani B (2 posts), Itay Ram (3 posts) and www (1 post).",
    );
  });

  test("POST /api/ai/search should fall back to a shortened answer if rewrite fails", async () => {
    const veryLongAnswer = `Intro ${"Detailed answer ".repeat(60)}`;

    mockGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () => veryLongAnswer,
        },
      })
      .mockRejectedValue(new Error("rewrite step failed"));

    const response = await request(testApp)
      .post("/api/ai/search")
      .set(authHeader(testUser))
      .send({ query: "What are the top liked posts?" });

    expect(response.statusCode).toBe(200);
    expect(response.body.result.length).toBeLessThanOrEqual(320);
    expect(response.body.result).toContain("Detailed answer");
  });

  test("POST /api/ai/search should return 503 when AI service is unavailable", async () => {
    mockGenerateContent.mockRejectedValue(new Error("No supported Gemini model succeeded"));

    const response = await request(testApp)
      .post("/api/ai/search")
      .set(authHeader(testUser))
      .send({ query: "Which user has the most posts?" });

    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({
      error: "AI search is temporarily unavailable. Please try again in a moment.",
    });
  });
});
