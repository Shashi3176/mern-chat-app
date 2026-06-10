import {
  Box,
  HStack,
  Text,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useToast,
  Tooltip,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { ChatState } from "../../Context/ChatProvider.jsx";
import {
  ChevronDownIcon,
  SettingsIcon,
  DeleteIcon,
  TimeIcon,
  InfoIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";

const STATUS_COLORS = {
  online: "#25d366",
  away: "#f59e0b",
  busy: "#ef4444",
  offline: "#9ca3af",
};

const UserHeader = ({ onToggleSidebar, isMobile, isTablet }) => {
  const { user, setSettingsOpen } = ChatState();
  const toast = useToast();
  const [status, setStatus] = useState("online");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [localPasswordForm, setLocalPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });

  const displayName = user?.anonymousName?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.online;

  const handleStatusChange = (next) => {
    setStatus(next);
    const { setUserStatusWithSocket } = ChatState();
    try {
      setUserStatusWithSocket?.(next);
    } catch {}
      toast({
        title: `Status updated`,
        description: `You are now ${next}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
  };

  const handleOpenSettings = () => {
    setSettingsOpen?.(true);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new) {
      toast({ title: "Please fill in all fields", status: "warning", duration: 5000 });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: "New passwords do not match", status: "error", duration: 5000 });
      return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: "Password must be at least 6 characters", status: "warning", duration: 5000 });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { changePassword } = ChatState();
      const result = await changePassword(localPasswordForm.current, localPasswordForm.new);
      if (result?.success) {
        toast({ title: result?.message || "Password changed successfully", status: "success", duration: 5000 });
        setLocalPasswordForm({ current: "", new: "", confirm: "" });
      } else {
        toast({ title: result?.message || "Failed to change password", status: "error", duration: 5000 });
      }
    } catch {
      toast({ title: "Failed to change password", status: "error", duration: 5000 });
    } finally {
      setIsChangingPassword(false);
    }
  };

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
            <Box
              position="absolute"
              bottom={0}
              right={0}
              w={3.5}
              h={3.5}
              borderRadius="full"
              bg={statusColor}
              border="2px solid white"
              className="status-dot"
            />
          </Box>

          <Box minW={0} flex={1}>
            <Text fontWeight="bold" fontSize="sm" noOfLines={1} className="user-name">
              {displayName}
            </Text>
            <HStack spacing={1} align="center">
              <Box w={2} h={2} borderRadius="full" bg={statusColor} className="status-indicator" />
              <Text fontSize="xs" color="gray.500" className="user-status-text">
                {status === "online"
                  ? "Online"
                  : status === "away"
                  ? "Away"
                  : status === "busy"
                  ? "Busy"
                  : "Offline"}
              </Text>
            </HStack>
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

          <Menu placement="bottom-end">
            <MenuButton
              as={IconButton}
              aria-label="User menu"
              icon={<SettingsIcon />}
              size="sm"
              variant="ghost"
              minH="36px"
              minW="36px"
              className="header-icon-btn"
            />
            <MenuList className="user-menu-dropdown" zIndex={50}>
              <Box px={3} py={2} borderBottom="1px solid" borderColor="gray.100">
                <Text
                  fontSize="xs"
                  color="gray.500"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Set Status
                </Text>
                <HStack spacing={1} mt={1.5}>
                  {["online", "away", "busy", "offline"].map((s) => (
                    <Tooltip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} placement="top">
                      <Box
                        as="button"
                        w={7}
                        h={7}
                        borderRadius="full"
                        bg={STATUS_COLORS[s]}
                        border={status === s ? "2px solid" : "2px solid transparent"}
                        borderColor={status === s ? "gray.600" : "transparent"}
                        onClick={() => handleStatusChange(s)}
                        className="status-option-btn"
                        type="button"
                        aria-label={`Set status ${s}`}
                      />
                    </Tooltip>
                  ))}
                </HStack>
              </Box>

              {isChangingPassword ? (
                <Box px={3} py={3} className="password-form-container">
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2}>
                    Change Password
                  </Text>
                  <Box className="password-inputs">
                    <input
                      type="password"
                      placeholder="Current password"
                      value={localPasswordForm.current}
                      onChange={(e) => setLocalPasswordForm((p) => ({ ...p, current: e.target.value }))}
                      className="password-input"
                      aria-label="Current password"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      value={localPasswordForm.new}
                      onChange={(e) => setLocalPasswordForm((p) => ({ ...p, new: e.target.value }))}
                      className="password-input"
                      aria-label="New password"
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={localPasswordForm.confirm}
                      onChange={(e) => setLocalPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                      className="password-input"
                      aria-label="Confirm new password"
                    />
                  </Box>
                  <HStack spacing={2} mt={2}>
                    <Button
                      size="xs"
                      colorScheme="blue"
                      onClick={handleChangePassword}
                      isLoading={isChangingPassword}
                      flex={1}
                    >
                      Save
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setIsChangingPassword(false)} flex={1}>
                      Cancel
                    </Button>
                  </HStack>
                </Box>
              ) : (
                <MenuItem icon={<TimeIcon />} onClick={() => setIsChangingPassword(true)} className="menu-item-change-password">
                  Change Password
                </MenuItem>
              )}

              <MenuItem icon={<SettingsIcon />} onClick={handleOpenSettings} className="menu-item" aria-label="Open settings">
                Settings
              </MenuItem>
              <MenuItem icon={<InfoIcon />} className="menu-item">
                Account Info
              </MenuItem>
              <MenuItem icon={<ExternalLinkIcon />} className="menu-item">
                Help & Support
              </MenuItem>
              <Box borderTop="1px solid" borderColor="gray.100" mt={1}>
                <MenuItem
                  icon={<DeleteIcon />}
                  color="red.500"
                  onClick={handleLogout}
                  className="menu-item-logout"
                >
                  Logout
                </MenuItem>
              </Box>
            </MenuList>
          </Menu>
        </HStack>
      </HStack>
    </Box>
  );
};

export default UserHeader;
