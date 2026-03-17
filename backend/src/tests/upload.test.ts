import request from "supertest";
import app from "../index";

describe("Upload API", () => {
  test("POST /upload should return 400 when image file is missing", async () => {
    const response = await request(app).post("/upload").send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: "Image file is required" });
  });

  test("POST /upload should upload PNG image and return imageUrl", async () => {
    const pngHeaderBuffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const response = await request(app)
      .post("/upload")
      .attach("image", pngHeaderBuffer, {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("imageUrl");
    expect(typeof response.body.imageUrl).toBe("string");
    expect(response.body.imageUrl).toContain("/public/images/");
  });

  test("upload middleware should create directory when missing", () => {
    jest.resetModules();

    const existsSync = jest.fn(() => false);
    const mkdirSync = jest.fn();
    const multerMock = Object.assign(
      jest.fn((options) => options),
      {
        diskStorage: jest.fn((config) => config),
      },
    );

    jest.isolateModules(() => {
      jest.doMock("fs", () => ({
        __esModule: true,
        default: { existsSync, mkdirSync },
        existsSync,
        mkdirSync,
      }));
      jest.doMock("multer", () => ({
        __esModule: true,
        default: multerMock,
      }));

      require("../middleware/upload");
    });

    expect(existsSync).toHaveBeenCalledTimes(1);
    expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    });

    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("upload middleware should reject unsupported files", () => {
    jest.resetModules();

    const multerMock = Object.assign(
      jest.fn((options) => options),
      {
        diskStorage: jest.fn((config) => config),
      },
    );

    let uploadOptions: {
      fileFilter: (
        req: unknown,
        file: { originalname: string; mimetype: string },
        cb: (error: Error | null, acceptFile?: boolean) => void,
      ) => void;
    };

    jest.isolateModules(() => {
      jest.doMock("multer", () => ({
        __esModule: true,
        default: multerMock,
      }));

      require("../middleware/upload");
      uploadOptions = multerMock.mock.calls[0][0];
    });

    const callback = jest.fn();

    uploadOptions.fileFilter(
      {},
      {
        originalname: "avatar.exe",
        mimetype: "application/octet-stream",
      },
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      new Error("Only JPG, PNG, and WEBP image files are allowed"),
    );

    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
});
