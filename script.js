import TelegramBot from 'node-telegram-bot-api';

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with the token you got from the BotFather
const token = '7221990979:AAF8foSmrHHPYHsCuL0J1poduf7RJBIS4y4';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Listen for any kind of message. There are different kinds of messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Check if the message is a command and if it's the /start command
    if (msg.text.toLowerCase() === '/start') {
        // Send a welcome message
        bot.sendMessage(chatId, '♠️Welcome to Card Captain👨🏻‍✈️ - 🤖AI Blackjack card counting mini-app♥️\nTo start the mini-app press the button here👇');
    }
});