import {
  Box,
  IconButton,
  Text,
  HStack,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import { useChatNavigation } from "../Context/ChatNavigationContext.jsx";
import { useState, useRef, useCallback, useEffect } from "react";
import SingleChat from "./SingleChat.jsx";
import EmptyState from "./EmptyState.jsx";
import { ArrowBackIcon, InfoIcon } from "@chakra-ui/icons";

const SWIPE_BACK_THRESHOLD = 80;

const ChatMain = ({ isMobile, isTablet }) => {
  const { selectedChat, setSelectedChat, fetchActiveRooms } = ChatState();
  const { activeSection, setActiveSection } = useChatNavigation();
  const toast = useToast();

  const [isSwipingBack, setIsSwipingBack] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const touchStartTime = useRef(0);

  const isChatView = activeSection === "chatView";
  const showBackButton = isMobile && (isChatView || activeSection !== "myChats");

  const handleBack = useCallback(() => {
    setSelectedChat(null);
    setActiveSection("myChats");
  }, [setSelectedChat, setActiveSection]);

  const handleBrowseRooms = useCallback(() => {
    setActiveSection("browseRooms");
    fetchActiveRooms();
  }, [setActiveSection, fetchActiveRooms]);

  const handleRandomChat = useCallback(() => {
    setActiveSection("randomChat");
  }, [setActiveSection]);

  // Swipe-to-go-back gesture (right edge swipe from left)
  const handleTouchStart = useCallback(
    (e) => {
      if (!isMobile || !isChatView) return;
      const x = e.touches[0].clientX;
      // Only trigger from left edge (first 25px of screen)
      if (x < window.innerWidth * 0.25) {
        touchStartX.current = x;
        touchCurrentX.current = x;
        touchStartTime.current = Date.now();
        setIsSwipingBack(true);
        setSwipeProgress(0);
      }
    },
    [isMobile, isChatView]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!isSwipingBack || !isChatView) return;
      const x = e.touches[0].clientX;
      touchCurrentX.current = x;
      const dx = x - touchStartX.current;
      // Only allow right swipe (positive dx)
      const progress = Math.max(0, Math.min(1, dx / window.innerWidth));
      setSwipeProgress(progress);
    },
    [isSwipingBack, isChatView]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isSwipingBack) return;
    const dx = touchCurrentX.current - touchStartX.current;
    const elapsed = Date.now() - touchStartTime.current;

    if (dx > SWIPE_BACK_THRESHOLD || (dx > 40 && elapsed < 300)) {
      handleBack();
    }

    setIsSwipingBack(false);
    setSwipeProgress(0);
  }, [isSwipingBack, handleBack]);

  useEffect(() => {
    if (isSwipingBack) {
      window.addEventListener("touchend", handleTouchEnd);
      return () => window.removeEventListener("touchend", handleTouchEnd);
    }
  }, [isSwipingBack, handleTouchEnd]);

  const mainPanelClass = isMobile
    ? isChatView
      ? "chat-main-panel visible-mobile"
      : "chat-main-panel hidden-mobile"
    : "chat-main-panel";

  return (
    <Box
      className={mainPanelClass}
      flex="1"
      h="100vh"
      bg="#f0f2f5"
      flexDirection="column"
      sx={{
        ...(isMobile && {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 10,
          transition: isSwipingBack
            ? "none"
            : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isChatView
            ? isSwipingBack
              ? `translateX(${swipeProgress * 100}%)`
              : "translateX(0)"
            : "translateX(100%)",
          willChange: isSwipingBack ? "transform" : "auto",
        }),
        ...(isTablet && {
          flex: "1",
          width: "60%",
          position: "relative",
          zIndex: 1,
        }),
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Swipe back visual indicator */}
      {isMobile && isSwipingBack && swipeProgress > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "16px",
            transform: `translateY(-50%) translateX(${-60 + swipeProgress * 60}px)`,
            opacity: Math.min(1, swipeProgress * 2),
            transition: "none",
            zIndex: 15,
            bg: "white",
            borderRadius: "full",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            p: 2,
            pointerEvents: "none",
          }}
        >
          <ArrowBackIcon />
        </Box>
      )}

      {/* Mobile: back button header */}
      {showBackButton && (
        <Box
          px={3}
          py={2}
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.200"
          flexShrink={0}
          zIndex={2}
        >
          <HStack spacing={2} align="center">
            <IconButton
              aria-label="Back to chat list"
              icon={<ArrowBackIcon />}
              size="sm"
              variant="ghost"
              onClick={handleBack}
              minH="44px"
              minW="44px"
            />
            <VStack align="start" spacing={0} minW={0} flex={1}>
              {selectedChat && (
                <>
                  <Text
                    fontWeight="bold"
                    fontSize={{ base: "14px", md: "md" }}
                    noOfLines={1}
                  >
                    {selectedChat.chatName ||
                      (selectedChat.roomType === "direct"
                        ? "Anonymous Partner"
                        : selectedChat.roomType === "group"
                        ? "Group Room"
                        : "Random Chat")}
                  </Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1}>
                    {selectedChat.roomType === "group"
                      ? `${selectedChat.participantCount || 0} participants`
                      : selectedChat.roomType === "direct"
                      ? selectedChat.roomName
                        ? "Direct room"
                        : "Random direct"
                      : "Anonymous room"}
                  </Text>
                </>
              )}
              {!selectedChat && (
                <Text fontSize="xs" color="gray.400">
                  {activeSection === "browseRooms"
                    ? "Browse Rooms"
                    : activeSection === "randomChat"
                    ? "Random Chat"
                    : "Select a chat"}
                </Text>
              )}
            </VStack>
            {isMobile && selectedChat && (
              <IconButton
                aria-label="Chat info"
                icon={<InfoIcon />}
                size="sm"
                variant="ghost"
                minH="40px"
                minW="40px"
              />
            )}
          </HStack>
        </Box>
      )}

      {/* Desktop / Tablet: inline back navigation hint */}
      {!isMobile && !selectedChat && (
        <Box px={6} pt={6} pb={2} flexShrink={0}>
          <EmptyState
            onBrowseRooms={handleBrowseRooms}
            onRandomChat={handleRandomChat}
          />
        </Box>
      )}

      {/* Main content */}
      <Box w="100%" h="100%" display="flex" flexDirection="column">
        {selectedChat ? <SingleChat /> : (isMobile || isTablet) && !selectedChat ? (
          <EmptyState
            onBrowseRooms={handleBrowseRooms}
            onRandomChat={handleRandomChat}
          />
        ) : null}
      </Box>
    </Box>
  );
};

export default ChatMain;
