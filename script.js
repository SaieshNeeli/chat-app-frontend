const statusDiv = document.getElementById("status");
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// Generate a unique ID for this browser tab
const myId = crypto.randomUUID();

const socket = new WebSocket("wss://chat-app-o1bd.onrender.com/ws");

socket.onopen = () => {
    statusDiv.innerText = "Connected";
};

socket.onclose = () => {
    statusDiv.innerText = "Disconnected";
};

socket.onmessage = (event) => {
    let data;
    try {
        data = JSON.parse(event.data);
    } catch (e) {
        console.error("Error parsing WebSocket message:", e);
        return;
    }

    if (data.type === "system") {
        const div = document.createElement("div");
        div.className = "message system";
        div.textContent = data.message;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return;
    }

    if (data.type !== "chat")
        return;

    const div = document.createElement("div");

    if (data.sender === myId) {
        div.className = "message me";
    } else {
        div.className = "message other";
    }

    div.textContent = data.message;

    messagesDiv.appendChild(div);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
};

function sendMessage() {

    const message = input.value.trim();

    if (message === "")
        return;

    socket.send(JSON.stringify({
        type: "chat",
        sender: myId,
        message: message
    }));

    input.value = "";
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", function(event){

    if(event.key === "Enter"){
        sendMessage();
    }

});