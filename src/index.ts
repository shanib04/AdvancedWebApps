import express from "express";
import connectDB from "./config/db";
import postRoutes from "./routes/postRoutes";
import commentRoutes from "./routes/commentRoutes";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";

const app = express();

connectDB();

// Middleware
app.use(express.json());

// Routes
app.use("/post", postRoutes);
app.use("/comment", commentRoutes);

// Swagger documentation
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Advanced Web Apps API",
      version: "1.0.0",
      description: "API documentation for Posts and Comments",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

export default app;
