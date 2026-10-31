import type { Metadata } from "next";
import { Suspense } from "react";
import Questionnaire from "@/components/Questionnaire";

export const metadata: Metadata = { title: "Questionario · Export Profile IAGAIN", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <Questionnaire />
    </Suspense>
  );
}
