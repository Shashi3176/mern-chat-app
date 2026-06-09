import { useEffect, useState, useCallback, useRef } from "react";
import { Box, Text, VStack, HStack, Badge, Spinner, Avatar, Button, Divider, useToast } from "@chakra-ui/react";
import { CloseIcon, PersonIcon } from "@chakra-ui/icons";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";

const ParticipantPanel = ({ isOpen, onClose, roomId }) => {
  const { user, onlineUsers, socket, leaveRoom } = ChatState();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const panelRef = useRef(null);

  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.get(`/api/rooms/${roomId}/participants`, config);
      setParticipants(data);
    } catch (error) {
      console.error("Failed to fetch participants:", error);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.token]);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchParticipants();
    }
  }, [isOpen, roomId, fetchParticipants]);

  const handleLeaveRoom = async () => {
    if (!roomId) return;
    try {
      await leaveRoom(roomId);
      toast({
        title: "Left room",
        description: "You have left the room",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave room",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const getOnlineStatus = (participantId) => {
    return onlineUsers[participantId] ? "online" : "offline";
  };

  const getOnlineLabel = (participantId) => {
    const online = onlineUsers[participantId];
    if (online === null || online === undefined) return "unknown";
    return online ? "online" : "offline";
  };

  if (!isOpen) return null;

  return (
    <>
      <Box
        ref={panelRef}
        className="participant-panel-overlay"
        sx={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "100%",
          maxWidth: { base: "100%", md: "380px" },
          height: "100vh",
          minHeight: "100vh",
          background: "white",
          boxShadow: "-4px 0 30px rgba(0,0,0,0.15)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          animation: "slideInFromRight 0.25s ease-out",
          "@keyframes slideInFromRight": {
            from: { transform: "translateX(100%)" },
            to: { transform: "translateX(0)" },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
          <Text sx={{ fontWeight: 700, fontSize: 18 }}>Participants</Text>
          <Button
            aria-label="Close participant panel"
            variant="ghost"
            size="sm"
            minW="36px"
            minH="36px"
            borderRadius="full"
            onClick={onClose}
          >
            <CloseIcon />
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", padding: 2 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 6 }}>
              <Spinner size="md" colorScheme="teal" />
            </Box>
          ) : (
            <VStack spacing={0} align="stretch">
              {participants.map((participant) => {
                const participantId = participant.user?._id || participant.userId;
                const onlineLabel = getOnlineLabel(participantId);
                const isOnline = onlineLabel === "online";
                const displayName =
                  participant.user?.anonymousName?.name ||
                  participant.user?.name ||
                  "Participant";

                return (
                  <Box
                    key={participant._id || participantId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      padding: "10px 14px",
                      borderRadius: 14,
                      transition: "background 0.15s",
                      _hover: { background: "#f9fafb" },
                    }}
                  >
                    <Box sx={{ position: "relative", flexShrink: 0 }}>
                      <Avatar
                        size="sm"
                        name={displayName}
                        bg="teal.200"
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          background: isOnline ? "#22c55e" : "#9ca3af",
                          border: "2px solid white",
                        }}
                      />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Text
                        sx={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {displayName}
                      </Text>
                      <HStack spacing={1}>
                        <Badge
                          sx={{
                            borderRadius: 6,
                            px: 1.5,
                            py: 0.5,
                            fontSize: 10,
                            fontWeight: 600,
                            background: isOnline ? "#dcfce7" : "#f3f4f6",
                            color: isOnline ? "#15803d" : "#6b7280",
                          }}
                        >
                          {onlineLabel}
                        </Badge>
                        <Badge
                          sx={{
                            borderRadius: 6,
                            px: 1.5,
                            py: 0.5,
                            fontSize: 10,
                            fontWeight: 600,
                            background: "#eef2ff",
                            color: "#3730a3",
                          }}
                        >
                          {participant.role || "member"}
                        </Badge>
                      </HStack>
                    </Box>
                  </Box>
                );
              })}
            </VStack>
          )}
        </Box>

        <Divider />

        <Box
          sx={{
            padding: "14px 16px",
            background: "white",
            borderTop: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <Button
            width="100%"
            variant="ghost"
            colorScheme="red"
            size="md"
            onClick={handleLeaveRoom}
            sx={{
              borderRadius: 12,
              minHeight: 44,
              fontWeight: 600,
              _hover: { background: "#fef2f2" },
            }}
          >
            Leave Room
          </Button>
        </Box>
      </Box>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default ParticipantPanel;
