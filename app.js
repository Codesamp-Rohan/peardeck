import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";
import fs from "fs";

const swarm = new Hyperswarm();
let peers = new Set();

const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const shareFileBtn = document.getElementById("share-file-btn");
const roomTopicEl = document.getElementById("room-topic");
const peersCountEl = document.getElementById("peers-count");
const fileInput = document.getElementById("file-input");

async function joinSwarm(topicBuffer) {
  document.querySelector('#room-section').classList.add('hidden');
  document.querySelector('#loading').classList.remove('hidden');
  await swarm.join(topicBuffer, { lookup: true, announce: true }).flushed();

  const topic = b4a.toString(topicBuffer, "hex");
  roomTopicEl.textContent = topic;
  document.querySelector('#loading').classList.add('hidden');
  document.querySelector('#file-section').classList.remove('hidden');
  document.querySelector('.ppt_view').classList.remove('hidden');
}

  swarm.on('update', () => {
    peersCountEl.textContent = swarm.connections.size + 1;
  })

swarm.on("connection", (connection) => {
  console.log("New peer connected");
  peers.add(connection);

  connection.on("data", (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === "presentation") {
      console.log("Received presentation data");
      viewPresentation(message.data);
      savePresentation(message.data);
    }
  });

  connection.on("close", () => {
    peers.delete(connection);
    updatePeerCount();
  });
});

function savePresentation(data) {
  const fileBuffer = b4a.from(data, "base64");
  const filePath = "received_presentation.pdf";
  fs.writeFileSync(filePath, fileBuffer);
  console.log(`Presentation saved as "${filePath}"`);
}

createRoomBtn.addEventListener("click", () => {
  const topicBuffer = crypto.randomBytes(32);
  joinSwarm(topicBuffer);
});

joinRoomBtn.addEventListener("click", () => {
  const topic = document.getElementById("room-id").value.trim();
  if (!topic) {
    alert("Please enter a valid Room ID");
    return;
  }
  const topicBuffer = b4a.from(topic, "hex");
  joinSwarm(topicBuffer);
});

function viewPresentation(data) {
  const fileBuffer = b4a.from(data, 'base64');
  const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
  const fileURL = URL.createObjectURL(fileBlob);

  const iframe = document.getElementById('presentation-viewer');
  if (iframe) {
    iframe.src = fileURL;
    console.log('Presentation displayed in the iframe');
  } else {
    console.log('Iframe element not found for displaying the presentation.');
  }
}

shareFileBtn.addEventListener("click", () => {
  const fileInput = document.getElementById('file-input');
  if (fileInput.files.length === 0) {
    alert('Please select a file to share.');
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    const data = reader.result.split(',')[1];
    viewPresentation(data);
    for (const peer of peers) {
      peer.write(JSON.stringify({ type: 'presentation', data }));
    }
    console.log('Presentation shared with peers.');
  };
  reader.readAsDataURL(file);
});
