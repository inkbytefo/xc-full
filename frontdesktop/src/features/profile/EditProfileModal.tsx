import { useState, useCallback, useRef } from "react";
import { Modal } from "../../components/Modal";
import { useAuthStore } from "../../store/authStore";
import { updateProfile } from "./userApi";
import { uploadFile, isImage } from "../media/mediaApi";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

// Predefined gradient options
const GRADIENT_OPTIONS: Array<[string, string]> = [
    ["#8B5CF6", "#EC4899"], // Purple to Pink
    ["#06B6D4", "#3B82F6"], // Cyan to Blue
    ["#10B981", "#059669"], // Emerald
    ["#F59E0B", "#EF4444"], // Orange to Red
    ["#6366F1", "#8B5CF6"], // Indigo to Purple
    ["#EC4899", "#F43F5E"], // Pink to Rose
    ["#14B8A6", "#06B6D4"], // Teal to Cyan
    ["#F97316", "#FBBF24"], // Orange to Yellow
];

export function EditProfileModal({ isOpen, onClose, onSave }: EditProfileModalProps) {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [selectedGradient, setSelectedGradient] = useState<[string, string]>(
        user?.avatarGradient || GRADIENT_OPTIONS[0]
    );
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
    const [bannerUrl, setBannerUrl] = useState(user?.bannerUrl || "");
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [bannerUploading, setBannerUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isImage(file.type)) {
            setError("Sadece resim dosyaları yükleyebilirsiniz");
            return;
        }

        setAvatarUploading(true);
        setError(null);
        try {
            const media = await uploadFile(file);
            setAvatarUrl(media.url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Avatar yüklenemedi");
        } finally {
            setAvatarUploading(false);
        }
    }, []);

    const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isImage(file.type)) {
            setError("Sadece resim dosyaları yükleyebilirsiniz");
            return;
        }

        setBannerUploading(true);
        setError(null);
        try {
            const media = await uploadFile(file);
            setBannerUrl(media.url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Banner yüklenemedi");
        } finally {
            setBannerUploading(false);
        }
    }, []);

    const handleSave = useCallback(async () => {
        if (!displayName.trim()) {
            setError("Görünen ad boş olamaz");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Call PATCH /me API
            const updatedUser = await updateProfile({
                displayName: displayName.trim(),
                bio: bio.trim() || undefined,
                avatarGradient: selectedGradient,
                avatarUrl: avatarUrl || undefined,
                bannerUrl: bannerUrl || undefined,
            });

            // Update local auth store with new user data
            if (user) {
                setUser({
                    ...user,
                    displayName: updatedUser.displayName,
                    bio: updatedUser.bio,
                    avatarGradient: updatedUser.avatarGradient,
                    avatarUrl: updatedUser.avatarUrl,
                    bannerUrl: updatedUser.bannerUrl,
                });
            }

            onSave?.();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Profil güncellenemedi");
        } finally {
            setSaving(false);
        }
    }, [displayName, bio, selectedGradient, avatarUrl, bannerUrl, user, setUser, onClose, onSave]);

    const removeAvatar = () => setAvatarUrl("");
    const removeBanner = () => setBannerUrl("");

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <div className="p-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Profili Düzenle</h2>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {error && (
                    <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Banner Upload */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Profil Banner
                    </label>
                    <div
                        className="relative w-full h-32 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-700 overflow-hidden cursor-pointer group"
                        onClick={() => bannerInputRef.current?.click()}
                    >
                        {bannerUrl ? (
                            <>
                                <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeBanner(); }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                <span className="text-white text-sm">Banner yüklemek için tıklayın</span>
                            </div>
                        )}
                        {bannerUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            </div>
                        )}
                    </div>
                    <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBannerUpload}
                    />
                </div>

                {/* Avatar Upload & Gradient Selection */}
                <div className="flex gap-6">
                    {/* Avatar Preview */}
                    <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Profil Fotoğrafı
                        </label>
                        <div
                            className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
                            onClick={() => avatarInputRef.current?.click()}
                            style={!avatarUrl ? {
                                backgroundImage: `linear-gradient(135deg, ${selectedGradient[0]}, ${selectedGradient[1]})`,
                            } : undefined}
                        >
                            {avatarUrl ? (
                                <>
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeAvatar(); }}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">
                                    {displayName.charAt(0).toUpperCase() || "?"}
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            {avatarUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                </div>
                            )}
                        </div>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                        <p className="text-xs text-zinc-500 mt-2 text-center">Fotoğraf yükle</p>
                    </div>

                    {/* Gradient Selection */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Varsayılan Renk {avatarUrl && <span className="text-zinc-500">(fotoğraf varken gizli)</span>}
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {GRADIENT_OPTIONS.map((gradient, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedGradient(gradient)}
                                    className={`w-full aspect-square rounded-lg transition-all ${selectedGradient[0] === gradient[0] && selectedGradient[1] === gradient[1]
                                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f0f15] scale-110"
                                        : "hover:scale-105"
                                        }`}
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Display Name */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Görünen Ad
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Adınız"
                        maxLength={50}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
                    />
                    <p className="text-xs text-zinc-500 mt-1">{displayName.length}/50</p>
                </div>

                {/* Bio */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Biyografi
                    </label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Kendiniz hakkında bir şeyler yazın..."
                        rows={4}
                        maxLength={160}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors resize-none"
                    />
                    <p className="text-xs text-zinc-500 mt-1">{bio.length}/160</p>
                </div>

                {/* Handle (read-only) */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Kullanıcı Adı
                    </label>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-zinc-500">@</span>
                        <span className="text-zinc-400">{user?.handle}</span>
                        <span className="ml-auto text-xs text-zinc-600">Değiştirilemez</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                    onClick={onClose}
                    disabled={saving || avatarUploading || bannerUploading}
                    className="px-5 py-2.5 rounded-lg text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    İptal
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || avatarUploading || bannerUploading || !displayName.trim()}
                    className="px-5 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {saving && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
            </div>
        </Modal>
    );
}
