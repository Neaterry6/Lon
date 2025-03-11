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

// Serve static files (CSS, images, JS)
app.use(express.static('public'));

// Serve the login/signup HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const chatHistoryDir = path.join(__dirname, 'groqllama70b');

if (!fs.existsSync(chatHistoryDir)) {
  fs.mkdirSync(chatHistoryDir);
}

// **Updated API Key**
const apiKey = "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";
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

// Function to save chat history (Limit to last 10 messages)
const saveChatHistory = (uid, chatHistory) => {
  const filePath = path.join(chatHistoryDir, `memory_${uid}.json`);
  const limitedHistory = chatHistory.slice(-10); // Keep only last 10 messages
  fs.writeFileSync(filePath, JSON.stringify(limitedHistory, null, 2));
};

// AI Chat Route
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
    console.log(`User (${uid}) asked: ${question}`); // Debugging

    const response = await groq.chat.completions.create({
      messages: chatMessages,
      model: "llama3-70b-8192",
      temperature: 0.6,
      max_tokens: 8192,
      top_p: 0.8
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error('AI did not return a response');
    }

    const aiResponse = response.choices[0].message.content;
    const timestamp = new Date().toISOString();

    chatHistory.push({ role: "user", content: question, timestamp });
    chatHistory.push({ role: "assistant", content: aiResponse, timestamp });

    saveChatHistory(uid, chatHistory);

    console.log(`AI Response: ${aiResponse}`); // Debugging

    res.json({ answer: aiResponse, timestamp });
  } catch (error) {
    console.error("Error fetching AI response:", error);
    res.status(500).json({ error: 'No response from AI. Please try again.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
