import { Box, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatState } from "../Context/ChatProvider";
import MessageBubble from "./MessageBubble";

const MessagesContainer = ({ messages, roomType = "" }) => {
  const { user } = ChatState();
  const scrollRef = useRef(null);
  const previousMessageCount = useRef(0);
  const [showNewMessagesDivider, setShowNewMessagesDivider] = useState(false);

  const isNearBottom = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return true;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom < 120;
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const container = scrollRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    const wasNearBottom = !container || isNearBottom();
    const hasNewMessages = messages.length > previousMessageCount.current;

    if (hasNewMessages && !wasNearBottom) {
      setShowNewMessagesDivider(true);
      return;
    }

    setShowNewMessagesDivider(false);
    previousMessageCount.current = messages.length;
    scrollToBottom(false);
  }, [messages, isNearBottom, scrollToBottom]);

  useEffect(() => {
    previousMessageCount.current = messages.length;
  }, []);

  const handleScroll = () => {
    if (isNearBottom()) {
      setShowNewMessagesDivider(false);
    }
  };

  const isOwnMessage = (message) => {
    const senderId =
      typeof message.sender === "string" ? message.sender : message.sender?._id;

    return senderId === user?._id;
  };

  return (
    <Box
      ref={scrollRef}
      flex="1"
      minH="0"
      overflowY="auto"
      p={{ base: 3, md: 4 }}
      className="messages-container"
      onScroll={handleScroll}
    >
      {messages.length === 0 ? (
        <Box className="messages-empty">
          <Text>No messages yet</Text>
          <Text fontSize="sm" color="gray.500">
            Send a message to start the conversation
          </Text>
        </Box>
      ) : (
        <VStack spacing={2} align="stretch" className="messages-list">
          {messages.map((message, index) => (
            <Box key={message._id || index}>
              {showNewMessagesDivider && index === messages.length - 1 && (
                <Box className="new-messages-divider">New messages</Box>
              )}
              <MessageBubble
                message={message}
                isOwn={isOwnMessage(message)}
                isGroup={roomType === "group"}
              />
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export default MessagesContainer;
