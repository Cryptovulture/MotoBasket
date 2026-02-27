import { useBlockInfo } from '../hooks/useBlockInfo';

export default function BlockInfo() {
  const { blockNumber, secondsUntilBlock, networkName, isConnected } = useBlockInfo();

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 text-xs font-mono">
      {/* Network badge */}
      <span className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-dark-300">
        {networkName}
      </span>

      {/* Block number */}
      <div className="flex items-center space-x-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="text-dark-300">
          {blockNumber !== null ? blockNumber.toLocaleString() : '---'}
        </span>
      </div>

      {/* Next block countdown */}
      <span className="text-dark-500">
        ~{formatCountdown(secondsUntilBlock)}
      </span>
    </div>
  );
}
