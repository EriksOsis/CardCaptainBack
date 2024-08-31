const cardValues = {
    '2': 1, '3': 1, '4': 1, '5': 1, '6': 1,
    '7': 0, '8': 0, '9': 0,
    '10': -1, 'J': -1, 'Q': -1, 'K': -1, 'A': -1
};

const cardImages = {
    '2': './2_of_diamonds.png',
    '3': './3_of_clubs.png',
    '4': './4_of_hearts.png',
    '5': './5_of_spades.png',
    '6': './6_of_diamonds.png',
    '7': './7_of_clubs.png',
    '8': './8_of_hearts.png',
    '9': './9_of_spades.png',
    '10': './10_of_diamonds.png',
    'J': './jack_of_clubs2.png',
    'Q': './queen_of_spades2.png',
    'K': './king_of_hearts2.png',
    'A': './ace_of_diamonds.png'
};

let gameState = {
    runningCount: 0,
    playerHands: [[]],  // Now handling multiple hands
    dealerCards: [],
    currentHandIndex: 0,
    awaitingCardFor: 'dealer',
    gameOver: false,
    analysing: false,
    dealerInitial: true, // To track if the dealer is dealing the first card
    splitOccurred: false,  // To track if a split occurred
    insuranceTaken: null,  // To track if insurance was taken
    awaitingInsurance: false // To track if we are waiting for insurance decision
};

function newGame() {
    gameState = {
        runningCount: 0,
        playerHands: [[]],
        dealerCards: [],
        currentHandIndex: 0,
        awaitingCardFor: 'dealer',
        gameOver: false,
        analysing: false,
        dealerInitial: true,
        splitOccurred: false,
        insuranceTaken: null,
        awaitingInsurance: false
    };
    clearCards();
    updateCounts();
    updateInstruction("Let's start the game.\nWhat is the dealer's upcard?");
    updateBestMove('Start'); // Initially empty, no advice until cards are dealt

    // Reset the Dealer's Bust percentage
    document.querySelector('.bust-percentage-text').textContent = '0%';
}

function clearCards() {
    const playerContainer = document.getElementById('playerCardsContainer');
    playerContainer.innerHTML = ''; // Clear all player hands
    playerContainer.appendChild(document.createElement('div')).id = 'playerHand0';
    playerContainer.firstChild.classList.add('cards');

    document.getElementById('dealerCards').innerHTML = ''; // Clear dealer cards
}

function addCard(card) {
    if (gameState.gameOver || gameState.analysing) return;

    if (gameState.awaitingCardFor === 'dealer') {
        addCardToHand('dealerCards', card);
        gameState.dealerCards.push(card);
        updateCounts();
        updateDealerBustPercentage();

        if (gameState.dealerInitial) {
            gameState.dealerInitial = false;
            stateAwaitingCard('player', "Dealer's upcard is noted.\nNow, enter your first card.");
        } else {
            checkDealerTurn();
        }
    } else if (gameState.awaitingCardFor === 'player') {
        let currentHand = gameState.playerHands[gameState.currentHandIndex];
        addCardToHand(`playerHand${gameState.currentHandIndex}`, card);
        currentHand.push(card);

        updateCounts();  // Ensure the player's hand value is updated immediately

        const playerTotal = calculateHandValue(currentHand);

        // Now we check for insurance after the player has received two cards.
        if (currentHand.length === 2 && gameState.dealerCards[0] === 'A' && !gameState.awaitingInsurance) {
            gameState.awaitingInsurance = true;
            offerInsurance();
            return; // Stop further actions until insurance is resolved
        }

        if (gameState.doubleDown) {
            gameState.doubleDown = false; // Reset double down state
            updateCounts();

            if (playerTotal > 21) {
                updateInstruction(`Hand ${gameState.currentHandIndex + 1} busted after doubling down!`);
                if (gameState.splitOccurred && gameState.currentHandIndex === 0) {
                    gameState.currentHandIndex = 1;
                    updateInstruction("Analyzing your second hand...");
                    checkForWinnerOrAdvice();
                } else {
                    endGame("You busted after doubling down! Dealer wins."); // End game immediately
                }
            } else {
                if (gameState.splitOccurred && gameState.currentHandIndex === 0) {
                    gameState.currentHandIndex = 1;
                    updateInstruction("Analyzing your second hand...");
                    checkForWinnerOrAdvice();
                } else {
                    stateAwaitingCard('dealer', "You doubled down. What is the dealer's next card?");
                }
            }
            return; // Ensure the player cannot add more cards after doubling down
        }

        // Check if the player has busted
        if (playerTotal > 21) {
            updateInstruction(`Hand ${gameState.currentHandIndex + 1} busted!`);
            endGame("You busted! Dealer wins."); // End game immediately
            return; // Stop further actions
        }

        // Check if the player has exactly 21
        if (playerTotal === 21) {
            updateInstruction(`Hand ${gameState.currentHandIndex + 1} stands with 21.`);
            stateAwaitingCard('dealer', "You have 21. Dealer's turn. What is the dealer's next card?");
            checkDealerTurn(); // Move immediately to dealer's turn
            return; // Ensure no further actions are taken for the player
        }

        // Handle split hands
        if (gameState.splitOccurred) {
            if (gameState.currentHandIndex === 0 && currentHand.length === 2) {
                gameState.currentHandIndex = 1;
                updateInstruction("What is the second card for your second hand?");
            } else if (gameState.currentHandIndex === 1 && currentHand.length === 2) {
                gameState.currentHandIndex = 0;
                updateInstruction("Analyzing your first hand...");
                checkForWinnerOrAdvice();
            } else {
                checkForWinnerOrAdvice();
            }
        } else {
            if (currentHand.length >= 2) {
                checkForWinnerOrAdvice();
            } else {
                updateInstruction("Enter your second card.");
            }
        }

        gameState.runningCount += cardValues[card];
    }
}

function handleSplitCardsFlow() {
    let currentHand = gameState.playerHands[gameState.currentHandIndex];

    if (currentHand.length === 2) {
        if (gameState.currentHandIndex === 0) {
            updateInstruction("Analyzing your first hand...");
            checkForWinnerOrAdvice();
        } else if (gameState.currentHandIndex === 1) {
            updateInstruction("Analyzing your second hand...");
            checkForWinnerOrAdvice();
        }
    } else {
        if (gameState.currentHandIndex === 0) {
            updateInstruction("Enter your second card for your first hand.");
        } else if (gameState.currentHandIndex === 1) {
            updateInstruction("Enter your second card for your second hand.");
        }
    }

    if (gameState.currentHandIndex === 0 && currentHand.length > 2) {
        // Move to the next hand if the current one is finished
        gameState.currentHandIndex = 1;
        updateInstruction("What is the second card for your second hand?");
    } else if (gameState.currentHandIndex === 1 && currentHand.length > 2) {
        // Move to dealer's turn after finishing both hands
        stateAwaitingCard('dealer', "Dealer's turn. What is the next card for the dealer?");
    }
}

function offerInsurance() {
    // Prompt the player to take insurance
    updateInstruction("Dealer's upcard is an Ace. Do you want to take insurance? The advice is 'No'.");
    showInsuranceOptions();
}

function showInsuranceOptions() {
    const cardButtonsContainer = document.getElementById('cardButtons');
    cardButtonsContainer.innerHTML = ''; // Clear current card buttons

    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.classList.add('insurance-btn');
    yesButton.onclick = () => handleInsuranceDecision(true);

    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    noButton.classList.add('insurance-btn');
    noButton.onclick = () => handleInsuranceDecision(false);

    cardButtonsContainer.appendChild(yesButton);
    cardButtonsContainer.appendChild(noButton);
}

function handleInsuranceDecision(takeInsurance) {
    gameState.insuranceTaken = takeInsurance;
    gameState.awaitingInsurance = false; // Reset the insurance flag
    stateAwaitingCard('player', "Insurance decision noted.\n Continue with the game.");
    createCardButtons(); // Re-create the card buttons
    checkForWinnerOrAdvice(); // Analyze the player's hand and offer advice
}

function updateDealerBustPercentage() {
    const dealerCards = gameState.dealerCards;
    const dealerUpCard = dealerCards[0]; // Assuming the dealer's first card is the upcard

    let bustPercentage = '---'; // Default value

    // Mapping of dealer up card to initial bust percentage based on the provided image
    const bustPercentageMap = {
        '2': '35.3%',
        '3': '37.56%',
        '4': '40.28%',
        '5': '42.89%',
        '6': '42.08%',
        '7': '25.99%',
        '8': '23.86%',
        '9': '23.34%',
        '10': '21.43%',
        'J': '21.43%',
        'Q': '21.43%',
        'K': '21.43%',
        'A': '11.65%'
    };

    // Calculate bust percentage based on the current dealer hand value
    const handValue = calculateHandValue(dealerCards);

    // Bust percentages based on hand value
    const bustPercentageByHandValue = {
        12: '31%',
        13: '39%',
        14: '56%',
        15: '58%',
        16: '62%',
        17: '69%',
        18: '77%',
        19: '85%',
        20: '92%',
        21: '100%' // Automatically busts if value goes over 21
    };

    // If the dealer's hand value is 11 or lower, use the upcard bust percentage
    if (handValue <= 11 && dealerUpCard && bustPercentageMap[dealerUpCard]) {
        bustPercentage = bustPercentageMap[dealerUpCard];
    } 
    // If the dealer's hand value is above 11, calculate based on current hand value
    else if (handValue >= 12) {
        if (handValue >= 12 && handValue <= 20) {
            bustPercentage = bustPercentageByHandValue[handValue];
        } else if (handValue >= 21) {
            bustPercentage = '100%';
        }
    }

    document.querySelector('.bust-percentage-text').textContent = bustPercentage;
}




function checkDealerTurn() {
    if (gameState.gameOver) return;  // Exit if the game is already over

    const dealerTotal = calculateHandValue(gameState.dealerCards);
    let insuranceOutcome = '';

    // Handle insurance scenario first
    if (gameState.insuranceTaken !== null) {
        if (gameState.dealerCards.length === 2 && dealerTotal === 21) {
            if (gameState.insuranceTaken) {
                insuranceOutcome = ' You win the insurance bet.\n';
                endGame("Dealer got Blackjack!\n" + insuranceOutcome);
            } else {
                insuranceOutcome = ' You lose the insurance bet.\n';
                endGame("Dealer got Blackjack!\n" + insuranceOutcome);
            }
            return; // End the game after insurance resolution
        } else if (gameState.insuranceTaken) {
            insuranceOutcome = ' You lose the insurance bet.\n';
            updateInstruction("Dealer did not get Blackjack.\n" + insuranceOutcome);
            gameState.insuranceTaken = null; // Reset the insurance state
        }
    }

    if (!gameState.gameOver) {
        let resultMessages = [];

        if (dealerTotal > 21) {
            // Dealer busts, each player hand wins
            gameState.playerHands.forEach((hand, index) => {
                const playerTotal = calculateHandValue(hand);
                resultMessages.push(`Hand ${index + 1} with ${playerTotal} wins against dealer's bust.`);
            });
            endGame("Dealer busted! " + resultMessages.join(' '));
        } else if (dealerTotal >= 17) {
            // Compare each player's hand to the dealer's total
            gameState.playerHands.forEach((hand, index) => {
                const playerTotal = calculateHandValue(hand);
                if (playerTotal > dealerTotal) {
                    resultMessages.push(`Hand ${index + 1} with ${playerTotal} wins against dealer's ${dealerTotal}.\n`);
                } else if (dealerTotal > playerTotal) {
                    resultMessages.push(`Hand ${index + 1} with ${playerTotal} loses against dealer's ${dealerTotal}.\n`);
                } else {
                    resultMessages.push(`Hand ${index + 1} ties with dealer at ${dealerTotal}.\n`);
                }
            });
            endGame(resultMessages.join(' ') + insuranceOutcome);
        } else {
            updateInstruction("Dealer draws another card.\nWhat is the dealer's next card?");
            updateBestMove(''); // Clear the best move area since no action is needed from the player
        }
    }
}


function addCardToHand(handId, card) {
    const hand = document.getElementById(handId);
    const cardCount = hand.children.length;

    const cardElement = document.createElement('img'); // Create an img element instead of div
    cardElement.className = 'card';
    cardElement.src = cardImages[card]; // Set the image source based on the card value
    cardElement.alt = `${card} card`; // Set alt text for accessibility

    const overlap = 0.7; // 70% overlap
    const cardWidth = 65; // Fixed card width (CSS should match this width)

    // Calculate the total width of the hand based on the number of cards and overlap
    const totalHandWidth = cardWidth + (cardWidth * overlap * Math.max(0, cardCount - 1));

    // Calculate the initial offset to keep the hand centered
    const initialOffset = (hand.offsetWidth - totalHandWidth) / 2;

    // Set the left position of the card based on its position in the hand
    cardElement.style.left = `${initialOffset + (cardCount * cardWidth * overlap)}px`;
    cardElement.style.transform = 'none';

    cardElement.style.zIndex = cardCount + 1;
    hand.appendChild(cardElement);

    adjustHandPositions(hand);
}

function adjustHandPositions(hand) {
    const cards = hand.children;
    const cardWidth = 65; // Fixed card width
    const overlap = 0.7; // 70% overlap

    // Calculate the total width of the hand
    const totalHandWidth = cardWidth + (cardWidth * overlap * (cards.length - 1));
    const initialOffset = (hand.offsetWidth - totalHandWidth) / 2;

    // Reposition all cards to keep the hand centered
    for (let i = 0; i < cards.length; i++) {
        const offset = initialOffset + (i * cardWidth * overlap);
        cards[i].style.left = `${offset}px`;
    }
}

function givePlayerAdvice() {
    if (gameState.gameOver) return;

    const currentHand = gameState.playerHands[gameState.currentHandIndex];
    const playerTotal = calculateHandValue(currentHand);
    const dealerUpCard = gameState.dealerCards[0];
    const playerFirstCard = currentHand[0];
    const playerSecondCard = currentHand[1];
    let advice;

    const isSoftHand = currentHand.includes('A') && playerTotal <= 18;
    const isHardHand = !isSoftHand;

    // SPLIT logic: If the player has two cards of the same value
    if (currentHand.length === 2 && playerFirstCard === playerSecondCard) {
        if (['8', 'A'].includes(playerFirstCard)) {
            advice = 'SPLIT';
        } else if (['10', 'J', 'Q', 'K'].includes(playerFirstCard)) {
            advice = 'STAND';
        } else if (['2', '3', '7'].includes(playerFirstCard) && ['2', '3', '4', '5', '6', '7'].includes(dealerUpCard)) {
            advice = 'SPLIT';
        } else if (['6'].includes(playerFirstCard) && ['2', '3', '4', '5', '6'].includes(dealerUpCard)) {
            advice = 'SPLIT';
        } else if (['4'].includes(playerFirstCard) && ['5', '6'].includes(dealerUpCard)) {
            advice = 'SPLIT';
        } else {
            advice = 'HIT';
        }
    } else if (currentHand.length === 2) {
        // Double down logic:
        if (isHardHand && (playerTotal === 9 && ['3', '4', '5', '6'].includes(dealerUpCard))) {
            advice = 'DOUBLE DOWN';
        } else if (isHardHand && (playerTotal === 10 && dealerUpCard !== '10' && dealerUpCard !== 'A')) {
            advice = 'DOUBLE DOWN';
        } else if (isHardHand && playerTotal === 11) {
            advice = 'DOUBLE DOWN';
        } else if (isSoftHand && (playerTotal === 16 || playerTotal === 17 || playerTotal === 18) && ['2', '3', '4', '5', '6'].includes(dealerUpCard)) {
            advice = 'DOUBLE DOWN';
        } else if (playerTotal >= 17) {
            advice = 'STAND';
        } else if (playerTotal === 16 && ['2', '3', '4', '5', '6'].includes(dealerUpCard)) {
            advice = 'STAND';
        } else if (playerTotal === 13 && ['2', '3', '4', '5', '6'].includes(dealerUpCard)) {
            advice = 'STAND';
        } else if (playerTotal === 12 && ['4', '5', '6'].includes(dealerUpCard)) {
            advice = 'STAND';
        } else {
            advice = 'HIT'; // Default to HIT if not meeting other criteria
        }
    } else {
        // Standard Hi-Lo advice logic for more than 2 cards
        if (playerTotal >= 17) {
            advice = 'STAND';
        } else if (playerTotal >= 13 && dealerUpCard <= '6') {
            advice = 'STAND';
        } else if (playerTotal === 12 && dealerUpCard >= '4' && dealerUpCard <= '6') {
            advice = 'STAND';
        } else {
            advice = 'HIT';
        }
    }

    updateBestMove(advice);

    if (advice === 'SPLIT') {
        handleSplit(currentHand);
    } else if (advice === 'DOUBLE DOWN') {
        gameState.doubleDown = true; // Set flag for double down
        stateAwaitingCard('player', "You decided to double down.\nWhat is your third card?");
    } else if (advice === 'STAND') {
        if (gameState.splitOccurred && gameState.currentHandIndex === 0) {
            gameState.currentHandIndex = 1;
            updateInstruction("Analyzing your second hand...");
            checkForWinnerOrAdvice();
        } else {
            stateAwaitingCard('dealer', "You decided to stand.\nWhat is the dealer's next card?");
        }
    } else {
        stateAwaitingCard('player', "What is the next card dealt to you?\n");
    }
}


function handleSplit(hand) {
    gameState.splitOccurred = true;

    const firstCard = hand.pop();
    const newHand = [firstCard];
    gameState.playerHands[gameState.currentHandIndex] = newHand;

    const secondHand = [firstCard];
    gameState.playerHands.push(secondHand);

    const currentHandDiv = document.getElementById(`playerHand${gameState.currentHandIndex}`);
    const secondHandDiv = document.createElement('div');
    secondHandDiv.id = `playerHand${gameState.playerHands.length - 1}`;
    secondHandDiv.className = 'cards';

    currentHandDiv.innerHTML = '';
    addCardToHand(`playerHand${gameState.currentHandIndex}`, firstCard);

    const playerCardsContainer = document.getElementById('playerCardsContainer');
    playerCardsContainer.appendChild(secondHandDiv);
    addCardToHand(secondHandDiv.id, firstCard);

    updateCounts(); // Ensure counts are updated immediately after the split

    // After splitting, update instruction and prepare for next actions
    updateInstruction("You decided to split.\nWhat is the second card for your first hand?");
    gameState.awaitingCardFor = 'player';
}

function checkForWinnerOrAdvice() {
    const currentHand = gameState.playerHands[gameState.currentHandIndex];
    const playerTotal = calculateHandValue(currentHand);

    if (playerTotal > 21) {
        updateInstruction(`Hand ${gameState.currentHandIndex + 1} busted!`);
        if (gameState.splitOccurred && gameState.currentHandIndex === 0) {
            // Move to second hand after first hand busts
            gameState.currentHandIndex = 1;
            updateInstruction("Analyzing your second hand...");
            checkForWinnerOrAdvice();
        } else {
            endGame("You busted! Dealer wins."); // End game immediately
        }
        return; // Ensure no further actions are taken
    } else if (playerTotal === 21 || gameState.bestMove === 'STAND') {
        updateInstruction(`Hand ${gameState.currentHandIndex + 1} stands.`);
        if (gameState.splitOccurred && gameState.currentHandIndex === 0) {
            // Move to second hand after first hand stands
            gameState.currentHandIndex = 1;
            updateInstruction("Analyzing your second hand...");
            checkForWinnerOrAdvice();
        } else if (gameState.splitOccurred && gameState.currentHandIndex === 1) {
            // After second hand, move to dealer
            checkDealerTurn();
        } else {
            checkDealerTurn();
        }
    } else {
        gameState.analysing = true;
        updateBestMove('Analyzing...');

        setTimeout(() => {
            givePlayerAdvice();
            gameState.analysing = false;

            if (gameState.splitOccurred && gameState.currentHandIndex === 0 && gameState.bestMove === 'STAND') {
                gameState.currentHandIndex = 1;
                updateInstruction("Analyzing your second hand...");
                checkForWinnerOrAdvice();
            }
        }, 1000); // Simulating analysis delay
    }
}

function determineWinner() {
    const dealerTotal = calculateHandValue(gameState.dealerCards);
    let resultMessage = '';

    gameState.playerHands.forEach((hand, index) => {
        const playerTotal = calculateHandValue(hand);

        if (playerTotal > 21) {
            resultMessage += `Hand ${index + 1} busted! Dealer wins. `;
        } else if (dealerTotal > 21) {
            resultMessage += `Hand ${index + 1} wins! Dealer busted. `;
        } else if (dealerTotal > playerTotal) {
            resultMessage += `Hand ${index + 1} with ${playerTotal} loses to dealer's ${dealerTotal}. `;
        } else if (dealerTotal < playerTotal) {
            resultMessage += `Hand ${index + 1} with ${playerTotal} wins against dealer's ${dealerTotal}. `;
        } else {
            resultMessage += `Hand ${index + 1} ties with dealer at ${dealerTotal}. `;
        }
    });

    endGame(resultMessage.trim());
}

function endGame(message) {
    gameState.gameOver = true;  // Mark the game as over
    updateInstruction(`${message} Game over!`);
    updateBestMove('');  // Clear best move area at the end of the game
}

function stateAwaitingCard(nextState, message) {
    gameState.awaitingCardFor = nextState;
    updateInstruction(message);
}

function calculateHandValue(cards) {
    let total = 0;
    let aceCount = 0;

    // First, calculate the total value and count the number of Aces
    cards.forEach(card => {
        if (card === 'A') {
            aceCount += 1;
            total += 11;
        } else if (['10', 'J', 'Q', 'K'].includes(card)) {
            total += 10;
        } else {
            total += parseInt(card);
        }
    });

    // Adjust the value of Aces if total is greater than 21
    while (total > 21 && aceCount > 0) {
        total -= 10;
        aceCount -= 1;
    }

    return total;
}

function calculateBustPercentage(hand) {
    const total = calculateHandValue(hand);
    const cardsLeft = 52 - (gameState.dealerCards.length + gameState.playerHands.flat().length); // 52 cards in total
    const bustingCards = [];

    for (let i = 2; i <= 11; i++) {
        if (i === 11) i = 'A';
        else if (i === 10) i = ['10', 'J', 'Q', 'K'];

        const simulatedTotal = total + (typeof i === 'string' ? 10 : i);

        if (simulatedTotal > 21) {
            bustingCards.push(i);
        }
    }

    const bustingCardsCount = Array.isArray(bustingCards[0]) ? bustingCards.length * bustingCards[0].length : bustingCards.length;
    const bustPercentage = (bustingCardsCount / cardsLeft) * 100;

    return bustPercentage.toFixed(2);
}

function updateCounts() {
    // Get the main player count container element (the div containing "Current Count")
    let playerCountContainer = document.getElementById('playerCount').parentElement;
    let playerCountElement = document.getElementById('playerCount');

    if (gameState.splitOccurred) {
        // Hide the entire "Current Count" container when split occurs
        playerCountContainer.style.display = 'none';

        // Show individual hand counts above each hand
        gameState.playerHands.forEach((hand, index) => {
            let handCountElement = document.getElementById(`playerCount${index}`);

            if (!handCountElement) {
                // Create the element if it doesn't exist
                handCountElement = document.createElement('div');
                handCountElement.id = `playerCount${index}`;
                handCountElement.className = 'player-count';
                document.getElementById(`playerHand${index}`).parentElement.insertBefore(handCountElement, document.getElementById(`playerHand${index}`));
            }

            const handTotal = calculateHandValue(hand);
            handCountElement.textContent = `Hand ${index + 1} Count: ${handTotal}`;
        });
    } else {
        // If not split, show the total in the playerCountElement
        const total = calculateHandValue(gameState.playerHands[0]);
        playerCountContainer.style.display = 'block';
        playerCountElement.textContent = `${total}`;
    }

    const dealerTotal = calculateHandValue(gameState.dealerCards);
    document.getElementById('dealerCount').textContent = `${dealerTotal}`;
}

let isTyping = false;
let typingTimeouts = [];

function updateInstruction(message) {
    const instructionElement = document.getElementById('instruction');

    // Stop any ongoing typing animation
    stopTyping();

    // Start typing the new message
    typeText(instructionElement, message, 25);
}

function stopTyping() {
    // Clear all the typing timeouts
    typingTimeouts.forEach(timeout => clearTimeout(timeout));
    typingTimeouts = [];
    isTyping = false;
}

function typeText(element, text, delay = 25) {
    if (isTyping) {
        return; // Exit if typing is already in progress
    }

    isTyping = true;
    element.textContent = ''; // Clear the existing text
    let i = 0;

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            typingTimeouts.push(setTimeout(type, delay)); // Store each timeout
        } else {
            isTyping = false; // Reset the typing flag once complete
        }
    }

    type();
}

function updateBestMove(message) {
    const bestMoveElement = document.getElementById('bestMoveText');
    const bestMoveContainer = document.querySelector('.best-move');

    bestMoveElement.textContent = message;

    // Remove any existing class
    bestMoveContainer.classList.remove('hit', 'stand', 'split', 'double-down');

    // Force reflow to ensure the transition occurs
    void bestMoveContainer.offsetWidth;

    // Add the appropriate class based on the advice
    if (message === 'HIT') {
        bestMoveContainer.classList.add('hit');
    } else if (message === 'STAND') {
        bestMoveContainer.classList.add('stand');
    } else if (message === 'SPLIT') {
        bestMoveContainer.classList.add('split');
    } else if (message === 'DOUBLE DOWN') {
        bestMoveContainer.classList.add('double-down');
    }
}

// Initialize card buttons and start a new game
document.addEventListener('DOMContentLoaded', () => {
    createCardButtons();
    newGame();
});

function createCardButtons() {
    const cardButtonsContainer = document.getElementById('cardButtons');
    cardButtonsContainer.innerHTML = ''; // Clear any existing buttons

    const cardRows = [
        ['2', '3', '4'],
        ['5', '6', '7'],
        ['8', '9', '10'],
        ['J', 'Q', 'K', 'A']
    ];

    cardRows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('card-row');
        row.forEach(card => {
            const button = document.createElement('button');
            button.textContent = card;
            button.classList.add('card-btn');
            button.onclick = () => addCard(card);
            rowDiv.appendChild(button);
        });
        cardButtonsContainer.appendChild(rowDiv);
    });
}
