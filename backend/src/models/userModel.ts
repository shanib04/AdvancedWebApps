import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      maxlength: 15,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: [String],
      default: [],
    },
    photoUrl: {
      type: String,
    },
    displayName: {
      type: String,
      maxlength: 20,
    },
    bio: {
      type: String,
      maxlength: 150,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
