/**
 * CommunalTable — Firebase Integration
 * Handles real-time room synchronization using Firebase Realtime Database.
 * Falls back to polling the local Flask server if Firebase is unavailable.
 */

// ─── Firebase Configuration ──────────────────────────────────────────────────
// Replace with your own Firebase project config from Firebase Console
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// ─── Firebase state ───────────────────────────────────────────────────────────
let firebaseApp = null;
let firebaseDb = null;
let firebaseEnabled = false;
let currentRoomRef = null;
let currentRoomListener = null;

/**
 * Initialize Firebase. Silently falls back to polling if config is missing.
 */
async function initFirebase() {
  // Check if config is populated (not placeholder values)
  if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    console.info("[Firebase] No config found — using local Flask polling instead.");
    firebaseEnabled = false;
    return false;
  }

  try {
    // Dynamically import Firebase modules (CDN)
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
    );
    const { getDatabase, ref, set, get, update, onValue, off } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js"
    );

    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firebaseDb = getDatabase(firebaseApp);
    firebaseEnabled = true;

    // Expose database functions globally for use in app.js
    window._fb = { ref, set, get, update, onValue, off, db: firebaseDb };
    console.info("[Firebase] Initialized successfully.");
    return true;
  } catch (err) {
    console.warn("[Firebase] Initialization failed:", err.message);
    firebaseEnabled = false;
    return false;
  }
}

/**
 * Create a room in Firebase Realtime Database.
 * @param {object} roomData
 * @returns {Promise<string>} room code
 */
async function fbCreateRoom(roomData) {
  if (!firebaseEnabled || !window._fb) throw new Error("Firebase not available");
  const { ref, set, db } = window._fb;
  const code = roomData.code;
  await set(ref(db, `rooms/${code}`), roomData);
  return code;
}

/**
 * Listen to room changes in real time.
 * @param {string} code - Room code
 * @param {function} callback - Called with room data on each change
 */
function fbListenRoom(code, callback) {
  if (!firebaseEnabled || !window._fb) return null;
  const { ref, onValue, db } = window._fb;
  const roomRef = ref(db, `rooms/${code}`);
  const unsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback(data);
  });
  return unsubscribe;
}

/**
 * Update room data in Firebase.
 * @param {string} code
 * @param {object} updates - Partial room object
 */
async function fbUpdateRoom(code, updates) {
  if (!firebaseEnabled || !window._fb) return;
  const { ref, update, db } = window._fb;
  await update(ref(db, `rooms/${code}`), {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Record a vote in Firebase.
 * @param {string} code
 * @param {string} restaurantId
 * @param {string} memberId
 * @param {number} vote (1=like, -1=dislike, 0=skip)
 */
async function fbVote(code, restaurantId, memberId, vote) {
  if (!firebaseEnabled || !window._fb) return;
  const { ref, update, db } = window._fb;
  await update(ref(db, `rooms/${code}/votes/${restaurantId}`), {
    [memberId]: vote,
    updatedAt: Date.now(),
  });
}

/**
 * Stop listening to a room.
 * @param {function} unsubscribe - The unsubscribe function returned by fbListenRoom
 */
function fbUnlisten(unsubscribe) {
  if (typeof unsubscribe === "function") unsubscribe();
}

// ─── Polling fallback (uses Flask /api/room/<code>/poll) ─────────────────────
let _pollActive = false;
let _pollController = null;
let _pollLastUpdated = 0;

/**
 * Start polling the Flask backend for room updates.
 * @param {string} code - Room code
 * @param {function} callback - Called with room data on each update
 */
function startPolling(code, callback) {
  stopPolling();
  _pollActive = true;

  const poll = async () => {
    while (_pollActive) {
      try {
        const url = `/api/room/${code}/poll?since=${_pollLastUpdated}`;
        const res = await fetch(url, { signal: _pollController?.signal });
        if (!res.ok) break;
        const data = await res.json();
        if (data.room) {
          _pollLastUpdated = data.room.updatedAt || Date.now() / 1000;
          callback(data.room);
        }
      } catch (err) {
        if (err.name === "AbortError") break;
        // Wait 2s before retry on error
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  };

  _pollController = new AbortController();
  poll();
}

/**
 * Stop polling.
 */
function stopPolling() {
  _pollActive = false;
  if (_pollController) {
    _pollController.abort();
    _pollController = null;
  }
}

// ─── Unified API (uses Firebase if available, else Flask polling) ─────────────

/**
 * Create a room using the best available backend.
 * Returns { code, shareUrl, room }
 */
async function createRoom(options = {}) {
  const res = await fetch("/api/room/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  const data = await res.json();

  if (firebaseEnabled) {
    try {
      await fbCreateRoom({ ...data.room, updatedAt: Date.now() / 1000 });
    } catch (e) {
      console.warn("[Firebase] Room sync failed, using Flask only:", e.message);
    }
  }

  return data;
}

/**
 * Join an existing room.
 */
async function joinRoom(code, options = {}) {
  const res = await fetch(`/api/room/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  return res.json();
}

/**
 * Listen to a room. Returns a cleanup function.
 */
function listenRoom(code, callback) {
  if (firebaseEnabled) {
    return fbListenRoom(code, callback);
  } else {
    startPolling(code, callback);
    return () => stopPolling();
  }
}

/**
 * Send a vote.
 */
async function sendVote(code, restaurantId, memberId, vote) {
  if (firebaseEnabled) {
    await fbVote(code, restaurantId, memberId, vote);
  } else {
    await fetch(`/api/room/${code}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, memberId, vote }),
    });
  }
}

/**
 * Update room status (host only).
 */
async function updateRoomStatus(code, status) {
  if (firebaseEnabled) {
    await fbUpdateRoom(code, { status });
  }
  await fetch(`/api/room/${code}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

/**
 * Set the restaurant list for a room.
 */
async function setRoomRestaurants(code, restaurants) {
  if (firebaseEnabled) {
    await fbUpdateRoom(code, { restaurants, status: "browsing" });
  }
  await fetch(`/api/room/${code}/restaurants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurants }),
  });
}

/**
 * Finalize the room pick (host only).
 */
async function finalizeRoom(code, restaurantId) {
  if (firebaseEnabled) {
    await fbUpdateRoom(code, { finalPick: restaurantId, status: "finished" });
  }
  await fetch(`/api/room/${code}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId }),
  });
}

// ─── Export ───────────────────────────────────────────────────────────────────
window.CT_Firebase = {
  init: initFirebase,
  isEnabled: () => firebaseEnabled,
  createRoom,
  joinRoom,
  listenRoom,
  sendVote,
  updateRoomStatus,
  setRoomRestaurants,
  finalizeRoom,
  stopPolling,
};

// Auto-init on load
window.addEventListener("DOMContentLoaded", async () => {
  await initFirebase();
});