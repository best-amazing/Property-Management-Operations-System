import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Reload stale data when you come back to the tab, so changes other
      // people made show up without a page refresh
      refetchOnWindowFocus: true,
    },
  },
});
