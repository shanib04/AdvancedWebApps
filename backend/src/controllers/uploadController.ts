import { Request, Response } from "express";

export const uploadImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/public/images/${req.file.filename}`;

  return res.status(201).json({ imageUrl });
};
