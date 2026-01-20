import swaggerJsDoc from "swagger-jsdoc";

const options: swaggerJsDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Advanced Web Apps API",
      version: "1.0.0",
      description: "API documentation for Posts and Comments",
      contact: {
        name: "Developer",
        email: "developer@example.com",
      },
    },
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT authorization header using the Bearer scheme",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
            username: { type: "string", example: "testuser" },
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: { type: "string", minLength: 6, example: "password123" },
          },
        },
        Post: {
          type: "object",
          required: ["sender", "content"],
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
            sender: { type: "string", example: "testuser" },
            content: { type: "string", example: "This is a post" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Comment: {
          type: "object",
          required: ["sender", "content", "postId"],
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
            sender: { type: "string", example: "commenter" },
            content: { type: "string", example: "Great post!" },
            postId: { type: "string", example: "507f1f77bcf86cd799439011" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Error message" },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Access token is missing or invalid",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Unauthorized" },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Not found" },
            },
          },
        },
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Validation failed" },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts", "./dist/src/routes/*.ts"],
};

const specs = swaggerJsDoc(options);

export { specs };
