import mongoose from "mongoose";

export const validateObjectId = (id: unknown): boolean => {
  if (Array.isArray(id)) {
    return id.every((item) => mongoose.Types.ObjectId.isValid(item));
  }

  if (
    typeof id === "string" ||
    id instanceof Uint8Array ||
    id instanceof mongoose.Types.ObjectId
  ) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  return false;
};
