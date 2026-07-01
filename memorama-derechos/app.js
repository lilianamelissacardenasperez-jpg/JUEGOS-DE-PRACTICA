/* ==========================================
   CONFIGURACIÓN Y DATOS DEL MEMORAMA
   ========================================== */

// Base de datos de los Derechos y sus descripciones pedagógicas
const RIGHTS_EXPLANATIONS = {
  salud: {
    title: "Derecho a la Salud 🩺",
    description: "Tienes derecho a ir al doctor, recibir vacunas y medicinas, y ser cuidado con amor cuando te sientas enfermo para estar muy sano.",
    speech: "¡Derecho a la Salud! Tienes derecho a ir al doctor, recibir vacunas y medicinas, y a que te cuiden con mucho amor cuando te sientas enfermo."
  },
  familia: {
    title: "Derecho a la Familia 🏡",
    description: "Tienes derecho a tener una familia que te brinde amor, protección, un hogar calientito y te apoye en todo momento.",
    speech: "¡Derecho a la Familia! Tienes derecho a tener una familia que te brinde mucho amor, protección, un hogar calientito y te cuide siempre."
  },
  alimentacion: {
    title: "Derecho a la Alimentación 🍎",
    description: "Tienes derecho a comer alimentos saludables, frescos y deliciosos todos los días para tener energía y crecer fuerte.",
    speech: "¡Derecho a la Alimentación! Tienes derecho a comer alimentos saludables, limpios y deliciosos todos los días para tener mucha energía y crecer muy fuerte."
  },
  educacion: {
    title: "Derecho a la Educación 🏫",
    description: "Tienes derecho a ir a una escuela bonita para aprender a leer, escribir, dibujar, cantar y jugar con tus amigos y maestros.",
    speech: "¡Derecho a la Educación! Tienes derecho a ir a una escuela bonita para aprender a leer, escribir, dibujar, y jugar con tus amigos y maestros."
  }
};

// Las 8 cartas únicas (2 por cada derecho)
const UNIQUE_CARDS = [
  // SALUD
  { rightId: "salud", emoji: "🏥", label: "Hospital" },
  { rightId: "salud", emoji: "🧼", label: "Higiene" },
  
  // FAMILIA
  { rightId: "familia", emoji: "🏡", label: "Hogar" },
  { rightId: "familia", emoji: "👨‍👩‍👧‍👦", label: "Familia" },
  
  // ALIMENTACIÓN
  { rightId: "alimentacion", emoji: "🍎", label: "Frutas" },
  { rightId: "alimentacion", emoji: "🥛", label: "Comida Sana" },
  
  // EDUCACIÓN
  { rightId: "educacion", emoji: "🏫", label: "Escuela" },
  { rightId: "educacion", emoji: "📚", label: "Aprender" }
];

// Estado del juego
let gameState = {
  deck: [],
  flippedCards: [],
  matchesCount: 0,
  movesCount: 0,
  boardLocked: false,
  soundEnabled: true,
  lastMatchedRight: null
};

// Sintetizador de voz (Web Speech API)
const synth = window.speechSynthesis;
let spanishVoice = null;

function loadVoices() {
  if (!synth) return;
  const voices = synth.getVoices();
  spanishVoice = voices.find(voice => voice.lang.startsWith('es-')) || voices[0];
}
if (synth) {
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
  loadVoices();
}

function speakText(text) {
  if (!synth) return;
  synth.cancel(); // Detener cualquier sonido previo
  const utterance = new SpeechSynthesisUtterance(text);
  if (spanishVoice) utterance.voice = spanishVoice;
  utterance.lang = 'es-ES';
  utterance.rate = 0.92; // Lento y amigable para niños
  utterance.pitch = 1.15; // Tono alegre e infantil
  synth.speak(utterance);
}

/* ==========================================
   EFECTOS DE SONIDO (Web Audio API)
   ========================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (!gameState.soundEnabled) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'flip') {
    // Sonido rápido de tarjeta volteando (swoosh / pop ligero)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'match') {
    // Chime brillante y alegre ascendente
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    gainNode.gain.setValueAtTime(0.12, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
    gainNode.gain.setValueAtTime(0.12, now + 0.24);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
    osc.start(now);
    osc.stop(now + 0.65);
  } else if (type === 'mismatch') {
    // Sonido sutil descendente de error
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.3);
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'victory') {
    // Arpegio largo y festivo
    osc.type = 'sine';
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    notes.forEach((freq, idx) => {
      osc.frequency.setValueAtTime(freq, now + (idx * 0.1));
    });
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    osc.start(now);
    osc.stop(now + 1.2);
  }
}

/* ==========================================
   LÓGICA DEL JUEGO
   ========================================== */

// Crear y mezclar el mazo de cartas (8 parejas = 16 cartas)
function createDeck() {
  // Duplicar cada una de las 8 cartas para formar las parejas
  const fullList = [...UNIQUE_CARDS, ...UNIQUE_CARDS];
  
  // Agregar una clave única para cada instancia de carta
  const deck = fullList.map((card, index) => ({
    ...card,
    id: index
  }));
  
  // Algoritmo Fisher-Yates para barajar
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

// Inicializar el tablero de juego
function initGame() {
  gameState.deck = createDeck();
  gameState.flippedCards = [];
  gameState.matchesCount = 0;
  gameState.movesCount = 0;
  gameState.boardLocked = false;
  gameState.lastMatchedRight = null;
  
  // Actualizar marcadores en UI
  document.getElementById("matches-found").textContent = `0 / 8`;
  document.getElementById("moves-count").textContent = `0`;
  document.getElementById("right-info-banner").style.display = "none";
  document.getElementById("pyro-effect").style.display = "none";
  
  // Crear elementos HTML del grid
  const gridEl = document.getElementById("cards-grid");
  gridEl.innerHTML = "";
  
  gameState.deck.forEach(card => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.setAttribute("data-id", card.id);
    cardEl.setAttribute("data-right", card.rightId);
    
    cardEl.innerHTML = `
      <div class="card-inner">
        <!-- Reverso (Face down) -->
        <div class="card-back">
          <div class="card-back-pattern">❓</div>
        </div>
        <!-- Anverso (Face up) -->
        <div class="card-front">
          <span class="card-front-emoji">${card.emoji}</span>
          <span class="card-front-label">${card.label}</span>
        </div>
      </div>
    `;
    
    cardEl.addEventListener("click", () => handleCardClick(cardEl, card));
    gridEl.appendChild(cardEl);
  });
  
  // Cambiar a pantalla de juego
  switchScreen("screen-game");
  
  // Instrucción inicial con voz
  setTimeout(() => {
    speakText("¡Encuentra las parejas de cartas iguales y descubre tus derechos!");
  }, 600);
}

// Cambiar de pantalla activa
function switchScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
}

// Manejar el clic en una carta
function handleCardClick(cardEl, cardData) {
  // Ignorar clics si el tablero está bloqueado, si la carta ya está volteada o si ya está emparejada
  if (gameState.boardLocked) return;
  if (cardEl.classList.contains("flipped") || cardEl.classList.contains("matched")) return;
  
  // Voltear carta
  playSound('flip');
  cardEl.classList.add("flipped");
  gameState.flippedCards.push({ element: cardEl, data: cardData });
  
  // Si es la primera carta volteada, esperamos a la segunda
  if (gameState.flippedCards.length < 2) return;
  
  // Si ya se volteó la segunda, bloqueamos clics y evaluamos
  gameState.boardLocked = true;
  gameState.movesCount++;
  document.getElementById("moves-count").textContent = gameState.movesCount;
  
  const firstCard = gameState.flippedCards[0];
  const secondCard = gameState.flippedCards[1];
  
  // Evaluar coincidencia
  if (firstCard.data.emoji === secondCard.data.emoji) {
    // --- COINCIDENCIA ---
    setTimeout(() => {
      // Aplicar estado de emparejado
      firstCard.element.classList.add("matched");
      secondCard.element.classList.add("matched");
      
      playSound('match');
      
      gameState.matchesCount++;
      document.getElementById("matches-found").textContent = `${gameState.matchesCount} / 8`;
      
      // Mostrar y leer información sobre el derecho encontrado
      showRightInfo(firstCard.data.rightId);
      
      // Resetear estado de volteo
      gameState.flippedCards = [];
      gameState.boardLocked = false;
      
      // Verificar si es la victoria
      if (gameState.matchesCount === 8) {
        // Retrasamos un poco la victoria para dejar escuchar la última explicación
        setTimeout(() => {
          showVictoryScreen();
        }, 5500);
      }
    }, 400);
    
  } else {
    // --- NO COINCIDE ---
    setTimeout(() => {
      // Agregar clase de error para animación de sacudida
      firstCard.element.classList.add("no-match");
      secondCard.element.classList.add("no-match");
      playSound('mismatch');
      
      setTimeout(() => {
        // Volver a voltear las cartas boca abajo
        firstCard.element.classList.remove("flipped", "no-match");
        secondCard.element.classList.remove("flipped", "no-match");
        
        gameState.flippedCards = [];
        gameState.boardLocked = false;
      }, 1000);
      
    }, 500);
  }
}

// Mostrar banner informativo del derecho y reproducir explicación de voz
function showRightInfo(rightId) {
  const explanation = RIGHTS_EXPLANATIONS[rightId];
  if (!explanation) return;
  
  gameState.lastMatchedRight = rightId;
  
  const banner = document.getElementById("right-info-banner");
  const emojiEl = document.getElementById("banner-emoji");
  const titleEl = document.getElementById("banner-title");
  const descEl = document.getElementById("banner-description");
  
  // Establecer colores correspondientes al derecho
  let emoji = "🌟";
  if (rightId === "salud") emoji = "🩺";
  else if (rightId === "familia") emoji = "🏡";
  else if (rightId === "alimentacion") emoji = "🍎";
  else if (rightId === "educacion") emoji = "🏫";
  
  emojiEl.textContent = emoji;
  titleEl.textContent = explanation.title;
  descEl.textContent = explanation.description;
  
  // Colorear el borde del banner según el derecho
  banner.style.borderColor = `var(--color-${rightId})`;
  
  // Mostrar banner
  banner.style.display = "block";
  
  // Explicación con voz en off
  speakText(explanation.speech);
}

// Volver a reproducir la última explicación de voz
function repeatLastRightVoice() {
  if (gameState.lastMatchedRight) {
    const explanation = RIGHTS_EXPLANATIONS[gameState.lastMatchedRight];
    if (explanation) {
      speakText(explanation.speech);
    }
  }
}

// Pantalla de Victoria
function showVictoryScreen() {
  document.getElementById("pyro-effect").style.display = "block";
  
  playSound('victory');
  switchScreen("screen-victory");
  
  document.getElementById("final-moves").textContent = gameState.movesCount;
  
  const evalEl = document.getElementById("victory-evaluation-text");
  let voiceMessage = "";
  
  if (gameState.movesCount <= 12) {
    evalEl.textContent = "🏆 ¡Fabuloso! ¡Tienes una memoria fantástica y conoces tus derechos! 🏆";
    voiceMessage = "¡Fabuloso! Tienes una memoria increíble y completaste tu memorama muy rápido. ¡Felicidades, eres un súper campeón de tus derechos!";
  } else if (gameState.movesCount <= 20) {
    evalEl.textContent = "🌟 ¡Muy bien! Has completado el memorama de tus derechos. 🌟";
    voiceMessage = `¡Felicidades! Completaste el memorama de tus derechos. Lo hiciste en ${gameState.movesCount} intentos. ¡Gran trabajo!`;
  } else {
    evalEl.textContent = "💪 ¡Excelente esfuerzo! Sigue jugando para mejorar tu memoria y aprender más. 💪";
    voiceMessage = "¡Excelente esfuerzo! Lograste encontrar todas las parejas de tus derechos. Sigue jugando para mejorar tu memoria.";
  }
  
  speakText(voiceMessage);
}


/* ==========================================
   MANEJADORES DE EVENTOS
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  
  const btnStart = document.getElementById("btn-start");
  const btnRestart = document.getElementById("btn-restart");
  const btnRepeatVoice = document.getElementById("btn-repeat-voice");
  const btnSoundToggle = document.getElementById("btn-sound-toggle");
  
  // --- Click Inicio / Reinicio ---
  btnStart.addEventListener("click", () => {
    playSound('flip');
    initGame();
  });
  
  btnRestart.addEventListener("click", () => {
    playSound('flip');
    initGame();
  });
  
  btnRepeatVoice.addEventListener("click", () => {
    playSound('flip');
    repeatLastRightVoice();
  });
  
  btnSoundToggle.addEventListener("click", () => {
    gameState.soundEnabled = !gameState.soundEnabled;
    btnSoundToggle.textContent = gameState.soundEnabled ? "🔊" : "🔇";
    if (gameState.soundEnabled && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  });

});
