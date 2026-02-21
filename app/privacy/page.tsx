// app/privacy/page.tsx
"use client";
import { useRouter } from "next/navigation";
import PrivacyPolicy from "@/components/PrivacyPolicy"; // adjust path

export default function PrivacyPage() {
  const router = useRouter();
  return <PrivacyPolicy onBack={() => router.push("/")} />;
}
