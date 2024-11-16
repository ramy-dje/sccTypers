const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { resolve } = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server);
const port = 3010;

app.use(express.static('static'));

const players = new Map();
const gameText = "this is a nice day with css club";
let gameInProgress = false;
let startTime = null;
let gameWinner = null;

io.on('connection', (socket) => {
  socket.on('join', (playerName) => {
    players.set(socket.id, { 
      name: playerName, 
      progress: 0,
      finished: false,
      position: null
    });
    io.emit('playerList', Array.from(players.values()));
    
    if (!gameInProgress) {
      gameInProgress = true;
      startTime = Date.now() + 3000;
      io.emit('gameStart', { startTime, text: gameText });
    }
  });

  socket.on('progress', ({ progress }) => {
    const player = players.get(socket.id);
    if (player && gameInProgress) {
      player.progress = progress;
      
      if (progress === 100 && !player.finished) {
        player.finished = true;
        const finishedPlayers = Array.from(players.values()).filter(p => p.finished).length;
        player.position = finishedPlayers;
        
        if (finishedPlayers === 1 && !gameWinner) {
          gameWinner = player;
          const endTime = Date.now();
          const timeElapsed = Math.floor((endTime - startTime) / 1000);
          const minutes = Math.floor(timeElapsed / 60);
          const seconds = timeElapsed % 60;
          const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          io.emit('gameWon', {
            winner: player.name,
            time: timeString
          });
        }
      }
      
      io.emit('playerList', Array.from(players.values()));
    }
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('playerList', Array.from(players.values()));
    if (players.size === 0) {
      gameInProgress = false;
      startTime = null;
      gameWinner = null;
      io.emit('gameReset');
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(resolve(__dirname, 'pages/index.html'));
});

server.listen(port, () => {
  console.log(`Typing race server running at http://localhost:${port}`);
});