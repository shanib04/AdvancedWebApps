"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = void 0;
const uploadImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
    }
    const imageUrl = `${req.protocol}://${req.get("host")}/public/images/${req.file.filename}`;
    return res.status(201).json({ imageUrl });
};
exports.uploadImage = uploadImage;
