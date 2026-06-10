import { useToast as useChakraToast, ToastStatus } from "@chakra-ui/react";

export const AUTO_CLOSE_DURATION = 5000;

export const useToast = () => {
  const toast = useChakraToast();

  const show = (title, description = "", status: ToastStatus = "info") => {
    return toast({
      title,
      description,
      status,
      duration: AUTO_CLOSE_DURATION,
      isClosable: true,
      position: "bottom",
    });
  };

  return {
    success: (title, description = "") => show(title, description, "success"),
    error: (title, description = "") => show(title, description, "error"),
    warning: (title, description = "") => show(title, description, "warning"),
    info: (title, description = "") => show(title, description, "info"),
    show,
  };
};
