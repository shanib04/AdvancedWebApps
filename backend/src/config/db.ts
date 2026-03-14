import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("MONGO_URI is not defined in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
};

export default connectDB;
