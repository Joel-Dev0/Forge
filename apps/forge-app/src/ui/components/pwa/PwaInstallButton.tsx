import { Download, AppWindow } from "lucide-react";
import { usePwaInstall } from "../../../core/pwa/usePwaInstall.ts";

interface Props {
  tabId?: string;
}

export function PwaInstallButton({ tabId }: Props) {
  const { status, manifest, openModal } = usePwaInstall(tabId);

  // STRICT RULE: Only visible when the PWA is fully eligible and verified!
  if (status !== "eligible" || !manifest) {
    return null;
  }

  const displayName = manifest.shortName || manifest.name || "App";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
      }}
      title={`Install "${displayName}" as desktop web application in Forge`}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 hover:bg-[#FF6B00]/25 transition-all cursor-pointer shrink-0 animate-in fade-in duration-200"
    >
      <AppWindow size={13} className="shrink-0" />
      <span className="max-w-[120px] truncate">Install {displayName}</span>
      <Download size={11} className="opacity-70 shrink-0" />
    </button>
  );
}
