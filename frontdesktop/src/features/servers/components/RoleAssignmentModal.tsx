import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRoles, updateMemberRoles } from "../serversApi";
import { serverKeys } from "../../../lib/query";

interface RoleAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverId: string;
    userId: string;
    userName: string;
    initialRoleIds?: string[];
}

export function RoleAssignmentModal({
    isOpen,
    onClose,
    serverId,
    userId,
    userName,
    initialRoleIds = [],
}: RoleAssignmentModalProps) {
    const queryClient = useQueryClient();
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialRoleIds);
    const [saving, setSaving] = useState(false);

    // Sync initial roles when opened
    useEffect(() => {
        if (isOpen) {
            setSelectedRoleIds(initialRoleIds);
        }
    }, [isOpen, initialRoleIds]);

    // Fetch available roles
    const { data: roles, isLoading } = useQuery({
        queryKey: serverKeys.roles(serverId),
        queryFn: () => fetchRoles(serverId),
        enabled: isOpen,
    });

    // Update Roles Mutation
    const updateMutation = useMutation({
        mutationFn: (roleIds: string[]) => updateMemberRoles(serverId, userId, roleIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serverKeys.detail(serverId) }); // Refresh server member list
            // queryClient.invalidateQueries({ queryKey: serverKeys.members(serverId) }); // If we had a specific members key
            onClose();
        },
        onError: (err) => {
            console.error("Failed to update roles", err);
            // Ideally show error toast
        }
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateMutation.mutateAsync(selectedRoleIds);
        } finally {
            setSaving(false);
        }
    };

    const toggleRole = (roleId: string) => {
        setSelectedRoleIds(prev =>
            prev.includes(roleId)
                ? prev.filter(id => id !== roleId)
                : [...prev, roleId]
        );
    };

    if (!isOpen) return null;

    // Filter out @everyone if you don't want it selectable (it's implicit usually)
    // But backend logic handles it. Just showing non-default roles usually makes sense for explicit assignment,
    // although @everyone is always assigned. Let's filter out the default role from the checklist or disable it.
    const displayRoles = roles?.filter(r => !r.isDefault).sort((a, b) => b.position - a.position);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#18181b] border border-white/10 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-zinc-100">
                        Roles for {userName}
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
                    {isLoading ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">Loading roles...</div>
                    ) : (
                        <div className="space-y-1">
                            {displayRoles?.length === 0 && (
                                <div className="p-4 text-center text-zinc-500 text-sm">No roles available.</div>
                            )}
                            {displayRoles?.map(role => (
                                <label
                                    key={role.id}
                                    className="flex items-center justify-between p-2.5 rounded hover:bg-white/5 cursor-pointer group transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: role.color }}
                                        />
                                        <span className={`text-sm font-medium ${selectedRoleIds.includes(role.id) ? "text-zinc-200" : "text-zinc-400 group-hover:text-zinc-300"}`}>
                                            {role.name}
                                        </span>
                                    </div>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedRoleIds.includes(role.id)
                                        ? "bg-indigo-600 border-indigo-600"
                                        : "border-zinc-600 bg-transparent"
                                        }`}>
                                        {selectedRoleIds.includes(role.id) && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedRoleIds.includes(role.id)}
                                            onChange={() => toggleRole(role.id)}
                                        />
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
