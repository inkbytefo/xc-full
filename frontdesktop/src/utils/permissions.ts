// ============================================================================
// Permission Utilities - RBAC 2.0 (Bitwise Permissions)
// ============================================================================

import { Permissions } from "../api/types";

/**
 * Legacy role type for backward compatibility
 */
export type MemberRole = "owner" | "admin" | "moderator" | "member";

// ============================================================================
// Bitwise Permission Helpers (RBAC 2.0)
// ============================================================================

/**
 * Check if a permission value has a specific permission flag
 */
export function hasPermission(permissions: number, flag: number): boolean {
    // Administrator has all permissions
    if ((permissions & Permissions.ADMINISTRATOR) !== 0) return true;
    return (permissions & flag) !== 0;
}

/**
 * Check multiple permissions (all must be present)
 */
export function hasAllPermissions(permissions: number, ...flags: number[]): boolean {
    if ((permissions & Permissions.ADMINISTRATOR) !== 0) return true;
    return flags.every((flag) => (permissions & flag) !== 0);
}

/**
 * Check multiple permissions (at least one must be present)
 */
export function hasAnyPermission(permissions: number, ...flags: number[]): boolean {
    if ((permissions & Permissions.ADMINISTRATOR) !== 0) return true;
    return flags.some((flag) => (permissions & flag) !== 0);
}

/**
 * Combine multiple permission flags
 */
export function combinePermissions(...flags: number[]): number {
    return flags.reduce((acc, flag) => acc | flag, 0);
}

// ============================================================================
// Legacy Role-Based Helpers (For backward compatibility)
// ============================================================================

const roleHierarchy: Record<MemberRole, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
};

/**
 * Check if a role is higher than or equal to another role
 */
export function isRoleAtLeast(role: string | undefined, minimumRole: MemberRole): boolean {
    if (!role) return false;
    const normalized = role.toLowerCase() as MemberRole;
    const roleLevel = roleHierarchy[normalized] || 1;
    return roleLevel >= roleHierarchy[minimumRole];
}

/**
 * Check if actor can manage target role
 */
export function canManageRole(actorRole: string | undefined, targetRole: string): boolean {
    if (!actorRole) return false;
    const actorLevel = roleHierarchy[actorRole.toLowerCase() as MemberRole] || 1;
    const targetLevel = roleHierarchy[targetRole.toLowerCase() as MemberRole] || 1;
    return actorLevel > targetLevel;
}

// ============================================================================
// Permission Check Functions (Hybrid: uses role or permissions)
// ============================================================================

export const permissions = {
    canManageChannels: (role?: string, perms?: number): boolean => {
        if (perms !== undefined) return hasPermission(perms, Permissions.MANAGE_CHANNELS);
        return isRoleAtLeast(role, "admin");
    },

    canManageMembers: (role?: string, perms?: number): boolean => {
        if (perms !== undefined) return hasPermission(perms, Permissions.KICK_MEMBERS);
        return isRoleAtLeast(role, "moderator");
    },

    canManageRoles: (role?: string, perms?: number): boolean => {
        if (perms !== undefined) return hasPermission(perms, Permissions.MANAGE_ROLES);
        return isRoleAtLeast(role, "admin");
    },

    canDeleteMessages: (role?: string, perms?: number): boolean => {
        if (perms !== undefined) return hasPermission(perms, Permissions.MANAGE_MESSAGES);
        return isRoleAtLeast(role, "moderator");
    },

    canEditServer: (role?: string, perms?: number): boolean => {
        if (perms !== undefined) return hasPermission(perms, Permissions.MANAGE_SERVER);
        return isRoleAtLeast(role, "admin");
    },

    canDeleteServer: (role?: string): boolean => {
        return role?.toLowerCase() === "owner";
    },

    canViewAuditLog: (role?: string, perms?: number): boolean => {
        if (perms !== undefined) return hasPermission(perms, Permissions.MANAGE_SERVER);
        return isRoleAtLeast(role, "admin");
    },

    canInvite: (role?: string, perms?: number): boolean => {
        if (perms !== undefined) return hasPermission(perms, Permissions.VIEW_CHANNEL);
        return isRoleAtLeast(role, "member");
    },

    canBanUsers: (role?: string, perms?: number): boolean => {
        if (perms !== undefined) return hasPermission(perms, Permissions.BAN_MEMBERS);
        return isRoleAtLeast(role, "moderator");
    },
};

// ============================================================================
// Role Display Helpers
// ============================================================================

export const roleLabels: Record<string, string> = {
    owner: "Sahip",
    admin: "Admin",
    moderator: "Moderatör",
    member: "Üye",
    "@everyone": "Üye",
};

export const roleColors: Record<string, string> = {
    owner: "text-amber-400 bg-amber-500/20",
    admin: "text-indigo-400 bg-indigo-500/20",
    moderator: "text-green-400 bg-green-500/20",
    member: "text-zinc-400 bg-zinc-500/20",
    "@everyone": "text-zinc-400 bg-zinc-500/20",
};

export function getRoleLabel(role: string): string {
    return roleLabels[role.toLowerCase()] || roleLabels.member;
}

export function getRoleColor(role: string): string {
    return roleColors[role.toLowerCase()] || roleColors.member;
}

/**
 * Get roles that a user with the given role can assign to others
 */
export function getAssignableRoles(actorRole: string | undefined): MemberRole[] {
    if (!actorRole) return [];

    switch (actorRole.toLowerCase()) {
        case "owner":
            return ["admin", "moderator", "member"];
        case "admin":
            return ["moderator", "member"];
        default:
            return [];
    }
}
