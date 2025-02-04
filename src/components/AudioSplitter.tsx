import React, { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Upload, Play, Pause, Scissors, Download, Wand2 } from 'lucide-react';
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

  const autoDetectSilence = async () => {
    if (!wavesurfer.current) {
      toast({
        title: "错误",
        description: "请先上传音频文件",
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

      const duration = wavesurfer.current.getDuration();
      const sampleRate = audioData.sampleRate;
      const channels = audioData.getChannelData(0);
      
      const samplesPerSegment = Math.floor(sampleRate * 0.1);
      const threshold = 0.05;
      const minSilenceLength = 0.5;
      
      const silencePoints: number[] = [];
      let isSilent = false;
      let silenceStart = 0;
      let currentSum = 0;
      
      for (let i = 0; i < channels.length; i += samplesPerSegment) {
        currentSum = 0;
        const segmentEnd = Math.min(i + samplesPerSegment, channels.length);
        
        for (let j = i; j < segmentEnd; j++) {
          currentSum += Math.abs(channels[j]);
        }
        
        const averageAmplitude = currentSum / samplesPerSegment;
        const currentTime = (i / sampleRate);
        
        if (averageAmplitude < threshold && !isSilent) {
          isSilent = true;
          silenceStart = currentTime;
        } else if ((averageAmplitude >= threshold || i >= channels.length - samplesPerSegment) && isSilent) {
          isSilent = false;
          const silenceLength = currentTime - silenceStart;
          
          if (silenceLength >= minSilenceLength) {
            silencePoints.push(silenceStart + silenceLength / 2);
          }
        }
      }

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

    toast({
      title: "功能开发中",
      description: "音频分割功能即将推出",
    });
  };

  const getSegmentColor = (index: number) => {
    const colors = ['#F2FCE2', '#FEF7CD', '#FEC6A1', '#E5DEFF', '#FFDEE2', '#FDE1D3', '#D3E4FD'];
    return colors[index % colors.length];
  };

  const renderSegments = () => {
    if (!wavesurfer.current || markers.length === 0) return null;
    
    const duration = wavesurfer.current.getDuration();
    const segments = [];
    let startTime = 0;

    markers.forEach((marker, index) => {
      const width = ((marker - startTime) / duration) * 100;
      segments.push(
        <div
          key={`segment-${index}`}
          className="absolute top-0 bottom-0"
          style={{
            left: `${(startTime / duration) * 100}%`,
            width: `${width}%`,
            backgroundColor: getSegmentColor(index),
            opacity: 0.2,
            pointerEvents: 'none',
          }}
        />
      );
      startTime = marker;
    });

    const finalWidth = ((duration - startTime) / duration) * 100;
    segments.push(
      <div
        key={`segment-final`}
        className="absolute top-0 bottom-0"
        style={{
          left: `${(startTime / duration) * 100}%`,
          width: `${finalWidth}%`,
          backgroundColor: getSegmentColor(markers.length),
          opacity: 0.2,
          pointerEvents: 'none',
        }}
      />
    );

    return segments;
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

          <Button variant="outline" onClick={autoDetectSilence} disabled={!audioFile}>
            <Wand2 className="mr-2 h-4 w-4" />
            自动检测
          </Button>

          <Button variant="outline" onClick={exportSegments} disabled={!audioFile || markers.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            导出片段
          </Button>
        </div>

        <div className="waveform-container relative">
          {renderSegments()}
          <div ref={waveformRef} className="relative z-10" />
          {markers.map((time, index) => (
            <div
              key={index}
              className="absolute top-0 h-full"
              style={{
                left: `${(time / (wavesurfer.current?.getDuration() || 1)) * 100}%`,
                zIndex: 20,
              }}
            >
              <div className="timeline-marker" />
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs">
                {time.toFixed(2)}s
              </div>
            </div>
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
