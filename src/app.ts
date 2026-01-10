import express from "express";
import connectDB from "./config/db";
import postRoutes from "./routes/post.routes";

const app = express();

connectDB();
app.use(express.json());

app.use("/post", postRoutes);

export default app;
