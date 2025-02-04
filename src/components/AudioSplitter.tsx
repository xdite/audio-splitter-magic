import React, { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Upload, Play, Pause, Scissors, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AudioSplitter = () => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [markers, setMarkers] = useState<number[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4a5568',
        progressColor: '#7aa2f7',
        cursorColor: '#bb9af7',
        cursorWidth: 2,
        height: 100,
        normalize: true,
      });

      wavesurfer.current.on('play', () => setIsPlaying(true));
      wavesurfer.current.on('pause', () => setIsPlaying(false));

      return () => {
        wavesurfer.current?.destroy();
      };
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      wavesurfer.current?.loadBlob(file);
      setMarkers([]);
      toast({
        title: "音频已加载",
        description: `文件名: ${file.name}`,
      });
    }
  };

  const togglePlayPause = () => {
    wavesurfer.current?.playPause();
  };

  const addMarker = () => {
    const currentTime = wavesurfer.current?.getCurrentTime() || 0;
    setMarkers(prev => [...prev, currentTime].sort((a, b) => a - b));
    toast({
      title: "添加分割点",
      description: `在 ${currentTime.toFixed(2)} 秒处添加分割点`,
    });
  };

  const exportSegments = async () => {
    if (!audioFile || !wavesurfer.current) {
      toast({
        title: "错误",
        description: "请先上传音频文件",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "导出中",
      description: "正在处理音频分段...",
    });

    // 这里应该添加实际的音频分割逻辑
    // 由于浏览器API限制，实际的音频分割需要使用Web Audio API
    // 这里只是一个示例提示
    toast({
      title: "功能开发中",
      description: "音频分割功能即将推出",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">音频分割工具</h1>
        <p className="text-muted-foreground">上传音频文件，添加分割点，导出音频片段</p>
      </div>

      <div className="space-y-6">
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
            onChange={handleFileUpload}
          />
          
          <Button variant="outline" onClick={togglePlayPause} disabled={!audioFile}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button variant="outline" onClick={addMarker} disabled={!audioFile}>
            <Scissors className="mr-2 h-4 w-4" />
            添加分割点
          </Button>

          <Button variant="outline" onClick={exportSegments} disabled={!audioFile || markers.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            导出片段
          </Button>
        </div>

        <div className="waveform-container relative">
          <div ref={waveformRef} />
          {markers.map((time, index) => (
            <div
              key={index}
              className="timeline-marker"
              style={{
                left: `${(time / (wavesurfer.current?.getDuration() || 1)) * 100}%`
              }}
            />
          ))}
        </div>

        {markers.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">分割点列表:</h3>
            <div className="grid grid-cols-4 gap-2">
              {markers.map((time, index) => (
                <div key={index} className="p-2 bg-muted rounded">
                  {time.toFixed(2)}s
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioSplitter;