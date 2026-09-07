import type { Metadata } from "next";
import { Report } from "@/features/workspace/Report";

interface ReportPageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata: Metadata = { title: "분석 보고서" };

export default async function ReportPage({ params }: ReportPageProps) {
  const { projectId } = await params;

  return <Report key={projectId} projectId={projectId} />;
}
