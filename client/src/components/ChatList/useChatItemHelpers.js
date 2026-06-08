import { useMemo } from "react";

const truncate = (value, limit = 40) => {
  if (!value) return "";
  const text = typeof value === "string" ? value : value?.content || "";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

const formatTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
};

export const useChatItemHelpers = () => {
  return useMemo(() => ({ truncate, formatTime }), []);
};