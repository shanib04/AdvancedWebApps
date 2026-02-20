import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
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
  photoUrl: {
    type: String,
  },
  refresh_tokens: {
    type: [String],
    default: [],
  },
  refreshToken: {
    type: [String],
    default: [],
  },
});

userSchema.pre("save", async function () {
  const doc = this as typeof this & {
    refresh_tokens?: string[];
    refreshToken?: string[];
  };

  if (doc.refresh_tokens && doc.refresh_tokens.length > 0) {
    doc.refreshToken = doc.refresh_tokens;
  } else if (doc.refreshToken && doc.refreshToken.length > 0) {
    doc.refresh_tokens = doc.refreshToken;
  } else {
    doc.refresh_tokens = [];
    doc.refreshToken = [];
  }
});

const User = mongoose.model("User", userSchema);

export default User;
