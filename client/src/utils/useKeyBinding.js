import { useEffect, useCallback } from "react";

const COMMAND_ALIASES = {
  "ctrl+k": ["Control+k", "Control+K", "ctrl+k", "ctrl+K"],
  "cmd+k": ["Meta+k", "Meta+K", "cmd+k", "cmd+K", "command+k", "command+K"],
  "ctrl+shift+k": ["Control+Shift+k", "Control+Shift+K", "ctrl+shift+k", "ctrl+shift+K"],
};

const normalizeShortcut = (raw) => raw.trim().toLowerCase();

const matchesShortcut = (event, shortcut) => {
  const normalized = normalizeShortcut(shortcut);
  const aliases = COMMAND_ALIASES[normalized] || [normalized];
  const combo = [
    event.ctrlKey ? "ctrl" : null,
    event.metaKey ? "cmd" : null,
    event.altKey ? "alt" : null,
    event.shiftKey ? "shift" : null,
    event.key.length === 1 ? event.key.toLowerCase() : event.key.toUpperCase(),
  ]
    .filter(Boolean)
    .join("+");

  return aliases.some((alias) => {
    const parts = alias.split("+");
    const keyPart = parts[parts.length - 1].toUpperCase();
    const needsCtrl = parts.includes("ctrl");
    const needsCmd = parts.includes("cmd") || parts.includes("command") || parts.includes("meta");
    const needsAlt = parts.includes("alt");
    const needsShift = parts.includes("shift");

    const pressedKey =
      event.key.length === 1 ? event.key.toLowerCase() : event.key.toUpperCase();

    const modsMatch =
      (!needsCtrl || event.ctrlKey) &&
      (!needsCmd || event.metaKey) &&
      (!needsAlt || event.altKey) &&
      (!needsShift || event.shiftKey);

    return modsMatch && pressedKey === keyPart.toLowerCase();
  });
};

const useKeyBinding = (shortcut, handler, options = {}) => {
  const { enabled = true, preventDefault = true, stopPropagation = false } = options;

  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;
      if (!matchesShortcut(event, shortcut)) return;
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      handler(event);
    },
    [enabled, handler, preventDefault, stopPropagation, shortcut]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};

export const useKeyboardShortcuts = (bindings = []) => {
  bindings.forEach(({ shortcut, handler, options }) => {
    useKeyBinding(shortcut, handler, options);
  });
};

export default useKeyBinding;
