// Global App State
const state = {
  currentUser: {
    name: "Akhil Jojo",
    username: "akhil_jojo",
    avatar: "AJ",
    bio: "Hostel Block C | CSE Senior",
    status: "In Hostel",
    coordinates: [12.9716, 77.5946], // Mock Campus Center
    invisibleMode: false,
    sharingActive: true,
    sharingDuration: 'manual',
    sharingStartTime: null,
    sharingTarget: 'friends'
  },
  friends: [
    { id: "f1", name: "Rahul Sharma", username: "rahul_s", avatar: "RS", status: "College", coordinates: [12.9740, 77.5960], isSharing: true, lastUpdated: "Just now" },
    { id: "f2", name: "Priya Patel", username: "priya_p", avatar: "PP", status: "Library", coordinates: [12.9700, 77.5910], isSharing: true, lastUpdated: "5m ago" },
    { id: "f3", name: "David Miller", username: "david_m", avatar: "DM", status: "Gym", coordinates: [12.9680, 77.5935], isSharing: true, lastUpdated: "2m ago" },
    { id: "f4", name: "Aisha Khan", username: "aisha_k", avatar: "AK", status: "Busy", coordinates: [12.9730, 77.5900], isSharing: false, lastUpdated: "3h ago" }
  ],
  groups: [
    { id: "g1", name: "Hostel Friends", description: "Block C coordination, mess alerts", avatar: "HF", memberIds: ["f1", "f2", "f3"] },
    { id: "g2", name: "Study Group", description: "Exam prep & library meetups", avatar: "SG", memberIds: ["f1", "f2", "f4"] }
  ],
  chats: {
    "f1": [
      { id: "m1", senderId: "f1", text: "Hey! Are you heading to the canteens tonight?", timestamp: "19:15" },
      { id: "m2", senderId: "self", text: "Yeah, planning to go in 15 mins. Want to join?", timestamp: "19:16" }
    ],
    "f2": [
      { id: "m3", senderId: "f2", text: "I'm study-cramming at the library, sharing my live location if you need it.", timestamp: "19:00" }
    ],
    "g1": [
      { id: "m4", senderId: "f1", text: "Mess food is terrible today, canteens are crowded.", timestamp: "18:45" },
      { id: "m5", senderId: "f3", text: "Let's plan a quick meetup at Gym ground.", timestamp: "18:50" }
    ]
  },
  meetups: [
    {
      id: "meet1",
      title: "Canteen Dinner Meetup",
      destinationName: "Mess Hall Canteen",
      coordinates: [12.9750, 77.5980],
      time: "Tonight, 20:15",
      creatorId: "self",
      attendees: [
        { userId: "self", status: "accepted" },
        { userId: "f1", status: "accepted" },
        { userId: "f2", status: "pending" },
        { userId: "f3", status: "accepted" }
      ]
    }
  ],
  friendRequests: [
    { id: "req1", from: { name: "Sneha Reddy", username: "sneha_r", avatar: "SR" } }
  ],
  activeChatId: null,
  map: null,
  markers: {},
  sharingTimerInterval: null,
  simulationInterval: null,
  audioRecorder: null,
  recordedChunks: [],
  recordingDuration: 0,
  recordingTimer: null
};

// Map Tile Layers
const mapLayers = {
  normal: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  // Load State from LocalStorage if available
  loadSavedState();

  // Initialize Map
  initMap();

  // Initialize UI events
  updateStatusTime();
  setInterval(updateStatusTime, 60000);
  updateDeviceBattery();

  // Load chats list and friends list UI
  renderChatsList();
  renderFriendsList();
  renderMeetupsList();

  // Switch to auth view or home map if logged in
  const isLoggedIn = localStorage.getItem("fl_logged_in") === "true";
  if (isLoggedIn) {
    document.getElementById("screen-auth").classList.remove("active");
    document.getElementById("screen-map").classList.add("active");
    document.getElementById("main-bottom-nav").classList.remove("hidden");
    state.currentUser.sharingStartTime = Date.now();
    startLocationSharingTimer();
  }

  // Start simulated friend movement simulation
  startFriendMovementSimulation();
});

// Load State Helper
function loadSavedState() {
  const savedState = localStorage.getItem("fl_state");
  if (savedState) {
    const parsed = JSON.parse(savedState);
    state.currentUser = { ...state.currentUser, ...parsed.currentUser };
    state.friendRequests = parsed.friendRequests || state.friendRequests;
    if (parsed.chats) state.chats = parsed.chats;
    if (parsed.meetups) state.meetups = parsed.meetups;
    if (parsed.friends) state.friends = parsed.friends;
  }
}

// Save State Helper
function saveState() {
  localStorage.setItem("fl_state", JSON.stringify({
    currentUser: state.currentUser,
    friendRequests: state.friendRequests,
    chats: state.chats,
    meetups: state.meetups,
    friends: state.friends
  }));
}

// Update clock in device mock status bar
function updateStatusTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  document.getElementById("status-time").textContent = timeStr;
}

// Fetch device battery and update status bar
async function updateDeviceBattery() {
  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      const updateBatteryUI = () => {
        const pct = Math.round(battery.level * 100);
        document.getElementById("status-battery-pct").textContent = pct + "%";
        const icon = document.getElementById("status-battery-icon");
        icon.className = "fa-solid ";
        if (battery.charging) {
          icon.className += "fa-battery-charging";
        } else if (pct > 80) {
          icon.className += "fa-battery-full";
        } else if (pct > 50) {
          icon.className += "fa-battery-three-quarters";
        } else if (pct > 20) {
          icon.className += "fa-battery-quarter";
        } else {
          icon.className += "fa-battery-empty";
          icon.style.color = "var(--danger)";
        }
      };
      updateBatteryUI();
      battery.addEventListener('levelchange', updateBatteryUI);
      battery.addEventListener('chargingchange', updateBatteryUI);
    }
  } catch (e) {
    console.log("Battery Status API not supported");
  }
}

// Switch between screens/tabs
function switchTab(tabId) {
  // Hide all screens
  const screens = document.querySelectorAll(".screen");
  screens.forEach(s => s.classList.remove("active"));

  // Deactivate all nav items
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => item.classList.remove("active"));

  // Show selected screen
  const targetScreen = document.getElementById(`screen-${tabId}`);
  if (targetScreen) {
    targetScreen.classList.add("active");
  }

  // Active navigation button highlight
  const targetNav = document.getElementById(`nav-${tabId}`);
  if (targetNav) {
    targetNav.classList.add("active");
  }

  // If map tab, trigger invalidateSize to handle correct rendering of map container size
  if (tabId === 'map' && state.map) {
    setTimeout(() => {
      state.map.invalidateSize();
    }, 100);
  }
}

// Switch between Authentication tabs (Login/Register)
function switchAuthTab(tab) {
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach(t => t.classList.remove("active"));
  
  const activeBtn = event.target;
  activeBtn.classList.add("active");

  if (tab === 'login') {
    document.getElementById("login-form").classList.remove("hidden");
    document.getElementById("register-form").classList.add("hidden");
  } else {
    document.getElementById("login-form").classList.add("hidden");
    document.getElementById("register-form").classList.remove("hidden");
  }
}

// Authentication Forms Handlers
function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value;
  
  state.currentUser.name = email.split('@')[0].toUpperCase();
  state.currentUser.username = email.split('@')[0];
  state.currentUser.sharingStartTime = Date.now();
  
  localStorage.setItem("fl_logged_in", "true");
  saveState();
  
  // Slide into main map dashboard
  document.getElementById("screen-auth").classList.remove("active");
  document.getElementById("screen-map").classList.add("active");
  document.getElementById("main-bottom-nav").classList.remove("hidden");
  
  showToast("Welcome Back!", "Logged in successfully as " + state.currentUser.name);
  startLocationSharingTimer();
  recenterMap();
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("reg-name").value;
  const username = document.getElementById("reg-username").value;
  
  state.currentUser.name = name;
  state.currentUser.username = username;
  state.currentUser.avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();
  state.currentUser.sharingStartTime = Date.now();
  
  localStorage.setItem("fl_logged_in", "true");
  saveState();
  
  document.getElementById("screen-auth").classList.remove("active");
  document.getElementById("screen-map").classList.add("active");
  document.getElementById("main-bottom-nav").classList.remove("hidden");
  
  showToast("Welcome!", "Registered successfully as " + name);
  startLocationSharingTimer();
  recenterMap();
}

function handleGoogleSignIn() {
  state.currentUser.name = "Google User";
  state.currentUser.username = "google_user";
  state.currentUser.avatar = "GU";
  state.currentUser.sharingStartTime = Date.now();
  
  localStorage.setItem("fl_logged_in", "true");
  saveState();
  
  document.getElementById("screen-auth").classList.remove("active");
  document.getElementById("screen-map").classList.add("active");
  document.getElementById("main-bottom-nav").classList.remove("hidden");
  
  showToast("Google Sign-In", "Welcome, Google User");
  startLocationSharingTimer();
  recenterMap();
}

function showForgotPassword() {
  alert("Reset link sent! Please check your email: demo@friendlink.com");
}

function handleLogout() {
  localStorage.setItem("fl_logged_in", "false");
  clearInterval(state.sharingTimerInterval);
  
  document.getElementById("screen-map").classList.remove("active");
  document.getElementById("screen-chats").classList.remove("active");
  document.getElementById("screen-friends").classList.remove("active");
  document.getElementById("screen-meetups").classList.remove("active");
  document.getElementById("screen-settings").classList.remove("active");
  document.getElementById("main-bottom-nav").classList.add("hidden");
  document.getElementById("screen-auth").classList.add("active");
  
  showToast("Signed Out", "You have been logged out.");
}

// Leaflet Map Controller
function initMap() {
  // Center map on the default campus coordinates
  state.map = L.map("map-element", {
    zoomControl: false,
    attributionControl: false
  }).setView(state.currentUser.coordinates, 15);

  // Add normal tile layer initially
  L.tileLayer(mapLayers.normal, {
    maxZoom: 19
  }).addTo(state.map);

  // Update/draw markers
  updateMapMarkers();
}

// Change Map view layout (Satellite / Normal)
function setMapView(type) {
  const buttons = document.querySelectorAll(".map-fab-views button");
  if (type === 'satellite') {
    buttons[0].style.backgroundColor = "transparent";
    buttons[0].style.color = "var(--text-secondary)";
    buttons[1].style.backgroundColor = "var(--primary)";
    buttons[1].style.color = "white";
    
    state.map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        state.map.removeLayer(layer);
      }
    });
    L.tileLayer(mapLayers.satellite, {
      maxZoom: 19
    }).addTo(state.map);
  } else {
    buttons[1].style.backgroundColor = "transparent";
    buttons[1].style.color = "var(--text-secondary)";
    buttons[0].style.backgroundColor = "var(--primary)";
    buttons[0].style.color = "white";

    state.map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        state.map.removeLayer(layer);
      }
    });
    L.tileLayer(mapLayers.normal, {
      maxZoom: 19
    }).addTo(state.map);
  }
}

// Recenter Map on current User location
function recenterMap() {
  if (state.map) {
    // Try to get real geolocator location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        state.currentUser.coordinates = coords;
        state.map.setView(coords, 16);
        updateMapMarkers();
      }, () => {
        // Fallback to mock coords
        state.map.setView(state.currentUser.coordinates, 16);
      });
    } else {
      state.map.setView(state.currentUser.coordinates, 16);
    }
  }
}

// Draw/refresh custom HTML markers on the map
function updateMapMarkers() {
  if (!state.map) return;

  // Clear existing markers from map
  for (let key in state.markers) {
    state.map.removeLayer(state.markers[key]);
  }
  state.markers = {};

  // Draw current user marker (if location sharing is active and NOT in Invisible Mode)
  if (state.currentUser.sharingActive && !state.currentUser.invisibleMode) {
    const selfIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="marker-pin self">
          <div class="profile-avatar" style="width:32px;height:32px;font-size:12px">${state.currentUser.avatar}</div>
          <div class="marker-status-badge"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44]
    });
    state.markers['self'] = L.marker(state.currentUser.coordinates, { icon: selfIcon }).addTo(state.map);
    state.markers['self'].bindPopup(`<b>You (${state.currentUser.name})</b><br>Status: ${state.currentUser.status}`);
  }

  // Draw friends markers
  state.friends.forEach(friend => {
    if (friend.isSharing) {
      const pinClass = friend.status === "SOS" ? "marker-pin emergency" : "marker-pin";
      const badgeColor = friend.status === "Busy" ? "var(--warning)" : (friend.status === "Sleeping" ? "var(--text-muted)" : "var(--success)");
      const friendIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="${pinClass}">
            <div class="profile-avatar" style="width:32px;height:32px;font-size:12px">${friend.avatar}</div>
            <div class="marker-status-badge" style="background:${badgeColor}"></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 44]
      });
      const marker = L.marker(friend.coordinates, { icon: friendIcon }).addTo(state.map);
      marker.bindPopup(`<b>${friend.name}</b><br>Status: ${friend.status}<br>Updated: ${friend.lastUpdated}`);
      state.markers[friend.id] = marker;
    }
  });

  // Draw meetup targets
  state.meetups.forEach(meetup => {
    const meetupIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="marker-pin" style="background:var(--primary)">
          <i class="fa-solid fa-utensils" style="color:white;transform:rotate(45deg);font-size:14px"></i>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44]
    });
    const marker = L.marker(meetup.coordinates, { icon: meetupIcon }).addTo(state.map);
    marker.bindPopup(`<b>Meetup: ${meetup.title}</b><br>Destination: ${meetup.destinationName}<br>Time: ${meetup.time}`);
    state.markers[meetup.id] = marker;
  });
}

// Toggle Invisible Mode (Hide from all friends on map)
function toggleInvisibleMode() {
  state.currentUser.invisibleMode = !state.currentUser.invisibleMode;
  saveState();
  
  const icon = document.getElementById("invisible-toggle-icon");
  if (state.currentUser.invisibleMode) {
    icon.className = "fa-solid fa-eye text-danger";
    showToast("Invisible Mode", "Your location sharing is suspended (Invisible).", "var(--danger)");
  } else {
    icon.className = "fa-solid fa-eye-slash";
    showToast("Invisible Mode Off", "Your location is now sharing with friends.");
  }
  updateMapMarkers();
}

// Location Sharing Sliding Panels
function showLocationSharingSettings() {
  document.getElementById("sharing-settings-panel").classList.add("active");
  // Set defaults
  document.getElementById("sharing-active").checked = state.currentUser.sharingActive;
}

function hideLocationSharingSettings() {
  document.getElementById("sharing-settings-panel").classList.remove("active");
}

function toggleLocationSharing() {
  state.currentUser.sharingActive = document.getElementById("sharing-active").checked;
  
  if (state.currentUser.sharingActive) {
    state.currentUser.sharingStartTime = Date.now();
    startLocationSharingTimer();
    showToast("Location Sharing Enabled", "Sharing location according to your limits.");
  } else {
    clearInterval(state.sharingTimerInterval);
    showToast("Sharing Stopped", "Location sharing has been disabled.", "var(--danger)");
  }
  saveState();
  updateMapMarkers();
  updateSharingSettingsMessage();
}

function setSharingDuration(duration, btn) {
  state.currentUser.sharingDuration = duration;
  state.currentUser.sharingStartTime = Date.now();
  saveState();

  const buttons = document.querySelectorAll(".duration-btn");
  buttons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  showToast("Duration Updated", `Location will share for: ${duration === '15m' ? '15 Minutes' : (duration === '1h' ? '1 Hour' : (duration === 'today' ? 'Today' : 'Until Manual Disable'))}`);
  updateSharingSettingsMessage();
}

function updateSharingTarget() {
  state.currentUser.sharingTarget = document.getElementById("sharing-target-select").value;
  saveState();
  showToast("Sharing Target Updated", "Location sharing restricted to selected audience.");
}

function updateSharingSettingsMessage() {
  const msgEl = document.getElementById("sharing-status-message");
  if (!state.currentUser.sharingActive) {
    msgEl.innerHTML = "Status: <b>Not Sharing Location</b>";
    return;
  }
  if (state.currentUser.sharingDuration === 'manual') {
    msgEl.innerHTML = "Status: <b>Sharing location indefinitely</b>";
  } else {
    msgEl.innerHTML = `Status: Sharing active (expiring soon)`;
  }
}

// Location sharing timer checks expiration
function startLocationSharingTimer() {
  clearInterval(state.sharingTimerInterval);
  updateSharingSettingsMessage();
  
  state.sharingTimerInterval = setInterval(() => {
    if (!state.currentUser.sharingActive || state.currentUser.sharingDuration === 'manual') return;

    const start = state.currentUser.sharingStartTime;
    const now = Date.now();
    let limit = 0;

    if (state.currentUser.sharingDuration === '15m') limit = 15 * 60000;
    else if (state.currentUser.sharingDuration === '1h') limit = 60 * 60000;
    else if (state.currentUser.sharingDuration === 'today') {
      // Expire at midnight
      const midnight = new Date().setHours(23, 59, 59, 999);
      if (now > midnight) limit = -1; // Trigger immediate expire
    }

    if (limit > 0 && (now - start) >= limit) {
      state.currentUser.sharingActive = false;
      saveState();
      updateMapMarkers();
      document.getElementById("sharing-active").checked = false;
      updateSharingSettingsMessage();
      showToast("Sharing Expired", "Your temporary live location sharing has ended.", "var(--danger)");
      clearInterval(state.sharingTimerInterval);
    }
  }, 10000);
}

// Simulating Movement of Friends on Campus to make map look active & alive
function startFriendMovementSimulation() {
  state.simulationInterval = setInterval(() => {
    state.friends.forEach(friend => {
      if (friend.isSharing && friend.status !== "SOS") {
        // Move coordinates randomly by a small step (~10-20 meters)
        const latChange = (Math.random() - 0.5) * 0.0006;
        const lngChange = (Math.random() - 0.5) * 0.0006;
        
        friend.coordinates[0] += latChange;
        friend.coordinates[1] += lngChange;
        friend.lastUpdated = "Just now";
        
        // Update Marker on Map
        if (state.markers[friend.id]) {
          state.markers[friend.id].setLatLng(friend.coordinates);
        }
      }
    });

    // Update active meetup ETAs and Distances dynamically
    updateActiveMeetupStats();
  }, 4000);
}

// Recalculates distances & ETAs for attendees dynamically
function updateActiveMeetupStats() {
  // If we are looking at the active meetup detailed screen, redraw the lists
  const meetupDetailsScreen = document.getElementById("screen-meetup-detail");
  if (meetupDetailsScreen.classList.contains("active")) {
    const container = document.getElementById("meetup-detail-content");
    if (container) {
      // Re-trigger layout print
      renderMeetupDetailUI(state.currentViewingMeetupId);
    }
  }
}

// Calculate distance (Haversine formula) in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2-lat1);
  const dLon = deg2rad(lon2-lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Helper to estimate Travel time (ETA) based on distance (assuming walking speed 4.5 km/h)
function estimateETA(distanceKm) {
  const speedKmh = 4.5;
  const timeHours = distanceKm / speedKmh;
  const timeMinutes = Math.round(timeHours * 60);
  return timeMinutes;
}

// Chats Lists Renderer
function renderChatsList() {
  const container = document.getElementById("chats-list-container");
  container.innerHTML = "";

  // One-to-one chats
  state.friends.forEach(friend => {
    const chatHistory = state.chats[friend.id] || [];
    const lastMsg = chatHistory[chatHistory.length - 1];
    const preview = lastMsg ? (lastMsg.senderId === 'self' ? 'You: ' : '') + lastMsg.text : "No messages yet";
    const timestamp = lastMsg ? lastMsg.timestamp : "";

    const el = document.createElement("div");
    el.className = "chat-item";
    el.onclick = () => openChatRoom(friend.id, friend.name, friend.avatar, false);
    el.innerHTML = `
      <div class="avatar">
        ${friend.avatar}
        ${friend.isSharing ? '<div class="status-dot"></div>' : ''}
      </div>
      <div class="content-body">
        <div class="chat-meta">
          <span class="name">${friend.name}</span>
          <span class="time">${timestamp}</span>
        </div>
        <div class="preview-row">
          <span class="msg-preview">${preview}</span>
          ${chatHistory.length > 2 && friend.id === 'f1' ? '<span class="unread-badge">2</span>' : ''}
        </div>
      </div>
    `;
    container.appendChild(el);
  });

  // Group chats
  state.groups.forEach(group => {
    const chatHistory = state.chats[group.id] || [];
    const lastMsg = chatHistory[chatHistory.length - 1];
    const preview = lastMsg ? `${lastMsg.senderId === 'self' ? 'You' : lastMsg.senderId}: ${lastMsg.text}` : "No messages yet";
    const timestamp = lastMsg ? lastMsg.timestamp : "";

    const el = document.createElement("div");
    el.className = "chat-item";
    el.onclick = () => openChatRoom(group.id, group.name, group.avatar, true);
    el.innerHTML = `
      <div class="avatar" style="background:var(--accent)">
        ${group.avatar}
      </div>
      <div class="content-body">
        <div class="chat-meta">
          <span class="name">${group.name}</span>
          <span class="time">${timestamp}</span>
        </div>
        <div class="preview-row">
          <span class="msg-preview">${preview}</span>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
}

// Filter chats list on search input
function filterChats(query) {
  const items = document.querySelectorAll(".chat-item");
  items.forEach(item => {
    const name = item.querySelector(".name").textContent.toLowerCase();
    if (name.includes(query.toLowerCase())) {
      item.classList.remove("hidden");
    } else {
      item.classList.add("hidden");
    }
  });
}

// Open active chat room conversation screen
function openChatRoom(chatId, title, avatar, isGroup) {
  state.activeChatId = chatId;
  switchTab("chatroom");
  
  document.getElementById("chat-title").textContent = title;
  const avatarEl = document.getElementById("chat-avatar");
  avatarEl.textContent = avatar;
  avatarEl.style.backgroundColor = isGroup ? "var(--accent)" : "var(--primary)";
  
  if (isGroup) {
    document.getElementById("chat-status").textContent = "Group Chat";
  } else {
    const friend = state.friends.find(f => f.id === chatId);
    document.getElementById("chat-status").textContent = friend ? friend.status : "Offline";
  }

  renderChatRoomMessages();
}

function renderChatRoomMessages() {
  const container = document.getElementById("chat-messages-container");
  container.innerHTML = "";

  const messages = state.chats[state.activeChatId] || [];
  messages.forEach(msg => {
    const bubble = document.createElement("div");
    const isOutgoing = msg.senderId === 'self';
    bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
    
    let contentHtml = msg.text;
    if (msg.voiceUrl) {
      contentHtml = `
        <div class="voice-message-player">
          <button onclick="playVoiceNote('${msg.voiceUrl}', this)"><i class="fa-solid fa-play"></i></button>
          <div class="audio-wave">
            <span class="audio-wave-bar" style="height:40%"></span>
            <span class="audio-wave-bar" style="height:70%"></span>
            <span class="audio-wave-bar" style="height:90%"></span>
            <span class="audio-wave-bar" style="height:50%"></span>
            <span class="audio-wave-bar" style="height:80%"></span>
            <span class="audio-wave-bar" style="height:30%"></span>
          </div>
          <span>Audio</span>
        </div>
      `;
    } else if (msg.locationCoords) {
      contentHtml = `
        <div class="location-message-card" onclick="panToCoords(${msg.locationCoords[0]}, ${msg.locationCoords[1]})">
          <div class="location-thumbnail">
            <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=150&q=80">
          </div>
          <strong>Shared Location</strong>
          <span style="font-size:11px;opacity:0.8">Click to view on Map</span>
        </div>
      `;
    }

    bubble.innerHTML = `
      ${contentHtml}
      <span class="time-stamp">${msg.timestamp}</span>
    `;
    container.appendChild(bubble);
  });
  
  // Scroll to bottom of message logs
  container.scrollTop = container.scrollHeight;
}

// Input Typing Handler
function handleTyping() {
  const val = document.getElementById("message-input").value;
  const sendBtn = document.getElementById("voice-send-btn");
  const micIcon = document.getElementById("mic-icon");
  if (val.trim().length > 0) {
    micIcon.className = "fa-solid fa-paper-plane";
  } else {
    micIcon.className = "fa-solid fa-microphone";
  }
}

// Send Message or Record audio action button click
function handleSendOrRecord() {
  const input = document.getElementById("message-input");
  const val = input.value;
  if (val.trim().length > 0) {
    // Send text
    sendMessage(val);
    input.value = "";
    handleTyping();
  } else {
    // Trigger audio recording
    startAudioRecording();
  }
}

// Send Message Engine
function sendMessage(textVal, extraData = {}) {
  if (!state.activeChatId) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  const newMsg = {
    id: "m_new_" + Date.now(),
    senderId: "self",
    text: textVal,
    timestamp: timeStr,
    ...extraData
  };

  if (!state.chats[state.activeChatId]) {
    state.chats[state.activeChatId] = [];
  }
  state.chats[state.activeChatId].push(newMsg);
  saveState();
  renderChatRoomMessages();
  renderChatsList();

  // Simulate automatic response (2 seconds delay)
  simulateFriendAutoResponse(state.activeChatId);
}

// Simulated auto response with notification triggering
function simulateFriendAutoResponse(chatId) {
  const isGroup = state.groups.some(g => g.id === chatId);
  let senderName = "Rahul Sharma";
  let responseText = "Sounds good! Catch you in a bit.";

  if (isGroup) {
    senderName = "Priya Patel";
    responseText = "Let's meet at the campus square library entrance instead?";
  } else {
    const friend = state.friends.find(f => f.id === chatId);
    senderName = friend ? friend.name : "Friend";
  }

  setTimeout(() => {
    // Check if we are still active in the same chat
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const reply = {
      id: "reply_" + Date.now(),
      senderId: isGroup ? "f2" : chatId,
      senderName: senderName,
      text: replyText,
      timestamp: timeStr
    };

    if (!state.chats[chatId]) state.chats[chatId] = [];
    state.chats[chatId].push(reply);
    saveState();

    if (state.activeChatId === chatId) {
      renderChatRoomMessages();
    } else {
      // Trigger notifications sound & banner alert
      showToast("New Message from " + senderName, responseText);
      playNotificationSound();
      renderChatsList();
    }
  }, 3500);
}

// Media attachment simulator
function simulateMediaAttachment() {
  const opt = confirm("Choose file to send:\n1. Mock Photo Attachment\n2. Share Current Location");
  if (opt) {
    if (confirm("Send Mock Photo attachment?")) {
      sendMessage("📷 Photo shared: study_materials.jpg");
    }
  }
}

// Share current location directly inside chat bubble
function shareLocationInChat() {
  if (confirm("Do you want to share your current location in this chat?")) {
    sendMessage("📍 Shared Location coordinates", {
      locationCoords: [...state.currentUser.coordinates]
    });
    showToast("Location Shared", "Sent coordinates into chat.");
  }
}

// Mic Recording mock simulation (or real API if permission allowed)
async function startAudioRecording() {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioRecorder = new MediaRecorder(stream);
      state.recordedChunks = [];
      
      state.audioRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.recordedChunks.push(e.data);
      };

      state.audioRecorder.onstop = () => {
        // Stop all audio tracks in stream
        stream.getTracks().forEach(track => track.stop());
      };

      state.audioRecorder.start();
      
      // Update voice overlay visibility
      const voiceOverlay = document.getElementById("voice-overlay");
      voiceOverlay.classList.remove("hidden");
      
      state.recordingDuration = 0;
      document.getElementById("voice-duration").textContent = "0:00";
      clearInterval(state.recordingTimer);
      state.recordingTimer = setInterval(() => {
        state.recordingDuration++;
        const mins = Math.floor(state.recordingDuration / 60);
        const secs = state.recordingDuration % 60;
        document.getElementById("voice-duration").textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }, 1000);

    } else {
      alert("Microphone recording not supported on this browser context.");
    }
  } catch (e) {
    alert("Could not access microphone: " + e.message);
  }
}

function stopAudioRecording(send) {
  clearInterval(state.recordingTimer);
  const voiceOverlay = document.getElementById("voice-overlay");
  voiceOverlay.classList.add("hidden");

  if (state.audioRecorder && state.audioRecorder.state !== 'inactive') {
    state.audioRecorder.stop();
  }

  if (send && state.recordedChunks.length > 0) {
    // Save mock blob url for playback
    const blob = new Blob(state.recordedChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(blob);
    sendMessage("🎙️ Voice Note", { voiceUrl: audioUrl });
    showToast("Voice Note Sent", "Audio message recorded successfully.");
  }
}

// Playing the local voice note audio note
function playVoiceNote(url, btn) {
  const audio = new Audio(url);
  const icon = btn.querySelector("i");
  icon.className = "fa-solid fa-pause";
  
  // Wave animation simulation
  const bubble = btn.closest(".message-bubble");
  const waveBars = bubble.querySelectorAll(".audio-wave-bar");
  
  let barInterval = setInterval(() => {
    waveBars.forEach(b => {
      if (Math.random() > 0.4) b.classList.add("active");
      else b.classList.remove("active");
    });
  }, 100);

  audio.play();
  audio.onended = () => {
    icon.className = "fa-solid fa-play";
    clearInterval(barInterval);
    waveBars.forEach(b => b.classList.remove("active"));
  };
}

// Open emoji drawer inside chat input
function toggleEmojiDrawer() {
  document.getElementById("emoji-drawer").classList.toggle("hidden");
}

function insertEmoji(emoji) {
  const input = document.getElementById("message-input");
  input.value += emoji;
  document.getElementById("emoji-drawer").classList.add("hidden");
  handleTyping();
}

// Meetups Dashboard UI Renderer
function renderMeetupsList() {
  const container = document.getElementById("meetups-list-container");
  container.innerHTML = "";

  state.meetups.forEach(meetup => {
    const distanceVal = calculateDistance(
      state.currentUser.coordinates[0], state.currentUser.coordinates[1],
      meetup.coordinates[0], meetup.coordinates[1]
    );
    const eta = estimateETA(distanceVal);

    const card = document.createElement("div");
    card.className = "meetup-card";
    card.onclick = () => openMeetupDetail(meetup.id);
    card.innerHTML = `
      <div class="meetup-card-header">
        <h3>${meetup.title}</h3>
        <span class="meetup-status-badge active">Active</span>
      </div>
      <div class="meetup-details-row">
        <div><i class="fa-solid fa-location-dot"></i> <span>${meetup.destinationName}</span></div>
        <div><i class="fa-solid fa-clock"></i> <span>Time: ${meetup.time}</span></div>
        <div><i class="fa-solid fa-person-walking"></i> <span>Your Distance: ${distanceVal.toFixed(2)} km (${eta} mins walk)</span></div>
      </div>
    `;
    container.appendChild(card);
  });
}

function openCreateMeetupDialog() {
  document.getElementById("create-meetup-modal").classList.remove("hidden");
}

function closeCreateMeetupDialog() {
  document.getElementById("create-meetup-modal").classList.add("hidden");
}

function submitCreateMeetup() {
  const title = document.getElementById("meetup-title").value;
  const destName = document.getElementById("meetup-destination").value;
  const coordsPreset = document.getElementById("meetup-coords-preset").value;

  if (!title.trim() || !destName.trim()) {
    alert("Please fill in all meetup planning fields.");
    return;
  }

  // Preset campus Coordinates mapper
  let coords = [12.9750, 77.5980]; // Mess default
  if (coordsPreset === 'hostel') coords = [12.9716, 77.5946];
  else if (coordsPreset === 'college') coords = [12.9740, 77.5960];
  else if (coordsPreset === 'library') coords = [12.9700, 77.5910];
  else if (coordsPreset === 'gym') coords = [12.9680, 77.5935];

  const newMeetup = {
    id: "meet_" + Date.now(),
    title: title,
    destinationName: destName,
    coordinates: coords,
    time: "Scheduled at: " + new Date(Date.now() + 60*60*1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    creatorId: "self",
    attendees: [
      { userId: "self", status: "accepted" },
      { userId: "f1", status: "accepted" },
      { userId: "f2", status: "pending" }
    ]
  };

  state.meetups.push(newMeetup);
  saveState();
  closeCreateMeetupDialog();
  renderMeetupsList();
  updateMapMarkers();
  showToast("Meetup Scheduled!", `Planned dinner/meetup event at ${destName}`);
}

// Meetup Detailed View UI print
function openMeetupDetail(meetupId) {
  state.currentViewingMeetupId = meetupId;
  switchTab("meetup-detail");
  renderMeetupDetailUI(meetupId);
}

function renderMeetupDetailUI(meetupId) {
  const container = document.getElementById("meetup-detail-content");
  const meetup = state.meetups.find(m => m.id === meetupId);
  if (!meetup) {
    container.innerHTML = "Meetup event not found.";
    return;
  }

  let attendeesHtml = "";
  meetup.attendees.forEach(att => {
    let name = "You";
    let avatar = state.currentUser.avatar;
    let distText = "";
    let statusText = att.status.toUpperCase();
    let coords = [...state.currentUser.coordinates];

    if (att.userId !== 'self') {
      const fr = state.friends.find(f => f.id === att.userId);
      name = fr ? fr.name : "Friend";
      avatar = fr ? fr.avatar : "F";
      coords = fr ? [...fr.coordinates] : coords;
    }

    // Calculate dynamic live distance & ETA
    const dist = calculateDistance(coords[0], coords[1], meetup.coordinates[0], meetup.coordinates[1]);
    const eta = estimateETA(dist);
    distText = `${dist.toFixed(2)} km away (${eta} mins walk)`;

    attendeesHtml += `
      <div class="attendee-item">
        <div class="avatar" style="width:38px;height:38px;font-size:12px;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;border-radius:50%">${avatar}</div>
        <div class="info">
          <div class="name">${name}</div>
          <div class="eta-dist">${distText}</div>
        </div>
        <div class="attendee-status ${att.status}">${statusText}</div>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="meetup-detail-title-card">
      <h2>${meetup.title}</h2>
      <p><i class="fa-solid fa-location-dot"></i> Destination: <b>${meetup.destinationName}</b></p>
      <p><i class="fa-solid fa-clock"></i> Time: <b>${meetup.time}</b></p>
      <button class="btn btn-primary btn-block" style="margin-top: 15px;" onclick="panToCoords(${meetup.coordinates[0]}, ${meetup.coordinates[1]})">
        <i class="fa-solid fa-diamond-turn-right"></i> Navigate on Map
      </button>
    </div>
    <div class="attendees-section">
      <h3>Participants Live ETAs</h3>
      ${attendeesHtml}
    </div>
  `;
}

// Navigate map to specific meetup coordinates
function panToCoords(lat, lng) {
  switchTab("map");
  if (state.map) {
    state.map.setView([lat, lng], 16);
    updateMapMarkers();
  }
}

// Friends List & Request Management Tabs
function switchFriendsTab(subTab, btn) {
  const tabs = document.querySelectorAll(".friends-tab");
  tabs.forEach(t => t.classList.remove("active"));
  btn.classList.add("active");

  const contents = document.querySelectorAll(".subtab-content");
  contents.forEach(c => c.classList.remove("active"));

  document.getElementById(`subtab-${subTab}`).classList.add("active");
}

function renderFriendsList() {
  const list = document.getElementById("friends-list-container");
  list.innerHTML = "";

  state.friends.forEach(f => {
    const el = document.createElement("div");
    el.className = "friend-list-item chat-item"; // Reuse layout styles
    el.innerHTML = `
      <div class="avatar">${f.avatar}</div>
      <div class="info">
        <div class="name">${f.name}</div>
        <div class="status">${f.status} &bull; ${f.isSharing ? 'Sharing Live' : 'Offline'}</div>
      </div>
      <button class="btn btn-secondary btn-circle" onclick="openChatRoom('${f.id}', '${f.name}', '${f.avatar}', false)">
        <i class="fa-solid fa-comment"></i>
      </button>
    `;
    list.appendChild(el);
  });

  // Render Requests list
  const reqContainer = document.getElementById("requests-list-container");
  reqContainer.innerHTML = "";
  
  const badge = document.getElementById("requests-badge");
  badge.textContent = state.friendRequests.length;

  state.friendRequests.forEach(req => {
    const el = document.createElement("div");
    el.className = "friend-list-item chat-item";
    el.innerHTML = `
      <div class="avatar" style="background:var(--accent)">${req.from.avatar}</div>
      <div class="info">
        <div class="name">${req.from.name}</div>
        <div class="status">wants to be friends</div>
      </div>
      <div style="display:flex;gap:5px">
        <button class="btn btn-primary" style="padding:6px 12px;font-size:12px" onclick="acceptFriendRequest('${req.id}')">Accept</button>
        <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px" onclick="rejectFriendRequest('${req.id}')">Decline</button>
      </div>
    `;
    reqContainer.appendChild(el);
  });
}

function acceptFriendRequest(reqId) {
  const req = state.friendRequests.find(r => r.id === reqId);
  if (req) {
    // Add to friends
    const newFriend = {
      id: "f_new_" + Date.now(),
      name: req.from.name,
      username: req.from.username,
      avatar: req.from.avatar,
      status: "In Hostel",
      coordinates: [12.9725, 77.5950],
      isSharing: true,
      lastUpdated: "Just now"
    };
    state.friends.push(newFriend);
    state.friendRequests = state.friendRequests.filter(r => r.id !== reqId);
    saveState();
    renderFriendsList();
    updateMapMarkers();
    showToast("Request Accepted", `${req.from.name} is now your friend!`);
  }
}

function rejectFriendRequest(reqId) {
  state.friendRequests = state.friendRequests.filter(r => r.id !== reqId);
  saveState();
  renderFriendsList();
  showToast("Request Declined", "Friend request declined.");
}

function handleUserSearch(query) {
  const container = document.getElementById("search-results-container");
  container.innerHTML = "";

  if (query.trim().length === 0) return;

  const mockUsers = [
    { name: "John Doe", username: "john_d", avatar: "JD" },
    { name: "Suresh Kumar", username: "suresh_k", avatar: "SK" }
  ];

  mockUsers.forEach(u => {
    if (u.username.includes(query.toLowerCase()) || u.name.toLowerCase().includes(query.toLowerCase())) {
      const el = document.createElement("div");
      el.className = "search-result-item";
      el.innerHTML = `
        <div class="user-meta">
          <div class="avatar" style="width:38px;height:38px;font-size:12px;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;border-radius:50%">${u.avatar}</div>
          <div>
            <span class="name">${u.name}</span>
            <span class="username">@${u.username}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" style="width:auto;padding:6px 12px;font-size:12px" onclick="sendFriendRequest('${u.name}', '${u.username}', '${u.avatar}')">Add</button>
      `;
      container.appendChild(el);
    }
  });
}

function sendFriendRequest(name, username, avatar) {
  alert("Friend request sent to @" + username);
  showToast("Friend Request", "Sent request to " + name);
  document.getElementById("user-search-input").value = "";
  document.getElementById("search-results-container").innerHTML = "";
}

// Groups & Member dialog creation
function openCreateGroupDialog() {
  document.getElementById("create-group-modal").classList.remove("hidden");
}

function closeCreateGroupDialog() {
  document.getElementById("create-group-modal").classList.add("hidden");
}

function submitCreateGroup() {
  const name = document.getElementById("new-group-name").value;
  const desc = document.getElementById("new-group-desc").value;
  if (!name.trim()) return;

  const newGroup = {
    id: "g_new_" + Date.now(),
    name: name,
    description: desc,
    avatar: name.split(' ').map(n => n[0]).join('').toUpperCase(),
    memberIds: ["f1", "f2"]
  };

  state.groups.push(newGroup);
  state.chats[newGroup.id] = [];
  saveState();
  closeCreateGroupDialog();
  renderChatsList();
  showToast("Group Created", `New group: ${name} is ready.`);
}

// Status Updates
function setUserStatus(statusName, btn) {
  state.currentUser.status = statusName;
  saveState();

  const options = document.querySelectorAll(".status-option");
  options.forEach(o => o.classList.remove("active"));
  btn.classList.add("active");

  showToast("Status Updated", `You are now: ${statusName}`);
  updateMapMarkers();
}

function updateProfileBio(bio) {
  state.currentUser.bio = bio;
  saveState();
  showToast("Bio Updated", "Your profile details have been saved.");
}

// Settings resets database
function openResetStorageDialog() {
  if (confirm("WARNING: Are you sure you want to reset all local storage data, mock messages, and active location coordinates?")) {
    localStorage.removeItem("fl_state");
    localStorage.removeItem("fl_logged_in");
    alert("App database reset successfully. Reloading...");
    window.location.reload();
  }
}

// Settings theme switches
function toggleThemeSetting() {
  const isDark = document.body.classList.contains("dark-theme");
  const checkbox = document.getElementById("theme-toggle");

  if (isDark) {
    document.body.className = "light-theme";
    if (checkbox) checkbox.checked = false;
    localStorage.setItem("fl_theme", "light");
  } else {
    document.body.className = "dark-theme";
    if (checkbox) checkbox.checked = true;
    localStorage.setItem("fl_theme", "dark");
  }
}

// Load theme settings preference
const savedTheme = localStorage.getItem("fl_theme");
if (savedTheme === "light") {
  document.body.className = "light-theme";
  setTimeout(() => {
    const cb = document.getElementById("theme-toggle");
    if (cb) cb.checked = false;
  }, 100);
}

// In-app alert sliding toasts
function showToast(title, msg, borderBg = "var(--primary)") {
  const toast = document.getElementById("toast-notif");
  document.getElementById("toast-title").textContent = title;
  document.getElementById("toast-message").textContent = msg;
  document.getElementById("toast-icon").style.backgroundColor = borderBg;

  toast.classList.add("active");
  setTimeout(() => {
    toast.classList.remove("active");
  }, 3500);
}

function playNotificationSound() {
  const audio = document.getElementById("notif-sound");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play blocked by browser policy"));
  }
}

// Emergency SOS Countdown & Broadcast Actions
let sosTimer = null;
let sosCount = 3;

function triggerSosCountdown() {
  const overlay = document.getElementById("sos-overlay");
  const countEl = document.getElementById("sos-countdown");
  const siren = document.getElementById("sos-sound");

  overlay.classList.remove("hidden");
  sosCount = 3;
  countEl.textContent = sosCount;

  if (siren) {
    siren.currentTime = 0;
    siren.play().catch(e => console.log("Siren audio blocked by browser policy"));
  }

  clearInterval(sosTimer);
  sosTimer = setInterval(() => {
    sosCount--;
    if (sosCount > 0) {
      countEl.textContent = sosCount;
    } else {
      clearInterval(sosTimer);
      triggerSosEmergencyAlert();
    }
  }, 1000);
}

function cancelSos() {
  clearInterval(sosTimer);
  document.getElementById("sos-overlay").classList.add("hidden");
  const siren = document.getElementById("sos-sound");
  if (siren) {
    siren.pause();
  }
  showToast("SOS Cancelled", "Emergency sequence aborted.", "var(--success)");
}

// The actual SOS trigger reading GPS coordinates and battery
function triggerSosEmergencyAlert() {
  document.getElementById("sos-overlay").classList.add("hidden");
  const siren = document.getElementById("sos-sound");
  if (siren) {
    siren.pause();
  }

  // Retrieve current coordinates and battery info
  let lat = state.currentUser.coordinates[0];
  let lng = state.currentUser.coordinates[1];
  let batteryText = "Unknown%";

  const executeAlert = () => {
    // Modify current user status
    state.currentUser.status = "SOS";
    saveState();
    
    // Simulate sending SOS to all friends in group chats
    const emergencyMsg = `🚨 EMERGENCY SOS! 🚨\nName: ${state.currentUser.name}\nCoordinates: https://maps.google.com/?q=${lat},${lng}\nTime: ${new Date().toLocaleTimeString()}\nBattery Percentage: ${batteryText}`;

    // Add alert to active chats
    state.friends.forEach(f => {
      if (!state.chats[f.id]) state.chats[f.id] = [];
      state.chats[f.id].push({
        id: "sos_" + Date.now(),
        senderId: "self",
        text: emergencyMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      });
    });

    saveState();
    renderChatsList();
    updateMapMarkers();
    showToast("SOS Alert Broadcasted!", "Emergency message and coordinates sent to all friends.", "var(--danger)");
    alert("Emergency SOS Alert successfully broadcasted to your emergency contacts!");
  };

  // Check battery percentage
  if (navigator.getBattery) {
    navigator.getBattery().then(bat => {
      batteryText = Math.round(bat.level * 100) + "%";
      // Get location coordinates
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          executeAlert();
        }, () => {
          executeAlert();
        });
      } else {
        executeAlert();
      }
    });
  } else {
    executeAlert();
  }
}
