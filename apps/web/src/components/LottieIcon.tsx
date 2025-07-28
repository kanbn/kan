import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("react-lottie-player"), { ssr: false });

interface IconProps {
  isPlaying: boolean;
  index: number;
  json: object;
}

const Icon: React.FC<IconProps> = ({ isPlaying, index, json }) => {
  return (
    <Lottie
      key={index}
      animationData={json}
      play={isPlaying}
      loop={false}
      style={{ width: 18, height: 18, fill: "white" }}
      rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
    />
  );
};

export default Icon;
