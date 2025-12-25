import React, { useEffect, useState } from 'react';

interface MediaDevice {
    deviceId: string;
    label: string;
}

export const VoiceSettings: React.FC = () => {
    const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
    const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
    const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);

    const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
    const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
    const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');

    useEffect(() => {
        const updateDevices = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();

            const audioIn = devices.filter(d => d.kind === 'audioinput');
            const videoIn = devices.filter(d => d.kind === 'videoinput');
            const audioOut = devices.filter(d => d.kind === 'audiooutput');

            setAudioInputs(audioIn.map(d => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 5)}` })));
            setVideoInputs(videoIn.map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` })));
            setAudioOutputs(audioOut.map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` })));
        };

        updateDevices();
        navigator.mediaDevices.addEventListener('devicechange', updateDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', updateDevices);
    }, []);

    return (
        <div className="p-4 bg-zinc-900 rounded-lg text-white space-y-4 max-w-md">
            <h2 className="text-xl font-bold border-b border-zinc-800 pb-2">Ses ve Görüntü Ayarları</h2>

            <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-zinc-400">Giriş Cihazı (Mikrofon)</label>
                <select
                    value={selectedAudioInput}
                    onChange={(e) => setSelectedAudioInput(e.target.value)}
                    className="w-full bg-zinc-800 p-2 rounded border border-zinc-700 focus:outline-none focus:border-indigo-500"
                >
                    {audioInputs.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-zinc-400">Çıkış Cihazı (Hoparlör)</label>
                <select
                    value={selectedAudioOutput}
                    onChange={(e) => setSelectedAudioOutput(e.target.value)}
                    className="w-full bg-zinc-800 p-2 rounded border border-zinc-700 focus:outline-none focus:border-indigo-500"
                >
                    {audioOutputs.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-zinc-400">Görüntü Cihazı (Kamera)</label>
                <select
                    value={selectedVideoInput}
                    onChange={(e) => setSelectedVideoInput(e.target.value)}
                    className="w-full bg-zinc-800 p-2 rounded border border-zinc-700 focus:outline-none focus:border-indigo-500"
                >
                    {videoInputs.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                </select>
            </div>

            <div className="pt-2">
                <p className="text-xs text-zinc-500">
                    * Değişiklikler otomatik olarak kaydedilir ve bir sonraki bağlantıda kullanılır.
                </p>
            </div>
        </div>
    );
};
