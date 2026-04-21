import { reactive, shallowRef, markRaw } from 'vue';
import * as JsSIP from 'jssip';
import { useSounds } from './useSounds';

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  NOTICE: 2,
  ERROR: 3
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export function useSIP() {
  const socket = shallowRef<any>(null);
  const ua = shallowRef<JsSIP.UA | null>(null);
  const session = shallowRef<any>(null);
  const remoteAudio = markRaw(new Audio());
  
  remoteAudio.autoplay = true;
  remoteAudio.hidden = true;
  
  const sounds = useSounds();
  
  const state = reactive({
    isConnected: false,
    isRegistered: false,
    registrationError: '',
    currentCall: null as {
      remoteIdentity: string;
      status: string;
      isIncoming: boolean;
      localStream?: MediaStream;
      remoteStream?: MediaStream;
    } | null,
    activePreset: 'Local Dev',
    logs: [] as { time: string; msg: string; type: 'info' | 'error' | 'success'; level: LogLevel }[],
  });


  const sysLog = (msg: string, level: LogLevel = LogLevel.INFO, type: 'info' | 'error' | 'success' = 'info') => {
    // Filter out DEBUG logs in Demo mode
    if (state.activePreset === 'CSC360 Demo' && level === LogLevel.DEBUG) {
      return;
    }

    state.logs.unshift({
      time: new Date().toLocaleTimeString(),
      msg,
      type,
      level
    });
    if (state.logs.length > 50) state.logs.pop();
  };

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    sysLog(msg, LogLevel.INFO, type);
  };

  const connect = (config: {
    wsUrl: string;
    extension: string;
    password: string;
    name?: string; // Preset name
  }) => {
    try {
      state.activePreset = config.name || 'Custom';
      sysLog(`Connecting to ${config.wsUrl}... (${state.activePreset})`, LogLevel.INFO);
      
      // WARM UP AUDIO
      sounds.unlockAudio();
      remoteAudio.play().catch(() => {}); // Prime the global sink

      // Pre-request permissions to avoid "reload" issue
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => sysLog('Microphone permission granted', LogLevel.INFO, 'success'))
        .catch((e) => sysLog(`Microphone permission denied: ${e.message}`, LogLevel.ERROR, 'error'));
      
      let domain = '127.0.0.1';
      try {
        const url = new URL(config.wsUrl);
        domain = url.hostname;
      } catch (e) {
        console.warn('Could not parse wsUrl for domain, falling back to 127.0.0.1');
      }

      socket.value = markRaw(new JsSIP.WebSocketInterface(config.wsUrl));
      
      // Optimization: Force transport=wss if using a secure websocket
      const transportSuffix = config.wsUrl.startsWith('wss') ? ';transport=wss' : '';

      const configuration = {
        sockets: [socket.value],
        uri: `sip:${config.extension}@${domain}${transportSuffix}`,
        password: config.password,
        display_name: `Agent ${config.extension}`,
        // Optimization: Standard Asterisk keep-alives and session stability
        register_expires: 600,
        session_timers: false,
        // Add STUN servers for NAT traversal on external calls
        pcConfig: {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] }
          ],
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          iceTransportPolicy: 'all'
        }
      };

      ua.value = markRaw(new JsSIP.UA(configuration));

      ua.value.on('connected', () => {
        state.isConnected = true;
        addLog('WebSocket Connected', 'success');
      });

      ua.value.on('disconnected', (data: any) => {
        state.isConnected = false;
        state.isRegistered = false;
        sounds.stopAll();
        const reason = data?.error ? ` (Error: ${data.error})` : '';
        sysLog(`WebSocket Disconnected${reason}`, LogLevel.NOTICE, 'error');
        console.error('SIP Disconnected:', data);
      });

      ua.value.on('registered', () => {
        state.isRegistered = true;
        state.registrationError = '';
        sysLog('Registered with Asterisk', LogLevel.INFO, 'success');
      });

      ua.value.on('unregistered', () => {
        state.isRegistered = false;
        addLog('Unregistered');
      });

      ua.value.on('registrationFailed', (data: any) => {
        state.isRegistered = false;
        state.registrationError = data.cause;
        const extra = data.response ? ` | Status: ${data.response.status_code}` : '';
        sysLog(`Registration Failed: ${data.cause}${extra}`, LogLevel.ERROR, 'error');
        console.error('SIP Registration Failed:', data);
      });

      ua.value.on('newRTCSession', (data: { session: any; originator: string }) => {
        const newSession = markRaw(data.session);
        session.value = newSession;

        state.currentCall = {
          remoteIdentity: newSession.remote_identity.uri.user,
          status: data.originator === 'local' ? 'Calling...' : 'Incoming Call...',
          isIncoming: data.originator === 'remote'
        };

        if (data.originator === 'remote') {
          sounds.playRingtone();
        }

        const handlePC = (pc: RTCPeerConnection) => {
          if ((pc as any)._captured) return;
          (pc as any)._captured = true;
          
          sysLog('WebRTC PeerConnection Active', LogLevel.DEBUG, 'success');

          pc.ontrack = (event: RTCTrackEvent) => {
            sysLog(`Remote track received: ${event.track.kind}`, LogLevel.DEBUG, 'info');
            if (state.currentCall) {
              let stream = state.currentCall.remoteStream;
              if (!stream || !(stream instanceof MediaStream)) stream = new MediaStream();
              stream.addTrack(event.track);
              state.currentCall.remoteStream = markRaw(stream);
              
              // Direct attachment to global sink
              remoteAudio.srcObject = state.currentCall.remoteStream;
              remoteAudio.play().catch(e => console.warn('Global playback failed:', e));
              
              sysLog(`Track attached to global sink`, LogLevel.DEBUG, 'success');
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              if (!state.logs.some(l => l.msg.includes('Candidates gathering'))) {
                sysLog('ICE Candidates gathering...', LogLevel.DEBUG, 'info');
              }
            }
          };

          pc.oniceconnectionstatechange = () => {
            const state_str = pc.iceConnectionState;
            if (state.currentCall) {
              if (state_str === 'connected' || state_str === 'completed') {
                state.currentCall.status = 'In Call';
              } else if (state_str === 'failed') {
                state.currentCall.status = 'Media Gap';
                addLog('ICE Failed. Check UDP Ports 10000-20000.', 'error');
              } else {
                state.currentCall.status = 'Establishing Media...';
              }
            }
          };
        };

        // Aggressive PC capture: Check if it already exists or wait for it
        if (newSession.connection) {
          handlePC(newSession.connection);
        }
        newSession.on('peerconnection', (pcData: { peerconnection: RTCPeerConnection }) => {
          handlePC(pcData.peerconnection);
        });

        newSession.on('sdp', (data: { sdp: string; originator: string; type: string }) => {
          const hasIce = data.sdp.includes('ice-pwd');
          const hasDtls = data.sdp.includes('fingerprint');
          console.log(`SDP ${data.type} hasIce:${hasIce} hasDtls:${hasDtls}`);
          sysLog(`SDP ${data.type}: ICE=${hasIce ? 'OK' : 'MISSING'} DTLS=${hasDtls ? 'OK' : 'MISSING'}`, LogLevel.DEBUG, 'info');
        });

        // Additional fallback for stream events
        newSession.on('addstream', (e: any) => {
          console.log('Legacy addstream event:', e.stream.id);
          if (state.currentCall && !state.currentCall.remoteStream) {
            state.currentCall.remoteStream = markRaw(e.stream);
            sysLog('Stream Added (Legacy)', LogLevel.DEBUG, 'success');
          }
        });

        newSession.on('track', (e: any) => {
          console.log('Session track event:', e.track.kind);
          if (state.currentCall && e.track.kind === 'audio') {
            if (!state.currentCall.remoteStream) {
              state.currentCall.remoteStream = markRaw(new MediaStream());
            }
            state.currentCall.remoteStream.addTrack(e.track);
          }
        });

        newSession.on('connecting', () => {
          if (state.currentCall) state.currentCall.status = 'Connecting...';
          sysLog('Call Connecting...', LogLevel.NOTICE);
        });

        newSession.on('progress', () => {
          if (state.currentCall) state.currentCall.status = 'Ringing...';
          sysLog('Call Progress/Ringing...', LogLevel.NOTICE);
          if (data.originator === 'local') {
            sounds.playDialTone();
          }
        });

        newSession.on('accepted', () => {
          sounds.stopAll();
          if (state.currentCall && !state.currentCall.status.includes('ICE')) {
            state.currentCall.status = 'In Call';
          }
          sysLog('Call Accepted', LogLevel.NOTICE, 'success');
        });

        newSession.on('confirmed', () => {
          sounds.stopAll();
          if (state.currentCall && !state.currentCall.status.includes('ICE')) {
            state.currentCall.status = 'In Call';
          }
          sysLog('Call Live', LogLevel.NOTICE, 'success');
        });
        
        newSession.on('failed', (e: any) => {
          sounds.stopAll();
          sounds.playBusyTone();
          state.currentCall = null;
          session.value = null;
          sysLog(`Call Failed: ${e.cause}`, LogLevel.NOTICE, 'error');
        });

        newSession.on('ended', () => {
          sounds.stopAll();
          state.currentCall = null;
          session.value = null;
          sysLog('Call Ended', LogLevel.NOTICE);
        });
      });

      ua.value.start();
    } catch (err: any) {
      addLog(`Setup Error: ${err.message}`, 'error');
    }
  };

  const disconnect = () => {
    if (ua.value) {
      ua.value.stop();
      sounds.stopAll();
      remoteAudio.srcObject = null;
    }
  };

  // High-fidelity Audio Constraints (from InnovateAsterisk)
  const audioConstraints = true;

  const makeCall = (target: string) => {
    if (!ua.value || !state.isRegistered) {
      addLog('Cannot call: Not registered', 'error');
      return;
    }

    // Extract domain from UA configuration for consistency
    const domain = ((ua.value as any).configuration.uri as any).host;

    // Check Browser Secure Context & Media Capabilities
    if (!window.isSecureContext) {
      addLog('Insecure Context: WebRTC is disabled by browser. Use localhost or HTTPS.', 'error');
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addLog('MediaDevices API not available. Check browser permissions.', 'error');
    }

    addLog(`Initiating call to ${target}...`);
    
    const options = {
      mediaConstraints: { audio: audioConstraints, video: false },
      pcConfig: (ua.value as any).configuration.pcConfig,
      rtcConstraints: { 'optional': [{ 'DtlsSrtpKeyAgreement': 'true' }] }
    };

    try {
      ua.value.call(`sip:${target}@${domain}`, options);
      addLog('SDP Offer generated', 'info');
    } catch (e: any) {
      addLog(`Failed to create call: ${e.message}`, 'error');
      console.error('JsSIP call error:', e);
    }
  };

  const terminateCall = () => {
    if (session.value) {
      session.value.terminate();
      sounds.stopAll();
    }
  };

  const answerCall = () => {
    if (session.value && state.currentCall?.isIncoming) {
      sounds.stopAll();
      session.value.answer({
        mediaConstraints: { audio: audioConstraints, video: false }
      });
    }
  };

  const clearLogs = () => {
    state.logs = [];
  };

  const sendDTMF = (tone: string) => {
    if (session.value && state.currentCall?.status === 'In Call') {
      try {
        const options = {
          transportType: 'INFO',
          duration: 100,
          interToneGap: 500
        };
        session.value.sendDTMF(tone, options);
        addLog(`DTMF Sent: ${tone}`, 'success');
      } catch (err: any) {
        addLog(`DTMF Error: ${err.message}`, 'error');
      }
    }
  };

  return {
    state,
    connect,
    disconnect,
    makeCall,
    terminateCall,
    answerCall,
    clearLogs,
    sendDTMF
  };
};
