const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const token = '7221990979:AAF8foSmrHHPYHsCuL0J1poduf7RJBIS4y4';
const bot = new TelegramBot(token, { polling: true });

// Express app to listen to $PORT
const app = express();
const port = process.env.PORT || 3000; // Use the port assigned by Heroku or default to 3000


app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (msg.text.toLowerCase() === '/start') {
    bot.sendPhoto(chatId, './photo_2024-08-22 11.23.28.jpeg', {
      caption: '♠️Welcome to Card Captain👨🏻‍✈️ - 🤖AI Blackjack card counting mini-app♥️\nTo start the mini-app, press the button below 👇',
      reply_markup: {
        inline_keyboard: [[
          { text: '♥️Open App♠️', web_app: { url: 'https://c0rdc0ptain.netlify.app' } }]
        ]
      }
    });
  }
});
