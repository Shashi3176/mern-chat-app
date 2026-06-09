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
import Picker from "emoji-button";

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
  const emojiContainerRef = useRef(null);
  const pickerInstanceRef = useRef(null);

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

  useEffect(() => {
    if (!showEmojiPicker || !emojiContainerRef.current) return;

    const picker = new Picker({
      emojiSize: 24,
      theme: "light",
      showPreview: false,
      showSkinTones: false,
      rowsPerPage: 7,
      perLine: 8,
      buttonPosition: "bottom",
      closeButton: false,
      zIndex: 1001,
    });

    picker.on("emoji", (emojiEvent) => {
      const native = emojiEvent.emoji?.native || "😀";
      if (typeof onChange === "function") {
        const syntheticEvent = {
          target: {
            value: (typeof value === "string" ? value : "") + native,
          },
        };
        onChange(syntheticEvent);
      }
      setShowEmojiPicker(false);
    });

    if (emojiContainerRef.current) {
      emojiContainerRef.current.innerHTML = "";
      picker.togglePicker(emojiContainerRef.current, emojiContainerRef.current);
      pickerInstanceRef.current = picker;
    }

    const handleOutsideClick = (e) => {
      if (
        emojiContainerRef.current &&
        !emojiContainerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleOutsideClick);
      if (pickerInstanceRef.current) {
        try {
          pickerInstanceRef.current.destroyPicker();
        } catch (err) {
          // ignore cleanup errors
        }
        pickerInstanceRef.current = null;
      }
    };
  }, [showEmojiPicker, onChange, value]);

  const handleSend = async (event) => {
    const isKeyboardSend =
      event.type === "keydown" && event.key === "Enter" && !event.shiftKey;
    const isClickSend = event.type === "click";

    if (!isKeyboardSend && !isClickSend) return;
    if (isDisabled || isExpired || loading || !value?.trim?.()) return;

    event.preventDefault();
    setLoading(true);

    try {
      await onSend();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="message-input-container">
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
              emitTyping(onChange);
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
            colorScheme="green"
            variant="solid"
            isRound
            isDisabled={isDisabled || isExpired || loading || !value?.trim?.()}
            className="send-button"
          />
        </HStack>
      </FormControl>

      {showEmojiPicker && (
        <Box
          ref={emojiContainerRef}
          sx={{
            position: "relative",
            marginTop: 2,
            minHeight: 360,
            maxHeight: 400,
            overflow: "auto",
          }}
          className="emoji-picker-container"
        />
      )}

      <Box>
        <style>{`
          .message-input-container {
            position: relative;
            z-index: 50;
          }
          .emoji-picker-container {
            position: absolute;
            bottom: calc(100% + 8px);
            right: 0;
            z-index: 50;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.14);
            background: white;
            border: 1px solid rgba(0,0,0,0.06);
          }
          .emoji-mount-inner {
            width: 320px;
            height: 360px;
          }
        `}</style>
      </Box>
    </Box>
  );
};

export default MessageInput;
