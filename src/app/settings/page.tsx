import type { Metadata } from "next";
import { FoundationView } from "@/components/foundation/FoundationView";
import { copy } from "@/i18n/ko";

export const metadata: Metadata = { title: copy.settings.title };

export default function SettingsPage() {
  return (
    <FoundationView
      eyebrow={copy.settings.eyebrow}
      title={copy.settings.title}
      description={copy.settings.description}
      status={copy.settings.status}
      items={[...copy.settings.items]}
    />
  );
}
