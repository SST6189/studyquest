const express = require("express");
const cors = require("cors");
const https = require("https");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const apiKey = process.env.GITHUB_TOKEN;

if (!apiKey) {
  console.error("Missing GITHUB_TOKEN in .env");
  process.exit(1);
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const request = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Authorization: "Bearer " + apiKey,
        },
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(data));
          }
        });
      },
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

app.post("/scan-homework", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    const response = await postJson(
      "https://models.inference.ai.azure.com/chat/completions",
      {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this homework image and extract every assignment you see.

Return ONLY JSON in this format:

{
  "suggestion": {
    "tasks": [
      {
        "title": "",
        "difficulty": "Easy",
        "deadline": "",
        "subject": "",
        "notes": "",
        "confidence": 0.0
      }
    ]
  }
}

Rules:
- Create a separate task object for EACH assignment visible in the image.
- difficulty must be one of: Easy, Medium, Hard.
- deadline must be YYYY-MM-DD format.
- If the image says "today", use today's date.
- If it says "tomorrow", use tomorrow's date.
- If no deadline is visible, use null.
- confidence must be a number between 0 and 1.
- Keep titles short and clear.
- Do not combine multiple assignments into one task.

Today's date is ${new Date().toISOString().split("T")[0]}.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      },
    );

    const content = response.choices[0].message.content;
    res.json(JSON.parse(content));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Unable to analyze image." });
  }
});

app.listen(3000, () => {
  console.log("AI server running at http://localhost:3000");
});
