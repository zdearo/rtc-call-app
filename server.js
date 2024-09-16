const PORT = process.env.PORT || 3000;
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let connected_users = [];

// Função para atualizar a lista de usuários conectados
function updateConnectedUsers() {
  io.emit('connected_users', connected_users);
}

// Evento de conexão de um novo usuário
io.on('connection', (socket) => {
  console.log('Usuário conectado: ' + socket.id);
  connected_users.push(socket.id);
  updateConnectedUsers();

  // Escuta por ofertas (offer) e envia para o destinatário correto
  socket.on('offer', (user, description) => {
    console.log('Oferta recebida de ' + socket.id + ' para ' + user);
    io.to(user).emit('offer', socket.id, description);
  });

  // Escuta por respostas (answer) e envia para o destinatário correto
  socket.on('answer', (user, description) => {
    console.log('Resposta recebida de ' + socket.id + ' para ' + user);
    io.to(user).emit('answer', socket.id, description);
  });

  // Escuta por candidatos ICE e envia para o destinatário correto
  socket.on('ice-candidate', (user, candidate) => {
    console.log('Candidato ICE recebido de ' + socket.id + ' para ' + user);
    io.to(user).emit('ice-candidate', socket.id, candidate);
  });

  // Evento de desconexão de um usuário
  socket.on('disconnect', () => {
    console.log('Usuário desconectado: ' + socket.id);
    connected_users = connected_users.filter(user => user !== socket.id);
    updateConnectedUsers();
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
