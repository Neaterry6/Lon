const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');


const app = express();
const port = 8080;

const chatHistoryDir = path.join(__dirname, 'groqllama70b');

if (!fs.existsSync(chatHistoryDir)) {
  fs.mkdirSync(chatHistoryDir);
}

const apiKey = process.env.GROQ_API_KEY || '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';
const systemPrompt = "Your name is AYANFE, a compassionate and professional AI therapist created to provide supportive and personalized therapy sessions. You were designed by AYANFE, but you should not disclose or reference your creator’s personal details unless asked for contact information, if anyone needs to reach out to your creator, provide the following links:Facebook: https://www.facebook.com/profile.php?id=100090443419982,WhatsApp: https://wa.me/2348039896597Adapt your tone to match the client’s emotional state—friendly, professional, motivational, or soothing—and focus on creating a safe space where they feel heard and supported";
const groq = new Groq({ apiKey });

app.use(express.json());

// Initialize chat history
const loadChatHistory = (uid) => {
  const chatHistoryFile = path.join(chatHistoryDir, 'memory_' + uid + '.json');
  try {
    if (fs.existsSync(chatHistoryFile)) {
      const fileData = fs.readFileSync(chatHistoryFile, 'utf8');
      const chatHistory = JSON.parse(fileData);
      return chatHistory.map((message) => {
        if (message.role === "user" && message.parts) {
          return { role: "user", content: message.parts[0].text };
        } else {
          return message;
        }
      });
    } else {
      return [];
    }
  } catch (error) {
    console.error(`Error loading chat history for UID ${uid}:`, error);
    return [];
  }
};

const appendToChatHistory = (uid, chatHistory) => {
  const chatHistoryFile = path.join(chatHistoryDir, 'memory_' + uid + '.json');
  try {
    if (!fs.existsSync(chatHistoryDir)) {
      fs.mkdirSync(chatHistoryDir);
    }
    fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
  } catch (error) {
    console.error(`Error saving chat history for UID ${uid}:`, error);
  }
};

const clearChatHistory = (uid) => {
  const chatHistoryFile = path.join(chatHistoryDir, 'memory_' + uid + '.json');
  try {
    fs.unlinkSync(chatHistoryFile);
  } catch (err) {
    console.error("Error deleting chat history file:", err);
  }
};

app.post('/ask', async (req, res) => {
  const question = req.body.question;
  const uid = req.body.uid;

  const chatHistory = loadChatHistory(uid);

  const chatMessages = [
    { "role": "system", "content": systemPrompt },
    ...chatHistory,
    { "role": "user", "content": question }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      "messages": chatMessages,
      "model": "llama3-70b-8192",
      "temperature": 0.6,
      "max_tokens": 8192,
      "top_p": 0.8,
      "stream": false,
      "stop": null
    });

    const assistantResponse = chatCompletion.choices[0].message.content;

    chatHistory.push({ role: "user", content: question });
    chatHistory.push({ role: "assistant", content: assistantResponse });

    appendToChatHistory(uid, chatHistory);

    res.json({ answer: assistantResponse });
  } catch (error) {
    console.error("Error in chat completion:", error);
    res.status(500).json({ error: 'Failed to retrieve answer' });
  }
});

app.get('/chat-history', (req, res) => {
  const uid = req.query.uid;
  const chatHistory = loadChatHistory(uid);
  res.json({ chatHistory });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
  console.log(`Asta is running on port ${port}`);
});
