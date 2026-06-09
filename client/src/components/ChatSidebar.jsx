import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Icon,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import {
  ChatIcon,
  SearchIcon,
  SettingsIcon,
  CloseIcon,
  ChevronLeftIcon,
} from "@chakra-ui/icons";
import { useChatNavigation } from "../Context/ChatNavigationContext.jsx";
import { useState, useRef, useCallback } from "react";
import ChatList from "./ChatList/ChatList.jsx";
import BrowseRoomsSection from "./ChatList/BrowseRoomsSection.jsx";
import RandomChatSection from "./RandomChatSection.jsx";
import ChatListItem from "./ChatList/ChatListItem.jsx";

const SWIPE_THRESHOLD = 60;
const PULL_THRESHOLD = 70;

const ChatSidebar = ({ isMobile, isTablet }) => {
  const { user, leaveRoom, fetchActiveRooms } = ChatState();
  const { activeSection, setActiveSection, isTabletSidebarOpen, setIsTabletSidebarOpen } =
    useChatNavigation();
  const { setSelectedChat } = ChatState();
  const toast = useToast();

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [swipeDeleteId, setSwipeDeleteId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [animatingSlide, setAnimatingSlide] = useState(false);

  const scrollRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isSwipingHorizontal = useRef(false);

  const isChatView = activeSection === "chatView";

  const handleSectionChange = useCallback(
    (section) => {
      setActiveSection(section);
      if (isMobile) {
        setAnimatingSlide(true);
        setTimeout(() => setAnimatingSlide(false), 300);
      }
    },
    [setActiveSection, isMobile]
  );

  const handleChatSelect = useCallback(
    (chat) => {
      setSelectedChat(chat);
      if (isMobile) {
        setAnimatingSlide(true);
        setTimeout(() => setAnimatingSlide(false), 300);
        setActiveSection("chatView");
      }
    },
    [setSelectedChat, setActiveSection, isMobile]
  );

  // Tablet hamburger toggle
  const toggleTabletSidebar = useCallback(() => {
    setIsTabletSidebarOpen((prev) => !prev);
  }, [setIsTabletSidebarOpen]);

  // Pull-to-refresh
  const handleScrollTouchStart = useCallback((e) => {
    const el = scrollRef.current;
    if (el && el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleScrollTouchMove = useCallback(
    (e) => {
      const el = scrollRef.current;
      if (!el || isRefreshing) return;
      if (el.scrollTop > 5) {
        setPullDistance(0);
        return;
      }
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0 && el.scrollTop <= 0) {
        const resisted = Math.min(dy * 0.4, PULL_THRESHOLD);
        setPullDistance(resisted);
      } else {
        setPullDistance(0);
      }
    },
    [isRefreshing]
  );

  const handleScrollTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await fetchActiveRooms();
        toast({
          title: "Chat list refreshed",
          status: "success",
          duration: 1500,
          isClosable: true,
        });
      } catch {
        toast({
          title: "Refresh failed",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, fetchActiveRooms, toast]);

  // Swipe-to-delete handlers on list items
  const handleItemTouchStart = useCallback((e, chatId) => {
    if (!isMobile) return;
    touchStartX.current = e.touches[0].clientX;
    isSwipingHorizontal.current = false;
    setSwipeDeleteId(chatId);
    setSwipeOffset(0);
  }, [isMobile]);

  const handleItemTouchMove = useCallback(
    (e, chatId) => {
      if (swipeDeleteId !== chatId || !isMobile) return;
      const dx = e.touches[0].clientX - touchStartX.current;
      if (!isSwipingHorizontal.current && Math.abs(dx) > 6) {
        isSwipingHorizontal.current = true;
      }
      if (isSwipingHorizontal.current) {
        const offset = Math.min(0, Math.max(-120, dx));
        setSwipeOffset(offset);
      }
    },
    [swipeDeleteId, isMobile]
  );

  const handleItemTouchEnd = useCallback(
    (e, chatId) => {
      if (swipeDeleteId !== chatId) return;
      if (swipeOffset < -60) {
        setSwipeOffset(-120);
      } else {
        setSwipeOffset(0);
        setTimeout(() => setSwipeDeleteId(null), 300);
      }
      isSwipingHorizontal.current = false;
    },
    [swipeDeleteId, swipeOffset]
  );

  const confirmDelete = useCallback(
    async (chatId, chatName) => {
      try {
        await leaveRoom(chatId);
        if (selectedChat && selectedChat._id === chatId) {
          setSelectedChat(null);
          setActiveSection("myChats");
        }
        toast({
          title: "Chat removed",
          description: `"${chatName || "Chat"}" has been removed`,
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch {
        toast({
          title: "Failed to remove chat",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      } finally {
        setSwipeDeleteId(null);
        setSwipeOffset(0);
      }
    },
    [leaveRoom, selectedChat, setSelectedChat, setActiveSection, toast]
  );

  // Wrapped ChatListItem with swipe support
  const SwipeableChatListItem = useCallback(
    ({ chat, onChatSelect: onChatSelectProp }) => {
      const isActive = selectedChat && selectedChat._id === chat._id;
      const isItemSwiped = swipeDeleteId === chat._id;
      const itemOffset = isItemSwiped ? swipeOffset : 0;

      const handleItemClick = () => {
        if (Math.abs(itemOffset) < 10) {
          if (onChatSelectProp) {
            onChatSelectProp(chat);
          } else {
            handleChatSelect(chat);
          }
        }
      };

      return (
        <Box
          position="relative"
          overflow="hidden"
          onTouchStart={(e) => handleItemTouchStart(e, chat._id)}
          onTouchMove={(e) => handleItemTouchMove(e, chat._id)}
          onTouchEnd={(e) => handleItemTouchEnd(e, chat._id)}
          style={{ touchAction: "pan-y" }}
        >
          {/* Swipe delete action background */}
          {isItemSwiped && (
            <Box
              position="absolute"
              top={0}
              right={0}
              h="100%"
              w="120px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="red.500"
              color="white"
              fontSize="13px"
              fontWeight="600"
              zIndex={0}
              cursor="pointer"
              onClick={() => confirmDelete(chat._id, chat.chatName)}
            >
              Delete
            </Box>
          )}
          {/* Chat item content */}
          <Box
            transform={`translateX(${itemOffset}px)`}
            transition={
              isItemSwiped && Math.abs(itemOffset) > 4
                ? "none"
                : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }
            zIndex={1}
            position="relative"
            bg="white"
          >
            <ChatListItem
              chat={chat}
              isActive={isActive && !isItemSwiped}
              onClick={handleItemClick}
            />
          </Box>
        </Box>
      );
    },
    [
      selectedChat,
      swipeDeleteId,
      swipeOffset,
      handleItemTouchStart,
      handleItemTouchMove,
      handleItemTouchEnd,
      handleChatSelect,
      confirmDelete,
    ]
  );

  // Determine sidebar panel classes for CSS transitions
  const sidebarPanelClass = isMobile
    ? isChatView
      ? "chat-sidebar-panel hidden-mobile"
      : "chat-sidebar-panel visible-mobile"
    : "chat-sidebar-panel";

  // Bottom tab bar (mobile only, shown when NOT in chat view)
  const BottomTabBar = () => (
    <Box
      className="mobile-bottom-tab-bar"
      display={{ base: "flex", md: "none" }}
      role="tablist"
      aria-label="Chat navigation tabs"
    >
      {[
        { id: "myChats", label: "My Chats", icon: "💬" },
        { id: "browseRooms", label: "Browse", icon: "🔍" },
        { id: "randomChat", label: "Random", icon: "🎲" },
      ].map((tab) => (
        <button
          key={tab.id}
          className={`mobile-tab-item ${activeSection === tab.id ? "active" : ""}`}
          onClick={() => handleSectionChange(tab.id)}
          role="tab"
          aria-selected={activeSection === tab.id}
          type="button"
        >
          <span className="mobile-tab-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </Box>
  );

  return (
    <>
      {/* Tablet backdrop */}
      {isTablet && isTabletSidebarOpen && (
        <Box
          className={`tablet-sidebar-backdrop ${isTabletSidebarOpen ? "visible" : ""}`}
          display={{ base: "none", md: "block" }}
          onClick={toggleTabletSidebar}
          aria-hidden="true"
        />
      )}

      <Box
        className={sidebarPanelClass}
        w={{ base: "100%", md: "40%", lg: "32%" }}
        maxW={{ base: "100%", md: "380px", lg: "420px" }}
        h="100vh"
        bg="white"
        borderRight="1px solid"
        borderColor="gray.200"
        display="flex"
        flexDirection="column"
        sx={{
          ...(isTablet && {
            position: "relative",
            zIndex: 5,
            width: isTabletSidebarOpen ? "40%" : "0",
            maxWidth: isTabletSidebarOpen ? "380px" : "0",
            overflow: "hidden",
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            borderRight: isTabletSidebarOpen ? "1px solid #e5e7eb" : "none",
            flexShrink: 0,
          }),
        }}
      >
        {/* Tablet: hamburger header */}
        {isTablet && (
          <Box px={3} py={2} borderBottom="1px solid" borderColor="gray.100" bg="white" flexShrink={0}>
            <HStack justify="space-between" align="center">
              <HStack spacing={2} align="center">
                <Icon as={ChatIcon} color="blue.500" fontSize="lg" />
                <Text fontSize="lg" fontFamily="Work sans" fontWeight="bold">
                  {isChatView ? "Chats" : "Talk-A-Tive"}
                </Text>
              </HStack>
              <HStack spacing={1}>
                {!isTabletSidebarOpen && (
                  <IconButton
                    aria-label="Open sidebar"
                    icon={<ChevronLeftIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={toggleTabletSidebar}
                    minH="36px"
                    minW="36px"
                  />
                )}
                {isTabletSidebarOpen && (
                  <IconButton
                    aria-label="Close sidebar"
                    icon={<CloseIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={toggleTabletSidebar}
                    minH="36px"
                    minW="36px"
                  />
                )}
              </HStack>
            </HStack>
          </Box>
        )}

        {/* Mobile header */}
        {isMobile && !isChatView && (
          <Box px={4} py={3} borderBottom="1px solid" borderColor="gray.200" bg="white" flexShrink={0}>
            <HStack justify="space-between" align="center">
              <HStack spacing={2} align="center">
                <Icon as={ChatIcon} color="blue.500" fontSize="xl" />
                <Text fontSize="xl" fontFamily="Work sans" fontWeight="bold">
                  Talk-A-Tive
                </Text>
              </HStack>
              {user?.anonymousName && (
                <Badge colorScheme="purple" fontSize="xs" px={2} py={0.5}>
                  {user.anonymousName}
                </Badge>
              )}
            </HStack>
          </Box>
        )}

        {/* Mobile: back button when in chat view */}
        {isMobile && isChatView && (
          <Box px={3} py={2} borderBottom="1px solid" borderColor="gray.200" bg="white" flexShrink={0}>
            <HStack spacing={2} align="center">
              <IconButton
                aria-label="Back to chat list"
                icon={<ChevronLeftIcon />}
                size="sm"
                variant="ghost"
                onClick={() => {
                  setActiveSection("myChats");
                  setAnimatingSlide(true);
                  setTimeout(() => setAnimatingSlide(false), 300);
                }}
                minH="40px"
                minW="40px"
              />
              <Text fontSize="md" fontWeight="bold">
                Back to Chats
              </Text>
            </HStack>
          </Box>
        )}

        {/* Section nav buttons - desktop and tablet only (mobile uses bottom tab bar) */}
        {!isMobile && (
          <VStack spacing={1} px={3} py={2} flexShrink={0}>
            <Button
              leftIcon={<Icon as={ChatIcon} />}
              variant={activeSection === "myChats" ? "solid" : "ghost"}
              colorScheme="blue"
              justifyContent="flex-start"
              w="100%"
              size={isTablet ? "sm" : "md"}
              onClick={() => handleSectionChange("myChats")}
              minH="44px"
            >
              My Chats
            </Button>
            <Button
              leftIcon={<Icon as={SearchIcon} />}
              variant={activeSection === "browseRooms" ? "solid" : "ghost"}
              colorScheme="blue"
              justifyContent="flex-start"
              w="100%"
              size={isTablet ? "sm" : "md"}
              onClick={() => handleSectionChange("browseRooms")}
              minH="44px"
            >
              Browse Rooms
            </Button>
            <Button
              leftIcon={<Icon as={SettingsIcon} />}
              variant={activeSection === "randomChat" ? "solid" : "ghost"}
              colorScheme="purple"
              justifyContent="flex-start"
              w="100%"
              size={isTablet ? "sm" : "md"}
              onClick={() => handleSectionChange("randomChat")}
              minH="44px"
            >
              Random Chat
            </Button>
          </VStack>
        )}

        {/* Scrollable content */}
        <Box
          ref={scrollRef}
          flex="1"
          overflowY="auto"
          px={{ base: 2, md: 3 }}
          py={2}
          className="chat-sidebar-scroll"
          onTouchStart={handleScrollTouchStart}
          onTouchMove={handleScrollTouchMove}
          onTouchEnd={handleScrollTouchEnd}
          sx={{
            paddingBottom: { base: "90px", md: "8px" },
            position: "relative",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Pull-to-refresh indicator (mobile) */}
          {isMobile && pullDistance > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: isRefreshing ? "14px" : `${Math.max(-40, pullDistance - 50)}px`,
                left: "50%",
                transform: "translateX(-50%)",
                transition: "top 0.15s ease",
                zIndex: 5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                color: "#667085",
                pointerEvents: "none",
              }}
            >
              <Text fontSize="md">{isRefreshing ? "⟳" : "↓"}</Text>
              <Text fontSize="xs">{isRefreshing ? "Refreshing..." : "Pull to refresh"}</Text>
            </Box>
          )}

          {/* Chat list section */}
          {activeSection === "myChats" && (
            <Box>
              {isMobile && !isChatView && (
                <Box px={2} py={1} mb={1}>
                  <Text
                    fontSize="xs"
                    color="gray.400"
                    fontWeight="700"
                    textTransform="uppercase"
                    letterSpacing="0.05em"
                  >
                    My Chats
                  </Text>
                </Box>
              )}
              <ChatList
                onChatSelect={handleChatSelect}
                renderItem={isMobile ? SwipeableChatListItem : undefined}
              />
            </Box>
          )}
          {activeSection === "browseRooms" && <BrowseRoomsSection />}
          {activeSection === "randomChat" && <RandomChatSection />}
        </Box>

        {/* Footer - desktop and tablet only */}
        {!isMobile && (
          <Box p={3} borderTop="1px solid" borderColor="gray.200" flexShrink={0}>
            <Button
              leftIcon={<Icon as={SettingsIcon} />}
              variant="ghost"
              justifyContent="flex-start"
              w="100%"
              mb={2}
              size={isTablet ? "sm" : "md"}
              minH="44px"
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              colorScheme="red"
              justifyContent="flex-start"
              w="100%"
              size={isTablet ? "sm" : "md"}
              onClick={() => {
                localStorage.removeItem("userInfo");
                window.location.href = "/";
              }}
              minH="44px"
            >
              Logout
            </Button>
          </Box>
        )}
      </Box>

      {/* Mobile bottom tab bar (only when not in chat view) */}
      {isMobile && !isChatView && <BottomTabBar />}
    </>
  );
};

export default ChatSidebar;
