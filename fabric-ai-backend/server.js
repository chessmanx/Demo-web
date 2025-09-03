const express = require('express');
const multer = require('multer');
const tf = require('@tensorflow/tfjs-node');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Express and middleware
const app = express();
// Simple CORS middleware (avoids adding external dependency)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// Serve static files from project root so the frontend pages can be loaded from the backend
app.use(express.static(path.join(__dirname, '..')));
// Multer will write incoming files to a temporary folder called `uploads/`
const upload = multer({ dest: 'uploads/' });

// Initialise Prisma client.  The Prisma client reads the DATABASE_URL
// environment variable (see .env.example) to connect to your database.
const prisma = new PrismaClient();

let model;
let labels;

/**
 * Load the TensorFlow.js model and accompanying metadata.  The metadata
 * produced by Teachable Machine includes the list of class names which
 * allows us to map the numeric predictions back to human‑readable labels.
 */
async function loadModel() {
  try {
    const modelPath = path.join(__dirname, 'my_model', 'model.json');
    const metaPath = path.join(__dirname, 'my_model', 'metadata.json');
    // Load the model using a file:// URL.  tf.loadLayersModel will
    // asynchronously read the JSON and binary weights.
    model = await tf.loadLayersModel('file://' + modelPath);
    // Load the metadata and parse the labels array.
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    labels = metadata.labels || [];
    console.log('Model and metadata loaded:', labels);
  } catch (err) {
    console.error('Failed to load model:', err);
  }
}

// Kick off model loading when the server starts
loadModel();

/**
 * Handle image upload and run inference.  This endpoint accepts
 * multipart/form-data with a single field called `image`.  It reads the
 * image from the temporary file, decodes it into a tensor, resizes it
 * to 96×96 (matching the Teachable Machine model input), normalises to
 * [0,1] and then passes it through the model.  The highest scoring
 * class is returned along with the probability score.  The result is
 * persisted to the database via Prisma.
 */
app.post('/predict', upload.single('image'), async (req, res) => {
  try {
    if (!model) {
      return res.status(503).json({ ok: false, error: 'Model not yet loaded' });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Missing image file' });
    }
    // Read the uploaded image file
    const imgBuffer = fs.readFileSync(req.file.path);
    // Decode the image into a tensor (assumes RGB)
    const decoded = tf.node.decodeImage(imgBuffer, 3);
    // Resize to the size used during training.  If you change the
    // training resolution you must update this accordingly.
    const resized = tf.image.resizeBilinear(decoded, [96, 96]);
    // Normalise pixel values to 0‑1 by dividing by 255.
    const normalised = resized.div(255);
    // Add a batch dimension: [height, width, channels] -> [1, height, width, channels]
    const input = normalised.expandDims(0);
    // Run inference
    const logits = model.predict(input);
    // Convert logits tensor to JavaScript array
    const data = logits.dataSync();
    // Find the class with the highest probability
    let maxIndex = 0;
    let maxValue = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i] > maxValue) {
        maxIndex = i;
        maxValue = data[i];
      }
    }
    const predictedLabel = labels[maxIndex] || String(maxIndex);
    // Persist the prediction to the database
    await prisma.prediction.create({
      data: {
        fileName: req.file.originalname,
        label: predictedLabel,
        score: maxValue
      }
    });
    // Send the prediction back to the client
    res.json({ ok: true, label: predictedLabel, score: maxValue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Inference failed' });
  } finally {
    // Delete the temporary file
    fs.unlink(req.file.path, () => {});
  }
});

// Expose a simple health check endpoint
app.get('/', (req, res) => {
  res.send('Fabric AI backend is running');
});

// Start the server on the specified port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});