const answerBtn = document.getElementById("answerCall");

let peerConnection;

answerBtn.onclick = async () => {
  peerConnection = new RTCPeerConnection();

  peerConnection.ontrack = (event) => {
    const remoteAudio = document.getElementById("remoteAudio");
    remoteAudio.srcObject = event.streams[0];
  };

  const offer = JSON.parse(localStorage.getItem("webrtc-offer"));
  if (!offer) {
    alert("No offer found! Start the call first.");
    return;
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  localStorage.setItem("webrtc-answer", JSON.stringify(answer));

  alert("Answer created! Now Caller should refresh and read the answer.");
};
