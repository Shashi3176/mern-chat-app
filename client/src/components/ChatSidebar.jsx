import {
  Box,
  VStack,
  HStack,
  Text,
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
import UserHeader from "./ChatList/UserHeader.jsx";
import TabNavigation from "./ChatList/TabNavigation.jsx";

const PULL_THRESHOLD = 70;

const ChatSidebar = ({ isMobile, isTablet }) => {
  const { leaveRoom, fetchActiveRooms, setSettingsOpen } = ChatState();
  const { activeSection, setActiveSection, isTabletSidebarOpen, setIsTabletSidebarOpen } =
    useChatNavigation();
  const { setSelectedChat } = ChatState();
  const toast = useToast();

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [animatingSlide, setAnimatingSlide] = useState(false);

  const scrollRef = useRef(null);
  const touchStartY = useRef(0);

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

  const toggleTabletSidebar = useCallback(() => {
    setIsTabletSidebarOpen((prev) => !prev);
  }, [setIsTabletSidebarOpen]);

  const handleUserHeaderToggle = useCallback(() => {
    toggleTabletSidebar();
  }, [toggleTabletSidebar]);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen?.(true);
  }, [setSettingsOpen]);

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
        {/* UserHeader with dropdown - all sizes */}
        <UserHeader
          onToggleSidebar={handleUserHeaderToggle}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        {/* Tab Navigation - desktop and tablet only */}
        {!isMobile && (
          <TabNavigation isMobile={isMobile} isTablet={isTablet} />
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

        {/* Scrollable content */}
        <Box
          ref={scrollRef}
          flex="1"
          overflowY="auto"
          px={{ base: 1, md: 2 }}
          py={1}
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
                <Box px={2} py={1} mb={0.5}>
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
                renderItem={isMobile ? undefined : undefined}
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
              onClick={handleOpenSettings}
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
