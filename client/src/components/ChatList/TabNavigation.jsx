import { HStack, Text, Badge, VStack, Button, Box, useColorModeValue } from "@chakra-ui/react";
import { ChatIcon, SearchIcon, TimeIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider.jsx";
import { useChatNavigation } from "../../Context/ChatNavigationContext.jsx";
import { useMemo } from "react";

const TabNavigation = ({ isMobile, isTablet }) => {
  const { activeSection, setActiveSection } = useChatNavigation();
  const { myRooms } = ChatState();

  const totalUnread = useMemo(() => {
    return myRooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
  }, [myRooms]);

  const tabs = [
    {
      id: "myChats",
      label: "My Chats",
      icon: ChatIcon,
      badge: totalUnread > 0 ? totalUnread : null,
    },
    {
      id: "browseRooms",
      label: "Browse",
      icon: SearchIcon,
      badge: null,
    },
    {
      id: "randomChat",
      label: "Random",
      icon: TimeIcon,
      badge: null,
    },
  ];

  const handleTabClick = (id) => {
    setActiveSection(id);
  };

  if (isMobile) return null;

  return (
    <Box className="tab-navigation" px={3} py={2} borderBottom="1px solid" borderColor="gray.200" bg="white">
      <HStack spacing={1} align="stretch">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id;
          const IconComponent = tab.icon;
          return (
            <Button
              key={tab.id}
              size="sm"
              variant="ghost"
              justifyContent="flex-start"
              onClick={() => handleTabClick(tab.id)}
              className={`tab-button ${isActive ? "tab-button-active" : ""}`}
              position="relative"
              minH="40px"
              px={3}
              w="100%"
              _hover={{ bg: isActive ? "blue.50" : "gray.50" }}
              _active={{ bg: isActive ? "blue.50" : "gray.100" }}
            >
              <HStack spacing={2} align="center">
                <IconComponent
                  fontSize="md"
                  color={isActive ? "blue.600" : "gray.500"}
                  className="tab-icon"
                />
                <Text
                  fontSize="sm"
                  fontWeight={isActive ? "600" : "500"}
                  color={isActive ? "blue.700" : "gray.600"}
                  className="tab-label"
                >
                  {tab.label}
                </Text>
                {tab.badge && (
                  <Badge
                    colorScheme="red"
                    borderRadius="full"
                    fontSize="10px"
                    minWidth="18px"
                    textAlign="center"
                    className="tab-badge"
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </Badge>
                )}
              </HStack>
              {/* Active indicator underline */}
              {isActive && <Box className="tab-active-indicator" />}
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
};

export default TabNavigation;
