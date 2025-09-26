const socket = new WebSocket("ws://localhost:3000");
let peerConnection;
let localStream;
let pendingOffer = null;
let callTimeout = null;
let pendingMediaType = { audio: true, video: false }; // default

const audioCallBtn = document.getElementById("audioCall");
const videoCallBtn = document.getElementById("videoCall");
const answerBtn = document.getElementById("answerCall");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

socket.onmessage = async (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "offer") {
    pendingOffer = message.offer;
    pendingMediaType = message.media; // 👈 save whether it’s audio or video
    alert("📞 Incoming " + (pendingMediaType.video ? "Video" : "Audio") + " Call! Press 'Answer Call' to accept.");
    answerBtn.disabled = false;

    // start timeout on receiver side too
    callTimeout = setTimeout(() => {
      if (!peerConnection) {
        alert("Missed call. No answer.");
        socket.send(JSON.stringify({ type: "call-timeout" }));
        pendingOffer = null;
        answerBtn.disabled = true;
      }
    }, 15000);
  } 
  else if (message.type === "answer") {
    clearTimeout(callTimeout); //cancel caller timeout
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
  } 
  else if (message.type === "ice-candidate") {
    try {
      await peerConnection.addIceCandidate(message.candidate);
    } catch (err) {
      console.error("Error adding ICE", err);
    }
  }
  else if (message.type === "call-timeout") {
    // Caller/Receiver both end
    endCall("Call timed out. Disconnected.");
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

async function startCall({ video }) {
  createPeerConnection();

  // Get local audio (+ video if requested)
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  localVideo.srcObject = localStream;

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Send offer with media type info
  socket.send(JSON.stringify({ type: "offer", offer, media: { audio: true, video } }));

  alert((video ? "📹 Video" : "🎤 Audio") + " call sent! Waiting for the other person to answer...");

  // Caller timeout (15s)
  callTimeout = setTimeout(() => {
    if (!peerConnection.currentRemoteDescription) {
      socket.send(JSON.stringify({ type: "call-timeout" }));
      endCall("No answer. Call ended.");
    }
  }, 15000);
}

audioCallBtn.onclick = () => startCall({ video: false });
videoCallBtn.onclick = () => startCall({ video: true });

answerBtn.onclick = async () => {
  if (!pendingOffer) {
    alert("No incoming call to answer.");
    return;
  }

  clearTimeout(callTimeout); // cancel missed call timer

  createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer));

  // 👇 use the same media type as caller requested
  localStream = await navigator.mediaDevices.getUserMedia(pendingMediaType);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  localVideo.srcObject = localStream;

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.send(JSON.stringify({ type: "answer", answer }));

  alert("✅ Call accepted!");
  answerBtn.disabled = true;
  pendingOffer = null;
};

function endCall(message) {
  alert(message);

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  pendingOffer = null;
  answerBtn.disabled = true;
  clearTimeout(callTimeout);
}
