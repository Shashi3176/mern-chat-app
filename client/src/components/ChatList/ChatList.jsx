import { Box, Spinner, Text, Flex, HStack, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ChatState } from "../../Context/ChatProvider";
import { useChatItemHelpers } from "./useChatItemHelpers";
import ChatListItem from "./ChatListItem";
import SearchBar from "./SearchBar";
import { NoResults } from "./SearchBar";
import ChatListSkeleton from "./ChatListSkeleton";
import ChatContextMenu from "./ChatContextMenu";

const PAGE_SIZE = 20;

const ChatList = ({ onChatSelect, renderItem }) => {
  const { myRooms, loadingRooms, fetchActiveRooms, selectedChat, setSelectedChat, markRoomAsRead, mutedChats = [], pinnedChats = [] } = ChatState();
  const { formatTime, truncate } = useChatItemHelpers();

  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchActiveRooms();
  }, [fetchActiveRooms]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery]);

  const handleChatClick = useCallback(
    async (chat) => {
      setSelectedChat(chat);
      if (chat.unreadCount > 0) {
        await markRoomAsRead(chat._id);
      }
      if (onChatSelect) {
        onChatSelect(chat);
      }
    },
    [setSelectedChat, markRoomAsRead, onChatSelect]
  );

  // Filter rooms by search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return myRooms;
    const q = searchQuery.toLowerCase().trim();
    return myRooms.filter((room) => {
      const name = (room.chatName || "").toLowerCase();
      const lastMsg = (room.latestMessage?.content || room.latestMessage || "").toLowerCase();
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [myRooms, searchQuery]);

  // Sort: pinned first, then by most recent
  const sortedRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => {
      const aPinned = pinnedChats.includes(a._id);
      const bPinned = pinnedChats.includes(b._id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aTime = new Date(a.lastMessageTime || a.updatedAt || 0).getTime();
      const bTime = new Date(b.lastMessageTime || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [filteredRooms, pinnedChats]);

  const visibleRooms = sortedRooms.slice(0, visibleCount);
  const hasMore = visibleCount < sortedRooms.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchActiveRooms();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchActiveRooms]);

  const handleSearch = useCallback((val) => {
    setSearchQuery(val);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Loading state
  if (loadingRooms && myRooms.length === 0) {
    return (
      <Box className="chat-list-loading" w="100%">
        <SearchBar
          placeholder="Search chats..."
          onSearch={handleSearch}
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
        />
        <Box px={2} py={1}>
          <Text fontSize="xs" color="gray.400" fontWeight="600" textTransform="uppercase" letterSpacing="wide">
            My Chats
          </Text>
        </Box>
        <Box px={2}>
          <ChatListSkeleton count={6} />
        </Box>
      </Box>
    );
  }

  // Empty state (no chats at all)
  if (!loadingRooms && myRooms.length === 0) {
    return (
      <Box className="chat-list-empty" w="100%">
        <SearchBar
          placeholder="Search chats..."
          onSearch={handleSearch}
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
        />
        <Box flex="1" display="flex" flexDirection="column" alignItems="center" justifyContent="center" px={4} py={8}>
          <Box
            w={16}
            h={16}
            borderRadius="full"
            bg="gray.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={3}
            className="empty-state-icon-circle"
          >
            <Text fontSize="2xl">💬</Text>
          </Box>
          <Text fontSize="sm" fontWeight="600" color="gray.600" textAlign="center">
            No chats yet
          </Text>
          <Text fontSize="xs" color="gray.400" textAlign="center" mt={1}>
            Browse rooms or start a random chat to begin
          </Text>
        </Box>
      </Box>
    );
  }

  // Filtered empty state
  if (!loadingRooms && filteredRooms.length === 0 && searchQuery) {
    return (
      <Box className="chat-list-filtered-empty" w="100%">
        <SearchBar
          placeholder="Search chats..."
          onSearch={handleSearch}
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
        />
        <NoResults
          message={`No chats matching "${searchQuery}"`}
          subtext="Try a different search term"
        />
      </Box>
    );
  }

  return (
    <Box className="chat-list-enhanced" w="100%">
      {/* Search bar */}
      <SearchBar
        placeholder="Search chats..."
        onSearch={handleSearch}
        value={searchQuery}
        onChange={(val) => setSearchQuery(val)}
      />

      {/* Section header with count */}
      {!searchQuery && (
        <HStack px={3} py={1.5} justify="space-between" align="center">
          <Text fontSize="xs" color="gray.400" fontWeight="700" textTransform="uppercase" letterSpacing="wide">
            My Chats
          </Text>
          <Text fontSize="10px" color="gray.400" fontWeight="500">
            {myRooms.length} chat{myRooms.length !== 1 ? "s" : ""}
          </Text>
        </HStack>
      )}

      {/* Chat list */}
      <Box className="chat-list-rooms" role="list">
        {visibleRooms.map((chat, index) => {
          const isActive = selectedChat?._id === chat._id;
          const isTyping = false; // comes from ChatState typingUsers if needed

          if (renderItem) {
            return (
              <Box key={chat._id} role="listitem">
                {renderItem(chat, handleChatClick)}
              </Box>
            );
          }

          return (
            <ChatContextMenu key={chat._id} chat={chat} onChatSelect={handleChatClick}>
              <Box
                cursor="pointer"
                bg={isActive ? "blue.50" : "white"}
                borderLeft={isActive ? "4px solid" : "4px solid transparent"}
                borderColor={isActive ? "blue.500" : "transparent"}
                _hover={{ bg: isActive ? "blue.50" : "gray.50" }}
                transition="all 0.15s ease"
                onClick={() => handleChatClick(chat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleChatClick(chat)}
                minH="64px"
                className="chat-list-item-enhanced"
                sx={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <HStack spacing={3} align="flex-start" py={2.5} px={3}>
                  {/* Avatar */}
                  <Box position="relative" flexShrink={0}>
                    <Box
                      w={11}
                      h={11}
                      borderRadius="full"
                      bg={isActive ? "blue.500" : chat.isGroupChat ? "blue.400" : "gray.300"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="white"
                      fontSize="lg"
                      fontWeight="bold"
                      className="chat-avatar"
                    >
                      {(chat.chatName || "U").charAt(0).toUpperCase()}
                    </Box>
                    {/* Online indicator for direct chats */}
                    {!chat.isGroupChat && (
                      <Box
                        position="absolute"
                        bottom={0.5}
                        right={0.5}
                        w={3}
                        h={3}
                        borderRadius="full"
                        bg="green.400"
                        border="2px solid white"
                        className="online-indicator"
                      />
                    )}
                    {/* Muted indicator */}
                    {mutedChats.includes(chat._id) && (
                      <Box
                        position="absolute"
                        top={-1}
                        right={-1}
                        w={4}
                        h={4}
                        borderRadius="full"
                        bg="gray.500"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        className="muted-indicator"
                      >
                        <Text fontSize="8px" color="white">🔕</Text>
                      </Box>
                    )}
                  </Box>

                  {/* Content */}
                  <VStack align="stretch" spacing={1} flex={1} minW={0}>
                    <HStack justify="space-between" align="center" w="100%">
                      <HStack spacing={2} minW={0} flex={1}>
                        {/* Pin icon */}
                        {pinnedChats.includes(chat._id) && (
                          <Box flexShrink={0} className="pin-icon">
                            <Text fontSize="xs" color="blue.500">📌</Text>
                          </Box>
                        )}
                        <Text
                          fontSize="sm"
                          fontWeight={(chat.unreadCount || 0) > 0 ? "700" : "500"}
                          color={(chat.unreadCount || 0) > 0 ? "gray.900" : "gray.700"}
                          noOfLines={1}
                          className="chat-name"
                        >
                          {chat.chatName || "Random Chat"}
                        </Text>
                      </HStack>
                      <Text
                        fontSize="xs"
                        color="gray.500"
                        whiteSpace="nowrap"
                        ml={2}
                        flexShrink={0}
                        className="chat-time"
                      >
                        {formatTime(chat.lastMessageTime || chat.updatedAt)}
                      </Text>
                    </HStack>

                    <HStack justify="space-between" align="center" w="100%">
                      <Text
                        fontSize="xs"
                        color={isTyping ? "blue.500" : (chat.unreadCount || 0) > 0 ? "gray.700" : "gray.500"}
                        fontWeight={isTyping ? "600" : (chat.unreadCount || 0) > 0 ? "600" : "400"}
                        noOfLines={1}
                        flex={1}
                        lineHeight="tight"
                        fontStyle={isTyping ? "italic" : "normal"}
                        className="chat-preview"
                      >
                        {isTyping ? (
                          <Box className="typing-indicator-enhanced">
                            <HStack spacing={1}>
                              <Box w={1.5} h={1.5} borderRadius="full" bg="blue.400" className="typing-dot" />
                              <Box w={1.5} h={1.5} borderRadius="full" bg="blue.400" className="typing-dot" />
                              <Box w={1.5} h={1.5} borderRadius="full" bg="blue.400" className="typing-dot" />
                            </HStack>
                          </Box>
                        ) : (
                          truncate(chat.latestMessage?.content || chat.latestMessage || "", 40)
                        )}
                      </Text>
                      {(chat.unreadCount || 0) > 0 && (
                        <Badge
                          colorScheme="red"
                          borderRadius="full"
                          fontSize="10px"
                          minWidth="20px"
                          textAlign="center"
                          ml={2}
                          className="unread-badge"
                        >
                          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            </ChatContextMenu>
          );
        })}
      </Box>

      {/* Load more button */}
      {hasMore && (
        <Box px={4} py={3} textAlign="center" className="load-more-container">
          <Box
            as="button"
            onClick={handleLoadMore}
            className="load-more-btn"
            type="button"
          >
            <Text fontSize="xs" fontWeight="600" color="blue.500">
              Show more ({sortedRooms.length - visibleCount} remaining)
            </Text>
          </Box>
        </Box>
      )}

      {/* Refresh indicator */}
      {isRefreshing && (
        <Box textAlign="center" py={2} className="refresh-indicator">
          <Spinner size="xs" color="blue.500" />
          <Text fontSize="xs" color="blue.500" ml={2} display="inline">Updating...</Text>
        </Box>
      )}
    </Box>
  );
};

export default ChatList;
