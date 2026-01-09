import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Simple redirect to chat - auth check happens in middleware/page
  // This avoids any server-side session checks that might fail on misconfigured deployments
  redirect("/chat");
}
