// OpenAI Realtime Session Manager
// Handles WebSocket connection to OpenAI Realtime API for speech-to-speech

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface RealtimeConfig {
  apiKey: string;
  model: string;
  instructions?: string;
}

export interface AudioChunk {
  audio: Buffer;
  format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  sampleRate: number;
  channels: number;
}

export class RealtimeSession extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: RealtimeConfig;
  private sessionId: string;
  private connected = false;

  constructor(config: RealtimeConfig) {
    super();
    this.config = config;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // OpenAI Realtime API WebSocket URL with model parameter
        const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(this.config.model)}`;

        this.ws = new WebSocket(url, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        this.ws.on('open', () => {
          console.log('Realtime: Connected to OpenAI Realtime API');
          this.connected = true;
          this.initializeSession();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleRealtimeMessage(message);
          } catch (error) {
            console.error('Realtime: Failed to parse message:', error);
          }
        });

        this.ws.on('error', (error) => {
          console.error('Realtime: WebSocket error:', error);
          this.connected = false;
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('Realtime: WebSocket closed');
          this.connected = false;
          this.emit('disconnected');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private initializeSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('Realtime: Cannot initialize session - WebSocket not open');
      return;
    }

    // Configure the session
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.config.instructions || 'You are AImee, a friendly and knowledgeable tour guide. Speak in a conversational, warm tone.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        tools: [],
        tool_choice: 'none',
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
    console.log('Realtime: Session configuration sent');
  }

  private handleRealtimeMessage(message: any): void {
    switch (message.type) {
      case 'session.created':
        console.log('Realtime: Session created:', message.session.id);
        break;

      case 'session.updated':
        console.log('Realtime: Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('Realtime: User speech started');
        this.emit('userSpeechStarted');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('Realtime: User speech stopped');
        this.emit('userSpeechStopped');
        break;

      case 'response.audio.delta':
        // Assistant audio chunk received
        if (message.delta) {
          const audioBuffer = Buffer.from(message.delta, 'base64');
          this.emit('assistantAudio', {
            audio: audioBuffer,
            format: 'pcm16',
            sampleRate: 24000,
            channels: 1
          });
        }
        break;

      case 'response.audio.done':
        console.log('Realtime: Assistant audio response complete');
        this.emit('assistantAudioComplete');
        break;

      case 'response.text.delta':
        // Text transcript (optional for debugging)
        if (message.delta) {
          this.emit('assistantText', message.delta);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User speech transcript (optional for debugging)
        if (message.transcript) {
          this.emit('userTranscript', message.transcript);
        }
        break;

      case 'error':
        console.error('Realtime: API error:', message.error);
        this.emit('error', new Error(message.error.message));
        break;

      default:
        // Log unknown message types for debugging
        if (message.type) {
          console.log(`Realtime: Unhandled message type: ${message.type}`);
        }
    }
  }

  sendAudioChunk(audioChunk: AudioChunk): void {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Realtime: Cannot send audio - not connected');
      return;
    }

    // Convert audio to base64 for OpenAI Realtime API
    const base64Audio = audioChunk.audio.toString('base64');

    const message = {
      type: 'input_audio_buffer.append',
      audio: base64Audio
    };

    this.ws.send(JSON.stringify(message));
  }

  commitAudioBuffer(): void {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'input_audio_buffer.commit'
    };

    this.ws.send(JSON.stringify(message));
  }

  clearAudioBuffer(): void {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'input_audio_buffer.clear'
    };

    this.ws.send(JSON.stringify(message));
  }

  createResponse(): void {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: 'Please respond to the user.'
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}