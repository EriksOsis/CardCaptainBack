const TelegramBot = require('node-telegram-bot-api');

// Replace with your Telegram bot token
const token = '7416479629:AAGc9J2hepHHkb9ApeeEORHnnFPaOFnLkuE';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Initialize user states
const userStates = new Map();

const imagePath = './Screenshot 2024-08-11 at 22.48.40.png';

// Hi-Lo card values
const cardValues = {
  '2': 1, '3': 1, '4': 1, '5': 1, '6': 1,
  '7': 0, '8': 0, '9': 0,
  '10': -1, 'J': -1, 'Q': -1, 'K': -1, 'A': -1
};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Send the start game button
  bot.sendPhoto(chatId, imagePath, { caption: "Welcome to ♠️CardCobra🐍 - Blackjack Card Counter!" })
    .then(() => {
      bot.sendMessage(chatId, "Ready to start the game?", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "♠️Start Game♥️", callback_data: 'start_game' }]
          ]
        }
      });
    });
});

// Handle callback queries
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const state = userStates.get(chatId) || {};

  if (callbackQuery.data === 'start_game') {
    // Initialize the user's state for a new game
    userStates.set(chatId, {
      runningCount: 0,
      playerHands: [[]], // Initialize with one hand
      dealerCards: [],
      gameOver: false,
      awaitingCardFor: 'player', // Track whether the next card is for the player or dealer
      awaitingInsuranceDecision: false,
      tookInsurance: false,
      insurancePayout: false,
      currentHandIndex: 0, // Track which hand is currently being played
      splitting: false // Track if the player is in the process of splitting
    });

    bot.sendMessage(chatId, "Let's start the game. What is the dealer's upcard?", {
      reply_markup: {
        inline_keyboard: generateCardButtons()
      }
    });
    return;
  }

  const card = callbackQuery.data;

  if (state.gameOver) {
    bot.sendMessage(chatId, "The game is over! Please click 'Start New Game' to begin a new game.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Start New Game", callback_data: 'start_game' }]
        ]
      }
    });
    return;
  }

  if (state.awaitingInsuranceDecision) {
    handleInsuranceDecision(chatId, state, card);
    return;
  }

  if (!cardValues.hasOwnProperty(card)) {
    bot.sendMessage(chatId, "Invalid card. Please enter a valid card (2-10, J, Q, K, A).");
    return;
  }

  if (state.dealerCards.length === 0) {
    // Record dealer's upcard
    state.dealerCards.push(card);
    state.runningCount += cardValues[card];
    bot.sendMessage(chatId, "Dealer's upcard is noted. Now, enter your first card.", {
      reply_markup: {
        inline_keyboard: generateCardButtons()
      }
    });
  } else if (state.playerHands[0].length < 2 && !state.splitting) {
    // Record player's initial cards
    state.playerHands[0].push(card);
    state.runningCount += cardValues[card];

    if (state.playerHands[0].length === 2) {
      if (state.dealerCards[0] === 'A') {
        showGameState(chatId, state); // Show state before offering insurance
        offerInsurance(chatId, state); // Offer insurance if the dealer's upcard is an Ace
      } else {
        checkForWinner(chatId, state);
        if (!state.gameOver) {
          givePlayerAdvice(chatId, state);
        }
      }
    } else {
      bot.sendMessage(chatId, "Enter your second card.", {
        reply_markup: {
          inline_keyboard: generateCardButtons()
        }
      });
    }
  } else if (state.splitting) {
    // Handle cards for split hands
    state.playerHands[state.currentHandIndex].push(card);
    state.runningCount += cardValues[card];

    // Move to the next hand or finish splitting
    if (state.currentHandIndex < state.playerHands.length - 1) {
      state.currentHandIndex++;
      bot.sendMessage(chatId, `What is the first card of your next hand?`, {
        reply_markup: {
          inline_keyboard: generateCardButtons()
        }
      });
    } else {
      state.splitting = false;
      state.currentHandIndex = 0;
      checkForWinner(chatId, state);
      if (!state.gameOver) {
        givePlayerAdvice(chatId, state);
      }
    }
  } else {
    // Handle further cards for the player or dealer
    if (state.awaitingCardFor === 'player') {
      state.playerHands[state.currentHandIndex].push(card);
      state.runningCount += cardValues[card];
      checkForWinner(chatId, state);
      if (!state.gameOver) {
        givePlayerAdvice(chatId, state);
      }
    } else if (state.awaitingCardFor === 'dealer') {
      state.dealerCards.push(card);
      state.runningCount += cardValues[card];
      handleDealerTurn(chatId, state);
    }
  }

  // Update the user's state
  userStates.set(chatId, state);
});

// Generate card buttons
function generateCardButtons() {
  const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  return [
    [
      { text: '2', callback_data: '2' },
      { text: '3', callback_data: '3' },
      { text: '4', callback_data: '4' }
    ],
    [
      { text: '5', callback_data: '5' },
      { text: '6', callback_data: '6' },
      { text: '7', callback_data: '7' }
    ],
    [
      { text: '8', callback_data: '8' },
      { text: '9', callback_data: '9' },
      { text: '10', callback_data: '10' }
    ],
    [
      { text: 'J', callback_data: 'J' },
      { text: 'Q', callback_data: 'Q' },
      { text: 'K', callback_data: 'K' },
      { text: 'A', callback_data: 'A' }
    ]
  ];
}

// Function to show the current game state
function showGameState(chatId, state) {
  const playerTotals = state.playerHands.map(hand => calculateHandValue(hand));
  const dealerTotal = calculateHandValue(state.dealerCards);

  if (state.playerHands.length > 1) {
    // Show detailed hand information when there are multiple hands
    bot.sendMessage(chatId, `Your hands: ${state.playerHands.map((hand, index) => `Hand ${index + 1}: ${hand.join(' and ')} (Total: ${playerTotals[index]})`).join('\n')}\nDealer's cards: ${state.dealerCards.join(' and ')} (Total: ${dealerTotal})\nRunning count: ${state.runningCount}`);
  } else {
    // Show simplified information when there is only one hand
    bot.sendMessage(chatId, `Your cards: ${state.playerHands[0].join(' and ')} (Total: ${playerTotals[0]})\nDealer's cards: ${state.dealerCards.join(' and ')} (Total: ${dealerTotal})\nRunning count: ${state.runningCount}`);
  }
}

// Function to offer insurance with advice
function offerInsurance(chatId, state) {
  let advice = "no"; // Default advice is not to take insurance
  if (state.runningCount > 3) { // Example threshold, adjust based on your strategy
    advice = "yes";
  }

  bot.sendMessage(chatId, `Dealer's upcard is an Ace. Do you want to take insurance? The current running count is ${state.runningCount}. Based on the count, the advice is '${advice}'.`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Yes', callback_data: 'yes' }, { text: 'No', callback_data: 'no' }]
      ]
    }
  });
  state.awaitingInsuranceDecision = true;
}

// Function to handle the insurance decision
function handleInsuranceDecision(chatId, state, decision) {
  state.awaitingInsuranceDecision = false;

  if (decision.toLowerCase() === 'yes') {
    state.tookInsurance = true;
    bot.sendMessage(chatId, "You took insurance.");
  } else {
    bot.sendMessage(chatId, "You declined insurance.");
  }

  // Continue the game after the insurance decision
  continueGameAfterInsurance(chatId, state);
}

// Function to continue the game after insurance is handled
function continueGameAfterInsurance(chatId, state) {
  if (!state.gameOver) {
    showGameState(chatId, state); // Show state after insurance is resolved
    givePlayerAdvice(chatId, state);
  }
}

// Function to handle the dealer's turn
function handleDealerTurn(chatId, state) {
  const dealerTotal = calculateHandValue(state.dealerCards);

  if (dealerTotal >= 17) {
    // Dealer stands
    checkForWinner(chatId, state);
  } else {
    // Dealer draws another card
    bot.sendMessage(chatId, "Dealer's turn. What card has been dealt to the dealer?", {
      reply_markup: {
        inline_keyboard: generateCardButtons()
      }
    });
    state.awaitingCardFor = 'dealer'; // Ensure the next card is counted for the dealer
  }
}

// Function to check if there is a winner or loser
function checkForWinner(chatId, state) {
  const playerTotals = state.playerHands.map(hand => calculateHandValue(hand));
  const dealerTotal = calculateHandValue(state.dealerCards);

  let resultMessage = "";

  if (state.tookInsurance) {
    if (dealerHasBlackjack(state)) {
      resultMessage += "Dealer has Blackjack! You win the insurance bet.\n";
      state.insurancePayout = true;
    } else {
      resultMessage += "Dealer does not have Blackjack. You lose the insurance bet.\n";
      state.insurancePayout = false;
    }
    // Reset the insurance flag
    state.tookInsurance = false;
  }

  for (let i = 0; i < playerTotals.length; i++) {
    const playerTotal = playerTotals[i];
    if (playerTotal > 21) {
      resultMessage += `Hand ${i + 1}: You busted! Dealer wins.\n`;
      state.gameOver = true;
    } else if (dealerTotal > 21) {
      resultMessage += `Hand ${i + 1}: Dealer busted! You win.\n`;
      state.gameOver = true;
    } else if (playerTotal === 21) {
      resultMessage += `Hand ${i + 1}: You got Blackjack! You win.\n`;
      state.gameOver = true;
    } else if (dealerTotal === 21) {
      resultMessage += `Hand ${i + 1}: Dealer got Blackjack! Dealer wins.\n`;
      state.gameOver = true;
    } else if (dealerTotal >= 17 && dealerTotal > playerTotal) {
      resultMessage += `Hand ${i + 1}: Dealer stands with ${dealerTotal}. Dealer wins.\n`;
      state.gameOver = true;
    } else if (dealerTotal >= 17 && dealerTotal < playerTotal) {
      resultMessage += `Hand ${i + 1}: Dealer stands with ${dealerTotal}. You win.\n`;
      state.gameOver = true;
    } else if (dealerTotal >= 17 && dealerTotal === playerTotal) {
      resultMessage += `Hand ${i + 1}: Dealer stands with ${dealerTotal}. It's a tie.\n`;
      state.gameOver = true;
    }

    if (state.gameOver) {
      break;
    }
  }

  if (state.gameOver) {
    bot.sendMessage(chatId, resultMessage.trim(), {}).then(() => {
      bot.sendMessage(chatId, "Game over! Type /start to play again.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Start New Game", callback_data: 'start_game' }]
          ]
        }
      });
    });
  } else if (!state.splitting) {
    showGameState(chatId, state);  // Show game state only if the game is not over
  }
}

// Function to end the game properly
function endGame(chatId, state) {
  bot.sendMessage(chatId, "Game over! Type /start to play again.", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Start New Game", callback_data: 'start_game' }]
      ]
    }
  });
}

// Function to give the player advice, now including splitting logic
function givePlayerAdvice(chatId, state) {
  // Only provide advice if the game is not over
  if (state.gameOver) {
    return;
  }

  const currentHand = state.playerHands[state.currentHandIndex];
  const playerTotal = calculateHandValue(currentHand);
  const dealerUpCard = state.dealerCards[0]; // Assuming the dealer's upcard is the first card

  let advice;

  // Check if the player has a pair (for splitting)
  if (currentHand.length === 2 && currentHand[0] === currentHand[1]) {
    const pairValue = currentHand[0];
    if (pairValue === 'A' || pairValue === '8') {
      advice = "Split.";
    } else if (pairValue === '10' || pairValue === '5') {
      advice = playerTotal >= 17 ? "Stand." : "Hit.";
    } else if (pairValue === '9') {
      advice = (dealerUpCard !== '7' && dealerUpCard !== '10' && dealerUpCard !== 'A') ? "Split." : "Stand.";
    } else if (pairValue === '7') {
      advice = dealerUpCard <= '7' ? "Split." : "Hit.";
    } else if (pairValue === '6') {
      advice = dealerUpCard <= '6' ? "Split." : "Hit.";
    } else if (pairValue === '3' || pairValue === '2') {
      advice = dealerUpCard <= '7' ? "Split." : "Hit.";
    } else {
      advice = "Hit.";
    }
  } else {
    // Basic strategy advice when not splitting
    if (playerTotal >= 17) {
      advice = "Stand.";
    } else if (playerTotal >= 13 && dealerUpCard <= '6') {
      advice = "Stand.";
    } else if (playerTotal === 12 && dealerUpCard >= '4' && dealerUpCard <= '6') {
      advice = "Stand.";
    } else if (playerTotal <= 11 || (playerTotal === 12 && dealerUpCard >= '7')) {
      advice = "Hit.";
    } else if (playerTotal === 10 || playerTotal === 11) {
      advice = "Double down if possible, otherwise Hit.";
    } else {
      advice = "Hit.";
    }
  }

  // Show game state, advice, and ask for next card in correct order
  bot.sendMessage(chatId, `Advice: ${advice}`).then(() => {
    if (advice === "Stand.") {
      if (state.currentHandIndex < state.playerHands.length - 1) {
        // Move to the next hand if there is one
        state.currentHandIndex++;
        bot.sendMessage(chatId, "What is the first card of your next hand?", {
          reply_markup: {
            inline_keyboard: generateCardButtons()
          }
        });
      } else {
        state.awaitingCardFor = 'dealer'; // Set the next card to be for the dealer
        handleDealerTurn(chatId, state);
      }
    } else if (advice === "Hit." || advice === "Double down if possible, otherwise Hit.") {
      state.awaitingCardFor = 'player'; // Set the next card to be for the player
      bot.sendMessage(chatId, "What card has been dealt to you?", {
        reply_markup: {
          inline_keyboard: generateCardButtons()
        }
      });
    } else if (advice === "Split.") {
      // Prepare for splitting: create two hands and reset the current hand index
      state.splitting = true;
      state.playerHands = [[currentHand[0]], [currentHand[1]]];
      state.currentHandIndex = 0;
      bot.sendMessage(chatId, "You chose to split. What is the first card of your first hand?", {
        reply_markup: {
          inline_keyboard: generateCardButtons()
        }
      });
    }
  });
}

// Calculate hand value function (simplified for this example)
function calculateHandValue(cards) {
  let total = 0;
  let hasAce = false;

  cards.forEach(card => {
    if (card === 'A') {
      hasAce = true;
      total += 11;
    } else if (['10', 'J', 'Q', 'K'].includes(card)) {
      total += 10;
    } else {
      total += parseInt(card);
    }
  });

  if (hasAce && total > 21) {
    total -= 10; // Adjust for Ace being 1 instead of 11
  }

  return total;
}

// Function to check if the dealer has Blackjack
function dealerHasBlackjack(state) {
  const dealerTotal = calculateHandValue(state.dealerCards);
  return dealerTotal === 21;
}

// Start the bot
console.log('Bot is running...');