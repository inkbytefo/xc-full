import { useUIStore } from "../store/uiStore";
import { DotWaveCanvas } from "./DotWaveCanvas";
import { TopoBackground } from "./TopoBackground";

export function BackgroundLayer() {
    const backgroundTheme = useUIStore((state) => state.backgroundTheme);

    return (
        <>
            {backgroundTheme === "dotwave" && <DotWaveCanvas />}
            {backgroundTheme === "topo" && <TopoBackground />}
        </>
    );
}
