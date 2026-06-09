import { Box, Text } from "@chakra-ui/react";

const DateSeparator = ({ label, date }) => (
  <Box
    className="date-separator"
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingY: 3,
      position: "relative",
    }}
  >
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 5,
        py: 1,
        bg: "rgba(255,255,255,0.88)",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <Text
        sx={{
          fontSize: 12,
          fontWeight: 600,
          color: "#374151",
          whiteSpace: "nowrap",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </Text>
    </Box>
  </Box>
);

export default DateSeparator;
