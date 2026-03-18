describe("app bootstrap", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test("exits in production when CLIENT_URL is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CLIENT_URL;

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    const useMock = jest.fn();
    const getMock = jest.fn();
    const expressMock = Object.assign(
      jest.fn(() => ({
        use: useMock,
        get: getMock,
      })),
      {
        json: jest.fn(() => "json-middleware"),
        static: jest.fn(() => "static-middleware"),
      },
    );

    jest.doMock("express", () => ({
      __esModule: true,
      default: expressMock,
    }));
    jest.doMock("dotenv/config", () => ({}));
    jest.doMock("cors", () => ({
      __esModule: true,
      default: jest.fn(() => "cors-middleware"),
    }));
    jest.doMock("../config/db", () => ({
      __esModule: true,
      default: jest.fn(),
    }));
    jest.doMock("../routes/authRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/userRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/postRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/commentRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/uploadRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/aiRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("swagger-ui-express", () => ({
      __esModule: true,
      default: {
        serve: "swagger-serve",
        setup: jest.fn(() => "swagger-setup"),
      },
    }));
    jest.doMock("../config/swagger", () => ({
      __esModule: true,
      specs: { openapi: "3.0.0" },
    }));

    expect(() => {
      jest.isolateModules(() => {
        require("../index");
      });
    }).toThrow("process.exit:1");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "CLIENT_URL environment variable must be set in production",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("uses CLIENT_URL as cors origin in production", () => {
    process.env.NODE_ENV = "production";
    process.env.CLIENT_URL = "https://node32.cs.colman.ac.il";

    const useMock = jest.fn();
    const getMock = jest.fn();
    const corsMock = jest.fn(() => "cors-middleware");

    const expressMock = Object.assign(
      jest.fn(() => ({
        use: useMock,
        get: getMock,
      })),
      {
        json: jest.fn(() => "json-middleware"),
        static: jest.fn(() => "static-middleware"),
      },
    );

    jest.doMock("express", () => ({
      __esModule: true,
      default: expressMock,
    }));
    jest.doMock("dotenv/config", () => ({}));
    jest.doMock("cors", () => ({
      __esModule: true,
      default: corsMock,
    }));
    jest.doMock("../config/db", () => ({
      __esModule: true,
      default: jest.fn(),
    }));
    jest.doMock("../routes/authRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/userRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/postRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/commentRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/uploadRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("../routes/aiRoutes", () => ({ __esModule: true, default: {} }));
    jest.doMock("swagger-ui-express", () => ({
      __esModule: true,
      default: {
        serve: "swagger-serve",
        setup: jest.fn(() => "swagger-setup"),
      },
    }));
    jest.doMock("../config/swagger", () => ({
      __esModule: true,
      specs: { openapi: "3.0.0" },
    }));

    jest.isolateModules(() => {
      require("../index");
    });

    expect(corsMock).toHaveBeenCalledWith({
      origin: "https://node32.cs.colman.ac.il",
      credentials: true,
    });
  });
});
