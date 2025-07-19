// JS Game Logic

let playerHand = [];
let aiHand = [];
let deck = [];
let topCard;
let playerTurn = true;
let gameTimer; // To hold the setInterval for the game timer
let timeLeft = 300; // 5 minutes in seconds (300 seconds)
const timerDisplay = document.getElementById('time-left'); // Assuming you have a div with this ID

const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "Skip", "Reverse", "+2"];
const colors = ["red", "green", "blue", "yellow"];
const specialCards = ["Wild", "+4"];

// --- Sound Effects ---
const drawSound = new Audio('draw.mp3');
const winSound = new Audio('win.wav');
const lossSound = new Audio('loss.wav');
const playCardSound = new Audio('play.wav');

// --- Background Music ---
const backgroundMusic = document.getElementById('bg'); // Get the audio element from HTML
backgroundMusic.loop = true;

// Get reference to the music toggle button
let musicToggleButton; // Will be initialized in window.onload

function updateMusicButtonImage() {
    if (musicToggleButton) {
        if (backgroundMusic.paused) {
            musicToggleButton.style.backgroundImage = 'url("off.png")';
            musicToggleButton.title = 'Music Off';
        } else {
            musicToggleButton.style.backgroundImage = 'url("on.webp")';
            musicToggleButton.title = 'Music On';
        }
    }
}

function createDeck() {
    let d = [];
    colors.forEach(color => {
        values.forEach(value => {
            d.push({ color, value });
            if (value !== "0") d.push({ color, value });
        });
    });
    specialCards.forEach(value => {
        for (let i = 0; i < 4; i++) d.push({ color: "black", value });
    });
    return shuffle(d);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function drawCard(n, hand) {
    for (let i = 0; i < n; i++) {
        if (deck.length === 0) deck = createDeck();
        hand.push(deck.pop());
    }
    drawSound.play(); // Play draw sound when a card is drawn
}

function onDrawCard() {
    if (!playerTurn) return; // Should already be handled by disabling buttons, but good for safety

    // Disable player interaction after drawing
    playerTurn = false;
    document.getElementById("draw-pile").disabled = true;
    document.querySelectorAll("#player-hand .card").forEach(c => {
        c.onclick = null;
        c.style.cursor = "default";
    });

    drawCard(1, playerHand);
    updateUI(); // Update UI after drawing
    setTimeout(aiMove, 1000);
}

function isPlayable(card) {
    return card.color === topCard.color || card.value === topCard.value || card.color === "black";
}

function playCard(card) {
    // Check if it's the player's turn and the card is playable
    if (!playerTurn || !isPlayable(card)) {
        showMessage("Cannot play this card!");
        return;
    }

    // IMMEDIATELY DISABLE PLAYER INTERACTION to prevent double-click glitch
    playerTurn = false;
    document.getElementById("draw-pile").disabled = true;
    // Also remove click handlers from all player cards
    document.querySelectorAll("#player-hand .card").forEach(c => {
        c.onclick = null;
        c.style.cursor = "default";
    });

    // Remove the card from the player's hand
    const cardIndex = playerHand.indexOf(card);
    if (cardIndex > -1) {
        playerHand.splice(cardIndex, 1);
    } else {
        console.error("Attempted to play a card not in hand:", card);
        return;
    }

    topCard = card; // Set the played card as the new top card
    playCardSound.play(); // Play sound when a card is played

    const specialEffectResult = handleSpecial(card, playerHand, aiHand, true); // Renamed for clarity

    if (specialEffectResult === "color-pick") {
        updateUI(); // This will re-enable only color picker buttons, not hand cards
        return; // Wait for color selection from the player
    }

    updateUI(); // Update UI immediately after playing the card

    // Game end check for Player Win
    if (playerHand.length === 0) {
        showMessage("🎉 You win!");
        winSound.play(); // Play win sound
        endGame(true); // Call endGame with player win
        return;
    }

    // Handle Player's Skip/Reverse Cards: Player gets another turn
    if (specialEffectResult === "skip" || specialEffectResult === "reverse") {
        playerTurn = true; // Give the turn back to the player
        document.getElementById("draw-pile").disabled = false; // Re-enable draw button
        showMessage("Your Turn! (Opponent Skipped)"); // Inform the player
        updateUI(); // Re-enable player hand clicks
        return; // IMPORTANT: Do not proceed to the AI's turn
    }

    // Transition to AI turn (only if no skip/reverse was played by player)
    setTimeout(() => {
        aiMove();
    }, 1000);
}


function handleSpecial(card, currentHand, otherHand, isPlayer) {
    if (card.value === "+2") {
        drawCard(2, otherHand);
        showMessage(`${isPlayer ? "AI" : "You"} drew 2 cards!`);
    } else if (card.value === "+4") {
        drawCard(4, otherHand);
        if (isPlayer) {
            showColorPicker();
            return "color-pick";
        } else {
            const aiColor = pickColorAI(aiHand); // AI picks a color based on its hand
            topCard.color = aiColor; // Update the color of the top card
            updateUI();
            showMessage(`💡 AI chose ${aiColor.toUpperCase()} after +4`);
        }
    } else if (card.value === "Wild") {
        if (isPlayer) {
            showColorPicker();
            return "color-pick";
        } else {
            const aiColor = pickColorAI(aiHand); // AI picks a color based on its hand
            topCard.color = aiColor; // Update the color of the top card
            updateUI();
            showMessage(`💡 AI chose ${aiColor.toUpperCase()} after Wild`);
        }
    } else if (card.value === "Skip") {
        showMessage(`${isPlayer ? "You" : "AI"} played Skip!`);
        return "skip";
    } else if (card.value === "Reverse") {
        showMessage(`${isPlayer ? "You" : "AI"} played Reverse!`);
        return "reverse"; // In a 2-player game, reverse acts like a skip.
    }

    return null; // No special action or action handled immediately
}

// Enhanced AI color choice logic
function pickColorAI(hand) {
    const colorsInHand = hand.map(card => card.color).filter(color => color !== "black");
    if (colorsInHand.length > 0) {
        const colorCounts = {};
        colorsInHand.forEach(color => {
            colorCounts[color] = (colorCounts[color] || 0) + 1;
        });
        let bestColor = "";
        let maxCount = -1;
        // Prioritize a color AI has most of
        for (const color of colors) { // Iterate through all possible colors
            if (colorCounts[color] > maxCount) {
                bestColor = color;
                maxCount = colorCounts[color];
            }
        }
        return bestColor;
    }
    // If AI has no colored cards, pick a random color
    return colors[Math.floor(Math.random() * colors.length)];
}


function aiMove() {
    updateUI(); // Update UI at the start of AI's turn
    showMessage("AI's Turn...");

    setTimeout(() => {
        // AI Strategy:
        // 1. Try to win immediately.
        // 2. Play a +4 if possible (most disruptive).
        // 3. Play a Wild card.
        // 4. Play a +2, Skip, or Reverse if beneficial (e.g., player has few cards).
        // 5. Play a matching color/value card.
        // 6. Draw if no playable cards.

        const playableCards = aiHand.filter(isPlayable);

        let cardToPlay = null;

        // 1. Check for immediate win (if playing this card reduces hand to 0)
        // This is tricky as special cards might add cards to player. Prioritize non-draw specials.
        const winningCards = playableCards.filter(card => {
            return !["+2", "+4"].includes(card.value);
        });
        if (winningCards.length > 0 && aiHand.length === 1) { // If AI has only one card left and it's a winning one
            cardToPlay = winningCards[0]; // Play it!
        }

        if (!cardToPlay) {
            // 2. Prioritize +4 card
            const plusFourCards = playableCards.filter(card => card.value === "+4");
            if (plusFourCards.length > 0) {
                cardToPlay = plusFourCards[0];
            }
        }

        if (!cardToPlay) {
            // 3. Prioritize Wild card
            const wildCards = playableCards.filter(card => card.value === "Wild");
            if (wildCards.length > 0) {
                cardToPlay = wildCards[0];
            }
        }

        if (!cardToPlay) {
            // 4. Prioritize +2, Skip, Reverse (action cards)
            const actionCards = playableCards.filter(card => ["+2", "Skip", "Reverse"].includes(card.value));
            if (actionCards.length > 0) {
                // If player has 1-2 cards, prioritize action cards to prevent them from winning
                if (playerHand.length <= 2) {
                    cardToPlay = actionCards[0]; // Just pick the first one
                } else {
                    // Otherwise, just play a regular card if available, to reduce hand size
                    const regularCards = playableCards.filter(card => !specialCards.includes(card.value) && !values.slice(10).includes(card.value));
                    if (regularCards.length > 0) {
                        cardToPlay = regularCards[0];
                    } else if (actionCards.length > 0) {
                        cardToPlay = actionCards[0]; // Fallback to action card if no regular cards
                    }
                }
            }
        }

        if (!cardToPlay) {
            // 5. Play any other playable card (numbers)
            if (playableCards.length > 0) {
                cardToPlay = playableCards[0]; // Just pick the first available
            }
        }


        if (cardToPlay) {
            topCard = cardToPlay;
            aiHand.splice(aiHand.indexOf(cardToPlay), 1);
            playCardSound.play(); // Play sound when AI plays a card
            showMessage(`AI played a ${cardToPlay.color === 'black' ? '' : cardToPlay.color} ${cardToPlay.value} card.`);

            const result = handleSpecial(cardToPlay, aiHand, playerHand, false); // AI is not player

            updateUI(); // Update UI after AI plays

            // Game end check for AI Win
            if (aiHand.length === 0) {
                showMessage("🤖 AI wins!");
                lossSound.play(); // Play loss sound
                endGame(false); // Call endGame with AI win
                return;
            }

            // If AI played a skip, reverse, or +4/Wild requiring color pick, AI gets another turn
            if (result === "skip" || result === "reverse" || result === "color-pick") {
                setTimeout(aiMove, 1000); // AI plays again
                return;
            }

        } else {
            // AI has no playable cards, draws one
            drawCard(1, aiHand); // drawCard function already plays the sound
            showMessage("AI drew a card.");
            updateUI(); // Update UI after AI draws
        }

        playerTurn = true; // It's now player's turn
        showMessage("Your Turn!");
        document.getElementById("draw-pile").disabled = false; // Re-enable draw button
        updateUI(); // Final UI update for player's turn - this will re-attach click handlers
    }, 1500); // Increased delay for AI's turn to be more noticeable
}


function chooseColor(color) {
    topCard.color = color;
    document.getElementById("color-picker").classList.add("hidden");
    updateUI(); // Redraws the UI, calling createCard with the updated topCard color
    showMessage(`You chose ${color.toUpperCase()}`);

    // After color choice, disable player interaction and proceed to AI turn
    playerTurn = false; // Set to false immediately
    document.getElementById("draw-pile").disabled = true; // Disable draw button
    document.querySelectorAll("#player-hand .card").forEach(c => {
        c.onclick = null;
        c.style.cursor = "default";
    });

    setTimeout(() => {
        aiMove();
    }, 1000);
}

function showColorPicker() {
    document.getElementById("color-picker").classList.remove("hidden");
}

function showMessage(msg) {
    const messageBox = document.getElementById("message");
    messageBox.textContent = msg;
    messageBox.classList.remove("hidden");
    // Clear previous timeout to ensure message is shown for its full duration
    if (messageBox.timeoutId) {
        clearTimeout(messageBox.timeoutId);
    }
    messageBox.timeoutId = setTimeout(() => messageBox.classList.add("hidden"), 2000);
}

function createCard(card) {
    const div = document.createElement("div");
    div.classList.add("card");

    const img = document.createElement("img");
    img.classList.add("custom-card-img");

    // Determine the image source based on card properties
    // Ensure you have all these image files in your 'images' folder or directly in the root
    // For example: `images/rb.jpg` or just `rb.jpg` based on your setup.
    // I'm assuming they are in the root for simplicity based on your original code's paths.
    if (card.color === "blue") {
        if (card.value === "Reverse") { img.src = "rb.jpg"; }
        else if (card.value === "Skip") { img.src = "skipb.jpg"; }
        else if (card.value === "+2") { img.src = "+2b.jpg"; }
        else if (card.value === "Wild") { img.src = "wb.jpg"; img.alt = "Blue Wild Card"; }
        else if (card.value === "0") { img.src = "0b.jpg"; }
        else if (card.value === "1") { img.src = "1b.jpg"; }
        else if (card.value === "2") { img.src = "2b.jpg"; }
        else if (card.value === "3") { img.src = "3b.jpg"; }
        else if (card.value === "4") { img.src = "4b.jpg"; }
        else if (card.value === "5") { img.src = "5b.jpg"; }
        else if (card.value === "6") { img.src = "6b.jpg"; }
        else if (card.value === "7") { img.src = "7b.jpg"; }
        else if (card.value === "8") { img.src = "8b.jpg"; }
        else if (card.value === "9") { img.src = "9b.jpg"; }
        else { img.src = `${card.value}b.jpg`; } // Fallback
        img.alt = `Blue ${card.value}`;
    } else if (card.color === "red") {
        if (card.value === "Reverse") { img.src = "rr.jpg"; }
        else if (card.value === "Skip") { img.src = "sr.jpg"; }
        else if (card.value === "+2") { img.src = "+2r.jpg"; }
        else if (card.value === "Wild") { img.src = "wr.jpg"; img.alt = "Red Wild Card"; }
        else if (card.value === "0") { img.src = "0r.jpg"; }
        else if (card.value === "1") { img.src = "1r.jpg"; }
        else if (card.value === "2") { img.src = "2r.jpg"; }
        else if (card.value === "3") { img.src = "3r.jpg"; }
        else if (card.value === "4") { img.src = "4r.jpg"; }
        else if (card.value === "5") { img.src = "5r.jpg"; }
        else if (card.value === "6") { img.src = "6r.jpg"; }
        else if (card.value === "7") { img.src = "7r.jpg"; }
        else if (card.value === "8") { img.src = "8r.jpg"; }
        else if (card.value === "9") { img.src = "9r.jpg"; }
        else { img.src = `${card.value}r.jpg`; } // Fallback
        img.alt = `Red ${card.value}`;
    } else if (card.color === "green") {
        if (card.value === "Reverse") { img.src = "rg.jpg"; }
        else if (card.value === "Skip") { img.src = "sg.jpg"; }
        else if (card.value === "+2") { img.src = "+2g.jpg"; }
        else if (card.value === "Wild") { img.src = "wg.jpg"; img.alt = "Green Wild Card"; }
        else if (card.value === "0") { img.src = "0g.jpg"; }
        else if (card.value === "1") { img.src = "1g.jpg"; }
        else if (card.value === "2") { img.src = "2g.jpg"; }
        else if (card.value === "3") { img.src = "3g.jpg"; }
        else if (card.value === "4") { img.src = "4g.jpg"; }
        else if (card.value === "5") { img.src = "5g.jpg"; }
        else if (card.value === "6") { img.src = "6g.jpg"; }
        else if (card.value === "7") { img.src = "7g.jpg"; }
        else if (card.value === "8") { img.src = "8g.jpg"; }
        else if (card.value === "9") { img.src = "9g.jpg"; }
        else { img.src = `${card.value}g.jpg`; } // Fallback
        img.alt = `Green ${card.value}`;
    } else if (card.color === "yellow") {
        if (card.value === "Reverse") { img.src = "ry.jpg"; }
        else if (card.value === "Skip") { img.src = "sy.jpg"; }
        else if (card.value === "+2") { img.src = "+2y.jpg"; }
        else if (card.value === "Wild") { img.src = "wy.jpg"; img.alt = "Yellow Wild Card"; }
        else if (card.value === "0") { img.src = "0y.jpg"; }
        else if (card.value === "1") { img.src = "1y.jpg"; }
        else if (card.value === "2") { img.src = "2y.jpg"; }
        else if (card.value === "3") { img.src = "3y.jpg"; }
        else if (card.value === "4") { img.src = "4y.jpg"; }
        else if (card.value === "5") { img.src = "5y.jpg"; }
        else if (card.value === "6") { img.src = "6y.jpg"; }
        else if (card.value === "7") { img.src = "7y.jpg"; }
        else if (card.value === "8") { img.src = "8y.jpg"; }
        else if (card.value === "9") { img.src = "9y.jpg"; }
        else { img.src = `${card.value}y.jpg`; } // Fallback
        img.alt = `Yellow ${card.value}`;
    } else if (card.color === "black") {
        // Handle Wild and +4 cards when their initial color is black (i.e., before color choice)
        if (card.value === "+4") {
            img.src = "+4.jpg";
            img.alt = "Wild +4 Card";
        } else if (card.value === "Wild") {
            img.src = "wild.jpg";
            img.alt = "Wild Card";
        }
    }

    div.appendChild(img);
    return div;
}


function updateUI() {
    const playerDiv = document.getElementById("player-hand");
    const aiDiv = document.getElementById("ai-hand");
    const topDiv = document.getElementById("top-card");

    playerDiv.innerHTML = "";
    aiDiv.innerHTML = "";
    topDiv.innerHTML = "";

    // Render player's hand
    playerHand.forEach(card => {
        const cardElement = createCard(card);
        // Attach click listener only for playable cards AND if it's player's turn
        if (playerTurn && isPlayable(card)) {
            cardElement.onclick = () => playCard(card);
            cardElement.style.cursor = "pointer"; // Indicate it's clickable
        } else {
            cardElement.onclick = null; // Ensure no click handler if not playable/not player turn
            cardElement.style.cursor = "default"; // Not clickable
        }
        playerDiv.appendChild(cardElement);
    });

    // Render AI's hand (face down)
    aiHand.forEach(() => {
        const back = document.createElement("div");
        back.classList.add("card", "back");
        const backImg = document.createElement("img");
        backImg.src = "back.jpg"; // Assuming you have a generic card back image
        backImg.alt = "Card Back";
        backImg.classList.add("custom-card-img");
        back.appendChild(backImg);
        aiDiv.appendChild(back);
    });

    // Render the top card
    if (topCard) {
        const topCardElement = createCard(topCard);
        topDiv.innerHTML = ''; // Clear previous content
        topDiv.appendChild(topCardElement);

        // This section handles the background color/gradient of the TOP CARD SLOT
        if (topCard.color && topCard.color !== "black") {
            topDiv.className = 'card-slot'; // Reset classes
            topDiv.classList.add(topCard.color); // Add the specific color class
            topDiv.style.background = ''; // Clear any inline background if a class defines it
        } else if (topCard.color === "black" && topCard.value === "+4") {
            topDiv.className = 'card-slot'; // Reset classes
            topDiv.style.background = "linear-gradient(45deg, red, yellow, green, blue)";
        } else {
            topDiv.className = 'card-slot'; // Reset classes
            topDiv.style.background = '';
        }
        topDiv.style.border = "3px solid white"; // Keep border
    }
}

// Timer functions
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    clearInterval(gameTimer); // Clear any existing timer
    timeLeft = 300; // Reset to 5 minutes
    updateTimerDisplay();
    gameTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            endGame(null); // Call endGame with null for a time-out draw
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(gameTimer);
}

function endGame(playerWon) {
    stopTimer();
    document.getElementById("draw-pile").disabled = true; // Disable further moves
    document.querySelectorAll("#player-hand .card").forEach(c => {
        c.onclick = null;
        c.style.cursor = "default";
    });
    document.getElementById("color-picker").classList.add("hidden"); // Hide color picker

    if (playerWon === true) {
        showMessage("🎉 You win!");
        winSound.play();
    } else if (playerWon === false) {
        showMessage("🤖 AI wins!");
        lossSound.play();
    } else { // Time ran out
        if (playerHand.length < aiHand.length) {
            showMessage("⏱️ Time's up! You have fewer cards. You win!");
            winSound.play();
        } else if (aiHand.length < playerHand.length) {
            showMessage("⏱️ Time's up! AI has fewer cards. AI wins!");
            lossSound.play();
        } else {
            showMessage("⏱️ Time's up! It's a draw!");
        }
    }
    setTimeout(onRestart, 3000); // Restart after 3 seconds
}


function startGame() {
    deck = createDeck();
    playerHand = [];
    aiHand = [];
    drawCard(7, playerHand);
    drawCard(7, aiHand);
    topCard = deck.pop();
    // Ensure the initial top card is not a special action card that requires immediate player choice
    while (topCard.value === "Wild" || topCard.value === "+4" || topCard.value === "+2" || topCard.value === "Skip" || topCard.value === "Reverse") {
        deck.unshift(topCard); // Put it back
        topCard = deck.pop();  // Draw a new one
    }
    playerTurn = true; // Player starts
    updateUI();
    showMessage("Game Started! Your Turn!");
    document.getElementById("draw-pile").disabled = false; // Correctly enable draw pile button

    // Start the game timer
    startTimer();

    // Attempt to play background music on game start
    backgroundMusic.play().catch(e => console.log("Background music autoplay blocked:", e));
    updateMusicButtonImage(); // Set the initial button image state
}

function onRestart() {
    startGame(); // Simply call startGame to reset everything
    showMessage("🔄 Game Restarted!");
}

window.onload = () => {
    musicToggleButton = document.getElementById("toggle-music-button"); // Get the music toggle button element
    // Ensure timerDisplay is correctly linked to an HTML element
    // This is important for the timer to show up. Add <div id="time-left"></div> in your HTML.

    startGame();

    // Attach the event listener to the draw pile button
    document.getElementById("draw-pile").onclick = onDrawCard;

    // Make sure the restart button also works as intended
    document.getElementById("Restart").onclick = onRestart;

    // Only attach music toggle listener if the button exists
    if (musicToggleButton) {
        musicToggleButton.onclick = () => {
            if (backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.log("Error playing music:", e));
            } else {
                backgroundMusic.pause();
            }
            updateMusicButtonImage(); // Update the button image after toggling music
        };

        backgroundMusic.onplay = updateMusicButtonImage;
        backgroundMusic.onpause = updateMusicButtonImage;
    } else {
        console.warn("Music toggle button with ID 'toggle-music-button' not found in HTML. Music cannot be manually toggled.");
    }
};