import { Text, Box } from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";

const ScrollableChat = ({ messages }) => {
  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => (
          <div style={{ display: "flex" }} key={m._id}>
            <Box
              style={{
                backgroundColor: "#E8E8E8",
                marginTop: i === 0 ? 3 : 10,
                borderRadius: "20px",
                padding: "5px 15px",
                maxWidth: "75%",
              }}
            >
              <Text fontSize="xs" color="gray.500">
                {m.sender._id}
              </Text>
              <Text>{m.content}</Text>
            </Box>
          </div>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
