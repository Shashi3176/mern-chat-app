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
import { useEffect, useRef, useCallback } from "react";

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
  const typingDebounceRef = useRef(null);

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

  const handleSend = async (event) => {
    const isKeyboardSend =
      event.type === "keydown" && event.key === "Enter" && !event.shiftKey;
    const isClickSend = event.type === "click";

    if (!isKeyboardSend && !isClickSend) return;
    if (isDisabled || isExpired || loading || !value.trim()) return;

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
            value={value}
            onChange={(event) => {
              onChange?.(event);
              emitTyping(onChange);
            }}
            onKeyDown={handleSend}
            flex={1}
            className="message-input"
          />
          <IconButton
            icon={loading ? <Spinner size="sm" /> : <ArrowForwardIcon />}
            aria-label="Send message"
            onClick={handleSend}
            colorScheme="green"
            variant="solid"
            isRound
            isDisabled={isDisabled || isExpired || loading || !value.trim()}
            className="send-button"
          />
        </HStack>
      </FormControl>
    </Box>
  );
};

export default MessageInput;
