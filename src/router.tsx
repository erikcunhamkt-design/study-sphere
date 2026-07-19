import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { authStore } from "@/lib/auth-store";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, auth: authStore },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
