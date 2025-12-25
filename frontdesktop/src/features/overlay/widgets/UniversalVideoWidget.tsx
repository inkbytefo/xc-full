import { useRef, useEffect } from 'react';
import { BaseWidget } from './BaseWidget';

export function UniversalVideoWidget() {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Auto-play when prepared
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = 0.5;
        }
    }, []);

    const videoSrc = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

    return (
        <BaseWidget
            id="video"
            title="Yayın İzle"
            icon="📺"
            defaultPosition={{ x: 200, y: 200 }}
            defaultSize={{ width: 480, height: 270 }}
        >
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                <video
                    ref={videoRef}
                    src={videoSrc}
                    controls
                    autoPlay
                    loop
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            </div>
        </BaseWidget>
    );
}
