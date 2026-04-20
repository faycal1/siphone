import { reactive, shallowRef, markRaw } from 'vue';
import * as JsSIP from 'jssip';
import { useSounds } from './useSounds';

export function useSIP() {
  const socket = shallowRef<any>(null);
  const ua = shallowRef<JsSIP.UA | null>(null);
  const session = shallowRef<any>(null);
  
  const { playRingtone, playDialTone, playBusyTone, stopAll } = useSounds();
  
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
    logs: [] as { time: string; msg: string; type: 'info' | 'error' | 'success' }[],
  });

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    state.logs.unshift({
      time: new Date().toLocaleTimeString(),
      msg,
      type
    });
    if (state.logs.length > 50) state.logs.pop();
  };

  const connect = (config: {
    wsUrl: string;
    extension: string;
    password: string;
  }) => {
    try {
      addLog(`Connecting to ${config.wsUrl}...`);
      
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
        stopAll();
        const reason = data?.error ? ` (Error: ${data.error})` : '';
        addLog(`WebSocket Disconnected${reason}`, 'error');
        console.error('SIP Disconnected:', data);
      });

      ua.value.on('registered', () => {
        state.isRegistered = true;
        state.registrationError = '';
        addLog('Registered with Asterisk', 'success');
      });

      ua.value.on('unregistered', () => {
        state.isRegistered = false;
        addLog('Unregistered');
      });

      ua.value.on('registrationFailed', (data: any) => {
        state.isRegistered = false;
        state.registrationError = data.cause;
        const extra = data.response ? ` | Status: ${data.response.status_code}` : '';
        addLog(`Registration Failed: ${data.cause}${extra}`, 'error');
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

        const handlePC = (pc: RTCPeerConnection) => {
          if ((pc as any)._captured) return;
          (pc as any)._captured = true;
          
          addLog('WebRTC PeerConnection Active', 'success');

          pc.ontrack = (event: RTCTrackEvent) => {
            addLog(`Remote track received: ${event.track.kind}`, 'info');
            if (state.currentCall) {
              let stream = state.currentCall.remoteStream;
              if (!stream || !(stream instanceof MediaStream)) stream = new MediaStream();
              stream.addTrack(event.track);
              state.currentCall.remoteStream = markRaw(stream);
              addLog(`Track Attached & Active`, 'success');
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              if (!state.logs.some(l => l.msg.includes('Candidates gathering'))) {
                addLog('ICE Candidates gathering...', 'info');
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
          addLog(`SDP ${data.type}: ICE=${hasIce ? 'OK' : 'MISSING'} DTLS=${hasDtls ? 'OK' : 'MISSING'}`, 'info');
        });

        // Additional fallback for stream events
        newSession.on('addstream', (e: any) => {
          console.log('Legacy addstream event:', e.stream.id);
          if (state.currentCall && !state.currentCall.remoteStream) {
            state.currentCall.remoteStream = markRaw(e.stream);
            addLog('Stream Added (Legacy)', 'success');
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
          addLog('Call Connecting...');
        });

        newSession.on('progress', () => {
          if (state.currentCall) state.currentCall.status = 'Ringing...';
          addLog('Call Progress/Ringing...');
        });

        newSession.on('accepted', () => {
          stopAll();
          if (state.currentCall && !state.currentCall.status.includes('ICE')) {
            state.currentCall.status = 'In Call';
          }
          addLog('Call Accepted', 'success');
        });

        newSession.on('confirmed', () => {
          stopAll();
          if (state.currentCall && !state.currentCall.status.includes('ICE')) {
            state.currentCall.status = 'In Call';
          }
          addLog('Call Live', 'success');
        });
        
        newSession.on('failed', (e: any) => {
          stopAll();
          playBusyTone();
          state.currentCall = null;
          session.value = null;
          addLog(`Call Failed: ${e.cause}`, 'error');
        });

        newSession.on('ended', () => {
          stopAll();
          state.currentCall = null;
          session.value = null;
          addLog('Call Ended');
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
      stopAll();
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
    const domain = (ua.value.configuration.uri as any).host;

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
      pcConfig: ua.value.configuration.pcConfig,
      rtcConstraints: { 'optional': [{ 'DtlsSrtpKeyAgreement': 'true' }] }
    };

    try {
      const outgoingSession = ua.value.call(`sip:${target}@${domain}`, options);
      addLog('SDP Offer generated', 'info');
    } catch (e: any) {
      addLog(`Failed to create call: ${e.message}`, 'error');
      console.error('JsSIP call error:', e);
    }
  };

  const terminateCall = () => {
    if (session.value) {
      session.value.terminate();
      stopAll();
    }
  };

  const answerCall = () => {
    if (session.value && state.currentCall?.isIncoming) {
      stopAll();
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
