const http = require('http'); // Import the HTTP module 
const WebSocket = require('ws'); // Import the WebSocket module 

// In-memory store for chat messages: {username, text, timestamp, type: 'chat'|'system'}
let chatHistory = []; // Initialize chat history array 

// Track connected users: Map from WebSocket to {username}
let clients = new Map(); // Initialize a map to track connected clients 

const server = http.createServer((req, res) => { // Create HTTP server 
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title> Chat</title>
<style>
  body {
    font-family: sans-serif;
    margin: 20px;
  }
  #header {
    display: flex;
    justify-content: space-between;
  }
  #searchBox {
    margin-bottom: 10px;
  }
  #messages {
    border: 1px solid #ccc;
    height: 300px;
    overflow-y: scroll;
    padding: 10px;
    margin-bottom: 10px;
    font-size: 14px;
  }
  .message {
    margin: 5px 0;
  }
  .message .username {
    font-weight: bold;
    margin-right: 5px;
  }
  .my-message {
    background: #e7f4ff;
    padding: 5px;
    border-radius: 5px;
    display: inline-block;
  }
  .other-message {
    background: #f2f2f2;
    padding: 5px;
    border-radius: 5px;
    display: inline-block;
  }
  .system-message {
    color: #999;
    font-style: italic;
    margin: 5px 0;
  }
  #inputBox {
    display: flex;
    gap: 5px;
  }
  #typingIndicator {
    font-size: 12px;
    color: #999;
    height: 20px;
  }
</style>
</head>
<body>
<div id="header">
  <h1> Chat</h1>
  <input type="text" id="searchInput" placeholder="Search messages..." />
</div>
<div id="messages"></div>
<div id="typingIndicator"></div>
<div id="inputBox">
  <input type="text" id="msgInput" placeholder="Type your message..." />
  <button id="sendBtn">Send</button>
</div>
<script>
  // Prompt for username
  let username = ''; // Initialize username variable 
  while(!username) { // Loop until a valid username is entered 
    username = prompt("Enter a username:"); // Prompt user for username 
    if(username) username = username.trim(); // Trim whitespace from username 
  }

  const msgDiv = document.getElementById('messages'); // Get messages div element 
  const input = document.getElementById('msgInput'); // Get message input element 
  const button = document.getElementById('sendBtn'); // Get send button element 
  const searchInput = document.getElementById('searchInput'); // Get search input element 
  const typingIndicator = document.getElementById('typingIndicator'); // Get typing indicator element 

  let chatHistory = []; // Initialize chat history array on client-side 
  let isFocused = true; // Track if window is focused for notifications 
  let typingTimeout; // Timeout for typing indicator 
  let currentlyTypingUsers = new Set(); // Set to track users currently typing 

  // Request notification permission
  if ("Notification" in window && Notification.permission === "default") { // Check if Notifications are supported and permission is default 
    Notification.requestPermission(); // Request permission for notifications 
  }

  // Connect to server
  const ws = new WebSocket('ws://' + location.host); // Create WebSocket connection to server 

  ws.addEventListener('open', () => { // Event listener for WebSocket open 
    // Send username as first message to register
    ws.send(JSON.stringify({type: 'username', username})); // Send username to server 
  });

  ws.addEventListener('message', (event) => { // Event listener for incoming WebSocket messages 
    const data = JSON.parse(event.data); // Parse incoming message data 
    if (data.type === 'chatHistory') { // If message is chat history 
      // Load chat history
      chatHistory = data.messages; // Set chat history from server 
      renderMessages(chatHistory); // Render chat messages on client 
    } else if (data.type === 'chat' || data.type === 'system') { // If message is chat or system type 
      chatHistory.push(data); // Add message to chat history 
      appendMessage(data); // Append message to messages div 
      if (!isFocused && data.type === 'chat' && data.username !== username && Notification.permission === "granted") { // Check if notification should be shown 
        new Notification("New message from " + data.username, { body: data.text }); // Show browser notification 
      }
    } else if (data.type === 'typing') { // If message is typing indicator 
      // Update typing indicator
      const {user, isTyping} = data; // Destructure typing data 
      if (isTyping) { // If user is typing 
        currentlyTypingUsers.add(user); // Add user to typing set 
      } else {
        currentlyTypingUsers.delete(user); // Remove user from typing set 
      }
      updateTypingIndicator(); // Update typing indicator display 
    }
  });

  // Filter messages based on search input
  searchInput.addEventListener('input', () => { // Event listener for search input 
    const query = searchInput.value.toLowerCase(); // Get and lowercase search query 
    const filtered = chatHistory.filter(msg => 
      msg.type === 'system' || msg.username.toLowerCase().includes(query) || msg.text.toLowerCase().includes(query)
    ); // Filter messages based on query 
    renderMessages(filtered); // Render filtered messages 
  });

  button.addEventListener('click', sendMessage); // Event listener for send button click 

  input.addEventListener('keyup', (e) => { // Event listener for keyup in message input 
    if (e.key === 'Enter') { // If Enter key is pressed 
      sendMessage(); // Send the message 
    } else {
      sendTypingStatus(); // Otherwise, send typing status 
    }
  });

  input.addEventListener('focus', sendTypingStatus); // Event listener for input focus 
  input.addEventListener('blur', sendTypingStatus); // Event listener for input blur 

  // Track window focus to handle notifications
  window.addEventListener('focus', () => { // Event listener for window focus 
    isFocused = true; // Set focus state to true 
  });
  window.addEventListener('blur', () => { // Event listener for window blur 
    isFocused = false; // Set focus state to false 
  });

  function sendMessage() { // Function to send a chat message 
    const text = input.value.trim(); // Get and trim message text 
    if (text) { // If message is not empty 
      ws.send(JSON.stringify({type: 'chat', text})); // Send message to server 
      input.value = ''; // Clear input field 
      sendTypingStatus(false); // Stop typing indicator 
    }
  }

  function sendTypingStatus(isTyping = true) { // Function to send typing status 
    clearTimeout(typingTimeout); // Clear existing typing timeout 
    ws.send(JSON.stringify({type: 'typing', isTyping})); // Send typing status to server 
    if (isTyping) { // If user is typing 
      typingTimeout = setTimeout(() => { // Set timeout to stop typing after delay 
        ws.send(JSON.stringify({type: 'typing', isTyping: false})); // Send stop typing status 
      }, 3000); // 3 seconds delay 
    }
  }

  function appendMessage(msg) { // Function to append a single message to the DOM 
    const div = document.createElement('div'); // Create a div for the message 
    div.classList.add('message'); // Add 'message' class to div 
    if (msg.type === 'system') { // If message is a system message 
      div.classList.add('system-message'); // Add 'system-message' class 
      div.textContent = msg.text; // Set system message text 
    } else { // If message is a user chat message 
      const usernameSpan = document.createElement('span'); // Create span for username 
      usernameSpan.classList.add('username'); // Add 'username' class to span 
      usernameSpan.textContent = msg.username + ":"; // Set username text 
      
      const textSpan = document.createElement('span'); // Create span for message text 
      textSpan.textContent = ' ' + msg.text; // Set message text 
      
      // Styling based on whether it's current user
      if (msg.username === username) { // If message is from current user 
        textSpan.classList.add('my-message'); // Add 'my-message' class for styling 
      } else {
        textSpan.classList.add('other-message'); // Add 'other-message' class for styling 
      }

      div.appendChild(usernameSpan); // Append username span to message div 
      div.appendChild(textSpan); // Append text span to message div 
    }
    msgDiv.appendChild(div); // Append message div to messages container 
    msgDiv.scrollTop = msgDiv.scrollHeight; // Scroll to the bottom of messages 
  }

  function renderMessages(messages) { // Function to render a list of messages 
    msgDiv.innerHTML = ''; // Clear existing messages 
    messages.forEach(m => appendMessage(m)); // Append each message to DOM 
  }

  function updateTypingIndicator() { // Function to update the typing indicator 
    if (currentlyTypingUsers.size === 0) { // If no users are typing 
      typingIndicator.textContent = ''; // Clear typing indicator 
    } else {
      typingIndicator.textContent = Array.from(currentlyTypingUsers).join(', ') + ' is typing...'; // Show users typing 
    }
  }
</script>
</body>
</html>
`;
  res.writeHead(200, {'Content-Type': 'text/html'}); // Set HTTP response headers 
  res.end(html); // End response with HTML content 
});

const wss = new WebSocket.Server({ server }); // Create WebSocket server attached to HTTP server 

// Broadcast to all connected clients
function broadcast(msgObj) { // Function to broadcast a message to all clients 
  const data = JSON.stringify(msgObj); // Stringify message object 
  for (const client of wss.clients) { // Iterate over all connected clients 
    if (client.readyState === WebSocket.OPEN) { // Check if client connection is open 
      client.send(data); // Send message to client 
    }
  }
}

wss.on('connection', (ws) => { // Event listener for new WebSocket connections 
  let user = {username: null}; // Initialize user object 
  clients.set(ws, user); // Add client to clients map 

  // Send chat history
  ws.send(JSON.stringify({type: 'chatHistory', messages: chatHistory})); // Send existing chat history to new client 

  ws.on('message', (message) => { // Event listener for incoming messages from client 
    let data;
    try {
      data = JSON.parse(message); // Parse incoming message 
    } catch (e) {
      return; // Ignore malformed messages 
    }

    if (data.type === 'username') { // If message is username registration 
      user.username = data.username; // Set user's username 
      // Broadcast join message
      const joinMsg = {
        type: 'system',
        text: user.username + " has joined the chat.",
        timestamp: Date.now()
      }; // Create join system message 
      chatHistory.push(joinMsg); // Add join message to chat history 
      broadcast(joinMsg); // Broadcast join message to all clients 
    } else if (data.type === 'chat') { // If message is a chat message 
      if (!user.username) return; // Ignore if username not set 
      const chatMsg = {
        type: 'chat',
        username: user.username,
        text: data.text,
        timestamp: Date.now()
      }; // Create chat message object 
      chatHistory.push(chatMsg); // Add chat message to history 
      broadcast(chatMsg); // Broadcast chat message to all clients 
    } else if (data.type === 'typing') { // If message is typing status 
      if (!user.username) return; // Ignore if username not set 
      broadcast({
        type: 'typing',
        user: user.username,
        isTyping: data.isTyping
      }); // Broadcast typing status to all clients 
    }
  });

  ws.on('close', () => { // Event listener for WebSocket close 
    const leavingUser = user.username; // Get username of leaving user 
    clients.delete(ws); // Remove client from clients map 
    if (leavingUser) { // If user had a username 
      const leaveMsg = {
        type: 'system',
        text: leavingUser + " has left the chat.",
        timestamp: Date.now()
      }; // Create leave system message 
      chatHistory.push(leaveMsg); // Add leave message to chat history 
      broadcast(leaveMsg); // Broadcast leave message to all clients 
    }
  });
});

server.listen(3000, () => { // Start server listening on port 3000 
  console.log(' Chat server running at http://localhost:3000'); // Log server start message 
});
