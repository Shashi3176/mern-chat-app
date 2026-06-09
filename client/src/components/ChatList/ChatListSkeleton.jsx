import { Box, VStack, HStack, Skeleton, SkeletonCircle } from "@chakra-ui/react";

const ChatListSkeleton = ({ count = 5 }) => {
  return (
    <Box className="chat-list-skeleton" w="100%">
      {Array.from({ length: count }).map((_, i) => (
        <HStack key={i} spacing={3} p={3} align="center" className="skeleton-item">
          <SkeletonCircle size="12" flexShrink={0} className="skeleton-avatar" />
          <VStack align="stretch" spacing={2} flex={1} minW={0}>
            <HStack justify="space-between">
              <Skeleton height="14px" width="40%" borderRadius="full" className="skeleton-line" />
              <Skeleton height="10px" width="15%" borderRadius="full" className="skeleton-line-small" />
            </HStack>
            <HStack justify="space-between">
              <Skeleton height="12px" width="65%" borderRadius="full" className="skeleton-line" />
              <Skeleton height="16px" width="24px" borderRadius="full" className="skeleton-badge" />
            </HStack>
          </VStack>
        </HStack>
      ))}
    </Box>
  );
};

const ChatItemSkeleton = () => (
  <HStack spacing={3} p={3} align="center">
    <SkeletonCircle size="12" flexShrink={0} />
    <VStack align="stretch" spacing={2} flex={1} minW={0}>
      <Skeleton height="14px" width="45%" borderRadius="full" />
      <Skeleton height="12px" width="70%" borderRadius="full" />
    </VStack>
  </HStack>
);

const RoomListSkeleton = ({ count = 4 }) => (
  <Box className="room-list-skeleton" w="100%">
    {Array.from({ length: count }).map((_, i) => (
      <HStack key={i} spacing={3} p={3} align="center">
        <SkeletonCircle size="10" flexShrink={0} />
        <VStack align="stretch" spacing={2} flex={1} minW={0}>
          <Skeleton height="13px" width="50%" borderRadius="full" />
          <Skeleton height="11px" width="35%" borderRadius="full" />
        </VStack>
        <Skeleton height="28px" width="72px" borderRadius="full" />
      </HStack>
    ))}
  </Box>
);

export { ChatListSkeleton, ChatItemSkeleton, RoomListSkeleton };
export default ChatListSkeleton;
