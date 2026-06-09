const DOMAIN = (import.meta?.env?.VITE_BASE_URL || window.location.origin).replace(/^https?:\/\//, "").split("/")[0];

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission({ name: "browserNotifications", icon: "/favicon.ico" });
  return permission === "granted";
};

export const showDesktopNotification = ({ title, body, tag, data }) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;
  try {
    const notification = new Notification(title, {
      body,
      tag: tag || `talkative-${Date.now()}`,
      data: data || {},
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      requireInteraction: false,
      silent: false,
    });
    if (document.hasFocus()) {
      setTimeout(() => notification.close?.(), 5000);
    }
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      const route = data?.route || "/chats";
      if (window.location.pathname !== route) {
        window.history.pushState({}, "", route);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    };
    return notification;
  } catch {
    return null;
  }
};

let audioContext = null;
const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioContext = null;
    }
  }
  return audioContext;
};

export const playNotificationSound = (frequency = 880, duration = 140, type = "sine", volume = 0.25) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch {
    // ignore audio playback errors
  }
};

let notificationCount = 0;
export const playIncomingMessageSound = () => {
  const delay = 70;
  const f1 = 783.99;
  const f2 = 1046.50;
  const timeout1 = setTimeout(() => playNotificationSound(f1, 160, "sine", 0.22), 0);
  const timeout2 = setTimeout(() => playNotificationSound(f2, 220, "sine", 0.22), delay);
  return () => {
    clearTimeout(timeout1);
    clearTimeout(timeout2);
  };
};

export const playMatchSound = () => {
  const notes = [
    { f: 783.99, t: 0, d: 120 },
    { f: 987.77, t: 90, d: 120 },
    { f: 1174.66, t: 180, d: 200 },
  ];
  const timeouts = notes.map(({ f, t, d }) => setTimeout(() => playNotificationSound(f, d, "triangle", 0.22), t));
  return () => timeouts.forEach(clearTimeout);
};

export const playAlertSound = () => {
  const notes = [
    { f: 400, t: 0, d: 180 },
    { f: 500, t: 180, d: 220 },
  ];
  const timeouts = notes.map(({ f, t, d }) => setTimeout(() => playNotificationSound(f, d, "square", 0.18), t));
  return () => timeouts.forEach(clearTimeout);
};

let notificationQueue = [];
let isNotifying = false;

const flushNotifications = () => {
  if (isNotifying || notificationQueue.length === 0) return;
  isNotifying = true;
  const current = notificationQueue.shift();
  if (current?.sound) {
    const clear = current.sound();
    setTimeout(clear, 800);
  }
  if (current?.desktop) {
    current.desktop();
  }
  setTimeout(() => {
    isNotifying = false;
    flushNotifications();
  }, 120);
};

const enqueueNotification = (options = {}) => {
  notificationQueue.push(options);
  flushNotifications();
};

export const notifyMessage = (data) => {
  const shouldNotify = data.sender._id !== data.recipient?._id && data.sender._id !== data.user?._id;
  if (!shouldNotify) return;
  const title = `New message from ${data.senderName || "Unknown"}`;
  const body = data.content?.text || "You received a new message";
  enqueueNotification({
    desktop: () => showDesktopNotification({ title, body, tag: `msg-${data._id || Date.now()}`, data: { route: "/chats", roomId: data.roomId } }),
    sound: playIncomingMessageSound,
  });
};

export const notifyMatch = (data) => {
  const title = "Match Found! 🎉";
  const body = data.message || "You're now connected with a random partner.";
  enqueueNotification({
    desktop: () => showDesktopNotification({ title, body, tag: `match-${data.roomId || Date.now()}`, data: { route: "/chats" } }),
    sound: playMatchSound,
  });
};

export const notifyPartnerLeft = (data) => {
  const title = "Partner Left";
  const body = data.message || "Your chat partner has left the conversation.";
  enqueueNotification({
    desktop: () => showDesktopNotification({ title, body, tag: `left-${data.roomId || Date.now()}`, data: { route: "/chats" } }),
    sound: playAlertSound,
  });
};

export const notifyRoomExpiryWarning = (data) => {
  const title = "Room Expiring Soon";
  const body = data.message || "This room will expire in a few minutes.";
  enqueueNotification({
    desktop: () => showDesktopNotification({ title, body, tag: `expiry-${data.roomId || Date.now()}` }),
    sound: playAlertSound,
  });
};

export const notifyRoomExpired = (data) => {
  const title = "Room Expired";
  const body = data.message || "The room has ended.";
  enqueueNotification({
    desktop: () => showDesktopNotification({ title, body, tag: `expired-${data.roomId || Date.now()}` }),
    sound: playAlertSound,
  });
};

export const getNotificationSettings = () => {
  try {
    const raw = localStorage.getItem("talkative-notification-settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    desktopEnabled: true,
    soundEnabled: true,
    matchNotifications: true,
    messageNotifications: true,
    roomNotifications: true,
  };
};

export const saveNotificationSettings = (settings) => {
  try {
    localStorage.setItem("talkative-notification-settings", JSON.stringify(settings));
  } catch {}
  return settings;
};

export const listenForMessages = (callback) => {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  return () => {
    window.removeEventListener("focus", handler);
  };
};
