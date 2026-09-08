import { BagIcon, BasketIcon, WaterIcon } from "./Icons";

export type Tool = "water" | "harvest";

interface Props {
  tool: Tool;
  hasHand: boolean;
  onTool: (t: Tool) => void;
  onShop: () => void;
}

export default function Toolbar({ tool, hasHand, onTool, onShop }: Props) {
  return (
    <nav className="toolbar">
      <button className={`tool${!hasHand && tool === "water" ? " active" : ""}`} onClick={() => onTool("water")}>
        <WaterIcon />
        <span>澆水</span>
      </button>
      <button className={`tool${!hasHand && tool === "harvest" ? " active" : ""}`} onClick={() => onTool("harvest")}>
        <BasketIcon />
        <span>收獲</span>
      </button>
      <button className="tool" onClick={onShop}>
        <BagIcon />
        <span>花店</span>
      </button>
    </nav>
  );
}
