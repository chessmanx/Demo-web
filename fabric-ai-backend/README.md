# Fabric AI Backend

This folder contains a Node.js backend service that loads a pre‑trained Teachable Machine image classification model and exposes an HTTP API for running predictions.  It also persists every prediction to a database via Prisma.

## Contents

* `server.js` – Express server with a `/predict` endpoint that accepts image uploads, runs inference using TensorFlow.js and stores the results.
* `my_model/` – The exported Teachable Machine model (JSON and binary weights) and its metadata.  The metadata includes the list of class labels.
* `prisma/schema.prisma` – Prisma schema defining the `Prediction` model used to store results.
* `.env.example` – Example environment configuration specifying the database connection and optional server port.
* `package.json` – Node package definition listing the required dependencies (`express`, `multer`, `@tensorflow/tfjs-node`, `@prisma/client`) and dev dependency (`prisma`).

## Prerequisites

1. **Node.js** – Install Node.js (version 16 or higher recommended) from [nodejs.org](https://nodejs.org/).
2. **npm** – Comes bundled with Node.js.
3. **Database** – By default the project uses SQLite.  Prisma will create an SQLite database file for you.  For production you can change the `provider` in `prisma/schema.prisma` and the `DATABASE_URL` in your `.env` file to point to PostgreSQL or another supported database.

## Setup

1. Navigate into the `fabric-ai-backend` directory:

   ```sh
   cd fabric-ai-backend
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Copy the example environment file and customise as needed:

   ```sh
   cp .env.example .env
   # Edit .env to change DATABASE_URL or PORT
   ```

4. Generate the Prisma client and apply the initial migration.  This will create your database and the `Prediction` table.

   ```sh
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. Start the server:

   ```sh
   npm start
   ```

   The API will start on `http://localhost:3000` (or whatever port you configure via `PORT`).  You should see the message `Server listening on port 3000` in your console.

## Usage

Once the server is running, you can send a `POST` request to `/predict` with an image to classify.  The request must be multipart/form‑data with a single field called `image` containing the binary image data.  For example using `curl`:

```sh
curl -F "image=@/path/to/your/image.jpg" http://localhost:3000/predict
```

The response will be a JSON object containing the predicted label and probability, e.g.:

```json
{
  "ok": true,
  "label": "ลายกาบบัวธรรมดา",
  "score": 0.97
}
```

Every prediction is persisted to the database.  You can explore the database using Prisma Studio:

```sh
npx prisma studio
```

This will open a web interface showing all stored predictions.

## Deployment

To deploy this backend you can use any Node‑capable hosting service (Render, Railway, Genezio etc.).  The service must support Node.js and provide a way to set environment variables and persist your database.  Follow your host’s documentation to deploy a Node app and run `npm install` plus `npx prisma migrate deploy` to apply migrations in production.

## Training a New Model

This backend assumes you have already exported a Teachable Machine model into the `my_model` folder.  To train a new model:

1. Visit [Teachable Machine](https://teachablemachine.withgoogle.com/) and create an image project.
2. Upload your dataset, train the model, and export it as **TensorFlow.js**.
3. Replace the contents of the `my_model` directory with the new `model.json`, `metadata.json` and weight files.
4. Restart your Node server to load the new model and labels.

For more advanced training (e.g. using TensorFlow or PyTorch directly) refer to the example notebooks provided earlier.

## Local HTTPS (optional)

If you want to serve the frontend over HTTPS locally (useful for testing camera access and other secure‑context features), you can generate a local certificate and use the small HTTPS static server script included at the repository root (`serve-https.js`).

Recommended: use `mkcert` to generate a trusted local certificate. Install `mkcert` (https://github.com/FiloSottile/mkcert) and run the following from your project root:

```powershell
# Install mkcert and the local CA on Windows (follow mkcert docs for full instructions)
mkcert -install
# Generate certs in the project root (creates cert.pem and key.pem)
mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1
```

Alternative: generate a self-signed certificate with OpenSSL (browsers will show a warning that you must accept manually):

```powershell
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
```

Once you have `cert.pem` and `key.pem` in the repository root, run the HTTPS static server from the project root:

```powershell
Set-Location 'C:\Users\ppe37\Downloads\fabric_project'
node serve-https.js
# Open https://localhost:8443/ in your browser
```

If you used `mkcert` the browser will trust the certificate automatically. If you used OpenSSL you will need to accept the browser warning to proceed.
