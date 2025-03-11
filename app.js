const express = require('express');
const cors = require('cors'); 
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
const port = 8080;

app.use(cors());  // Enable CORS for frontend requests
app.use(express.json()); 

const chatHistoryDir = path.join(__dirname, 'chat_history');

if (!fs.existsSync(chatHistoryDir)) {
  fs.mkdirSync(chatHistoryDir);
}

const apiKey = process.env.GROQ_API_KEY || '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';
const systemPrompt = "Your name is AYANFE, an AI chatbot created by AYANFE.";

const groq = new Groq({ apiKey });

const loadChatHistory = (uid) => {
  const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);
  try {
    if (fs.existsSync(chatHistoryFile)) {
      return JSON.parse(fs.readFileSync(chatHistoryFile, 'utf8'));
    } else {
      return [];
    }
  } catch (error) {
    console.error(`Error loading chat history for UID ${uid}:`, error);
    return [];
  }
};

const appendToChatHistory = (uid, chatHistory) => {
  const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);
  try {
    fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
  } catch (error) {
    console.error(`Error saving chat history for UID ${uid}:`, error);
  }
};

app.post('/ask', async (req, res) => {
  const { question, uid } = req.body;
  if (!question || !uid) return res.status(400).json({ error: 'Invalid request' });

  const chatHistory = loadChatHistory(uid);
  const timestamp = new Date().toLocaleTimeString();

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: question, timestamp }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: chatMessages,
      model: "llama3-70b-8192",
      temperature: 0.6,
      max_tokens: 8192,
      top_p: 0.8
    });

    const assistantResponse = chatCompletion.choices[0].message.content;

    chatHistory.push({ role: "user", content: question, timestamp });
    chatHistory.push({ role: "assistant", content: assistantResponse, timestamp });

    appendToChatHistory(uid, chatHistory);

    res.json({ answer: assistantResponse, timestamp });
  } catch (error) {
    console.error("Error in chat completion:", error);
    res.status(500).json({ error: 'Failed to retrieve answer' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Ayanfe AI is running on port ${port}`);
});
