"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.specs = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
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
                        password: { type: "string", example: "password123" },
                        refreshToken: {
                            type: "array",
                            items: { type: "string" },
                            example: ["token1", "token2"],
                        },
                    },
                },
                Post: {
                    type: "object",
                    required: ["user", "content"],
                    properties: {
                        _id: { type: "string", example: "507f1f77bcf86cd799439011" },
                        user: {
                            type: "string",
                            description: "User ID of the post creator",
                            example: "507f1f77bcf86cd799439012",
                        },
                        content: { type: "string", example: "This is a post" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                Comment: {
                    type: "object",
                    required: ["user", "post", "content"],
                    properties: {
                        _id: { type: "string", example: "507f1f77bcf86cd799439011" },
                        user: {
                            type: "string",
                            description: "User ID of the comment creator",
                            example: "507f1f77bcf86cd799439012",
                        },
                        post: {
                            type: "string",
                            description: "Post ID that this comment belongs to",
                            example: "507f1f77bcf86cd799439013",
                        },
                        content: { type: "string", example: "Great post!" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
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
const specs = (0, swagger_jsdoc_1.default)(options);
exports.specs = specs;
