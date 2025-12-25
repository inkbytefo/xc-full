import type { Server } from '../../../../api/types';

interface ServerRailProps {
    servers: Server[];
    selectedServerId: string | null;
    onServerSelect: (serverId: string) => void;
}

export function ServerRail({ servers, selectedServerId, onServerSelect }: ServerRailProps) {
    return (
        <div style={{
            width: 60,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 12,
            gap: 8,
            overflowY: 'auto',
            borderRight: '1px solid rgba(255,255,255,0.05)'
        }}>
            {servers.map((server) => {
                const [c1, c2] = server.iconGradient || ['#6366f1', '#8b5cf6'];
                const isSelected = selectedServerId === server.id;

                return (
                    <div
                        key={server.id}
                        onClick={() => onServerSelect(server.id)}
                        title={server.name}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: isSelected ? 12 : 20,
                            background: `linear-gradient(135deg, ${c1}, ${c2})`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 15,
                            color: 'white',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none'
                        }}
                    >
                        {server.name.substring(0, 1).toUpperCase()}
                        {isSelected && (
                            <div style={{
                                position: 'absolute',
                                left: -8,
                                width: 4,
                                height: 24,
                                background: 'white',
                                borderRadius: '0 4px 4px 0'
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
