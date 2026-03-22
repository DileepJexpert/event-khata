import { redirect } from "next/navigation";

export default async function Home() {
  // DEV MODE: Skip auth, go straight to dashboard
  redirect("/dashboard");
}
