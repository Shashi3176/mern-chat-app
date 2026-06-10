import {
  Box,
  HStack,
  Text,
  IconButton,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider.jsx";
import { ChevronDownIcon, MoonIcon, DeleteIcon, SunIcon } from "@chakra-ui/icons";

const UserHeader = ({ onToggleSidebar, isMobile, isTablet }) => {
  const { user, theme, toggleTheme } = ChatState();

  const displayName = user?.anonymousName?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    try {
      localStorage.removeItem("userInfo");
    } catch {}
    window.location.href = "/";
  };

  return (
    <Box px={4} py={3} borderBottom="1px solid" borderColor="gray.200" bg="white" className="user-header">
      <HStack justify="space-between" align="center">
        <HStack spacing={3} align="center" minW={0} flex={1}>
          <Box position="relative" flexShrink={0}>
            <Box
              w={10}
              h={10}
              borderRadius="full"
              bg="blue.500"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              fontWeight="bold"
              fontSize="md"
              className="user-avatar"
            >
              {initials}
            </Box>
          </Box>

          <Box minW={0} flex={1}>
            <Text fontWeight="bold" fontSize="sm" noOfLines={1} className="user-name">
              {displayName}
            </Text>
          </Box>
        </HStack>

        <HStack spacing={1} flexShrink={0}>
          {(isTablet || isMobile) && (
            <IconButton
              aria-label="Toggle sidebar"
              icon={<ChevronDownIcon />}
              size="sm"
              variant="ghost"
              onClick={onToggleSidebar}
              minH="36px"
              minW="36px"
              className="header-icon-btn"
            />
          )}

          <IconButton
            aria-label="Logout"
            icon={<DeleteIcon />}
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            minH="36px"
            minW="36px"
            className="header-icon-btn"
          />
        </HStack>
      </HStack>
    </Box>
  );
};

export default UserHeader;