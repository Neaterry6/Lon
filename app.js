const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
const port = 8080;

app.use(express.json());
app.use(cors()); // Allow frontend requests

const chatHistoryDir = path.join(__dirname, 'groqllama70b');

if (!fs.existsSync(chatHistoryDir)) {
  fs.mkdirSync(chatHistoryDir);
}

const apiKey = process.env.GROQ_API_KEY || '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';
const systemPrompt = "Your name is AYANFE, a compassionate and professional AI therapist created to provide supportive and personalized therapy sessions.";

const groq = new Groq({ apiKey });

// Function to load chat history
const loadChatHistory = (uid) => {
  const filePath = path.join(chatHistoryDir, `memory_${uid}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return [];
};

// Function to save chat history
const saveChatHistory = (uid, chatHistory) => {
  const filePath = path.join(chatHistoryDir, `memory_${uid}.json`);
  fs.writeFileSync(filePath, JSON.stringify(chatHistory, null, 2));
};

app.post('/ask', async (req, res) => {
  const { question, uid } = req.body;
  if (!question || !uid) {
    return res.status(400).json({ error: 'Question and UID are required' });
  }

  const chatHistory = loadChatHistory(uid);

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: question }
  ];

  try {
    const response = await groq.chat.completions.create({
      messages: chatMessages,
      model: "llama3-70b-8192",
      temperature: 0.6,
      max_tokens: 8192,
      top_p: 0.8
    });

    const aiResponse = response.choices[0].message.content;
    const timestamp = new Date().toISOString();

    chatHistory.push({ role: "user", content: question, timestamp });
    chatHistory.push({ role: "assistant", content: aiResponse, timestamp });

    saveChatHistory(uid, chatHistory);

    res.json({ answer: aiResponse, timestamp });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: 'AI response failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
