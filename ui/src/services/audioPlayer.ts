interface AudioData {
    audio: string;  // base64 encoded audio
    text: string;   // the text that was spoken
    sample_rate: number;
    voice: string;
    format: string; // audio format (e.g., 'float32')
    channels: number; // number of audio channels
}

export class AudioPlayer {
    private audioQueue: AudioData[] = [];
    private audioContext = new AudioContext();
    private isPlaying = false;
    
    initialize(socketService: { on: (arg0: string, arg1: (data: AudioData) => void) => void }) {
        socketService.on('tts_audio', (data: AudioData) => {
            console.log('Received TTS audio data');
            this.audioQueue.push(data);
            
            // If we're not already playing, start playback
            if (!this.isPlaying) {
              console.log('Playing next audio');
              this.playNextAudio();
            }
          });
    }

    playNextAudio = async () => {
        if (this.audioQueue.length === 0) {
          this.isPlaying = false;
          return;
        }
    
        this.isPlaying = true;
        const audioData = this.audioQueue.shift();
        
        if (!audioData || !this.audioContext) {
          this.isPlaying = false;
          return;
        }
    
        try {
            // Decode base64 audio
            const binaryString = window.atob(audioData.audio);
            const len = binaryString.length;
            console.log(audioData.format);
          
            // For float32 format
            const buffer = new ArrayBuffer(len);
            const bytes = new Uint8Array(buffer);
            
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create an AudioBuffer directly
            const channels = audioData.channels || 1;  // Number of channels (default to mono)
            const audioBuffer = this.audioContext.createBuffer(
                channels,  // Use the stored channels variable
                len / 4 / channels, // Number of samples (4 bytes per float32)
                audioData.sample_rate  // Sample rate
            );
            
            // Convert bytes to float32 and set in the audio buffer
            const floatArray = new Float32Array(buffer);
            
            // Fill audio buffer with the float32 data
            for (let channel = 0; channel < channels; channel++) {
                const channelData = audioBuffer.getChannelData(channel);
                for (let i = 0; i < channelData.length; i++) {
                channelData[i] = floatArray[i + (channel * channelData.length)];
                }
            }
            
            // Create and play source
            console.log("Creating source");
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            console.log("Connecting to destination");
            source.connect(this.audioContext.destination);
            
            // When done, play the next audio in queue
            console.log("Setting onended");
            source.onended = () => {
                console.log("Playing next audio");
                this.playNextAudio();
            };
            
            source.start();
        } catch (error) {
          console.error('Error playing audio:', error);
          // Try to play next audio even if current one failed
          this.playNextAudio();
        }
      };
    
}
