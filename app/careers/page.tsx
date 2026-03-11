"use client";
import { useRouter } from "next/navigation";
import Careers from "@/components/Careers";

export default function CareersPage() {
  const router = useRouter();

  return (
    <main>
      <Careers onBack={() => router.push("/")} />
    </main>
  );
}
