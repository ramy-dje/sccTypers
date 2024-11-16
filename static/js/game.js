const socket = io();
let gameStartTime = null;
let gameText = '';
let timerInterval = null;

function joinGame() {
  const playerName = document.getElementById('playerName').value.trim();
  if (playerName) {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
    socket.emit('join', playerName);
  }
}

function updateTimer(startTime) {
  const timerElement = document.getElementById('timer');
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

function highlightText(input) {
  const textDisplay = document.getElementById('textDisplay');
  let html = '';
  
  for (let i = 0; i < gameText.length; i++) {
    if (i < input.length) {
      if (input[i] === gameText[i]) {
        html += `<span class="correct">${gameText[i]}</span>`;
      } else {
        html += `<span class="incorrect">${gameText[i]}</span>`;
      }
    } else {
      html += `<span class="remaining">${gameText[i]}</span>`;
    }
  }
  textDisplay.innerHTML = html;
}

function showVictoryPopup(winner, time) {
  const overlay = document.getElementById('overlay');
  const popup = document.getElementById('victoryPopup');
  const winnerName = document.getElementById('winnerName');
  const timeValue = document.getElementById('timeValue');

  winnerName.textContent = `${winner} finished first!`;
  timeValue.textContent = time;

  overlay.classList.remove('hidden');
  popup.classList.remove('hidden');
  overlay.style.opacity = '1';
}

socket.on('playerList', (players) => {
  const playersDiv = document.getElementById('players');
  playersDiv.innerHTML = players.map(player => `
    <div class="player">
      <div class="player-info">
        <div class="player-name">${player.name}</div>
        <div class="player-stats">
          <span class="progress-percent">${player.progress}%</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress" style="width: ${player.progress}%"></div>
      </div>
      ${player.position ? `<div class="position">#${player.position}</div>` : ''}
    </div>
  `).join('');
});

socket.on('gameStart', ({ startTime, text }) => {
  gameStartTime = startTime;
  gameText = text;
  const textDisplay = document.getElementById('textDisplay');
  textDisplay.innerHTML = `<span class="remaining">${text}</span>`;
  
  const countdown = document.getElementById('countdown');
  const updateCountdown = () => {
    const now = Date.now();
    const timeLeft = Math.ceil((gameStartTime - now) / 1000);
    
    if (timeLeft > 0) {
      countdown.textContent = timeLeft;
      requestAnimationFrame(updateCountdown);
    } else {
      countdown.textContent = 'GO!';
      document.getElementById('textInput').disabled = false;
      document.getElementById('textInput').focus();
      setTimeout(() => countdown.textContent = '', 1000);
      updateTimer(Date.now());
    }
  };
  updateCountdown();
});

socket.on('gameReset', () => {
  document.getElementById('textInput').value = '';
  document.getElementById('textInput').disabled = true;
  document.getElementById('textDisplay').textContent = '';
  document.getElementById('countdown').textContent = '';
  document.getElementById('timer').textContent = '0:00';
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('victoryPopup').classList.add('hidden');
  if (timerInterval) clearInterval(timerInterval);
});

socket.on('gameWon', ({ winner, time }) => {
  showVictoryPopup(winner, time);
  document.getElementById('textInput').disabled = true;
});

document.getElementById('textInput').addEventListener('input', (e) => {
  const input = e.target.value;
  const currentIndex = input.length - 1;
  
  
  highlightText(input);
  if (currentIndex >= 0 && input[currentIndex] !== gameText[currentIndex]) {
    e.target.value = input.slice(0, -1);
    return;
  }
  
  const progress = (input.length / gameText.length) * 100;
  
  socket.emit('progress', {
    progress: Math.min(progress, 100)
  });
  
  if (input === gameText) {
    e.target.disabled = true;
    if (timerInterval) clearInterval(timerInterval);
  }
});

document.getElementById('textInput').addEventListener('paste', (e) => {
  e.preventDefault();
});