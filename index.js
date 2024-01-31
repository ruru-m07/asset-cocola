const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
const cors = require("cors");
const compression = require("compression");

const serviceAccount = require("./asset-cocola-firebase-adminsdk-5oxgh-5e79b5a466.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "asset-cocola.appspot.com",
});

const bucket = admin.storage().bucket();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Enable CORS for all routes
app.use(compression()); // Enable compression for response payload

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

// Define allowed domains for image uploads
const allowedDomains = [
  "http://localhost:3000",
  "https://cocola.vercel.app",
  // "http://127.0.0.1:5500",
];

app.get("/", (req, res) => {
  return res.json({"message": "welcome to cocola asset menagement area"});
});

// POST endpoint for uploading images
app.post("/upload", upload.single("profileImage"), async (req, res) => {
  const origin = req.get("Origin");

  // Check if the request is from an allowed domain
  if (!allowedDomains.includes(origin)) {
    return res.status(403).json({ error: "Forbidden: Unauthorized domain" });
  }

  // Access the uploaded file through req.file
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = bucket.file(`uploads/${req.file.originalname}`);
  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype,
    },
  });

  stream.on("error", (err) => {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  });

  stream.on("finish", () => {
    return res.json({ success: true, message: "File uploaded successfully" });
  });

  stream.end(req.file.buffer);
});

// GET endpoint to retrieve an image by a link
app.get("/:imageName", async (req, res) => {
  const imageName = req.params.imageName;
  const file = bucket.file(`uploads/${imageName}`);

  try {
    const [fileExists] = await file.exists();

    if (!fileExists) {
      return res.status(404).json({ error: "Image not found" });
    }

    const readStream = file.createReadStream();

    // Set content type based on file extension or use a default content type
    const contentType = getContentType(imageName);
    res.setHeader("Content-Type", contentType);

    // Set cache headers for one year
    res.header("Cache-Control", "public, max-age=31536000");

    // Pipe the file content to the response
    readStream.pipe(res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

function getContentType(fileName) {
  // Add more content types based on your needs
  if (fileName.endsWith(".png")) {
    return "image/png";
  } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    return "image/jpeg";
  } else {
    return "application/octet-stream"; // default content type
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
