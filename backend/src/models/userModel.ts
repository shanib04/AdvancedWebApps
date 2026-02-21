import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false,
    unique: true,

    // only documents that have this field are indexed, so uniqueness is enforced only when the field exists.
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
  refreshToken: {
    type: [String],
  },
  photoUrl: {
    type: String,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
