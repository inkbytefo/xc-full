import { useCallback, useMemo, useState } from "react";
import type { Server } from "../../../api/types";
import { Modal, ModalBody, ModalFooter } from "../../../components/Modal";

interface InviteServerModalProps {
  isOpen: boolean;
  server: Server | undefined;
  onClose: () => void;
  onOpenProfile: () => void;
}

export function InviteServerModal({ isOpen, server, onClose, onOpenProfile }: InviteServerModalProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const inviteLink = useMemo(() => {
    if (!server) return "";
    const path = server.handle ? `/s/${server.handle}` : `/servers/${server.id}`;
    try {
      return new URL(path, window.location.origin).toString();
    } catch {
      return path;
    }
  }, [server]);

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyStatus("Kopyalandı");
      window.setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus("Kopyalanamadı");
      window.setTimeout(() => setCopyStatus(null), 2000);
    }
  }, [inviteLink]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setCopyStatus(null);
        onClose();
      }}
      title="Sunucuyu Paylaş"
      size="md"
    >
      <ModalBody className="space-y-3">
        <div className="text-sm text-zinc-400">
          Bu linki paylaşarak kullanıcıların sunucu profilini açmasını sağlayabilirsiniz.
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Paylaşım Linki</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!inviteLink}
              className="px-4 py-2.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 transition-colors disabled:opacity-50 disabled:hover:bg-purple-500/20"
            >
              Kopyala
            </button>
          </div>
        </div>

        {copyStatus && (
          <div className={`text-sm ${copyStatus === "Kopyalandı" ? "text-green-300" : "text-red-300"}`} role="status">
            {copyStatus}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={() => {
            setCopyStatus(null);
            onClose();
          }}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
        >
          Kapat
        </button>
        {server && (
          <button
            type="button"
            onClick={() => {
              setCopyStatus(null);
              onOpenProfile();
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            Sunucu Profili
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}

