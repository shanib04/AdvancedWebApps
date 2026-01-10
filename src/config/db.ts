import mongoose from "mongoose";

const connectDB = async () => {
  await mongoose.connect(
    "mongodb://admin:bartar20%40CS@10.10.246.32:21771/posts_app?authSource=admin"
  );

  console.log("MongoDB connected");
};

export default connectDB;
