// === DOM Elements ===
const recordButton = document.getElementById('recordButton') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLSpanElement;

// === State management ===
let isRecording = false;
let mediaRecorder: MediaRecorder | null = null;
let socket: WebSocket | null = null;

const BACKEND_WEBSOCKET_URL = 'ws://localhost:8080';

// === Core Functions ===

/**
 * Handles the click event on the record button.
 * Toggles between starting and stopping the recording.
 */
recordButton.onclick = () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
};

/**
 * Asks for microphone permission and starts the recording process.
 */
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 1. Establish WebSocket connection with the backend
    socket = new WebSocket(BACKEND_WEBSOCKET_URL);

    // 2. Handle successful connection
    socket.onopen = () => {
      console.log('✅ WebSocket connection established.');
      updateUI('Connected, recording...', 'Stop Recording', true);

      // 3. Create MediaRecorder to capture audio
      mediaRecorder = new MediaRecorder(stream);
      
      // 4. Send audio data to backend in chunks every 250 milliseconds
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      };
      
      mediaRecorder.start(250); // The number is the timeslice in ms
    };

    // Listen for any messages from the backend (e.g., transcriptions)
    socket.onmessage = (event) => {
      console.log('Received from backend:', event.data);
      // Later, you'll display this data on the page.
    };

    // Handle connection closing
    socket.onclose = () => {
      console.log('❌ WebSocket connection closed.');
      cleanup();
    };
    
    // Handle WebSocket errors
    socket.onerror = (err) => {
      console.error('WebSocket Error:', err);
      updateUI('Error connecting.', 'Start Recording', false);
      cleanup();
    };

  } catch (error) {
    console.error('Error getting user media:', error);
    updateUI('Could not access microphone.', 'Start Recording', false);
  }
}

/**
 * Stops the MediaRecorder and closes the WebSocket connection.
 */
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  // The onclose event will trigger the cleanup() function
}

/**
 * Cleans up resources and resets the UI to the initial state.
 */
function cleanup() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
  
  mediaRecorder = null;
  socket = null;
  isRecording = false;
  updateUI('Idle', 'Start Recording', false);
}

/**
 * Helper function to update the user interface elements.
 */
function updateUI(statusText: string, buttonText: string, recordingStatus: boolean) {
  statusEl.textContent = statusText;
  recordButton.textContent = buttonText;
  isRecording = recordingStatus;

  if (isRecording) {
    recordButton.classList.remove('idle');
    recordButton.classList.add('recording');
  } else {
    recordButton.classList.remove('recording');
    recordButton.classList.add('idle');
  }
}
