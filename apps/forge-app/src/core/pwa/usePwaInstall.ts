import { usePwaStore } from "./pwaStore.ts";

export function usePwaInstall(tabId?: string) {
  const eligibility = usePwaStore((s) => (tabId ? s.eligibilityByTab[tabId] : undefined));
  const isInstalling = usePwaStore((s) => s.isInstalling);
  const openInstallModal = usePwaStore((s) => s.openInstallModal);
  const installPwa = usePwaStore((s) => s.installPwa);

  const status = eligibility?.status || "hidden";
  const eligible = eligibility?.eligible ?? false;
  const manifest = eligibility?.manifest;
  const bestIconUrl = eligibility?.bestIconUrl;
  const reasons = eligibility?.reasons || [];

  return {
    status,
    eligible,
    manifest,
    bestIconUrl,
    reasons,
    isInstalling,
    openModal: () => tabId && openInstallModal(tabId),
    install: () => (tabId ? installPwa(tabId) : Promise.resolve({ success: false })),
  };
}
