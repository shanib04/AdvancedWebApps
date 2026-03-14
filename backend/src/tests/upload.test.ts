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
});
