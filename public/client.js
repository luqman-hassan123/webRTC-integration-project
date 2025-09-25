const socket = new WebSocket("ws://localhost:3000");
let peerConnection;
let localStream;
let pendingOffer = null;

const startBtn = document.getElementById("startCall");
const answerBtn = document.getElementById("answerCall");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

socket.onmessage = async (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "offer") {
    pendingOffer = message.offer;
    alert("Incoming call! Press 'Answer Call' to accept.");
    answerBtn.disabled = false;
  } 
  else if (message.type === "answer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
  } 
  else if (message.type === "ice-candidate") {
    try {
      await peerConnection.addIceCandidate(message.candidate);
    } catch (err) {
      console.error("Error adding ICE", err);
    }
  }
};

function createPeerConnection() {
  peerConnection = new RTCPeerConnection();

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
    }
  };
}

// Caller: start a call
startBtn.onclick = async () => {
  createPeerConnection();

  // Get local audio + video
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  localVideo.srcObject = localStream;

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Send offer to signaling server
  socket.send(JSON.stringify({ type: "offer", offer }));

  alert("📤 Call sent! Waiting for the other person to answer...");

  // ⏳ Start 15s timer
  const timeout = setTimeout(() => {
    if (!peerConnection.currentRemoteDescription) {
      alert("No answer. Call ended.");
      peerConnection.close();
      peerConnection = null;
      localStream.getTracks().forEach(track => track.stop());
    }
  }, 15000);

  // Cancel timeout if answer arrives
  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "answer") {
      clearTimeout(timeout); //cancel timeout
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } 
    else if (message.type === "ice-candidate") {
      try {
        await peerConnection.addIceCandidate(message.candidate);
      } catch (err) {
        console.error("Error adding ICE", err);
      }
    }
    else if (message.type === "offer") {
      // Handle receiver side if needed
      pendingOffer = message.offer;
      alert("Incoming call! Press 'Answer Call' to accept.");
      answerBtn.disabled = false;
    }
  };
};

answerBtn.onclick = async () => {
  if (!pendingOffer) {
    alert("No incoming call to answer.");
    return;
  }

  createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer));

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  localVideo.srcObject = localStream;

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.send(JSON.stringify({ type: "answer", answer }));

  alert("Call accepted!");
  answerBtn.disabled = true;
  pendingOffer = null;
};
