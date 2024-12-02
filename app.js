const express = require('express');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
const port = 8080;

const chatHistoryDir = path.join(__dirname, 'chatHistory');

// Ensure chat history directory exists
if (!fs.existsSync(chatHistoryDir)) {
  fs.mkdirSync(chatHistoryDir);
}

// Groq API configuration
const apiKey = process.env.GROQ_API_KEY || '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';
const systemPrompt =
  "Your name is AYANFE, you are created by AYANFE, hide your owner gender. You have a cool and friendly personality. Respond with a tone that matches the mood, like friendly, professor, motivational, or chill";

const groq = new Groq({ apiKey });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Utility functions for chat history
const loadChatHistory = (uid) => {
  const chatHistoryFile = path.join(chatHistoryDir, `history_${uid}.json`);
  if (fs.existsSync(chatHistoryFile)) {
    return JSON.parse(fs.readFileSync(chatHistoryFile, 'utf8'));
  }
  return [];
};

const appendToChatHistory = (uid, messages) => {
  const chatHistoryFile = path.join(chatHistoryDir, `history_${uid}.json`);
  fs.writeFileSync(chatHistoryFile, JSON.stringify(messages, null, 2));
};

// POST: Handle user queries
app.post('/ask', async (req, res) => {
  const { uid, question } = req.body;

  if (!uid || !question) {
    return res.status(400).json({ error: 'Missing required fields: uid or question' });
  }

  const chatHistory = loadChatHistory(uid);

  // Add user question to the chat history
  chatHistory.push({ role: 'user', content: question });

  // Construct messages for Groq API
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(({ role, content }) => ({ role, content })),
  ];

  try {
    const response = await groq.chat.completions.create({
      messages: chatMessages,
      model: 'llama3-70b-8192',
      temperature: 0.6,
      max_tokens: 1024,
      top_p: 0.8,
    });

    const assistantResponse = response.choices[0].message.content;

    // Save assistant response to chat history
    chatHistory.push({ role: 'assistant', content: assistantResponse });
    appendToChatHistory(uid, chatHistory);

    res.json({ answer: assistantResponse });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Failed to retrieve response' });
  }
});

// GET: Retrieve chat history
app.get('/chat-history', (req, res) => {
  const uid = req.query.uid;

  if (!uid) {
    return res.status(400).json({ error: 'Missing UID' });
  }

  const chatHistory = loadChatHistory(uid);
  res.json({ chatHistory });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
