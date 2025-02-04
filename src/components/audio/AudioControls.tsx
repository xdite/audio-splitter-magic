
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Play, Pause, Scissors, Download, Wand2 } from 'lucide-react';

interface AudioControlsProps {
  isPlaying: boolean;
  audioFile: File | null;
  markers: number[];
  onUploadClick: () => void;
  onPlayPauseClick: () => void;
  onAddMarkerClick: () => void;
  onAutoDetectClick: () => void;
  onExportClick: () => void;
}

const AudioControls = ({
  isPlaying,
  audioFile,
  markers,
  onUploadClick,
  onPlayPauseClick,
  onAddMarkerClick,
  onAutoDetectClick,
  onExportClick,
}: AudioControlsProps) => {
  return (
    <div className="flex justify-center gap-4">
      <Button variant="outline" onClick={onUploadClick}>
        <Upload className="mr-2 h-4 w-4" />
        上传音频
      </Button>
      
      <Button variant="outline" onClick={onPlayPauseClick} disabled={!audioFile}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <Button variant="outline" onClick={onAddMarkerClick} disabled={!audioFile}>
        <Scissors className="mr-2 h-4 w-4" />
        添加分割点
      </Button>

      <Button variant="outline" onClick={onAutoDetectClick} disabled={!audioFile}>
        <Wand2 className="mr-2 h-4 w-4" />
        自动检测
      </Button>

      <Button variant="outline" onClick={onExportClick} disabled={!audioFile || markers.length === 0}>
        <Download className="mr-2 h-4 w-4" />
        导出片段
      </Button>
    </div>
  );
};

export default AudioControls;
