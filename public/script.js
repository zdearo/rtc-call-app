const socket = io();
let localStream;
let peerConnection;
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};
const usersList = document.getElementById('users');

// Captura o stream de audio e video do usuário
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    const video = document.createElement('video');
    const videosContainer = document.getElementById('videos-container');
    videosContainer.appendChild(video);
    video.srcObject = stream;
    localStream = stream;
    video.muted = true; // Para evitar o feedback do microfone
    video.play();
  }).catch(console.error);

// Função para criar uma conexão peer com outro usuário
function createPeerConnection(user) {
  peerConnection = new RTCPeerConnection(config);
  
  // Adiciona os tracks locais de audio e video ao peerConnection
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  
  // Enviar candidatos ICE ao outro peer
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('ice-candidate', user, event.candidate);
    }
  };

  // Quando o stream remoto é adicionado, ele é exibido
  peerConnection.ontrack = event => {
    const video = document.createElement('video');
    const videosContainer = document.getElementById('videos-container');
    video.srcObject = event.streams[0];
    video.play();
    videosContainer.appendChild(video);
  };
}

// Função para iniciar a conexão e enviar a oferta
function createOffer(user) {
  peerConnection.createOffer()
    .then(offer => peerConnection.setLocalDescription(offer))
    .then(() => {
      socket.emit('offer', user, peerConnection.localDescription);
    }).catch(console.error);
}

// Função para criar um item de lista de usuários
function createListItem(user) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.textContent = 'Conectar';
  li.textContent = user;
  li.appendChild(button);
  button.addEventListener('click', () => {
    console.log('Conectando com ' + user);
    createPeerConnection(user);
    createOffer(user); // Inicia a oferta após criar a conexão
  });
  usersList.appendChild(li);
}

// Evento disparado quando um novo usuário se conecta
socket.on('connected_users', (users) => {
  usersList.innerHTML = '';
  users.forEach(user => {
    if (user !== socket.id) {
      createListItem(user);
    }
  });
});

// Quando uma oferta é recebida de outro peer
socket.on('offer', (user, description) => {
  createPeerConnection(user); // Cria a conexão ao receber a oferta
  peerConnection.setRemoteDescription(new RTCSessionDescription(description))
    .then(() => {
      return peerConnection.createAnswer();
    })
    .then(answer => {
      return peerConnection.setLocalDescription(answer);
    })
    .then(() => {
      socket.emit('answer', user, peerConnection.localDescription);
    }).catch(console.error);
});

// Quando uma resposta (answer) é recebida do peer
socket.on('answer', (user, description) => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(description)).catch(console.error);
});

// Quando um candidato ICE é recebido
socket.on('ice-candidate', (user, candidate) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
});
