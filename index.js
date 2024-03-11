const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
const cors = require("cors");
const compression = require("compression");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

require("dotenv").config();

const serviceAccount = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "asset-cocola.appspot.com",
});

const bucket = admin.storage().bucket();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(compression()); // Enable compression for response payload

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

app.get("/", (req, res) => {
  return res.json({ message: "welcome to cocola asset management area" });
});

// POST endpoint for uploading images
app.post("/upload/:user", upload.single("profileImage"), async (req, res) => {
  const user = req.params.user;

  res.setHeader("Access-Control-Allow-Origin", "*");

  // Access the uploaded file through req.file
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Resize and compress the image
  const resizedImageBuffer = await sharp(req.file.buffer)
    .resize({ width: 247 }) // Resize to a maximum width of 247 pixels (adjust as needed)
    // .toFormat("jpeg", { quality: 75 }) // Convert to JPEG format with 80% quality
    .toBuffer();

  // Generate a unique file name
  // const uniqueFileName = `${uuidv4()}_${Date.now()}_${Math.random()
  //   .toString(36)
  //   .substring(7)}.${req.file.originalname.split('.').pop()}`;
  const uniqueFileName = user;

  const file = bucket.file(`uploads/${uniqueFileName}.png`);
  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype,
    },
  });

  stream.on("error", (err) => {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  });

  stream.on("finish", async () => {
    // Construct the URL for the uploaded file
    const imageUrl = `https://asset-cocola.vercel.app/${uniqueFileName}.png`;

    return res.json({
      success: true,
      message: "File uploaded successfully",
      imageUrl,
    });
  });

  stream.end(resizedImageBuffer);
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
