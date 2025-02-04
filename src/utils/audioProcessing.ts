
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const writeUTFBytes = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export const exportWAV = (audioBuffer: AudioBuffer): Promise<Blob> => {
  const interleaved = new Float32Array(audioBuffer.length * audioBuffer.numberOfChannels);
  const length = audioBuffer.length;
  
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      interleaved[i * audioBuffer.numberOfChannels + channel] = channelData[i];
    }
  }

  const buffer = new ArrayBuffer(44 + interleaved.length * 2);
  const view = new DataView(buffer);
  
  writeUTFBytes(view, 0, 'RIFF');
  view.setUint32(4, 36 + interleaved.length * 2, true);
  writeUTFBytes(view, 8, 'WAVE');
  writeUTFBytes(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, audioBuffer.numberOfChannels, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * audioBuffer.numberOfChannels * 2, true);
  view.setUint16(32, audioBuffer.numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeUTFBytes(view, 36, 'data');
  view.setUint32(40, interleaved.length * 2, true);
  
  const volume = 1;
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    view.setInt16(offset, interleaved[i] * (0x7FFF * volume), true);
    offset += 2;
  }
  
  return new Promise((resolve) => {
    resolve(new Blob([buffer], { type: 'audio/wav' }));
  });
};

export const getSegmentColor = (index: number) => {
  const colors = ['#F2FCE2', '#FEF7CD', '#FEC6A1', '#E5DEFF', '#FFDEE2', '#FDE1D3', '#D3E4FD'];
  return colors[index % colors.length];
};
