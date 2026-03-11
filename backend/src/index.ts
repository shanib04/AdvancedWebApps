import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import postRoutes from "./routes/postRoutes";
import commentRoutes from "./routes/commentRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import aiRoutes from "./routes/aiRoutes";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger";

const app = express();

// Validate CORS origin in production
const NODE_ENV = process.env.NODE_ENV || "development";
const CLIENT_URL = process.env.CLIENT_URL;

if (NODE_ENV === "production" && !CLIENT_URL) {
  console.error("CLIENT_URL environment variable must be set in production");
  process.exit(1);
}

const corsOrigin =
  NODE_ENV === "production"
    ? CLIENT_URL
    : process.env.CLIENT_URL || "http://localhost:5173";

connectDB();

// Middleware
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "../public")));

// Routes
app.use("/upload", uploadRoutes);
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/post", postRoutes);
app.use("/comment", commentRoutes);
app.use("/api/ai", aiRoutes);

// Swagger documentation
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Advanced Web Apps API Documentation",
  }),
);

// Swagger JSON endpoint
app.get("/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(specs);
});

export default app;
