import express from "express";
import connectDB from "./config/db";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/commentRoutes";

const app = express();

connectDB();
app.use(express.json());

app.use("/post", postRoutes);
app.use("/comment", commentRoutes);

export default app;
