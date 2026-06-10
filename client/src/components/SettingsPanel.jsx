import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Button,
  IconButton,
  Tooltip,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  FormLabel,
  Divider,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { CloseIcon, CheckIcon, RepeatIcon } from "@chakra-ui/icons";
import { ChatState } from "../Context/ChatProvider.jsx";
import {
  requestNotificationPermission,
  getNotificationSettings,
  saveNotificationSettings,
} from "../utils/notifications.js";

const SettingsPanel = ({ isOpen, onClose }) => {
  const { setUser } = ChatState();
  const toast = useToast();

  const [theme, setTheme] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem("talkative-theme") || "light" : "light";
  });
  const [desktopNotifications, setDesktopNotifications] = useState(() => {
    const s = getNotificationSettings();
    return s.desktopEnabled ?? true;
  });
  const [soundNotifications, setSoundNotifications] = useState(() => {
    const s = getNotificationSettings();
    return s.soundEnabled ?? true;
  });
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ current: "", new: "", confirm: "" });

  const applyTheme = useCallback(
    (next) => {
      setTheme(next);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", next);
        document.documentElement.classList.add("theme-transition");
        setTimeout(() => document.documentElement.classList.remove("theme-transition"), 200);
      }
      try {
        localStorage.setItem("talkative-theme", next);
      } catch {}
    },
    []
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    if (!isOpen) return;
    const s = getNotificationSettings();
    setDesktopNotifications(s.desktopEnabled ?? true);
    setSoundNotifications(s.soundEnabled ?? true);
  }, [isOpen]);

  const handleDesktopToggle = async () => {
    if (!desktopNotifications) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast({
          title: "Notifications blocked",
          description: "Please allow notifications in your browser settings to enable desktop notifications.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }
    const next = !desktopNotifications;
    setDesktopNotifications(next);
    saveNotificationSettings({ ...getNotificationSettings(), desktopEnabled: next });
      toast({
        title: next ? "Desktop notifications enabled" : "Desktop notifications disabled",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
  };

  const handleSoundToggle = () => {
    const next = !soundNotifications;
    setSoundNotifications(next);
    saveNotificationSettings({ ...getNotificationSettings(), soundEnabled: next });
  };

  const handleEmailChange = async () => {
    if (!emailForm.current || !emailForm.new) {
      toast({ title: "Please fill in all fields", status: "warning", duration: 5000 });
      return;
    }
    if (emailForm.new !== emailForm.confirm) {
      toast({ title: "Emails do not match", status: "error", duration: 5000 });
      return;
    }
    try {
      const currentUser = JSON.parse(localStorage.getItem("userInfo"));
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/auth/change-email`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ currentEmail: emailForm.current, newEmail: emailForm.new }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data?.message || "Failed to update email", status: "error", duration: 5000 });
        return;
      }
      const updatedUser = { ...currentUser, email: emailForm.new };
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast({ title: "Email updated successfully", status: "success", duration: 5000 });
      setIsChangingEmail(false);
      setEmailForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      toast({ title: "Something went wrong. Please retry.", status: "error", duration: 5000 });
    }
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent className="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">
        <ModalHeader display="flex" alignItems="center" justifyContent="space-between">
          <Text fontWeight="bold" fontSize="lg">
            Settings
          </Text>
          <IconButton
            aria-label="Close settings"
            size="sm"
            variant="ghost"
            onClick={onClose}
            icon={<CloseIcon />}
          />
        </ModalHeader>
        <Divider />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
                Appearance
              </Text>
              <HStack justify="space-between" align="center" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.200" bg="white">
                <Box>
                  <Text fontWeight="medium" fontSize="sm">Dark Mode</Text>
                  <Text fontSize="xs" color="gray.500">Use a darker color palette across the app.</Text>
                </Box>
                <HStack>
                  <Tooltip label="Light">
                    <IconButton
                      aria-label="Switch to light theme"
                      icon={<Box w="4" h="4" borderRadius="full" bg="white" borderWidth="1px" borderColor="gray.300" />}
                      size="sm"
                      variant={theme === "light" ? "solid" : "ghost"}
                      colorScheme="gray"
                      onClick={() => applyTheme("light")}
                    />
                  </Tooltip>
                  <Tooltip label="Dark">
                    <IconButton
                      aria-label="Switch to dark theme"
                      size="sm"
                      variant={theme === "dark" ? "solid" : "ghost"}
                      colorScheme="gray"
                      onClick={() => applyTheme("dark")}
                    />
                  </Tooltip>
                </HStack>
              </HStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
                Notifications
              </Text>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between" align="center" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.200" bg="white">
                  <Box>
                    <Text fontWeight="medium" fontSize="sm">Desktop Notifications</Text>
                    <Text fontSize="xs" color="gray.500">Show system notifications for new activity.</Text>
                  </Box>
                  <Switch
                    aria-label="Toggle desktop notifications"
                    isChecked={desktopNotifications}
                    onChange={handleDesktopToggle}
                    colorScheme="teal"
                  />
                </HStack>
                <HStack justify="space-between" align="center" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.200" bg="white">
                  <Box>
                    <Text fontWeight="medium" fontSize="sm">Sound</Text>
                    <Text fontSize="xs" color="gray.500">Play a tone for incoming messages and alerts.</Text>
                  </Box>
                  <Switch
                    aria-label="Toggle notification sounds"
                    isChecked={soundNotifications}
                    onChange={handleSoundToggle}
                    colorScheme="teal"
                  />
                </HStack>
              </VStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
                Account
              </Text>
              <Box p={3} borderRadius="md" borderWidth="1px" borderColor="gray.200" bg="white">
                {isChangingEmail ? (
                  <VStack spacing={3} align="stretch">
                    <Input
                      type="email"
                      placeholder="Current email"
                      value={emailForm.current}
                      onChange={(e) => setEmailForm((s) => ({ ...s, current: e.target.value }))}
                      aria-label="Current email"
                    />
                    <Input
                      type="email"
                      placeholder="New email"
                      value={emailForm.new}
                      onChange={(e) => setEmailForm((s) => ({ ...s, new: e.target.value }))}
                      aria-label="New email"
                    />
                    <Input
                      type="email"
                      placeholder="Confirm new email"
                      value={emailForm.confirm}
                      onChange={(e) => setEmailForm((s) => ({ ...s, confirm: e.target.value }))}
                      aria-label="Confirm new email"
                    />
                    <HStack>
                      <Button colorScheme="teal" size="sm" leftIcon={<CheckIcon />} onClick={handleEmailChange}>
                        Save email
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsChangingEmail(false)}>
                        Cancel
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<RepeatIcon />}
                    onClick={() => setIsChangingEmail(true)}
                    w="full"
                    justifyContent="flex-start"
                    aria-label="Change email"
                  >
                    Change Email
                  </Button>
                )}
              </Box>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
                Keyboard shortcuts
              </Text>
              <Box p={3} borderRadius="md" borderWidth="1px" borderColor="gray.200" bg="white" fontSize="sm">
                <HStack justify="space-between" py={1}>
                  <Text>Search chats</Text>
                  <Badge variant="outline">Ctrl/⌘ + K</Badge>
                </HStack>
                <HStack justify="space-between" py={1}>
                  <Text>Close / back</Text>
                  <Badge variant="outline">Esc</Badge>
                </HStack>
                <HStack justify="space-between" py={1}>
                  <Text>Navigate chat list</Text>
                  <Badge variant="outline">↑ ↓</Badge>
                </HStack>
                <HStack justify="space-between" py={1}>
                  <Text>Send message</Text>
                  <Badge variant="outline">Enter</Badge>
                </HStack>
              </Box>
            </Box>
          </VStack>
        </ModalBody>
        <Divider />
        <ModalFooter justifyContent="space-between">
          <Button size="sm" variant="ghost" colorScheme="red" onClick={handleReset}>
            Reset App
          </Button>
          <Button size="sm" colorScheme="teal" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsPanel;
