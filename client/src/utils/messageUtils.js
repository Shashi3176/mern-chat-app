const isWithinTimeWindow = (prevTime, currTime, windowMs = 5 * 60 * 1000) => {
  if (!prevTime || !currTime) return false;
  return new Date(currTime).getTime() - new Date(prevTime).getTime() <= windowMs;
};

const getDateSeparatorLabel = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isCurrentYear = date.getFullYear() === today.getFullYear();

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("default", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: isCurrentYear ? undefined : "numeric",
  });
};

export const createMessageNodes = (messages, currentUserId) => {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const nodes = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const isOwn = msg.sender?._id === currentUserId;
    const prevDate = prev ? new Date(prev.createdAt).toDateString() : null;
    const currDate = new Date(msg.createdAt).toDateString();
    const showDateSeparator = !prev || prevDate !== currDate;

    if (showDateSeparator) {
      nodes.push({
        kind: "separator",
        key: `sep-${msg._id}`,
        label: getDateSeparatorLabel(msg.createdAt),
        date: currDate,
      });
    }

    if (isOwn) {
      nodes.push({
        kind: "message",
        key: msg._id,
        message: msg,
        isOwn: true,
        showSender: false,
        showAvatar: false,
        showTimestamp: true,
        grouped: false,
      });
      continue;
    }

    const prevSameSender =
      prev && prev.sender?._id === msg.sender?._id && isWithinTimeWindow(prev.createdAt, msg.createdAt);
    const nextSameSender =
      messages[i + 1] &&
      messages[i + 1].sender?._id === msg.sender?._id &&
      isWithinTimeWindow(msg.createdAt, messages[i + 1].createdAt);

    const isGroupFirst = !prevSameSender;
    const isGroupLast = !nextSameSender;
    const showTimestamp = isGroupFirst;
    const showAvatar = isGroupFirst;

    nodes.push({
      kind: "message",
      key: msg._id,
      message: msg,
      isOwn: false,
      showSender: isGroupFirst,
      showAvatar,
      showTimestamp: showTimestamp || isGroupLast,
      grouped: prevSameSender,
      isGroupFirst,
      isGroupLast,
    });
  }

  return nodes;
};

export const shouldShowDateSeparator = (currentMsg, prevMsg) => {
  if (!prevMsg) return true;
  return new Date(currentMsg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
};

export const getRelativeDateLabel = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("default", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

export const formatMessageTimestamp = (createdAt) => {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatFullDate = (createdAt) => {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const canEditMessage = (message, currentUserId) => {
  if (!message || message.sender?._id !== currentUserId) return false;
  return Date.now() - new Date(message.createdAt).getTime() <= 5 * 60 * 1000;
};

export const extractFirstUrl = (text) => {
  if (!text || typeof text !== "string") return null;
  const urlRegex =
    /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : null;
};
