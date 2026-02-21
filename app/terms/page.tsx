// app/terms/page.tsx  (or app/terms-and-conditions/page.tsx)
"use client";
import { useRouter } from "next/navigation";
import TermsAndConditions from "@/components/TermsAndConditions";

export default function TermsPage() {
  const router = useRouter();
  return <TermsAndConditions onBack={() => router.push("/")} />;
}
