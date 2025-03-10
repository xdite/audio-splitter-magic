
import React, { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useToast } from '@/hooks/use-toast';
import WaveformDisplay from './WaveformDisplay';
import AudioControls from './AudioControls';
import MarkersList from './MarkersList';
import { Progress } from '@/components/ui/progress';
import { detectSilence, exportAudioSegments } from '@/utils/audioProcessing';

const AudioSplitter = () => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [markers, setMarkers] = useState<number[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
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
      wavesurfer.current.on('ready', () => setIsReady(true));
      wavesurfer.current.on('finish', () => setIsReady(false));

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

  const autoDetectSilence = async () => {
    if (!wavesurfer.current || !isReady) {
      toast({
        title: "错误",
        description: "请等待音频加载完成",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "检测中",
      description: "正在自动检测音频片段...",
    });

    try {
      const audioData = wavesurfer.current.getDecodedData();
      if (!audioData) {
        throw new Error('无法获取音频数据');
      }

      const silencePoints = await detectSilence(audioData, {
        sampleRate: audioData.sampleRate,
        threshold: 0.05,
        minSilenceLength: 0.5,
      });

      setMarkers(prev => [...new Set([...prev, ...silencePoints])].sort((a, b) => a - b));
      
      toast({
        title: "检测完成",
        description: `检测到 ${silencePoints.length} 个可能的分割点`,
      });
    } catch (error) {
      console.error('自动检测失败:', error);
      toast({
        title: "检测失败",
        description: "自动检测分割点时发生错误",
        variant: "destructive",
      });
    }
  };

  const exportSegments = async () => {
    if (!audioFile || !wavesurfer.current || !isReady) {
      toast({
        title: "错误",
        description: "请等待音频加载完成",
        variant: "destructive",
      });
      return;
    }

    if (markers.length === 0) {
      toast({
        title: "错误",
        description: "请先添加分割点",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    
    toast({
      title: "导出中",
      description: "正在处理音频分段...",
    });

    try {
      const audioData = wavesurfer.current.getDecodedData();
      if (!audioData) {
        throw new Error('无法获取音频数据');
      }

      await exportAudioSegments(
        audioData, 
        markers, 
        audioFile.name,
        (progress) => {
          setExportProgress(Math.round(progress * 100));
        }
      );

      toast({
        title: "导出成功",
        description: "音频分段已成功导出为 ZIP 文件",
      });
    } catch (error) {
      console.error('导出失败:', error);
      toast({
        title: "导出失败",
        description: "处理音频分段时发生错误",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">音频分割工具</h1>
        <p className="text-muted-foreground">上传音频文件，添加分割点，导出音频片段</p>
      </div>

      <div className="space-y-6">
        <AudioControls
          isPlaying={isPlaying}
          audioFile={audioFile}
          markers={markers}
          onFileUpload={handleFileUpload}
          onPlayPause={togglePlayPause}
          onAddMarker={addMarker}
          onAutoDetect={autoDetectSilence}
          onExport={exportSegments}
        />

        {isExporting && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              正在导出: {exportProgress}%
            </div>
            <Progress value={exportProgress} className="w-full" />
          </div>
        )}

        <WaveformDisplay
          waveformRef={waveformRef}
          markers={markers}
          duration={wavesurfer.current?.getDuration() || 0}
        />

        <MarkersList markers={markers} />
      </div>
    </div>
  );
};

export default AudioSplitter;
