
import React, { useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useToast } from '@/components/ui/use-toast';
import WaveformDisplay from './audio/WaveformDisplay';
import AudioControls from './audio/AudioControls';
import MarkersList from './audio/MarkersList';
import { exportWAV, getSegmentColor } from '@/utils/audioProcessing';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const AudioSplitter = () => {
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [markers, setMarkers] = useState<number[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleWaveSurferInit = (ws: WaveSurfer) => {
    wavesurfer.current = ws;
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
  };

  const handleFileUpload = () => {
    const input = document.getElementById('audio-upload') as HTMLInputElement;
    input.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (markers.length === 0) {
      toast({
        title: "错误",
        description: "请先添加分割点",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "处理中",
      description: "正在处理音频分段...",
    });

    try {
      const audioContext = new AudioContext();
      const response = await fetch(URL.createObjectURL(audioFile));
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const zip = new JSZip();
      const originalFileName = audioFile.name.replace(/\.[^/.]+$/, "");
      
      const segmentTimes = [0, ...markers, audioBuffer.duration];
      
      for (let i = 0; i < segmentTimes.length - 1; i++) {
        const startTime = segmentTimes[i];
        const endTime = segmentTimes[i + 1];
        const segmentDuration = endTime - startTime;
        
        const segmentSamples = Math.floor(segmentDuration * audioBuffer.sampleRate);
        const segmentContext = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          segmentSamples,
          audioBuffer.sampleRate
        );
        
        const sourceNode = segmentContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(segmentContext.destination);
        
        sourceNode.start(0, startTime, segmentDuration);
        
        const segmentBuffer = await segmentContext.startRendering();
        const wavBlob = await exportWAV(segmentBuffer);
        
        zip.file(`${originalFileName}_part${i + 1}.wav`, wavBlob);
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${originalFileName}_segments.zip`);
      
      toast({
        title: "完成",
        description: "音频分段已成功导出",
      });
    } catch (error) {
      console.error('导出失败:', error);
      toast({
        title: "错误",
        description: "音频导出失败",
        variant: "destructive",
      });
    }
  };

  const renderSegments = useCallback(() => {
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
  }, [markers]);

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
          onUploadClick={handleFileUpload}
          onPlayPauseClick={togglePlayPause}
          onAddMarkerClick={addMarker}
          onAutoDetectClick={autoDetectSilence}
          onExportClick={exportSegments}
        />
        
        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="waveform-container relative">
          {renderSegments()}
          <WaveformDisplay onWaveSurferInit={handleWaveSurferInit} />
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

        <MarkersList markers={markers} />
      </div>
    </div>
  );
};

export default AudioSplitter;

