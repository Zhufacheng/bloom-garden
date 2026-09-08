import { BagIcon, WaterIcon } from "./Icons";

interface Props {
  onWater: () => void;
  onShop: () => void;
}

export default function Toolbar({ onWater, onShop }: Props) {
  return (
    <nav className="toolbar">
      <button className="tool active" onClick={onWater}>
        <WaterIcon />
        <span>澆水</span>
      </button>
      <button className="tool" onClick={onShop}>
        <BagIcon />
        <span>花店</span>
      </button>
    </nav>
  );
}
