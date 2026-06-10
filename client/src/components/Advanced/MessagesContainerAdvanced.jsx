import { Box, Text, VStack, Spinner, Button } from "@chakra-ui/react";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { ChatState } from "../../Context/ChatProvider";
import EnhancedMessageBubble, { renderEmojiPreview } from "./EnhancedMessageBubble";
import DateSeparator from "./DateSeparator";
import { createMessageNodes } from "../../utils/messageUtils";

const MESSAGES_PER_PAGE = 30;

const MessagesContainerAdvanced = ({ messages, roomType = "", loading = false }) => {
  const { user } = ChatState();
  const scrollRef = useRef(null);
  const previousMessageCount = useRef(0);
  const [showNewMessagesDivider, setShowNewMessagesDivider] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [showAtTop, setShowAtTop] = useState(false);
  const isNearBottomRef = useRef(true);
  const initializedRef = useRef(false);

  const visibleMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return messages;
  }, [messages]);

  const renderedNodes = useMemo(() => {
    if (!visibleMessages || visibleMessages.length === 0) return [];
    return createMessageNodes(visibleMessages, user?._id);
  }, [visibleMessages, user?._id]);

  const isNearBottom = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return true;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;
    return isNearBottomRef.current;
  }, []);

  const scrollToBottom = useCallback(
    (smooth = false) => {
      const container = scrollRef.current;
      if (!container) return;

      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
        isNearBottomRef.current = true;
        setShowScrollToBottom(false);
      });
    },
    []
  );

  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !messages || messages.length === 0) return;
    setIsLoadingOlder(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, messages]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom > 300) {
      setShowScrollToBottom(true);
      isNearBottomRef.current = false;
    } else {
      setShowScrollToBottom(false);
      isNearBottomRef.current = true;
    }

    if (distanceFromBottom < 120) {
      setShowNewMessagesDivider(false);
    }

    if (scrollTop < 80 && !isLoadingOlder && messages.length > 0) {
      setShowAtTop(true);
      loadOlderMessages();
    } else {
      setShowAtTop(false);
    }
  }, [isLoadingOlder, messages.length, loadOlderMessages]);

  useEffect(() => {
    const container = scrollRef.current;
    const wasNearBottom = !container || isNearBottomRef.current;
    const hasNewMessages = messages.length > previousMessageCount.current;

    if (hasNewMessages && !wasNearBottom) {
      setShowNewMessagesDivider(true);
    } else if (wasNearBottom) {
      setShowNewMessagesDivider(false);
      previousMessageCount.current = messages.length;
      scrollToBottom(false);
    } else {
      previousMessageCount.current = messages.length;
      setShowNewMessagesDivider(true);
    }

    if (messages.length === 0) {
      previousMessageCount.current = 0;
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    previousMessageCount.current = messages.length;
    if (messages.length > 0 && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom(false);
        isNearBottomRef.current = true;
        setShowNewMessagesDivider(false);
        setShowScrollToBottom(false);
      });
    }
  }, []);

  const isOwnMessage = useCallback(
    (message) => {
      const senderId = typeof message.sender === "string" ? message.sender : message.sender?._id;
      return senderId === user?._id;
    },
    [user?._id]
  );

  return (
    <Box
      ref={scrollRef}
      flex="1"
      minH="0"
      overflowY="auto"
      p={{ base: 2, md: 3 }}
      className="messages-container"
      onScroll={handleScroll}
    >
      {loading ? (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Spinner size="xl" />
          <Text color="gray.500">Loading messages</Text>
        </Box>
      ) : messages.length === 0 ? (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <VStack spacing={2} align="center">
            <Text color="gray.500">No messages yet</Text>
            <Text fontSize="sm" color="gray.400">
              Send a message to start the conversation
            </Text>
          </VStack>
        </Box>
      ) : (
        <Box sx={{ position: "relative", width: "100%" }}>
          {showScrollToBottom && (
            <Button
              onClick={() => scrollToBottom(true)}
              className="scroll-to-bottom enter"
              aria-label="Scroll to bottom"
            >
              ↓
            </Button>
          )}

          <VStack spacing={2} align="stretch" className="messages-list">
            {showAtTop && isLoadingOlder && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 3,
                  gap: 2,
                }}
              >
                <Spinner size="sm" colorScheme="teal" />
                <Text fontSize="sm" color="gray.500">
                  Loading older messages...
                </Text>
              </Box>
            )}

            {renderedNodes.map((node) => {
              if (node.kind === "separator") {
                return <DateSeparator key={node.key} label={node.label} date={node.date} />;
              }

              const message = node.message;
              const isLastNode =
                renderedNodes.length > 0 &&
                renderedNodes[renderedNodes.length - 1].kind === "message" &&
                renderedNodes[renderedNodes.length - 1].key === node.key;

              return (
                <Box key={node.key}>
                  {showNewMessagesDivider && isLastNode && node.isOwn === false && (
                    <Box
                      className="new-messages-divider"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        my: 3,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setShowNewMessagesDivider(false);
                        isNearBottomRef.current = true;
                        scrollToBottom(true);
                      }}
                      role="button"
                    >
                      <Text
                        sx={{
                          background: "rgba(11,128,67,0.12)",
                          color: "#065f46",
                          padding: "2px 14px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        ↓ New messages
                      </Text>
                    </Box>
                  )}
                  <EnhancedMessageBubble
                    message={message}
                    isOwn={node.isOwn}
                    isGroup={roomType === "group"}
                  />
                </Box>
              );
            })}

            {showAtTop && !isLoadingOlder && messages.length >= MESSAGES_PER_PAGE && (
              <Box
                sx={{
                  textAlign: "center",
                  padding: 2,
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                Scroll up for older messages
              </Box>
            )}
          </VStack>
        </Box>
      )}

      {renderEmojiPreview()}
    </Box>
  );
};

export default MessagesContainerAdvanced;
