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

// 将 AudioBuffer 转换为 Blob
const audioBufferToBlob = async (audioBuffer: AudioBuffer): Promise<Blob> => {
  const channelData = audioBuffer.getChannelData(0);
  const audioContext = new AudioContext();
  const newBuffer = audioContext.createBuffer(1, channelData.length, audioBuffer.sampleRate);
  newBuffer.copyToChannel(channelData, 0);

  return new Promise((resolve) => {
    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    source.buffer = newBuffer;
    source.connect(mediaStreamDestination);
    source.start(0);

    const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/mpeg' }));
    
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), (newBuffer.duration * 1000) + 100);
  });
};

// 分割音频并导出为 ZIP
export const exportAudioSegments = async (audioBuffer: AudioBuffer, markers: number[], fileName: string) => {
  const zip = new JSZip();
  const sortedMarkers = [0, ...markers.sort((a, b) => a - b), audioBuffer.duration];
  
  // 创建每个分段的 AudioBuffer 并添加到 ZIP
  for (let i = 0; i < sortedMarkers.length - 1; i++) {
    const startTime = sortedMarkers[i];
    const endTime = sortedMarkers[i + 1];
    const duration = endTime - startTime;
    
    // 创建新的 AudioBuffer 用于存储分段
    const segmentBuffer = new AudioContext().createBuffer(
      1,
      Math.floor(duration * audioBuffer.sampleRate),
      audioBuffer.sampleRate
    );
    
    // 复制原始音频数据到分段
    const channelData = audioBuffer.getChannelData(0);
    const startSample = Math.floor(startTime * audioBuffer.sampleRate);
    const segmentData = channelData.slice(
      startSample,
      startSample + Math.floor(duration * audioBuffer.sampleRate)
    );
    segmentBuffer.copyToChannel(segmentData, 0);
    
    // 转换为 Blob 并添加到 ZIP
    const blob = await audioBufferToBlob(segmentBuffer);
    zip.file(`segment_${(i + 1).toString().padStart(3, '0')}.mp3`, blob);
  }
  
  // 生成并下载 ZIP 文件
  const content = await zip.generateAsync({ type: 'blob' });
  const baseFileName = fileName.replace(/\.[^/.]+$/, ''); // 移除文件扩展名
  saveAs(content, `${baseFileName}_segments.zip`);
};
