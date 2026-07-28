const statusDiv = document.getElementById("status");
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const activeDot = document.getElementById("active-dot");
const typingIndicator = document.getElementById("typing-indicator");

// Generate a unique ID for this browser tab
const myId = crypto.randomUUID();

// const socket = new WebSocket("ws://127.0.0.1:8000/ws");
const socket = new WebSocket("wss://chat-app-o1bd.onrender.com/ws");

let isTyping = false;
let typingTimeout = null;

function setTyping(typing) {
    if (isTyping !== typing) {
        isTyping = typing;
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "typing",
                sender: myId,
                typing: typing
            }));
        }
    }
}

function handleTypingInput() {
    if (input.value.trim() === "") {
        setTyping(false);
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        return;
    }

    setTyping(true);

    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    typingTimeout = setTimeout(() => {
        setTyping(false);
        typingTimeout = null;
    }, 1500);
}

socket.onopen = () => {
    statusDiv.innerText = "Connected";
    // Register ourselves with our initial visibility state (must be visible and focused)
    socket.send(JSON.stringify({
        type: "register",
        sender: myId,
        visible: document.visibilityState === "visible" && document.hasFocus()
    }));
};

socket.onclose = () => {
    statusDiv.innerText = "Disconnected";
    if (activeDot) {
        activeDot.className = "status-dot offline";
        activeDot.title = "Connection lost";
    }
    if (typingIndicator) {
        typingIndicator.classList.add("hidden");
    }
};

socket.onmessage = (event) => {
    let data;
    try {
        data = JSON.parse(event.data);
    } catch (e) {
        console.error("Error parsing WebSocket message:", e);
        return;
    }

    if (data.type === "users_status") {
        const otherUser = data.users.find(u => u.id !== myId);
        if (otherUser) {
            if (otherUser.visible) {
                activeDot.className = "status-dot online";
                activeDot.title = "Other user is active";
            } else {
                activeDot.className = "status-dot offline";
                activeDot.title = "Other user is idle/away";
            }

            if (otherUser.typing) {
                typingIndicator.classList.remove("hidden");
            } else {
                typingIndicator.classList.add("hidden");
            }
        } else {
            activeDot.className = "status-dot offline";
            activeDot.title = "Other user is offline";
            typingIndicator.classList.add("hidden");
        }
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
    
    // Reset typing status on send
    setTyping(false);
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("input", handleTypingInput);

input.addEventListener("keypress", function(event){
    if(event.key === "Enter"){
        sendMessage();
    }
});

// Function to determine and send if user is actively using/viewing the chat
function updateActiveStatus() {
    const visible = document.visibilityState === "visible" && document.hasFocus();
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "visibility",
            sender: myId,
            visible: visible
        }));
    }
}

// Watch for tab visibility change, window focus, and window blur
document.addEventListener("visibilitychange", updateActiveStatus);
window.addEventListener("focus", updateActiveStatus);
window.addEventListener("blur", () => {
    // Immediately set to inactive when blurred (user switches apps/clicks away)
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "visibility",
            sender: myId,
            visible: false
        }));
    }
});

// Adjust height dynamically for mobile keyboards using the Visual Viewport API
function adjustHeight() {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    if (window.innerWidth <= 480) {
        document.documentElement.style.setProperty('--chat-height', `${vh}px`);
    } else {
        document.documentElement.style.setProperty('--chat-height', `${Math.min(vh * 0.9, 650)}px`);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', adjustHeight);
    window.visualViewport.addEventListener('scroll', adjustHeight);
}
window.addEventListener('resize', adjustHeight);
window.addEventListener('load', () => {
    adjustHeight();
    input.focus();
});

// Call adjustHeight and focus input on WebSocket open
socket.addEventListener('open', () => {
    adjustHeight();
    input.focus();
});

// Add listener for the refresh button
const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
        window.location.reload();
    });
}

// Add listener for the reset button
const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
        try {
            const wsUrl = socket.url;
            const httpUrl = wsUrl
                .replace("wss://", "https://")
                .replace("ws://", "http://")
                .replace("/ws", "/reset");

            await fetch(httpUrl, {
                method: "POST"
            });
        } catch (error) {
            console.error("Error calling reset endpoint:", error);
        }
    });
}