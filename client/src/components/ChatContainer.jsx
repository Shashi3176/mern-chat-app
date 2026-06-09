import { Box, useBreakpointValue } from "@chakra-ui/react";
import ChatSidebar from "./ChatSidebar.jsx";
import ChatMain from "./ChatMain.jsx";
import { ChatNavigationProvider } from "../Context/ChatNavigationContext.jsx";
import ChatProvider from "../Context/ChatProvider.jsx";
import { NotificationCenter } from "./NotificationCenter.jsx";
import ErrorBoundary from "../utils/ErrorBoundary.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import useKeyBinding from "../utils/useKeyBinding.js";
import { ChatState } from "../Context/ChatProvider.jsx";
import "./ChatLayout.css";

const ChatContainer = () => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false });
  const { settingsOpen, setSettingsOpen, isOffline } = ChatState();

  useKeyBinding("ctrl+k,command+k", () => {
    const searchInput = document.querySelector('[aria-label*="Search" i], .search-input, input[type="search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select?.();
    }
  });

  useKeyBinding("escape", (event) => {
    const active = document.activeElement;
    if (active && active.id) {
      active.blur();
    }
  });

  return (
    <ErrorBoundary>
      <ChatProvider>
        <ChatNavigationProvider>
          {isOffline && (
            <Box className="offline-banner" role="status" aria-live="polite">
              <span>You're offline — attempting to reconnect...</span>
            </Box>
          )}
          <Box display="flex" h="100vh" maxH="100vh" overflow="hidden">
            <ChatSidebar isMobile={isMobile} isTablet={isTablet} />
            <ChatMain isMobile={isMobile} isTablet={isTablet} />
          </Box>
          <NotificationCenter />
          <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </ChatNavigationProvider>
      </ChatProvider>
    </ErrorBoundary>
  );
};

export default ChatContainer;
