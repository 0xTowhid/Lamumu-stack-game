let gameState = 'start';
let score = 0;
let lives = 3;
let timeLeft = 60;
let gameTimer = null;
let playerUsername = '';
let highestStack = 0;
let timeSurvived = 0;

// Canvas and game objects
let canvas = null;
let ctx = null;
let gameContainer = null;
let crane = null;
let cranePosition = 0;
let craneDirection = 1;
let craneSpeed = 1.5;
let currentCowOnCrane = null;
let fallingCows = [];
let stackedCows = [];

// View sliding system
let viewOffsetY = 0;
let targetViewOffsetY = 0;

// Image loading system
let cowImages = {};
let imagesLoaded = 0;
let totalImages = 0;

// Audio system
let audioContext = null;
let audioBuffers = {};
let backgroundMusic = null;
let musicVolume = 0.3;
let sfxVolume = 0.6;
let isMuted = false;

// Audio files configuration
const audioFiles = {
    backgroundMusic: 'game-sound/bg-music.mp3', // Background game music
    buttonClick: 'game-sound/btn-sound.mp3', // Button click sound
    cowDrop: 'game-sound/cow-moo.mp3', // Sound when cow is dropped
    cowLand: 'cow-land.wav', // Sound when cow lands on stack
    gameOver: 'game-sound/game-over-kid-voice-clip-352738.mp3', // Game over sound
    perfectStack: 'perfect-stack.wav', // Sound for perfect placement
    lifeAlert: 'life-alert.wav' // Sound when losing a life
};

// Cows
const cowTypes = [
    { 
        id: 'classic', 
        color: '#FFCCCB', 
        name: 'Classic',
        imageUrl: 'cow.png'
    },
    { 
        id: 'cowboy', 
        color: '#DEB887', 
        name: 'Cowboy',
        imageUrl: 'cow1.png'
    },
    {
        id: 'rocket', 
        color: '#FF6B6B', 
        name: 'Rocket',
        imageUrl: 'cow2.png'
    },
    {
        id: 'alien', 
        color: '#98FB98', 
        name: 'Alien',
        imageUrl: 'cow3.png'
    }
];

// Initialize Audio Context
function initializeAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        loadAudioFiles();
        console.log('Audio system initialized');
    } catch (error) {
        console.warn('Audio not supported on this device:', error);
    }
}

// Load audio files
async function loadAudioFiles() {
    for (const [key, filename] of Object.entries(audioFiles)) {
        try {
            const response = await fetch(filename);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                audioBuffers[key] = audioBuffer;
                console.log(`Loaded audio: ${key}`);
            } else {
                console.warn(`Could not load audio file: ${filename}`);
            }
        } catch (error) {
            console.warn(`Error loading audio ${filename}:`, error);
        }
    }
}

// Play sound effect
function playSFX(soundKey, volume = sfxVolume) {
    if (!audioContext || !audioBuffers[soundKey] || isMuted) return;
    
    try {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = audioBuffers[soundKey];
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = volume;
        
        source.start(0);
    } catch (error) {
        console.warn(`Error playing sound ${soundKey}:`, error);
    }
}

// Start background music
function startBackgroundMusic() {
    if (!audioContext || !audioBuffers.backgroundMusic || isMuted) return;
    
    try {
        if (backgroundMusic) {
            backgroundMusic.stop();
        }
        
        backgroundMusic = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        backgroundMusic.buffer = audioBuffers.backgroundMusic;
        backgroundMusic.loop = true;
        backgroundMusic.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = musicVolume;
        
        backgroundMusic.start(0);
        console.log('Background music started');
    } catch (error) {
        console.warn('Error starting background music:', error);
    }
}

// Stop background music
function stopBackgroundMusic() {
    if (backgroundMusic) {
        try {
            backgroundMusic.stop();
            backgroundMusic = null;
        } catch (error) {
            console.warn('Error stopping background music:', error);
        }
    }
}

// Resume audio context 
function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Toggle mute
function toggleMute() {
    isMuted = !isMuted;
    
    if (isMuted) {
        stopBackgroundMusic();
    } else if (gameState === 'playing') {
        startBackgroundMusic();
    }
    
    // Update mute button if it exists
    const muteBtn = document.getElementById('mute-button');
    if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    }
}

function preloadImages() {
    totalImages = cowTypes.length;
    imagesLoaded = 0;
    
    cowTypes.forEach(cowType => {
        const img = new Image();
        img.onload = () => {
            imagesLoaded++;
            console.log(`Loaded image for ${cowType.id}`);
        };
        img.onerror = () => {
            imagesLoaded++;
            console.log(`Failed to load image for ${cowType.id}, using fallback`);
        };
        img.src = cowType.imageUrl;
        cowImages[cowType.id] = img;
    });
}

function startGame() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert('Please enter your X username!');
        return;
    }
    
    // Resume audio context and play button click sound
    resumeAudioContext();
    playSFX('buttonClick');
    
    playerUsername = username;
    gameState = 'playing';
    
    // Reset game variables
    score = 0;
    lives = 3;
    timeLeft = 60;
    craneSpeed = 1.5;
    highestStack = 0;
    timeSurvived = 0;
    fallingCows = [];
    stackedCows = [];
    cranePosition = 0;
    craneDirection = 1;
    viewOffsetY = 0;
    targetViewOffsetY = 0;
    
    // Show game screen
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    // Initialize game
    initializeGame();
}

function initializeGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    gameContainer = document.getElementById('game-container');
    crane = document.getElementById('crane');
    
    // Set canvas size to match container
    const rect = gameContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Reset crane and container
    crane.style.left = '0px';
    crane.style.transform = 'none';
    gameContainer.style.transform = 'none';
    
    // Preload cow images
    preloadImages();
    
    updateUI();
    spawnNewCow();
    showInstructions();
}

function showInstructions() {
    const popup = document.getElementById('instructions-popup');
    const countdownEl = document.getElementById('countdown');
    popup.classList.add('show');
    
    let countdown = 5;
    const countdownInterval = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            popup.classList.remove('show');
            
            // Start the actual game after popup closes
            setTimeout(() => {
                startActualGame();
            }, 300);
        }
    }, 1000);
}

function startActualGame() {
    startGameTimer();
    
    startBackgroundMusic();
    
    // Add touch and click listeners for mobile compatibility
    canvas.addEventListener('click', dropCow);
    canvas.addEventListener('touchstart', dropCow, { passive: false });
    
    // Start game loop
    gameLoop();
}

function startGameTimer() {
    gameTimer = setInterval(() => {
        if (gameState !== 'playing') return;
        
        timeLeft--;
        timeSurvived = 60 - timeLeft;
        updateUI();
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function spawnNewCow() {
    if (gameState !== 'playing') return;
    
    // Random cow type
    const cowType = cowTypes[Math.floor(Math.random() * cowTypes.length)];
    currentCowOnCrane = cowType;
    
    // Update crane cow display with image
    const craneCow = document.getElementById('crane-cow');
    craneCow.style.backgroundImage = `url(${cowType.imageUrl})`;
    craneCow.style.backgroundSize = 'cover';
    craneCow.style.backgroundColor = cowType.color; // Fallback color
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('timer').textContent = timeLeft;
    
    // Update hearts
    const hearts = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    document.getElementById('hearts').textContent = hearts;
}

function moveCrane() {
    if (gameState !== 'playing' || !currentCowOnCrane) return;
    
    // Move crane left and right
    cranePosition += craneDirection * craneSpeed;
    
    const containerWidth = gameContainer.clientWidth;
    const craneWidth = 50;
    
    // Bounce off walls
    if (cranePosition <= 0) {
        cranePosition = 0;
        craneDirection = 1;
    } else if (cranePosition >= containerWidth - craneWidth) {
        cranePosition = containerWidth - craneWidth;
        craneDirection = -1;
    }
    
    // Update crane position
    crane.style.left = cranePosition + 'px';
}

function dropCow(e) {
    if (gameState !== 'playing' || !currentCowOnCrane) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Play cow drop sound
    playSFX('cowDrop');
    
    // Create falling cow object
    const cow = {
        x: cranePosition + 15, // Center of crane
        y: 50, // Below crane
        width: 50,
        height: 42,
        vy: 0,
        color: currentCowOnCrane.color,
        imageUrl: currentCowOnCrane.imageUrl,
        id: currentCowOnCrane.id,
        landed: false
    };
    
    fallingCows.push(cow);
    
    // Clear crane cow
    currentCowOnCrane = null;
    document.getElementById('crane-cow').style.backgroundImage = '';
    
    // Spawn next cow after delay
    setTimeout(() => {
        spawnNewCow();
    }, 600);
}

function updateFallingCows() {
    const containerHeight = gameContainer.clientHeight;
    const containerWidth = gameContainer.clientWidth;
    const groundLevel = containerHeight - 20;
    
    // Define optimal stacking zone (middle area)
    const stackingZoneCenter = containerWidth / 2;
    const stackingZoneWidth = 100;
    const stackingZoneLeft = stackingZoneCenter - stackingZoneWidth / 2;
    const stackingZoneRight = stackingZoneCenter + stackingZoneWidth / 2;
    
    for (let index = fallingCows.length - 1; index >= 0; index--) {
        const cow = fallingCows[index];
        if (cow.landed) continue;
        
        // Apply gravity
        cow.vy += 0.6;
        cow.y += cow.vy;
        
        // Find the highest collision point
        let landedOnStack = false;
        let highestCollisionY = groundLevel;
        let collisionDetected = false;
        
        // Check collision with stacked cows - find the topmost cow that overlaps horizontally
        for (let stackCow of stackedCows) {
            // horizontal overlap
            if (cow.x < stackCow.x + stackCow.width && 
                cow.x + cow.width > stackCow.x) {
                
                // This cow overlaps horizontally, check if it's the highest collision point
                if (stackCow.y < highestCollisionY) {
                    highestCollisionY = stackCow.y;
                    collisionDetected = true;
                }
            }
        }
        
        // if the cow has reached its collision point
        if (collisionDetected && cow.y + cow.height >= highestCollisionY) {
            const cowCenter = cow.x + cow.width / 2;
            
            // Landed on stack
            cow.y = highestCollisionY - cow.height;
            cow.landed = true;
            landedOnStack = true;
            
            stackedCows.push(cow);
            fallingCows.splice(index, 1);
            
            // Points and sound based on positioning
            if (cowCenter >= stackingZoneLeft && cowCenter <= stackingZoneRight) {
                score += 15; // Bonus for perfect placement
                playSFX('perfectStack'); // Perfect placement sound
            } else {
                score += 10; // Regular points for stack landing
                playSFX('cowLand'); // Regular landing sound
            }
            
            highestStack = Math.max(highestStack, stackedCows.length);
            updateUI();
            updateView();
            
            // Increase crane speed
            craneSpeed = Math.min(1.5 + score * 0.008, 4);
        }
        // Check ground collision only if no stack collision occurred
        else if (!collisionDetected && cow.y + cow.height >= groundLevel) {
            const cowCenter = cow.x + cow.width / 2;
            
            // Only allow landing in the stacking zone
            if (cowCenter >= stackingZoneLeft && cowCenter <= stackingZoneRight) {
                // Good landing in the zone
                cow.y = groundLevel - cow.height;
                cow.x = stackingZoneCenter - cow.width / 2; // Snap to center
                cow.landed = true;
                
                stackedCows.push(cow);
                fallingCows.splice(index, 1);
                
                score += 10;
                playSFX('cowLand');
                
                highestStack = Math.max(highestStack, stackedCows.length);
                updateUI();
                updateView();
                
                craneSpeed = Math.min(1.5 + score * 0.008, 4);
            } else {
                // Cow landed outside the stacking zone - lose a life
                fallingCows.splice(index, 1);
                loseLife();
            }
        }
        
        // Remove cows that fall off screen
        if (cow.y > containerHeight + 50) {
            fallingCows.splice(index, 1);
            if (!cow.landed) {
                loseLife();
            }
        }
    }
}

function updateView() {
    // Calculate the highest point of the stack
    let highestY = gameContainer.clientHeight - 20; // Ground level
    
    if (stackedCows.length > 0) {
        highestY = Math.min(...stackedCows.map(cow => cow.y));
    }
    
    // If the stack is getting close to the crane, slide the view down
    const craneY = 15;
    const distanceFromCrane = highestY - craneY;
    
    if (distanceFromCrane < 150) {
        targetViewOffsetY = Math.floor(150 - distanceFromCrane);
    } else {
        targetViewOffsetY = 0;
    }
    
    // Smooth interpolation to target view offset with pixel-perfect positioning
    viewOffsetY += (targetViewOffsetY - viewOffsetY) * 0.1;
    viewOffsetY = Math.floor(viewOffsetY);
}

function loseLife() {
    lives--;
    updateUI();
    
    // Play life alert sound
    playSFX('lifeAlert');
    
    // Visual feedback for losing a life
    gameContainer.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        gameContainer.style.animation = '';
    }, 500);
    
    if (lives <= 0) {
        endGame();
    }
}

function drawGame() {
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply view offset transformation
    ctx.save();
    ctx.translate(0, viewOffsetY);
    
    // Draw stacking zone guide
    const containerWidth = gameContainer.clientWidth;
    const stackingZoneCenter = containerWidth / 2;
    const stackingZoneWidth = 80;
    const stackingZoneLeft = stackingZoneCenter - stackingZoneWidth / 2;
    const groundLevel = canvas.height - 20;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(stackingZoneLeft, groundLevel, stackingZoneWidth, 20);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(stackingZoneLeft, groundLevel, stackingZoneWidth, 20);
    ctx.setLineDash([]);
    
    // Draw falling cows
    fallingCows.forEach(cow => {
        drawCow(cow);
    });
    
    // Draw stacked cows
    stackedCows.forEach(cow => {
        drawCow(cow);
    });
    
    ctx.restore();
}

function drawCow(cow) {
    const img = cowImages[cow.id];
    if (img && img.complete && img.naturalHeight > 0) {
        ctx.drawImage(img, Math.floor(cow.x), Math.floor(cow.y), cow.width, cow.height);
    } else {
        // Fallback: draw colored rectangle with border
        ctx.fillStyle = cow.color;
        ctx.fillRect(Math.floor(cow.x), Math.floor(cow.y), cow.width, cow.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.floor(cow.x), Math.floor(cow.y), cow.width, cow.height);
        
        // Draw first letter of cow type as identifier
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cow.id[0].toUpperCase(), Math.floor(cow.x + cow.width/2), Math.floor(cow.y + cow.height/2) + 4);
    }
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    moveCrane();
    updateFallingCows();
    drawGame();
    
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameState = 'gameover';
    
    // Stop background music and play game over sound
    stopBackgroundMusic();
    playSFX('gameOver');
    
    if (gameTimer) {
        clearInterval(gameTimer);
    }
    
    // Remove event listeners
    if (canvas) {
        canvas.removeEventListener('click', dropCow);
        canvas.removeEventListener('touchstart', dropCow);
    }
    
    // Update final stats
    const finalScoreEl = document.getElementById('final-score');
    const timeSurvivedEl = document.getElementById('time-survived');
    const highestStackEl = document.getElementById('highest-stack');
    
    if (finalScoreEl) finalScoreEl.textContent = score;
    if (timeSurvivedEl) timeSurvivedEl.textContent = timeSurvived + 's';
    if (highestStackEl) highestStackEl.textContent = highestStack;
    
    // Show game over screen after a brief delay
    setTimeout(() => {
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('gameover-screen').classList.add('active');
    }, 500);
}

function shareOnX() {
    // Play button click sound
    playSFX('buttonClick');
    
    const text = `🐮 Just played Lamamu Cow Stack by @0xTowhid and scored ${score} points with a ${highestStack} cow high stack! Can you beat my score? @lamumudotxyz`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function restartGame() {
    // Play button click sound
    playSFX('buttonClick');
    
    document.getElementById('gameover-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('active');
    gameState = 'start';
}

// Add event listeners for buttons with sound effects
function addButtonSoundEffects() {
    // Add click sound to all buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            resumeAudioContext();
            playSFX('buttonClick');
        });
    });
}

// Prevent default touch behaviors for better mobile experience
document.addEventListener('touchmove', function(e) {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchstart', function(e) {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Initialize everything on page load
window.addEventListener('load', () => {
    initializeAudio();
    addButtonSoundEffects();
});

// Handle orientation changes on mobile
window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        if (canvas && gameContainer) {
            const rect = gameContainer.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
    }, 100);
});

// Handle user interaction to resume audio context (required by browsers)
document.addEventListener('click', resumeAudioContext, { once: true });
document.addEventListener('touchstart', resumeAudioContext, { once: true });