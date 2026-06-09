import {
  Box,
  HStack,
  Text,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Avatar,
  Tooltip,
  Badge,
  Portal,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
} from "@chakra-ui/react";
import {
  CheckIcon,
  CheckCircleIcon,
  CopyIcon,
  EditIcon,
  DeleteIcon,
  ExternalLinkIcon,
  LinkIcon,
} from "@chakra-ui/icons";
import { MdMoreVert } from "react-icons/md";
import { useState, useRef, memo, useCallback, useEffect } from "react";
import {
  canEditMessage,
  extractFirstUrl,
} from "../../utils/messageUtils";
import { ChatState } from "../../Context/ChatProvider";

const EnhancedMessageBubble = memo(({ message, isOwn, isGroup = false, onEdit, onDelete, onEmojiReact }) => {
  const { user } = ChatState();
  const toast = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [localContent, setLocalContent] = useState(message.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLinkPreview, setShowLinkPreview] = useState(false);
  const [linkPreviewData, setLinkPreviewData] = useState(null);
  const [loadingLinkPreview, setLoadingLinkPreview] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const firstUrlRef = useRef(extractFirstUrl(message.content));
  const emojiContainerRef = useRef(null);
  const pickerInstanceRef = useRef(null);

  const senderName =
    message.sender?.anonymousName?.name ||
    message.sender?.name ||
    message.senderName ||
    "Anonymous";

  const timestamp = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const fullTimestamp = message.createdAt
    ? new Date(message.createdAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const showSenderName = isGroup && !isOwn;
  const isEditable = canEditMessage(message, user?._id);

  useEffect(() => {
    setLocalContent(message.content);
  }, [message.content]);

  useEffect(() => {
    if (!showEmojiPicker || !emojiContainerRef.current) return;

    const picker = new Picker({
      emojiSize: 24,
      theme: "light",
      showPreview: false,
      showSkinTones: false,
      rowsPerPage: 7,
      perLine: 8,
      buttonPosition: "bottom",
      closeButton: false,
      zIndex: 1001,
    });

    picker.on("emoji", (emojiEvent) => {
      const native = emojiEvent.emoji?.native || "😀";
      setLocalContent((prev) => prev + native);
      onEmojiReact?.(message, native);
      setShowEmojiPicker(false);
    });

    if (emojiContainerRef.current) {
      emojiContainerRef.current.innerHTML = "";
      picker.togglePicker(emojiContainerRef.current, emojiContainerRef.current);
      pickerInstanceRef.current = picker;
    }

    const handleOutsideClick = (e) => {
      if (
        emojiContainerRef.current &&
        !emojiContainerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleOutsideClick);
      if (pickerInstanceRef.current) {
        try {
          pickerInstanceRef.current.destroyPicker();
        } catch (err) {
          // ignore cleanup errors
        }
        pickerInstanceRef.current = null;
      }
    };
  }, [showEmojiPicker, message, onEmojiReact]);

  useEffect(() => {
    const url = firstUrlRef.current;
    if (!url) return;

    setLoadingLinkPreview(true);
    setShowLinkPreview(false);

    const timer = setTimeout(() => {
      try {
        const urlObj = new URL(url);
        setLinkPreviewData({
          url,
          domain: urlObj.hostname,
          path: urlObj.pathname,
        });
        setShowLinkPreview(true);
      } catch (err) {
        setLinkPreviewData({
          url,
          domain: url.replace(/^https?:\/\//, "").split(/[?#\/]/)[0],
        });
        setShowLinkPreview(true);
      } finally {
        setLoadingLinkPreview(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [message.content, message._id]);

  const handleCopy = useCallback(
    async (content) => {
      try {
        await navigator.clipboard.writeText(content);
        toast({
          title: "Copied",
          description: "Message copied to clipboard",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (err) {
        toast({
          title: "Failed to copy",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    },
    [toast]
  );

  const handleDelete = useCallback(() => {
    onDelete?.(message);
    setIsMenuOpen(false);
  }, [onDelete, message]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setIsMenuOpen(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!localContent.trim()) {
      toast({
        title: "Cannot save empty message",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    onEdit?.(message, localContent);
    setIsEditing(false);
  }, [localContent, onEdit, message, toast]);

  const handleCancelEdit = useCallback(() => {
    setLocalContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  return (
    <Box
      className={`message-wrapper ${isOwn ? "own" : "other"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isMenuOpen) setShowEmojiPicker(false);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setIsHovered(true);
      }}
    >
      <Box
        className="message-row"
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: isOwn ? "flex-end" : "flex-start",
          alignItems: "flex-end",
          gap: 2,
          position: "relative",
          px: 0,
          py: 1,
        }}
      >
        {!isOwn && (
          <Box
            sx={{
              width: 6,
              flexShrink: 0,
              visibility: "hidden",
            }}
          />
        )}

        <Box sx={{ maxWidth: "78%", position: "relative" }} className="message-bubble-wrapper">
          {showSenderName && (
            <Text
              fontSize="xs"
              fontWeight="bold"
              sx={{ color: "#0b8043", mb: 0.5, ml: 1 }}
              className="message-sender-name"
            >
              {senderName}
            </Text>
          )}

          <Box
            className={isOwn ? "message-bubble-own" : "message-bubble-other"}
            sx={{
              padding: "8px 10px 6px",
              boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
              wordBreak: "break-word",
              borderRadius: isOwn ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
              border: isOwn
                ? "1px solid rgba(37,211,102,0.18)"
                : "1px solid rgba(0,0,0,0.06)",
              background: isOwn ? "#d9fdd3" : "#ffffff",
              position: "relative",
            }}
          >
            {isEditing ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <textarea
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="edit-textarea"
                  placeholder="Edit message..."
                  style={{
                    width: "100%",
                    minHeight: "60px",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #d0d7de",
                    background: "rgba(255,255,255,0.8)",
                    fontSize: "14px",
                    lineHeight: "1.4",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
                <HStack spacing={2} justify="flex-end">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    sx={{ minHeight: 28 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    colorScheme="teal"
                    onClick={handleSaveEdit}
                    sx={{ minHeight: 28 }}
                  >
                    Save
                  </Button>
                </HStack>
              </Box>
            ) : (
              <Box>
                {message.reactions && message.reactions.length > 0 && (
                  <HStack
                    spacing={1}
                    sx={{ flexWrap: "wrap", gap: 4, mb: message.content ? 0.5 : 0 }}
                  >
                    {message.reactions.map((r, idx) => (
                      <Badge
                        key={idx}
                        bg="whiteAlpha.200"
                        color="gray.700"
                        sx={{ borderRadius: 6, px: 1, py: 0.5, fontSize: 11 }}
                      >
                        {r.emoji} {r.count}
                      </Badge>
                    ))}
                  </HStack>
                )}

                <Text
                  sx={{
                    color: "#111827",
                    fontSize: 15,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                  className="message-content"
                >
                  {message.content}
                </Text>

                {loadingLinkPreview && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 8,
                      background: isOwn ? "rgba(0,0,0,0.04)" : "#f3f4f6",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <HStack spacing={2}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "#ccc",
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            height: 8,
                            width: "40%",
                            background: "#ddd",
                            borderRadius: 4,
                          }}
                        />
                        <Box
                          sx={{
                            height: 6,
                            width: "70%",
                            background: "#eee",
                            borderRadius: 4,
                            mt: 1,
                          }}
                        />
                      </Box>
                    </HStack>
                  </Box>
                )}

                {showLinkPreview && !loadingLinkPreview && linkPreviewData && (
                  <Box
                    as="a"
                    href={linkPreviewData.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-preview-card"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mt: 2,
                      p: 2,
                      borderRadius: 8,
                      background: isOwn ? "rgba(0,0,0,0.04)" : "#f3f4f6",
                      border: "1px solid rgba(0,0,0,0.06)",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      _hover: {
                        transform: "translateY(-1px)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: isOwn ? "rgba(255,255,255,0.4)" : "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <LinkIcon sx={{ color: "#667085", width: 5, height: 5 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Text
                        sx={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {linkPreviewData.domain}
                      </Text>
                      <Text
                        sx={{
                          fontSize: 11,
                          color: "#667085",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {linkPreviewData.url.replace(/^https?:\/\//, "").split(/[?#]/)[0]}
                      </Text>
                    </Box>
                    <ExternalLinkIcon sx={{ color: "#667085", width: 3.5, height: 3.5 }} />
                  </Box>
                )}

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <Text
                    as="span"
                    sx={{
                      fontSize: 11,
                      lineHeight: 1,
                      color: isOwn ? "#4f7f43" : "#667085",
                    }}
                    className="message-timestamp"
                    title={fullTimestamp}
                  >
                    {timestamp}
                  </Text>

                  {isOwn && (
                    <Tooltip label="Read" placement="top" hasArrow>
                      <Box sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
                        <CheckCircleIcon sx={{ color: "#4f7f43", width: 3.5, height: 3.5 }} />
                        <CheckIcon sx={{ color: "#4f7f43", width: 3, height: 3, ml: -1 }} />
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {!isEditing && (
            <Box
              className="message-actions"
              sx={{
                position: "absolute",
                top: "4px",
                right: isOwn ? "-32px" : undefined,
                left: !isOwn ? "-32px" : undefined,
                display: "flex",
                alignItems: "center",
                gap: 1,
                transition: "opacity 0.2s, transform 0.2s",
                opacity: isHovered || isMenuOpen ? 1 : 0,
                transform: isHovered || isMenuOpen ? "translateY(0)" : "translateY(4px)",
                pointerEvents: isHovered || isMenuOpen ? "auto" : "none",
                zIndex: 20,
              }}
            >
              <Popover
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                placement={isOwn ? "bottom-start" : "bottom-end"}
                closeOnBlur={false}
              >
                <PopoverTrigger>
                  <Box />
                </PopoverTrigger>
                <PopoverContent
                  width="320px"
                  p={0}
                  border="none"
                  boxShadow="0 10px 30px rgba(0,0,0,0.14)"
                  borderRadius="12px"
                  overflow="hidden"
                  zIndex={1001}
                >
                  <PopoverArrow bg="transparent" />
                  <PopoverCloseButton display="none" />
                  <Box ref={emojiContainerRef} className="emoji-mount" />
                </PopoverContent>
              </Popover>

              <IconButton
                aria-label="Emoji"
                icon={<Text sx={{ fontSize: 16 }}>😊</Text>}
                size="xs"
                variant="ghost"
                rounded="full"
                minW="28px"
                h="28px"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker((prev) => !prev);
                  setIsMenuOpen(false);
                }}
              />

              <IconButton
                aria-label="Actions"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                }
                size="xs"
                variant="ghost"
                rounded="full"
                minW="28px"
                h="28px"
                onClick={() => setIsMenuOpen((prev) => !prev)}
              />
            </Box>
          )}
        </Box>
      </Box>

      <style>{`
        .edit-textarea {
          width: 100%;
          min-height: 60px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #d0d7de;
          background: rgba(255,255,255,0.8);
          font-size: 14px;
          line-height: 1.4;
          resize: vertical;
          font-family: inherit;
        }
        .edit-textarea:focus {
          outline: none;
          border-color: #25d366;
          box-shadow: 0 0 0 3px rgba(37,211,102,0.16);
        }
        .message-actions {
          opacity: 0;
          transform: translateY(4px);
        }
        .message-row:hover .message-actions {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </Box>
  );
});

EnhancedMessageBubble.displayName = "EnhancedMessageBubble";

export const renderEmojiPreview = () => (
  <style>{`
    .message-bubble-own:hover,
    .message-bubble-other:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
  `}</style>
);

export default EnhancedMessageBubble;
