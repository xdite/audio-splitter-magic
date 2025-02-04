```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const detectSilence = async (audioData: AudioBuffer, options: {
  sampleRate: number;
  threshold: number;
  minSilenceLength: number;
}) => {
  const { sampleRate, threshold, minSilenceLength } = options;
  const channels = audioData.getChannelData(0);
  const samplesPerSegment = Math.floor(sampleRate * 0.1);
  const silencePoints: number[] = [];
  let isSilent = false;
  let silenceStart = 0;
  
  for (let i = 0; i < channels.length; i += samplesPerSegment) {
    let currentSum = 0;
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
  
  return silencePoints;
};

export const getSegmentColor = (index: number) => {
  const colors = ['#F2FCE2', '#FEF7CD', '#FEC6A1', '#E5DEFF', '#FFDEE2', '#FDE1D3', '#D3E4FD'];
  return colors[index % colors.length];
};

// 優化的 AudioBuffer 到 Blob 轉換
const audioBufferToBlob = async (audioBuffer: AudioBuffer, audioContext: AudioContext): Promise<Blob> => {
  return new Promise((resolve) => {
    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(mediaStreamDestination);
    source.start(0);

    const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream, {
      mimeType: 'audio/webm;codecs=opus',
      bitsPerSecond: 128000
    });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/mpeg' }));
    
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), (audioBuffer.duration * 1000) + 100);
  });
};

// 優化的音頻分段導出
export const exportAudioSegments = async (
  audioBuffer: AudioBuffer, 
  markers: number[], 
  fileName: string,
  onProgress?: (progress: number) => void
) => {
  const zip = new JSZip();
  const sortedMarkers = [0, ...markers.sort((a, b) => a - b), audioBuffer.duration];
  const audioContext = new AudioContext();
  const totalSegments = sortedMarkers.length - 1;
  const batchSize = 3; // 每批處理的片段數

  // 批量處理片段
  for (let batchStart = 0; batchStart < totalSegments; batchStart += batchSize) {
    const batchPromises = [];
    const batchEnd = Math.min(batchStart + batchSize, totalSegments);

    for (let i = batchStart; i < batchEnd; i++) {
      const startTime = sortedMarkers[i];
      const endTime = sortedMarkers[i + 1];
      const duration = endTime - startTime;
      
      // 創建片段 AudioBuffer
      const segmentBuffer = audioContext.createBuffer(
        1,
        Math.floor(duration * audioBuffer.sampleRate),
        audioBuffer.sampleRate
      );
      
      // 複製音頻數據
      const channelData = audioBuffer.getChannelData(0);
      const startSample = Math.floor(startTime * audioBuffer.sampleRate);
      const segmentData = channelData.slice(
        startSample,
        startSample + Math.floor(duration * audioBuffer.sampleRate)
      );
      segmentBuffer.copyToChannel(segmentData, 0);
      
      // 將片段轉換為 Blob 的 Promise
      const promise = audioBufferToBlob(segmentBuffer, audioContext)
        .then(blob => {
          zip.file(`segment_${(i + 1).toString().padStart(3, '0')}.mp3`, blob);
          if (onProgress) {
            onProgress((i + 1) / totalSegments);
          }
        });
      
      batchPromises.push(promise);
    }

    // 等待當前批次完成
    await Promise.all(batchPromises);
  }
  
  // 生成並下載 ZIP 檔案
  const content = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });
  const baseFileName = fileName.replace(/\.[^/.]+$/, '');
  saveAs(content, `${baseFileName}_segments.zip`);

  // 清理
  audioContext.close();
};
```
