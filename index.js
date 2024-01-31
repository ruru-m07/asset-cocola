const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: "uploads/", // Specify the folder to store uploaded images
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + fileExtension);
  },
});

const upload = multer({ storage: storage });

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

// POST endpoint for uploading images
app.post("/upload", upload.single("profileImage"), (req, res) => {
  // Access the uploaded file through req.file
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Store the file information in a database or use Moltin to handle storage

  return res.json({ success: true, message: "File uploaded successfully" });
});

// GET endpoint to retrieve an image by a link
app.get("/get-image/:imageName", (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, "uploads", imageName);

  // Check if the file exists
  if (fs.existsSync(imagePath)) {
    return res.sendFile(imagePath);
  } else {
    return res.status(404).json({ error: "Image not found" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
