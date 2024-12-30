import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";
import fs from "fs";

const swarm = new Hyperswarm();
let peers = new Set();

// const myHexCode = generateRandomHexCode();
// let myHexCode;

const fileChunks = new Map();

const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const shareFileBtn = document.getElementById("share-file-btn");
const roomTopicEl = document.getElementById("room-topic");
const peersCountEl = document.getElementById("peers-count");
const userName = document.getElementById("hexName");
const fileInput = document.getElementById("file-input");

async function joinSwarm(topicBuffer) {
  document.querySelector('#room-section').classList.add('hidden');
  addLoading();
  console.log(name);
  await swarm.join(topicBuffer, { lookup: true, announce: true }).flushed();
  const topic = b4a.toString(topicBuffer, "hex");
  roomTopicEl.textContent = topic;
  // userName.textContent = myHexCode;
  removeLoading();
  document.querySelector('#chat--container').classList.remove('hidden');
  document.querySelector('#file-section').classList.remove('hidden');
  document.querySelector('.toggle-btn-div').classList.remove('hidden');
  document.querySelector('.pdf_view').classList.remove('hidden');
}

  swarm.on('update', () => {
    peersCountEl.textContent = swarm.connections.size + 1;
  })

  swarm.on("connection", (connection) => {
    const myHexCode = b4a.toString(connection.remotePublicKey, 'hex').substr(0, 6);
    console.log("New peer connected : ", myHexCode);
    peers.add(connection);
    connection.on("data", (data) => {
      console.log("Data received from peer:", data.toString());
      try {
        const message = JSON.parse(data.toString());
        if(message.type === 'tchat'){
          onMessageAdded(myHexCode ,message.message);
        }
        if (message.type === 'chat') {
          onMessageAdded(message.sender, message.content);
        }
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
  peersCountEl.textContent = 1;
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

function displayFile(message){
  const {data, fileName, fileType} = message;
  try{
  const fileBuffer = b4a.from(data, 'base64');
  const fileBlob = new Blob([fileBuffer], { type: fileType });
  const fileURL = URL.createObjectURL(fileBlob);

  if (fileType.startsWith('image/')) {
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('imgContainer');
    const img = document.createElement('img');
    img.src = fileURL;
    img.alt = fileName;
    const imgContent = document.createElement('div');
    imgContent.classList.add('img-content')
    const imgContentDiv = document.createElement('div');
    imgContentDiv.classList.add('img-contentDiv');
    const imgH1 = document.createElement('h1');
    const imgp = document.createElement('p');
    imgH1.textContent = `Name : ${fileName}`;
    imgp.textContent = `File Type : ${fileType}`;
    const imgDownload = document.createElement('button');
    imgDownload.textContent = "Download";

    imgDownload.addEventListener('click', () => {
      const downloadLink = document.createElement('a');
      downloadLink.href = fileURL;
      downloadLink.download = fileName;
      downloadLink.click();
    });

    imgContentDiv.appendChild(imgH1);
    imgContentDiv.appendChild(imgp);
    imgContent.appendChild(imgContentDiv);
    imgContent.appendChild(imgDownload);
    imageContainer.appendChild(img);
    imageContainer.appendChild(imgContent);
    document.querySelector('.image_view').appendChild(imageContainer);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || fileType === 'application/vnd.ms-powerpoint') { 
    const googleDocsUrl = `https://docs.google.com/gview?url=${fileURL}&embedded=true`;
    const iframe = document.getElementById('ppt-viewer');
    if(iframe){ 
      iframe.src = googleDocsUrl;
    } 
  } else if (fileType === 'application/pdf') {
    const iframe = document.getElementById('presentation-viewer');
    if (iframe) {
      iframe.src = fileURL;
    }
  } else if(fileType === 'video/mp4'){
    const videoContainer = document.createElement('div');
    videoContainer.classList.add('videoContainer');
    const video = document.createElement('video');
    video.src = fileURL;
    video.controls = true;
    video.alt = fileName;
    const vdContent = document.createElement('div');
    vdContent.classList.add('vd-content');
    const vdContentDiv = document.createElement('div');
    vdContentDiv.classList.add('vd-contentDiv');
    const vdH1 = document.createElement('h1');
    const vdp = document.createElement('p');
    vdH1.textContent = `Name : ${fileName}`;
    vdp.textContent = `File Type : ${fileType}`;
    const vdDownload = document.createElement('button');
    vdDownload.textContent = "Download";
  
    vdDownload.addEventListener('click', () => {
      const downloadLink = document.createElement('a');
      downloadLink.href = fileURL;
      downloadLink.download = fileName;
      downloadLink.click();
    });
  
    vdContentDiv.appendChild(vdH1);
    vdContentDiv.appendChild(vdp);
    vdContent.appendChild(vdContentDiv);
    vdContent.appendChild(vdDownload);
    videoContainer.appendChild(video);
    videoContainer.appendChild(vdContent);
    document.querySelector('.video_view').appendChild(videoContainer);
  }
  
   else {
    const link = document.createElement('a');
    link.classList.add('other_link');
    link.href = fileURL;
    link.download = fileName;
    link.textContent = `Download ${fileName}`;
    document.querySelector('.other_viewLinks').appendChild(link);
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

// Other JS
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".toggle-btn-div button");
  const views = {
    ppt: document.querySelector(".ppt_view"),
    pdf: document.querySelector(".pdf_view"),
    image: document.querySelector(".image_view"),
    video: document.querySelector(".video_view"),
    other: document.querySelector(".other_view")
  };
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      Object.values(views).forEach(view => view.classList.add("hidden"));
      buttons.forEach(btn => {
        btn.style.borderBottom = "none";
        btn.style.backgroundColor = '#f4f4f4';
        btn.style.borderRadius = "5px";
      });
      const viewKey = button.textContent.toLowerCase();
      if (views[viewKey]) {
        views[viewKey].classList.remove("hidden");
      }
      button.style.borderBottom = "2px solid #161616";
      button.style.backgroundColor = "#ddd";
      button.style.borderRadius = "5px";
    });
  });
});


// Chat Code
const chatToggleBtn = document.querySelector('#chat-toggle-btn');
const chatArea = document.querySelector('#chat--area');

chatToggleBtn.addEventListener('click', () => {
  chatArea.classList.toggle('hidden');
})

document.querySelector('#sendMsgForm').addEventListener('submit', sendMessage)

function sendMessage (e) {
  const message = document.querySelector('#message-input').value
  document.querySelector('#message-input').value = ''
  e.preventDefault()
  if (!message) return;
  const myHexCode = b4a.toString(swarm.keyPair.publicKey, 'hex').substr(0, 6);
  const chatMessage = JSON.stringify({
    type: 'chat',
    sender: myHexCode,
    content: message,
    timestamp: Date.now()
  });
  onMessageAdded('You', message)
  const peers = [...swarm.connections]
  for (const peer of peers) peer.write(chatMessage)
}

function onMessageAdded(name, message) {
  const $div = document.createElement('div');
  $div.className = name === "You" ? 'chat-message-right' : 'chat-message-left';
  $div.innerHTML = `
  <p>${message}</p>
  <p style="font-size: 7px; color: #777;"><strong>${name}</strong></p>
  `;
  document.querySelector('#chat').appendChild($div);
  document.querySelector('#chat').scrollTop = document.querySelector('#chat').scrollHeight;
}

// function generateRandomHexCode() {
//   return Math.random().toString(16).substr(2, 6);
// }
