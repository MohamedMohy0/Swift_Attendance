import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const querySchema = z.object({
  provider: z.literal("google"),
  state: z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+$/),
  prompt: z.enum(["none", "consent", "select_account"]).optional(),
  login_hint: z.string().email().max(254).optional(),
  hd: z.string().min(1).max(253).optional(),
});

const OAUTH_BROKER_URL = "https://oauth.lovable.app/initiate";
const PROJECT_ID = "f69d5027-242e-4de1-a25a-75880dbfcdd8";
const PRODUCTION_REDIRECT_URI = "https://swift-attendance.vercel.app/dashboard";

export const Route = createFileRoute("/~oauth/initiate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const parsed = querySchema.safeParse(
          Object.fromEntries(requestUrl.searchParams.entries()),
        );

        if (!parsed.success) {
          return new Response("Invalid OAuth request", { status: 400 });
        }

        const destination = new URL(OAUTH_BROKER_URL);
        destination.searchParams.set("provider", parsed.data.provider);
        destination.searchParams.set("redirect_uri", PRODUCTION_REDIRECT_URI);
        destination.searchParams.set("state", parsed.data.state);
        destination.searchParams.set("project_id", PROJECT_ID);
        destination.searchParams.set("project_env", "prod");

        for (const key of ["prompt", "login_hint", "hd"] as const) {
          const value = parsed.data[key];
          if (value) destination.searchParams.set(key, value);
        }

        return Response.redirect(destination, 302);
      },
    },
  },
});