import request from "supertest";
import app from "../index";

describe("Swagger API Documentation", () => {
  describe("GET /docs.json", () => {
    it("should return OpenAPI specification with core metadata", async () => {
      const response = await request(app).get("/docs.json");

      expect(response.status).toBe(200);
      expect(response.type).toBe("application/json");
      expect(response.body).toHaveProperty("openapi");
      expect(response.body).toHaveProperty("info");
      expect(response.body.info.title).toBe("Advanced Web Apps API");
      expect(response.body).toHaveProperty("paths");
      expect(Object.keys(response.body.paths).length).toBeGreaterThan(0);
    });

    it("should include security schemes and core schemas", async () => {
      const response = await request(app).get("/docs.json");

      expect(response.body.components).toHaveProperty("securitySchemes");
      expect(response.body.components.securitySchemes).toHaveProperty(
        "bearerAuth",
      );
      expect(response.body.components).toHaveProperty("schemas");
      expect(response.body.components.schemas).toHaveProperty("User");
      expect(response.body.components.schemas).toHaveProperty("Post");
      expect(response.body.components.schemas).toHaveProperty("Comment");
    });

    it("should include AI search endpoint documentation", async () => {
      const response = await request(app).get("/docs.json");

      expect(response.body.paths).toHaveProperty("/api/ai/search");
      expect(response.body.paths["/api/ai/search"]).toHaveProperty("post");
      expect(
        response.body.paths["/api/ai/search"].post.responses,
      ).toHaveProperty("200");
      expect(
        response.body.paths["/api/ai/search"].post.responses,
      ).toHaveProperty("422");
      expect(
        response.body.paths["/api/ai/search"].post.responses,
      ).toHaveProperty("500");
    });
  });
});
