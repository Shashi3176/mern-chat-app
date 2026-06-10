import {
  Box,
  FormControl,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { useEffect, useRef, useCallback, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import data from "@emoji-mart/data";

const MessageInput = ({
  onSend,
  onChange,
  value,
  isDisabled = false,
  isExpired = false,
  isTyping = false,
  placeholder = "Type a message...",
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingDebounceRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiContainerRef = useRef(null);

  const emitTyping = useCallback((emitFn) => {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed) {
      emitFn("stop");
      return;
    }
    typingDebounceRef.current = setTimeout(() => {
      emitFn("start");
    }, 300);
  }, [value]);

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
    };
  }, []);

  const handleEmojiSelect = (emoji) => {
    const native = emoji?.native || "😀";
    if (typeof onChange === "function") {
      const syntheticEvent = {
        target: {
          value: (typeof value === "string" ? value : "") + native,
        },
      };
      onChange(syntheticEvent);
    }
    setShowEmojiPicker(false);
  };

  const handleOutsideClick = (e) => {
    const btn = emojiButtonRef.current;
    const container = emojiContainerRef.current;
    if (
      btn &&
      container &&
      !btn.contains(e.target) &&
      !container.contains(e.target)
    ) {
      setShowEmojiPicker(false);
    }
  };

  useEffect(() => {
    if (!showEmojiPicker) return;
    const timer = setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [showEmojiPicker]);

  const handleSend = async (event) => {
    const isKeyboardSend =
      event.type === "keydown" && event.key === "Enter" && !event.shiftKey;
    const isClickSend = event.type === "click";

    if (!isKeyboardSend && !isClickSend) return;
    if (isDisabled || isExpired || loading) return;

    event.preventDefault();
    setLoading(true);

    try {
      await onSend();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="message-input-container" sx={{ position: "relative" }}>
      {isTyping && !isExpired && (
        <Text fontSize="sm" color="gray.500" className="typing-indicator">
          Partner is typing...
        </Text>
      )}

      <FormControl isDisabled={isDisabled || isExpired} isRequired mt={2}>
        <HStack spacing={2} align="center" className="message-input-panel">
          <Input
            variant="filled"
            placeholder={isExpired ? "Room has expired" : placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => {
              onChange?.(event);
            }}
            onKeyDown={handleSend}
            flex={1}
            className="message-input"
          />
          <IconButton
            aria-label="Emoji"
            icon={<Text sx={{ fontSize: 16 }}>😊</Text>}
            size="sm"
            variant="ghost"
            isRound
            ref={emojiButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker((prev) => !prev);
            }}
            className="emoji-button"
          />
          <IconButton
            icon={loading ? <Spinner size="sm" /> : <ArrowForwardIcon />}
            aria-label="Send message"
            onClick={handleSend}
            isRound
            isDisabled={isDisabled || isExpired || loading || !value?.trim?.()}
            className="send-button"
          />
        </HStack>
      </FormControl>

      {showEmojiPicker && (
        <Box
          sx={{
            position: "absolute",
            bottom: "100%",
            right: 0,
            mb: 1,
            zIndex: 100,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.14)",
            background: "white",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
          className="emoji-picker-wrapper"
        >
          <Box
            sx={{
              width: 320,
              height: 380,
            }}
            className="emoji-picker-container"
          >
            <EmojiPicker
              data={data}
              onEmojiClick={handleEmojiSelect}
              lazyLoadEmojis
              previewConfig={{ showPreview: false }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MessageInput;
