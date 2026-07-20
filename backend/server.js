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
    "subtasks": [
  "Review assignment instructions",
  "Complete required work",
  "Check answers before submitting"
],
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
- subtasks should be an array of 2-5 smaller steps that help complete the assignment.
- If the assignment is already small, return an empty array.

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

app.post("/analyze-calendar-event", async (req, res) => {
  try {
    const { title, date, description } = req.body;

    const prompt = `
You are a study planning assistant.

Convert this Google Calendar event into a study task.

Calendar Event:
Title: ${title}
Date: ${date}
Description: ${description || "None"}

Return ONLY valid JSON:

{
  "title": "study task title",
  "difficulty": "Easy, Medium, or Hard",
  "deadline": "YYYY-MM-DD",
  "subtasks": [
    "subtask 1",
    "subtask 2"
  ]
}

Choose difficulty based on workload.
Create useful study subtasks if appropriate.
`;

    const response = await postJson(
      "https://models.inference.ai.azure.com/chat/completions",
      {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      },
    );

    const suggestion = JSON.parse(response.choices[0].message.content);

    res.json(suggestion);
  } catch (error) {
    console.error("Calendar AI error:", error.message);

    res.status(500).json({
      error: "Failed to analyze calendar event.",
    });
  }
});

app.post("/generate-study-plan", async (req, res) => {
  try {
    const { tasks, calendarEvents, freeTime } = req.body;

    const now = new Date();
    const currentDateTime = now.toLocaleString();

    const prompt = `
You are an AI academic scheduling assistant.

Current date and time:
${currentDateTime}
The student has these tasks:

${JSON.stringify(tasks, null, 2)}

The student has these Google Calendar events:

${JSON.stringify(calendarEvents, null, 2)}

The student is available to study during these free time blocks:

${JSON.stringify(freeTime, null, 2)}

IMPORTANT HARD CONSTRAINTS:
- The ONLY allowed study times are the provided freeTime blocks.
- Never schedule outside freeTime.
- Calendar events are unavailable time and must never overlap with study sessions.
- If freeTime begins at 3 PM, do not schedule anything before 3 PM.
- Do not schedule study sessions before the current time if the day is today.
- Do not use past free time blocks.
- Before creating the schedule, compare every proposed study session against freeTime. If the start and end time do not fit inside a freeTime block, reject that session and choose another time.
- If freeTime is insufficient, schedule fewer tasks rather than breaking these rules.
- Prioritize earlier deadlines.
- If a task requires multiple sessions, spread them across different days when possible.
- Give harder tasks longer study sessions.
- Calendar events are fixed commitments and must appear inside the final schedule.
- Include calendar events in the schedule array with "type":"calendar".
- Preserve the exact date and time of calendar events.
- The final schedule must be one chronological list containing BOTH study sessions and calendar events.
- Do not create lunch breaks, rest breaks, meals, identification of buffer time / relaxation to avoid burnout, nor personal activities.
- Every item in the schedule must be either a study session or a Google Calendar event.
- If there isn't enough free time, explain that in the "reason" field.
- The freeTime list is the ONLY source of truth for available study times.
- If a time is not explicitly listed in freeTime, it is unavailable.
- Reject any schedule that uses a time not found in freeTime.

Return ONLY valid JSON.

Create an optimized study schedule.

Estimate the amount of study time each task realistically requires based on its title, difficulty, deadline, and subtasks.

Some tasks may require multiple study sessions.

Do not assume every task takes one hour.

Long projects may require several sessions spread across multiple days.

Short homework assignments may only require 20–45 minutes.

Rules:

- Never schedule during existing calendar events.
- Prioritize assignments with earlier deadlines.
- Hard tasks should receive longer study sessions.
- Easy tasks can receive shorter sessions.
- Break difficult assignments into multiple sessions if necessary.
- Study sessions should be between 30 and 90 minutes.
- Include a short explanation for every recommendation.

The schedule array MUST ONLY contain:
- Study sessions created from the provided tasks.
- Google Calendar events from the provided calendarEvents.

NEVER include:
- Lunch
- Breaks
- Rest periods
- Meals
- Free time
- Personal activities
- Any event that is not a task or Google Calendar event

If there is unused time, leave it empty. Do not fill it.

Return ONLY valid JSON.

{
  "schedule":[
    {
      "date":"2026-07-20",
      "day":"Monday",
      "start":"5:00 PM",
      "end":"5:40 PM",
      "type":"calendar",
      "task":"Coding Project Weekly Check-Ins",
      "reason":"Google Calendar event"
    },
    {
      "date":"2026-07-20",
      "day":"Monday",
      "start":"6:00 PM",
      "end":"7:00 PM",
      "type":"study",
      "task":"Study Biology Unit 5",
      "reason":"Test in two days."
    }
  ]
}
`;

    const response = await postJson(
      "https://models.inference.ai.azure.com/chat/completions",
      {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
      },
    );

    const schedule = JSON.parse(response.choices[0].message.content);

    schedule.schedule = schedule.schedule.filter((item) => {
      if (!item.date) return true;

      const sessionTime = new Date(`${item.date} ${item.start}`);

      return sessionTime > now;
    });

    res.json(schedule);
  } catch (error) {
    console.error("Study planner error:", error.message);

    res.status(500).json({
      error: "Unable to generate study plan.",
    });
  }
});

app.listen(3000, () => {
  console.log("AI server running at http://localhost:3000");
});
