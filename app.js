import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";
import fs from "fs";

const swarm = new Hyperswarm();
let peers = new Set();

const fileChunks = new Map();

const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const shareFileBtn = document.getElementById("share-file-btn");
const roomTopicEl = document.getElementById("room-topic");
const peersCountEl = document.getElementById("peers-count");
const fileInput = document.getElementById("file-input");

async function joinSwarm(topicBuffer) {
  document.querySelector('#room-section').classList.add('hidden');
  addLoading();
  await swarm.join(topicBuffer, { lookup: true, announce: true }).flushed();

  const topic = b4a.toString(topicBuffer, "hex");
  roomTopicEl.textContent = topic;
  removeLoading();
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
      console.log("Data received from peer:", data.toString());
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'file-chunk') {
          const { fileName, fileType, chunk, index, isLast } = message;
  
          if (!fileChunks.has(fileName)) {
            fileChunks.set(fileName, []);
          }
  
          fileChunks.get(fileName)[index] = chunk;
  
          if (isLast) {
            const allChunks = fileChunks.get(fileName).join('');
            displayFile({ data: allChunks, fileName, fileType });
            fileChunks.delete(fileName); // Clean up
            console.log(`File "${fileName}" received and reconstructed.`);
          }
        }
      } catch (error) {
        console.error("Error processing incoming data:", error);
      }
    });
  
    connection.on("close", () => {
      peers.delete(connection);
      console.log("Peer disconnected.");
    });
  });
  
  
  
function chunkData(data, chunkSize = 16 * 1024){
  const chunks = [];
  for(let i=0;i<data.length;i+=chunkSize){
    chunks.push(data.slice(i, i+chunkSize));
  }

  return chunks;
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

// function saveFile({ data, fileName }) {
//   const fileBuffer = b4a.from(data, 'base64');
//   fs.writeFileSync(fileName, fileBuffer);
//   console.log(`File saved as "${fileName}"`);
// }


function displayFile(message){
  const {data, fileName, fileType} = message;
  try{
  const fileBuffer = b4a.from(data, 'base64');
  const fileBlob = new Blob([fileBuffer], { type: fileType });
  const fileURL = URL.createObjectURL(fileBlob);

  if (fileType.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = fileURL;
    img.alt = fileName;
    img.style.maxWidth = '100%';
    document.body.appendChild(img);
  } else if (fileType === 'application/pdf') {
    const iframe = document.getElementById('presentation-viewer');
    if (iframe) {
      iframe.src = fileURL;
    }
  } else {
    const link = document.createElement('a');
    link.href = fileURL;
    link.download = fileName;
    link.textContent = `Download ${fileName}`;
    document.body.appendChild(link);
  }
  }catch(error){
  console.error('Error displaying file:', error);
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
    const fileName = file.name;
    const fileType = file.type;
    console.log("File name : ", fileName);
    console.log("File type : ", fileType);

    const chunks = chunkData(data, 16*1024);
    chunks.forEach((chunk, index) => {
     try {
      for (const peer of peers) {
        peer.write(JSON.stringify({ type: 'file-chunk', chunk, fileName, fileType, index, isLast: index===chunks.length - 1 }));
        console.log(`Sending chunk ${index + 1} of ${chunks.length} to peers`);
      }
     } catch (error) {
        console.error('Error sending chunk to peer:', err);
     }
    })
    displayFile({data, fileName, fileType});
    console.log(`${fileName} shared with peers.`);
  };
  reader.readAsDataURL(file);
  fileInput.innerText = '';
});

function addLoading(){
  document.querySelector('#loading').classList.remove('hidden');
}
function removeLoading(){
  document.querySelector('#loading').classList.add('hidden');
}