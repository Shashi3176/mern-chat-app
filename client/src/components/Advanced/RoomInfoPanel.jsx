import { Box, Text, VStack, HStack, Badge, Button, useToast } from "@chakra-ui/react";
import { InfoIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";
import { ArrowForwardIcon } from "@chakra-ui/icons";

const RoomInfoPanel = ({ isOpen, onClose, room }) => {
  const { user } = ChatState();
  const toast = useToast();
  const [imageError, setImageError] = useState(false);

  if (!room || !isOpen) return null;

  const roomType = room.roomType === "group" ? "Public Group" : "Random Direct";
  const colorScheme = room.roomType === "group" ? "teal" : "purple";
  const createdDate = room.createdAt
    ? new Date(room.createdAt).toLocaleDateString("default", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const handleShare = async () => {
    const shareData = {
      title: `Join ${room.chatName || "Chat Room"}`,
      text: `Join my chat room on ${window.location.origin}`,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast({
          title: "Link copied",
          description: "Room link copied to clipboard",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        toast({
          title: "Share failed",
          description: "Could not share room",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  return (
    <Box
      className="room-info-panel"
      sx={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 50,
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        animation: "slideDown 0.2s ease-out",
        maxHeight: "70vh",
        overflowY: "auto",
      }}
    >
      <Box sx={{ padding: "20px 24px" }}>
        <VStack spacing={5} align="stretch">
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: room.roomType === "group" ? "#0d9488" : "#7c3aed",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {room.roomType === "group" ? "👥" : "💬"}
              </Box>
              <Box>
                <Text sx={{ fontWeight: 700, fontSize: 16 }}>{room.chatName || "Chat Room"}</Text>
                <Badge colorScheme={colorScheme} sx={{ borderRadius: 6, mt: 0.5 }}>
                  {roomType}
                </Badge>
              </Box>
            </HStack>
            <Button aria-label="Close room info" variant="ghost" size="sm" onClick={onClose} minW="36px" minH="36px">
              ✕
            </Button>
          </HStack>

          <Box
            sx={{
              background: "#f9fafb",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <VStack spacing={3} align="stretch">
              <HStack spacing={2}>
                <InfoIcon sx={{ color: "#6b7280", width: 4, height: 4 }} />
                <VStack align="start" spacing={0}>
                  <Text sx={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Created</Text>
                  <Text sx={{ fontSize: 13, fontWeight: 600 }}>{createdDate}</Text>
                </VStack>
              </HStack>

              {room.topic && (
                <Box>
                  <Text sx={{ fontSize: 11, color: "#6b7280", fontWeight: 500, mb: 0.5 }}>Topic</Text>
                  <Text sx={{ fontSize: 13 }}>{room.topic}</Text>
                </Box>
              )}

              {room.expiresAt && (
                <HStack spacing={2}>
                  <Badge colorScheme="orange" sx={{ borderRadius: 6 }}>
                    Expires {new Date(room.expiresAt).toLocaleDateString()}
                  </Badge>
                </HStack>
              )}

              <HStack spacing={2}>
                <Text sx={{ fontSize: 11, color: "#6b7280" }}>
                  {room.participantCount || 0} participants •{" "}
                  {room.roomType === "group" ? "Public" : "Private"}
                </Text>
              </HStack>
            </VStack>
          </Box>

          {room.roomType === "group" && (
            <Button
              width="100%"
              colorScheme="teal"
              variant="outline"
              leftIcon={<ArrowForwardIcon />}
              onClick={handleShare}
              sx={{
                borderRadius: 12,
                minHeight: 44,
                fontWeight: 600,
              }}
            >
              Share Room
            </Button>
          )}
        </VStack>
      </Box>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Box>
  );
};

export default RoomInfoPanel;
