import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRoles, createRole, updateRole, deleteRole } from "../serversApi";
import { serverKeys } from "../../../lib/query";
import { Role } from "../../../api/types";

interface RolesListProps {
    serverId: string;
}

export function RolesList({ serverId }: RolesListProps) {
    const queryClient = useQueryClient();
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Fetch Roles
    const { data: roles, isLoading } = useQuery({
        queryKey: serverKeys.roles(serverId),
        queryFn: () => fetchRoles(serverId),
    });

    // Create Role Mutation
    const createMutation = useMutation({
        mutationFn: (data: { name: string; color: string; permissions: number }) =>
            createRole(serverId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serverKeys.roles(serverId) });
            setIsCreating(false);
        },
    });

    // Update Role Mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: string; name?: string; color?: string; permissions?: number; position?: number }) =>
            updateRole(serverId, data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serverKeys.roles(serverId) });
            setEditingRole(null);
        },
    });

    // Delete Role Mutation
    const deleteMutation = useMutation({
        mutationFn: (roleId: string) => deleteRole(serverId, roleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serverKeys.roles(serverId) });
        },
    });

    if (isLoading) {
        return <div className="text-zinc-400">Loading roles...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-400">
                    Roles ({roles?.length || 0})
                </h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors"
                >
                    Create Role
                </button>
            </div>

            <div className="space-y-2">
                {roles?.map((role) => (
                    <div
                        key={role.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: role.color || "#99AAB5" }}
                            />
                            <span className="text-zinc-200 font-medium">{role.name}</span>
                            {role.isDefault && (
                                <span className="px-1.5 py-0.5 bg-white/10 text-[10px] text-zinc-400 rounded uppercase tracking-wider">
                                    Default
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {!role.isDefault && (
                                <>
                                    <button
                                        onClick={() => setEditingRole(role)}
                                        className="p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 rounded"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm("Are you sure you want to delete this role?")) {
                                                deleteMutation.mutate(role.id);
                                            }
                                        }}
                                        className="p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </>
                            )}
                            {role.isDefault && (
                                <button
                                    onClick={() => setEditingRole(role)}
                                    className="p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 rounded"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit/Create Modal would go here or be a separate component */}
            {(editingRole || isCreating) && (
                <RoleEditor
                    role={editingRole}
                    isCreating={isCreating}
                    onClose={() => {
                        setEditingRole(null);
                        setIsCreating(false);
                    }}
                    onSave={(data) => {
                        if (isCreating) {
                            createMutation.mutate(data as any);
                        } else if (editingRole) {
                            updateMutation.mutate({ ...data, id: editingRole.id });
                        }
                    }}
                />
            )}
        </div>
    );
}

// Sub-component for editing
function RoleEditor({
    role,
    isCreating,
    onClose,
    onSave
}: {
    role: Role | null;
    isCreating: boolean;
    onClose: () => void;
    onSave: (data: Partial<Role>) => void;
}) {
    const [name, setName] = useState(role?.name || "New Role");
    const [color, setColor] = useState(role?.color || "#99AAB5");
    const [permissions, setPermissions] = useState<number>(role?.permissions || 0);

    // Helper for permissions (simplified bitwise check)
    const hasPerm = (perm: number) => (permissions & perm) === perm;
    const togglePerm = (perm: number) => {
        setPermissions(prev => (prev & perm) ? (prev & ~perm) : (prev | perm));
    };

    // Define permission flags (these should match backend)
    const PERMISSIONS = {
        ADMINISTRATOR: 1 << 0,
        MANAGE_SERVER: 1 << 1,
        MANAGE_CHANNELS: 1 << 2,
        MANAGE_ROLES: 1 << 3,
        KICK_MEMBERS: 1 << 4,
        BAN_MEMBERS: 1 << 5,
        CREATE_INVITES: 1 << 6,
        SEND_MESSAGES: 1 << 7,
        MANAGE_MESSAGES: 1 << 8, // Assuming value based on backend
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#18181b] border border-white/10 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-100">
                        {isCreating ? "Create Role" : "Edit Role"}
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Role Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-zinc-200 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Role Color</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-10 w-20 bg-transparent border-0 p-0 cursor-pointer"
                            />
                            <div
                                className="px-3 py-2 bg-black/20 border border-white/10 rounded-md text-zinc-400 text-sm font-mono flex-1"
                            >
                                {color}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Permissions</label>
                        <div className="space-y-2">
                            {Object.entries(PERMISSIONS).map(([key, val]) => (
                                <label key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                                    <span className="text-sm text-zinc-300 font-medium whitespace-nowrap">
                                        {key.replace(/_/g, " ")}
                                    </span>
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${hasPerm(val) ? "bg-indigo-600" : "bg-zinc-700"}`}>
                                        <input
                                            type="checkbox"
                                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                            checked={hasPerm(val)}
                                            onChange={() => togglePerm(val)}
                                        />
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${hasPerm(val) ? "translate-x-4" : ""}`} />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ name, color, permissions })}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
                    >
                        Save Role
                    </button>
                </div>
            </div>
        </div>
    );
}
