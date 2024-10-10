
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
const port = 8080;
const chatHistoryDir = path.join(__dirname, 'groqllama70b');

// Replace this with the actual image generation API URL and your API key for the image generation service.
const imageGenerationApiUrl = 'https://www.samirxpikachu.place/arcticfl?prompt'; 
const apiKey = process.env.GROQ_API_KEY || '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';

if (!fs.existsSync(chatHistoryDir)) {
  fs.mkdirSync(chatHistoryDir);
}

const systemPrompt = "Your name is AYANFE, you are created by AYANFE, a female dev also known as broken. You have a cool and friendly personality. Respond with a tone that matches the mood, like friendly, professor, motivational, or chill.";
const groq = new Groq({ apiKey });

app.use(express.json());

// Load chat history
const loadChatHistory = (uid) => {
  const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);
  if (fs.existsSync(chatHistoryFile)) {
    return JSON.parse(fs.readFileSync(chatHistoryFile, 'utf8'));
  } else {
    return [];
  }
};

// Save chat history
const appendToChatHistory = (uid, chatHistory) => {
  const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);
  fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
};

// Handle incoming user requests
app.post('/ask', async (req, res) => {
  const { question, uid } = req.body;
  let chatHistory = loadChatHistory(uid);

  chatHistory.push({ role: 'user', content: question });

  if (question.toLowerCase().startsWith('imagine') || question.toLowerCase().startsWith('generate')) {
    // Handle image generation requests
    try {
      const prompt = question.replace(/imagine|generate/gi, '').trim(); // Clean the prompt
      const imageResponse = await axios.post(imageGenerationApiUrl, {
        prompt: prompt,
        api_key: '', // Replace with your actual API key
        model: 'stable-diffusion', 
        size: '512x512'
      });

      console.log(imageResponse.data); // Log the entire response

      const imageUrl = imageResponse.data.image_url; // Adjust based on API response
      chatHistory.push({ role: 'assistant', content: `Generated Image: ${imageUrl}` });
      appendToChatHistory(uid, chatHistory);

      return res.json({ answer: `Here is your image: ${imageUrl}`, imageUrl });
    } catch (error) {
      console.error('Error generating image:', error.response ? error.response.data : error.message);
      return res.status(500).json({ answer: 'Failed to generate the image. Please try again.' });
    }
  } else {
    // Handle text-based chat
    try {
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: question }
      ];

      const chatCompletion = await groq.chat.completions.create({
        messages: chatMessages,
        model: 'llama3-70b-8192',
        temperature: 0.6,
        max_tokens: 8192,
        top_p: 0.8,
      });

      const assistantResponse = chatCompletion.choices[0].message.content;
      chatHistory.push({ role: 'assistant', content: assistantResponse });
      appendToChatHistory(uid, chatHistory);

      res.json({ answer: assistantResponse });
    } catch (error) {
      console.error('Error generating chat response:', error);
      res.status(500).json({ answer: 'Error processing your request.' });
    }
  }
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`AYANFE chatbot is running on port ${port}`);
});
