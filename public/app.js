// Generate a random session ID
function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Initialize session ID
const sessionId = generateSessionId();
document.getElementById('sessionId').textContent = sessionId;

// Message handling
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messageContainer = document.getElementById('messageContainer');

function addMessageToDisplay(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'other'}`;
    messageDiv.textContent = text;
    messageContainer.appendChild(messageDiv);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

async function sendMessage(text) {
    try {
        const response = await fetch('/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                segments: [{
                    text: text,
                    is_user: true,
                    start: Date.now() / 1000
                }]
            })
        });

        const data = await response.json();
        
        // If there's a notification, display it as a response
        if (data.notification) {
            // In a real application, you would process the notification template
            // For now, we'll just display a simple response
            setTimeout(() => {
                addMessageToDisplay("Message received!", false);
            }, 1000);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text) {
        addMessageToDisplay(text, true);
        await sendMessage(text);
        messageInput.value = '';
    }
});

// Add initial message
addMessageToDisplay('Welcome! Start typing to send messages.', false);