import { redirect } from "next/navigation";

export default function Home() {
  // Immediately redirect to /auth/login
  redirect("/auth/login");
}