import {
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  HStack,
  Icon,
  useToast,
  Tooltip,
  Badge
} from "@chakra-ui/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { ChatState } from "../../Context/ChatProvider.jsx";
import { useChatNavigation } from "../../Context/ChatNavigationContext.jsx";
import {
  StarIcon,
  BellIcon,
  DeleteIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";

const LONG_PRESS_DURATION = 500;

const ChatContextMenu = ({ chat, children, onChatSelect }) => {
  const { leaveRoom, mutedChats, toggleMuteChat, pinnedChats, togglePinChat, selectedChat, setSelectedChat } = ChatState();
  const { setActiveSection } = useChatNavigation();
  const toast = useToast();
  const longPressTimer = useRef(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const isSelected = selectedChat?._id === chat._id;
  const isPinned = pinnedChats.includes(chat._id);
  const isMuted = mutedChats.includes(chat._id);
  const unreadCount = chat.unreadCount || 0;

  const handleLeave = useCallback(async () => {
    try {
      await leaveRoom(chat._id);
      if (isSelected) {
        setSelectedChat(null);
        setActiveSection("myChats");
      }
      toast({
        title: "Chat left",
        description: `"${chat.chatName || "Chat"}" has been left`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch {
      toast({ title: "Failed to leave chat", status: "error", duration: 5000, isClosable: true });
    }
  }, [chat, leaveRoom, isSelected, setSelectedChat, setActiveSection, toast]);

  const handleTogglePin = useCallback(() => {
    togglePinChat(chat._id);
    toast({
      title: isPinned ? "Chat unpinned" : "Chat pinned",
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  }, [chat._id, isPinned, togglePinChat, toast]);

  const handleToggleMute = useCallback(() => {
    toggleMuteChat(chat._id);
    toast({
      title: isMuted ? "Notifications enabled" : "Notifications muted",
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  }, [chat._id, isMuted, toggleMuteChat, toast]);

  const handleOpenChat = useCallback(() => {
    onChatSelect?.(chat);
  }, [chat, onChatSelect]);

  // Long press handlers for mobile
  const handleTouchStart = useCallback(
    (e) => {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      longPressTimer.current = setTimeout(() => {
        setIsLongPress(true);
        // Trigger a small haptic-like feedback via a tiny animation
        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_DURATION);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e) => {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer.current);
      }
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (!isLongPress) {
      setIsLongPress(false);
    }
  }, [isLongPress]);

  useEffect(() => {
    return () => clearTimeout(longPressTimer.current);
  }, []);

  const menuContent = (
    <MenuList className="chat-context-menu" zIndex={60} minW="200px">
      <Text px={3} py={2} fontSize="xs" color="gray.500" fontWeight="700" textTransform="uppercase" letterSpacing="wide" className="context-menu-header">
        {chat.chatName || "Chat Options"}
      </Text>

      <MenuItem
        icon={<StarIcon />}
        onClick={handleTogglePin}
        className={`context-menu-item ${isPinned ? "context-menu-item-active" : ""}`}
      >
        <HStack justify="space-between" flex={1}>
          <Text fontSize="sm">{isPinned ? "Unpin Chat" : "Pin Chat"}</Text>
          {isPinned && <Box w={2} h={2} borderRadius="full" bg="blue.500" />}
        </HStack>
      </MenuItem>

      <MenuItem
        icon={isMuted ? <BellIcon color="gray.400" /> : <BellIcon color="blue.500" />}
        onClick={handleToggleMute}
        className={`context-menu-item ${isMuted ? "context-menu-item-active" : ""}`}
      >
        <HStack justify="space-between" flex={1}>
          <Text fontSize="sm">{isMuted ? "🔕 Unmute Notifications" : "🔔 Mute Notifications"}</Text>
          {isMuted && (
            <Badge colorScheme="gray" fontSize="10px" borderRadius="full" px={1.5} py={0.5}>
              MUTED
            </Badge>
          )}
        </HStack>
      </MenuItem>

      <MenuItem
        icon={<ExternalLinkIcon />}
        onClick={handleOpenChat}
        className="context-menu-item"
      >
        <HStack justify="space-between" flex={1}>
          <Text fontSize="sm">Open Chat</Text>
          {unreadCount > 0 && (
            <Badge colorScheme="red" borderRadius="full" fontSize="10px" px={1.5} py={0.5}>
              {unreadCount}
            </Badge>
          )}
        </HStack>
      </MenuItem>

      <Box borderTop="1px solid" borderColor="gray.100" my={1}>
        <MenuItem
          icon={<DeleteIcon />}
          color="red.500"
          onClick={handleLeave}
          className="context-menu-item-danger"
        >
          <HStack spacing={2}>
            <DeleteIcon />
            <Text fontSize="sm" fontWeight="500">Leave Room</Text>
          </HStack>
        </MenuItem>
      </Box>
    </MenuList>
  );

  return (
    <Menu placement="bottom-start" isLazy>
      <MenuButton
        as={Box}
        onClick={(e) => {
          if (isLongPress) {
            e.preventDefault();
            setIsLongPress(false);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        className="chat-context-menu-trigger"
        cursor="context-menu"
        role="button"
      >
        {children}
      </MenuButton>
      {menuContent}
    </Menu>
  );
};

export default ChatContextMenu;
