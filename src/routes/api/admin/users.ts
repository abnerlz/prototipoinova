import { createFileRoute } from "@tanstack/react-router";

import { createOperatorAccount } from "@/lib/admin-users.server";

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      POST: async ({ request }) => createOperatorAccount(request),
    },
  },
});
