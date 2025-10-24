'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface RealtimeGPTProps {
  onTextReceived: (text: string) => void;
  onError: (error: string) => void;
  onConnectionChange: (connected: boolean) => void;
}

interface RealtimeGPTReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastResponse: string;
}

interface RealtimeMessage {
  type: string;
  data?: any;
}

interface ResponseTextDelta {
  type: 'response.text.delta';
  delta: string;
}

interface ResponseTextDone {
  type: 'response.text.done';
}

interface ConversationItem {
  type: 'conversation_item.created';
  item: {
    type: 'message';
    role: 'user' | 'assistant';
    content: Array<{
      type: 'input_text' | 'output_text';
      text: string;
    }>;
  };
}

export const useRealtimeGPT = ({
  onTextReceived,
  onError,
  onConnectionChange
}: RealtimeGPTProps): RealtimeGPTReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentResponseRef = useRef<string>('');

  const connect = useCallback(async () => {
    if (isConnected || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      streamRef.current = stream;

      // Connect to OpenAI Realtime API
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not found');
      }
      
      const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview&api_key=${apiKey}`);

      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to OpenAI Realtime API');
        setIsConnected(true);
        onConnectionChange(true);

        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful AI assistant. Respond naturally and conversationally.',
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
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };

        ws.send(JSON.stringify(sessionConfig));
      };

      ws.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          handleRealtimeMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsListening(false);
        onConnectionChange(false);
        
        // Auto-reconnect if not intentionally closed
        if (event.code !== 1000) {
          setTimeout(() => {
            if (!isConnected) {
              connect();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError('Connection error occurred');
        setIsConnected(false);
        onConnectionChange(false);
      };

    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      onError('Failed to access microphone or connect to API');
    }
  }, [isConnected, onTextReceived, onError, onConnectionChange]);

  const handleRealtimeMessage = useCallback((message: RealtimeMessage) => {
    switch (message.type) {
      case 'response.text.delta':
        const textDelta = message as ResponseTextDelta;
        currentResponseRef.current += textDelta.delta;
        break;

      case 'response.text.done':
        const textDone = message as ResponseTextDone;
        if (currentResponseRef.current.trim()) {
          setLastResponse(currentResponseRef.current);
          onTextReceived(currentResponseRef.current);
          currentResponseRef.current = '';
        }
        break;

      case 'conversation_item.created':
        const conversationItem = message as ConversationItem;
        if (conversationItem.item.role === 'assistant') {
          const textContent = conversationItem.item.content.find(c => c.type === 'output_text');
          if (textContent?.text) {
            setLastResponse(textContent.text);
            onTextReceived(textContent.text);
          }
        }
        break;

      case 'response.audio.delta':
        // Handle audio response if needed
        break;

      case 'response.audio.done':
        // Handle audio completion if needed
        break;

      case 'input_audio_buffer.speech_started':
        console.log('Speech started');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('Speech stopped');
        break;

      case 'response.audio.delta':
        // Handle audio streaming if needed
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }, [onTextReceived]);

  const startListening = useCallback(() => {
    if (!isConnected || isListening || !wsRef.current) {
      return;
    }

    try {
      if (!streamRef.current) {
        onError('No audio stream available');
        return;
      }

      // Create MediaRecorder for audio streaming
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert audio data to base64 and send
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            const audioMessage = {
              type: 'input_audio_buffer.append',
              audio: base64
            };
            wsRef.current?.send(JSON.stringify(audioMessage));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(100); // Send data every 100ms
      setIsListening(true);

      // Send start message
      const startMessage = {
        type: 'input_audio_buffer.commit'
      };
      wsRef.current.send(JSON.stringify(startMessage));

    } catch (error) {
      console.error('Failed to start listening:', error);
      onError('Failed to start audio recording');
    }
  }, [isConnected, isListening, onError]);

  const stopListening = useCallback(() => {
    if (!isListening || !mediaRecorderRef.current) {
      return;
    }

    try {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsListening(false);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send stop message
        const stopMessage = {
          type: 'input_audio_buffer.commit'
        };
        wsRef.current.send(JSON.stringify(stopMessage));
      }
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  }, [isListening]);

  const disconnect = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Intentional disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    onConnectionChange(false);
  }, [onConnectionChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnected,
    isListening,
    startListening,
    stopListening,
    lastResponse
  };
};
