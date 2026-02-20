"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
describe("Swagger API Documentation", () => {
    describe("GET /docs.json", () => {
        it("should return OpenAPI specification as JSON", async () => {
            const response = await (0, supertest_1.default)(index_1.default).get("/docs.json");
            expect(response.status).toBe(200);
            expect(response.type).toBe("application/json");
            expect(response.body).toHaveProperty("openapi");
            expect(response.body).toHaveProperty("info");
            expect(response.body.info.title).toBe("Advanced Web Apps API");
        });
        it("should include all API paths in the specification", async () => {
            const response = await (0, supertest_1.default)(index_1.default).get("/docs.json");
            expect(response.body).toHaveProperty("paths");
            expect(Object.keys(response.body.paths).length).toBeGreaterThan(0);
        });
        it("should include security schemes in components", async () => {
            const response = await (0, supertest_1.default)(index_1.default).get("/docs.json");
            expect(response.body.components).toHaveProperty("securitySchemes");
            expect(response.body.components.securitySchemes).toHaveProperty("bearerAuth");
        });
        it("should include all schema definitions", async () => {
            const response = await (0, supertest_1.default)(index_1.default).get("/docs.json");
            expect(response.body.components).toHaveProperty("schemas");
            expect(response.body.components.schemas).toHaveProperty("User");
            expect(response.body.components.schemas).toHaveProperty("Post");
            expect(response.body.components.schemas).toHaveProperty("Comment");
        });
    });
});
