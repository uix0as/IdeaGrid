import type { Metadata } from "next";
import { Editor } from "@/features/workspace/Editor";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  return { title: `프로젝트 ${projectId}` };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return <Editor key={projectId} projectId={projectId} />;
}
