const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = "uploads/userphoto";

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = "user_" + Date.now() + ext;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {

    const allowedTypes = [".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(ext)) {
        return cb(new Error("Only PNG, JPG, JPEG allowed"));
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter
});

module.exports = upload;