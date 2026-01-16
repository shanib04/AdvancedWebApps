import mongoose from "mongoose";

export const validateObjectId = (id: any): boolean => {
  if (Array.isArray(id)) {
    return id.every((item) => mongoose.Types.ObjectId.isValid(item));
  }
  return mongoose.Types.ObjectId.isValid(id);
};
