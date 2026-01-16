import mongoose, { Schema, Document } from "mongoose";

export interface User extends Document {
  id: string;
  name: string;
  email: string;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

const UserModel = mongoose.model<User>("User", UserSchema);
export default UserModel;
