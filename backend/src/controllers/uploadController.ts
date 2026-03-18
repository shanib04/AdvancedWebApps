import { Request, Response } from "express";
import { HandlerResponse } from "../types/models";

// return absolute image url for uploaded file
export const uploadImage = async (
  req: Request,
  res: Response,
): HandlerResponse => {
  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/public/images/${req.file.filename}`;

  return res.status(201).json({ imageUrl });
};
