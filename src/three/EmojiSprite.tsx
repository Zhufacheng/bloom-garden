import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

/** draw an emoji to a canvas and reuse it as a sprite texture */
function emojiTexture(emoji: string): THREE.CanvasTexture {
  let t = cache.get(emoji);
  if (!t) {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.font = `${Math.floor(size * 0.7)}px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, size / 2, size / 2 + 6);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    cache.set(emoji, t);
  }
  return t;
}

interface Props {
  emoji: string;
  position: [number, number, number];
  scale?: number;
  /** gentle floating bob */
  bob?: boolean;
}

export default function EmojiSprite({ emoji, position, scale = 0.5, bob = false }: Props) {
  const map = useMemo(() => emojiTexture(emoji), [emoji]);
  const ref = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    if (bob && ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2.2 + position[0] * 3.1) * 0.07;
    }
  });
  return (
    <sprite ref={ref} position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={map} transparent depthWrite={false} />
    </sprite>
  );
}
