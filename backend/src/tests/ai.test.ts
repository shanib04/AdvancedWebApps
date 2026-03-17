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

  test("POST /api/ai/refineText should validate fields and return refined text", async () => {
    const missingCurrent = await request(testApp)
      .post("/api/ai/refineText")
      .set(authHeader(testUser))
      .send({ instruction: "shorten" });

    expect(missingCurrent.statusCode).toBe(422);

    const missingInstruction = await request(testApp)
      .post("/api/ai/refineText")
      .set(authHeader(testUser))
      .send({ currentText: "hello world" });

    expect(missingInstruction.statusCode).toBe(422);

    mockGenerateContent
      .mockRejectedValueOnce(new Error("first model failed"))
      .mockResolvedValueOnce({
        response: {
          text: () => "Recovered refined text",
        },
      });

    const recovered = await request(testApp)
      .post("/api/ai/refineText")
      .set(authHeader(testUser))
      .send({
        currentText: "This is a long sentence",
        instruction: "Make it short",
      });

    expect(recovered.statusCode).toBe(200);
    expect(recovered.body).toEqual({ text: "Recovered refined text" });

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "```Refined text```",
      },
    });

    const refined = await request(testApp)
      .post("/api/ai/refineText")
      .set(authHeader(testUser))
      .send({
        currentText: "This is a long sentence",
        instruction: "Make it short",
      });

    expect(refined.statusCode).toBe(200);
    expect(refined.body).toEqual({ text: "Refined text" });
  });

  test("POST /api/ai/refineText should return 500 when all Gemini models fail", async () => {
    mockGenerateContent.mockRejectedValue(new Error("all models failed"));

    const response = await request(testApp)
      .post("/api/ai/refineText")
      .set(authHeader(testUser))
      .send({
        currentText: "Long sentence",
        instruction: "Shorten it",
      });

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
});
