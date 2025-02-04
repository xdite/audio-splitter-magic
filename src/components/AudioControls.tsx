
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Play, Pause, Scissors, Download, Wand2 } from 'lucide-react';

interface AudioControlsProps {
  isPlaying: boolean;
  audioFile: File | null;
  markers: number[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPlayPause: () => void;
  onAddMarker: () => void;
  onAutoDetect: () => void;
  onExport: () => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  audioFile,
  markers,
  onFileUpload,
  onPlayPause,
  onAddMarker,
  onAutoDetect,
  onExport,
}) => {
  return (
    <div className="flex justify-center gap-4">
      <Button variant="outline" onClick={() => document.getElementById('audio-upload')?.click()}>
        <Upload className="mr-2 h-4 w-4" />
        上传音频
      </Button>
      <input
        id="audio-upload"
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={onFileUpload}
      />
      
      <Button variant="outline" onClick={onPlayPause} disabled={!audioFile}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <Button variant="outline" onClick={onAddMarker} disabled={!audioFile}>
        <Scissors className="mr-2 h-4 w-4" />
        添加分割点
      </Button>

      <Button variant="outline" onClick={onAutoDetect} disabled={!audioFile}>
        <Wand2 className="mr-2 h-4 w-4" />
        自动检测
      </Button>

      <Button variant="outline" onClick={onExport} disabled={!audioFile || markers.length === 0}>
        <Download className="mr-2 h-4 w-4" />
        导出片段
      </Button>
    </div>
  );
};

export default AudioControls;
