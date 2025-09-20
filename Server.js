const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

// --- IMPORTANT: REPLACE THESE VALUES ---
const PROJECT_ID = "your-google-cloud-project-id";
const LOCATION = "us-central1"; // Or the region of your endpoint
const ENDPOINT_ID = "your-vertex-ai-endpoint-id";
// -----------------------------------------

const app = express();
// Allow requests from any origin. For production, you might want to restrict this.
app.use(cors()); 
app.use(bodyParser.json({ limit: '10mb' })); // Allow large image payloads

// This is the authentication setup using the service account
const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

// The main analysis route that your website will call
app.post('/api/server', async (req, res) => {
  try {
    const { front, left, right } = req.body;
    if (!front || !left || !right) {
      return res.status(400).json({ error: 'Missing one or more images (front, left, right).' });
    }

    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    const endpointUrl = https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/${ENDPOINT_ID}:predict;
    
    // The prompt that instructs the model, same as your original code
    const prompt = `Analyze the user's facial skin from the three provided images (front, left, right). Respond ONLY with a valid JSON object. The object must have three keys: "skin_concerns", "product_recommendations", and "lifestyle_recommendations".
    1. "skin_concerns": An array of up to 3 strings for the most prominent issues.
    2. "product_recommendations": An array of 2-3 objects, each with "product_type", "reason", and "key_ingredients".
    3. "lifestyle_recommendations": An object with two keys: "diet" and "lifestyle".
        - "diet": An object with "introduction" (string), "foods_to_eat" (array of strings), and "foods_to_avoid" (array of strings).
        - "lifestyle": An object with "introduction" (string) and "tips" (array of strings).`;

    // Construct the payload for the Vertex AI API
    const payload = {
      instances: [
        {
          content: JSON.stringify({
            prompt: prompt,
            images: [
              { image_bytes: { b64: front } },
              { image_bytes: { b64: left } },
              { image_bytes: { b64: right } },
            ]
          })
        }
      ],
      // The parameters for your model might be different, adjust if needed.
      parameters: {
        candidateCount: 1,
        maxOutputTokens: 2048,
        temperature: 0.5,
        topP: 0.95,
        topK: 40
      }
    };
    
    const response = await axios.post(endpointUrl, payload, {
      headers: {
        'Authorization': Bearer ${accessToken},
        'Content-Type': 'application/json'
      }
    });

    // Send the successful analysis back to the website
    res.json(response.data);

  } catch (error) {
    console.error('Error in analysis:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred during analysis.', details: error.message });
  }
});

// This makes the backend runnable. Vercel uses this file automatically.
module.exports = app;