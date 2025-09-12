const startBtn = document.getElementById("startCall");

let peerConnection;
let localStream;

startBtn.onclick = async () => {
  peerConnection = new RTCPeerConnection();

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    const remoteAudio = document.getElementById("remoteAudio");
    remoteAudio.srcObject = event.streams[0];
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  localStorage.setItem("webrtc-offer", JSON.stringify(offer));

  alert("Offer created! Now go to the Receiver and click Answer Call.");
};
