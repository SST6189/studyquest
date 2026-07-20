const fs = require("fs");
const https = require("https");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "ai.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const apiKey = process.env.GITHUB_TOKEN || process.env.OPENAI_API_KEY;

if (!apiKey || apiKey === "INSERT_YOUR_GITHUB_TOKEN") {
  console.error(
    "Missing GitHub token. Add your token to ai.env as GITHUB_TOKEN=your_token",
  );
  process.exit(1);
}

function getImageMimeType(filePath) {
  var ext = path.extname(filePath).toLowerCase();

  if (ext === ".png") {
    return "image/png";
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }

  return "application/octet-stream";
}

function postJson(url, payload) {
  return new Promise(function (resolve, reject) {
    var body = JSON.stringify(payload);
    var request = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Authorization: "Bearer " + apiKey,
        },
      },
      function (response) {
        var data = "";

        response.setEncoding("utf8");
        response.on("data", function (chunk) {
          data += chunk;
        });
        response.on("end", function () {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error("Invalid JSON response: " + data));
            }
          } else {
            reject(
              new Error(
                "AI request failed with status " +
                  response.statusCode +
                  ": " +
                  data,
              ),
            );
          }
        });
      },
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function readImageAsBase64(filePath) {
  var absolutePath = path.resolve(filePath);
  var fileBuffer = fs.readFileSync(absolutePath);
  return fileBuffer.toString("base64");
}

async function run(imagePath) {
  if (!imagePath) {
    console.error("Usage: node ai.js path/to/homework-image.jpg");
    process.exit(1);
  }

  var base64Image = readImageAsBase64(imagePath);
  var mimeType = getImageMimeType(imagePath);

  if (mimeType === "application/octet-stream") {
    console.error("Unsupported image type. Use .png, .jpg, or .jpeg");
    process.exit(1);
  }

  var response = await postJson(
    "https://models.inference.ai.azure.com/chat/completions",
    {
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Look at the homework image and extract the assignment details as a suggestion for the user to review.

Return JSON with these fields:
Return JSON with an array called "tasks".

Each task should contain:
- title
- difficulty
- deadline
- subject
- notes
- confidence

If multiple assignments appear in the image, create a separate task object for each assignment.

Example format:
{
  "tasks": [
    {
      "title": "Complete math worksheet",
      "difficulty": "medium",
      "deadline": "2026-07-06",
      "subject": "Math",
      "notes": "",
      "confidence": 0.95
    },
    {
      "title": "Read chapter 5",
      "difficulty": "easy",
      "deadline": "2026-07-08",
      "subject": "English",
      "notes": "",
      "confidence": 0.9
    }
  ]
}
  
Rules:
- title should be a clear suggested task name.
- difficulty should be one of 'easy', 'medium', 'hard'.
- deadline should be in YYYY-MM-DD format.
- If the homework says "today", use today's date.
- If it says "tomorrow", use tomorrow's date.
- If no deadline is visible, use null.
- confidence should be a number from 0 to 1.
- Keep the content concise and suitable for a user to verify before creating a task.

Today's date is ${new Date().toISOString().split("T")[0]}.`,
            },
            {
              type: "image_url",
              image_url: {
                url: "data:" + mimeType + ";base64," + base64Image,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    },
  );

  var content = "No response content returned.";

  if (
    response &&
    response.choices &&
    response.choices[0] &&
    response.choices[0].message
  ) {
    content = response.choices[0].message.content;
  }

  console.log(content);
}

run(process.argv[2]).catch(function (error) {
  console.error("AI request failed:", error.message);
  process.exit(1);
});
