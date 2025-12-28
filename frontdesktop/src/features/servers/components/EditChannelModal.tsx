import { useEffect, useState } from "react";
import type { Channel } from "../../../api/types";
import { Modal, ModalBody, ModalFooter } from "../../../components/Modal";
import { updateChannel } from "../serversApi";

interface EditChannelModalProps {
  isOpen: boolean;
  serverId: string | null;
  channel: Channel | null;
  categories: Channel[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function EditChannelModal({
  isOpen,
  serverId,
  channel,
  categories,
  onClose,
  onSaved,
}: EditChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !channel) return;
    setName(channel.name);
    setDescription(channel.description ?? "");
    setParentId(channel.parentId ?? "");
    setSaving(false);
    setError(null);
  }, [channel, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kanalı Düzenle" size="md">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!channel || !serverId) return;

          const trimmedName = name.trim();
          if (!trimmedName) {
            setError("Kanal adı gerekli");
            return;
          }
          if (trimmedName.length > 100) {
            setError("Kanal adı en fazla 100 karakter olabilir");
            return;
          }
          if (description.length > 500) {
            setError("Açıklama en fazla 500 karakter olabilir");
            return;
          }

          setSaving(true);
          setError(null);

          const formattedName =
            channel.type === "category" ? trimmedName : trimmedName.toLowerCase().replace(/\s+/g, "-");

          try {
            await updateChannel(serverId, channel.id, {
              name: formattedName,
              description: description.trim() || undefined,
              parentId:
                channel.type === "category" ? undefined : parentId.trim() ? parentId.trim() : undefined,
            });
            onClose();
            await onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Kanal güncellenemedi");
          } finally {
            setSaving(false);
          }
        }}
      >
        <ModalBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Kanal Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              autoFocus
            />
          </div>

          {channel?.type !== "category" && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Açıklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
              />
            </div>
          )}

          {channel?.type !== "category" && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Kategori</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              >
                <option value="">Kategorisiz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors font-medium"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

