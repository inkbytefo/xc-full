import { useCallback, useState } from "react";
import type { VoiceChannel } from "../../voice/voiceApi";

type VoiceStoreLike = {
  isConnected: boolean;
  activeChannelId: string | null;
  connect: (channel: VoiceChannel) => Promise<void>;
};

interface UseVoiceChannelNavigationParams {
  voiceChannels: VoiceChannel[];
  voiceStore: VoiceStoreLike;
  onSelectChannel: (channelId: string) => void;
  onAfterSelectChannel?: () => void;
}

interface UseVoiceChannelNavigationReturn {
  isViewingVoiceRoom: boolean;
  setIsViewingVoiceRoom: (value: boolean) => void;
  handleVoiceChannelClick: (channelId: string) => void;
  handleSelectChannel: (channelId: string) => void;
}

export function useVoiceChannelNavigation({
  voiceChannels,
  voiceStore,
  onSelectChannel,
  onAfterSelectChannel,
}: UseVoiceChannelNavigationParams): UseVoiceChannelNavigationReturn {
  const [isViewingVoiceRoom, setIsViewingVoiceRoom] = useState(false);

  const handleVoiceChannelClick = useCallback(
    (channelId: string) => {
      const channel = voiceChannels.find((c) => c.id === channelId);
      if (!channel) return;

      if (voiceStore.isConnected && voiceStore.activeChannelId === channelId) {
        setIsViewingVoiceRoom((prev) => !prev);
        return;
      }

      void voiceStore.connect(channel);
      setIsViewingVoiceRoom(true);
    },
    [voiceChannels, voiceStore]
  );

  const handleSelectChannel = useCallback(
    (channelId: string) => {
      onSelectChannel(channelId);
      setIsViewingVoiceRoom(false);
      onAfterSelectChannel?.();
    },
    [onSelectChannel, onAfterSelectChannel]
  );

  return {
    isViewingVoiceRoom,
    setIsViewingVoiceRoom,
    handleVoiceChannelClick,
    handleSelectChannel,
  };
}

