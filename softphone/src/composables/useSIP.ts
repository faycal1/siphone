import { reactive, shallowRef, markRaw, watch } from 'vue';
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
  const consultSession = shallowRef<any>(null); // For Attended Transfer
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
      qos?: {
        jitter: number;
        latency: number;
        packetsLost: number;
        health: 'excellent' | 'good' | 'fair' | 'poor';
      };
    } | null,
    activePreset: 'Local Dev',
    logs: [] as { time: string; msg: string; type: 'info' | 'error' | 'success'; level: LogLevel }[],
    availableDevices: {
      inputs: [] as MediaDeviceInfo[],
      outputs: [] as MediaDeviceInfo[]
    },
    selectedDevices: {
      inputId: 'default',
      outputId: 'default'
    },
    isAutoAnswerEnabled: false,
    activityHistory: [] as { time: string; msg: string; type: 'call' | 'reg' | 'dtmf' | 'system'; date: string }[],
    globalActivityHistory: [] as { time: string; msg: string; type: string; date: string; sip: string }[],
    ariEndpoints: [] as string[],
    baseIp: '',
  });

  const fetchEndpoints = async () => {
    if (!state.baseIp) return;
    try {
      const ariUser = import.meta.env.VITE_ARI_USER;
      const ariPass = import.meta.env.VITE_ARI_PASS;
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      // Port 8088 is default for Asterisk HTTP
      const url = `${protocol}://${state.baseIp}:8088/ari/endpoints`;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + btoa(ariUser + ":" + ariPass)
        }
      });
      const data = await res.json();
      // Filter only PJSIP endpoints and extract resource names
      state.ariEndpoints = data
        .filter((e: any) => e.technology === 'PJSIP')
        .map((e: any) => e.resource);
    } catch (e) {
      console.error('Failed to fetch ARI endpoints', e);
    }
  };

  const fetchGlobalActivity = async () => {
    if (!state.baseIp) return;
    const isRemote = state.activePreset === 'CSC360 Demo';
    const protocol = window.location.protocol === 'https:' || isRemote ? 'https' : 'http';
    
    const configUrl = isRemote 
      ? import.meta.env.VITE_GET_LOGS_URL_REMOTE 
      : import.meta.env.VITE_GET_LOGS_URL_LOCAL;

    const endpoint = configUrl
      ? configUrl.replace('{baseIp}', state.baseIp)
      : (isRemote ? `${protocol}://${state.baseIp}/get_logs.php` : `http://${state.baseIp}:5000/get-activities`);

    try {
      const resp = await fetch(endpoint);
      const data = await resp.json();
      state.globalActivityHistory = data.history || [];
      
      // Attempt to sync personal history if we have identity
      syncPersonalHistory();
    } catch (e) {
      console.error('Failed to fetch activity logs', e);
    }
  };

  const syncPersonalHistory = () => {
    if (ua.value) {
      const mySip = (ua.value as any).configuration.uri.user;
      const filtered = state.globalActivityHistory.filter(h => h.sip === mySip);
      // Only sync if we have no local history yet (initial load/refresh)
      if (state.activityHistory.length <= 1) {
        state.activityHistory = filtered as any[];
      }
    }
  };

  const trackActivity = async (msg: string, type: 'call' | 'reg' | 'dtmf' | 'system' = 'system') => {
    const entry = {
      time: new Date().toLocaleTimeString(),
      date: new Date().toISOString().split('T')[0],
      msg,
      type
    };
    
    state.activityHistory.unshift(entry);
    if (state.activityHistory.length > 500) state.activityHistory.pop();
    
    // Backend Persistence
    if (state.baseIp && ua.value) {
      const sip = (ua.value as any).configuration.uri.user;
      // Determine logging endpoint
      const isRemote = state.activePreset === 'CSC360 Demo';
      const protocol = window.location.protocol === 'https:' || isRemote ? 'https' : 'http';
      
      const configUrl = isRemote 
        ? import.meta.env.VITE_LOG_URL_REMOTE 
        : import.meta.env.VITE_LOG_URL_LOCAL;

      const endpoint = configUrl
        ? configUrl.replace('{baseIp}', state.baseIp)
        : (isRemote ? `${protocol}://${state.baseIp}/log.php` : `http://${state.baseIp}:5000/log-activity`);
        
      try {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sip, msg, type })
        });
      } catch (e) {
        // Silent fail for background sync
      }
    }
  };


  const sysLog = (msg: string, level: LogLevel = LogLevel.INFO, type: 'info' | 'error' | 'success' = 'info') => {
    // Filter out DEBUG logs in Demo mode
    if (state.activePreset === 'CSC360 Demo' && level === LogLevel.DEBUG) {
      return;
    }

    state.logs.push({
      time: new Date().toLocaleTimeString(),
      msg,
      type,
      level
    });
    if (state.logs.length > 50) state.logs.shift();
  };

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    sysLog(msg, LogLevel.INFO, type);
  };

  const enumerateDevices = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      state.availableDevices.inputs = devices.filter(d => d.kind === 'audioinput');
      state.availableDevices.outputs = devices.filter(d => d.kind === 'audiooutput');
      
      // Auto-select defaults if not set
      if (state.selectedDevices.inputId === 'default' && state.availableDevices.inputs.length > 0) {
        state.selectedDevices.inputId = state.availableDevices.inputs[0].deviceId;
      }
      if (state.selectedDevices.outputId === 'default' && state.availableDevices.outputs.length > 0) {
        state.selectedDevices.outputId = state.availableDevices.outputs[0].deviceId;
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  };

  const setAudioOutput = async (deviceId: string) => {
    state.selectedDevices.outputId = deviceId;
    if ((remoteAudio as any).setSinkId) {
      try {
        await (remoteAudio as any).setSinkId(deviceId);
        sysLog(`Audio output set to: ${deviceId}`, LogLevel.DEBUG, 'success');
      } catch (err: any) {
        sysLog(`Failed to set audio output: ${err.message}`, LogLevel.ERROR, 'error');
      }
    } else {
      sysLog('Speaker selection not supported in this browser', LogLevel.NOTICE, 'info');
    }
  };

  const connect = (config: {
    wsUrl: string;
    extension: string;
    password: string;
    turnUrl?: string;
    turnUser?: string;
    turnPass?: string;
    name?: string; // Preset name
  }) => {
    let qosInterval: any = null;

    const stopQosPolling = () => {
      if (qosInterval) {
        clearInterval(qosInterval);
        qosInterval = null;
      }
    };

    const startQosPolling = (pc: RTCPeerConnection) => {
      stopQosPolling();
      qosInterval = setInterval(async () => {
        if (!state.currentCall || pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') return;

        try {
          const stats = await pc.getStats();
          let jitter = 0;
          let latency = 0;
          let packetsLost = 0;

          stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              jitter = Math.round((report.jitter || 0) * 1000); // convert to ms
              packetsLost = report.packetsLost || 0;
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              latency = Math.round((report.currentRoundTripTime || 0) * 1000); // convert to ms
            }
          });

          // Calculate health
          let health: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
          if (latency > 400 || jitter > 100) health = 'poor';
          else if (latency > 200 || jitter > 50) health = 'fair';
          else if (latency > 100 || jitter > 20) health = 'good';

          state.currentCall.qos = { jitter, latency, packetsLost, health };
        } catch (e) {
          console.warn('Stats error:', e);
        }
      }, 2000);
    };

    try {
      state.activePreset = config.name || 'Custom';
      try {
        const url = new URL(config.wsUrl);
        state.baseIp = url.hostname;
      } catch (e) {
        state.baseIp = '127.0.0.1';
      }
      sysLog(`Connecting to ${config.wsUrl}... (${state.activePreset})`, LogLevel.INFO);

      // WARM UP AUDIO
      sounds.unlockAudio();
      remoteAudio.play().catch(() => { }); // Prime the global sink

      // Pre-request permissions to avoid "reload" issue (Safety check for insecure contexts)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => sysLog('Microphone permission granted', LogLevel.INFO, 'success'))
          .catch((e) => sysLog(`Microphone permission denied: ${e.message}`, LogLevel.ERROR, 'error'));
      } else {
        sysLog('WebRTC Error: Security context missing. Modern browsers require HTTPS for microphone access.', LogLevel.ERROR, 'error');
      }

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

      // Add TURN if provided
      if (config.turnUrl) {
        const turnServer: any = {
          urls: [config.turnUrl],
          username: config.turnUser,
          credential: config.turnPass
        };
        configuration.pcConfig.iceServers.push(turnServer);
        sysLog(`TURN Relay Configured: ${config.turnUrl}`, LogLevel.INFO);
      }

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
        trackActivity('SIP Registered successfully', 'reg');
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
        trackActivity(`Registration Failed: ${data.cause}`, 'reg');
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

        trackActivity(`${data.originator === 'local' ? 'Outbound' : 'Inbound'} Call: ${newSession.remote_identity.uri.user}`, 'call');

        if (data.originator === 'remote') {
          sounds.playRingtone();
          
          // AUTO-ANSWER / INTERCOM LOGIC
          if (state.isAutoAnswerEnabled) {
            const alertInfo = data.session.request.getHeader('Alert-Info');
            if (alertInfo && (alertInfo.toLowerCase().includes('autoanswer') || alertInfo.toLowerCase().includes('intercom'))) {
              sysLog('Auto-answering Intercom call...', LogLevel.NOTICE, 'success');
              setTimeout(() => answerCall(), 500); // Tiny delay for stability
            }
          }
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

              if (state_str === 'connected' || state_str === 'completed') {
                startQosPolling(pc);
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
          //console.log(`SDP ${data.type} hasIce:${hasIce} hasDtls:${hasDtls}`);
          sysLog(`SDP ${data.type}: ICE=${hasIce ? 'OK' : 'MISSING'} DTLS=${hasDtls ? 'OK' : 'MISSING'}`, LogLevel.DEBUG, 'info');
        });

        // Additional fallback for stream events
        newSession.on('addstream', (e: any) => {
          //console.log('Legacy addstream event:', e.stream.id);
          if (state.currentCall && !state.currentCall.remoteStream) {
            state.currentCall.remoteStream = markRaw(e.stream);
            sysLog('Stream Added (Legacy)', LogLevel.DEBUG, 'success');
          }
        });

        newSession.on('track', (e: any) => {
          //console.log('Session track event:', e.track.kind);
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
          stopQosPolling();
          sysLog(`Call Failed: ${e.cause}`, LogLevel.NOTICE, 'error');
          trackActivity(`Call Failed: ${e.cause}`, 'call');
        });

        newSession.on('ended', () => {
          sounds.stopAll();
          state.currentCall = null;
          session.value = null;
          stopQosPolling();
          sysLog('Call Ended', LogLevel.NOTICE);
          trackActivity('Call Ended', 'call');
        });
      });

      fetchGlobalActivity();
      fetchEndpoints();
      
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

  // High-fidelity Audio Constraints
  const getAudioConstraints = () => {
    return {
      deviceId: state.selectedDevices.inputId !== 'default' ? { exact: state.selectedDevices.inputId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
  };

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
      mediaConstraints: { audio: getAudioConstraints(), video: false },
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
        mediaConstraints: { audio: getAudioConstraints(), video: false }
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
        trackActivity(`DTMF Sent: ${tone}`, 'dtmf');
      } catch (err: any) {
        addLog(`DTMF Error: ${err.message}`, 'error');
      }
    }
  };

  const hold = () => {
    if (session.value && !session.value.isOnHold().local) {
      session.value.hold({
        useUpdate: true // More stable for Asterisk
      });
      if (state.currentCall) state.currentCall.status = 'On Hold';
      sysLog('Call put on Hold', LogLevel.NOTICE);
    }
  };

  const unhold = () => {
    if (session.value && session.value.isOnHold().local) {
      session.value.unhold({
        useUpdate: true
      });
      if (state.currentCall) state.currentCall.status = 'In Call';
      sysLog('Call resumed', LogLevel.NOTICE);
    }
  };

  const blindTransfer = (target: string) => {
    if (session.value && target) {
      try {
        session.value.refer(target);
        sysLog(`Blind Transfer initiated to: ${target}`, LogLevel.NOTICE, 'success');
        trackActivity(`Blind Transfer to ${target}`, 'call');
      } catch (err: any) {
        addLog(`Transfer Error: ${err.message}`, 'error');
      }
    }
  };

  const startAttendedTransfer = (target: string) => {
    if (!ua.value || !session.value || !target) return;

    try {
      // 1. Hold original call
      hold();
      
      const domain = ((ua.value as any).configuration.uri as any).host;
      const options = {
        mediaConstraints: { audio: getAudioConstraints(), video: false },
        pcConfig: (ua.value as any).configuration.pcConfig,
        rtcConstraints: { 'optional': [{ 'DtlsSrtpKeyAgreement': 'true' }] }
      };

      // 2. Start consult call
      consultSession.value = ua.value.call(`sip:${target}@${domain}`, options);
      sysLog(`Consultation call started to: ${target}`, LogLevel.NOTICE);

      consultSession.value.on('failed', () => {
        sysLog('Consultation failed, reverting...', LogLevel.NOTICE, 'error');
        consultSession.value = null;
        unhold();
      });

      consultSession.value.on('ended', () => {
        consultSession.value = null;
      });
    } catch (err: any) {
      addLog(`Attended Transfer Setup Error: ${err.message}`, 'error');
    }
  };

  const completeAttendedTransfer = () => {
    if (session.value && consultSession.value) {
      try {
        const replaces = `${consultSession.value.dialog.id.call_id};to-tag=${consultSession.value.dialog.id.remote_tag};from-tag=${consultSession.value.dialog.id.local_tag}`;
        const target = consultSession.value.remote_identity.uri.toString();
        
        session.value.refer(target + "?Replaces=" + encodeURIComponent(replaces));
        sysLog('Attended Transfer completed', LogLevel.NOTICE, 'success');
        
        consultSession.value.terminate();
        consultSession.value = null;
      } catch (err: any) {
        addLog(`Attended Transfer Commit Error: ${err.message}`, 'error');
      }
    }
  };

  const cancelAttendedTransfer = () => {
    if (consultSession.value) {
      consultSession.value.terminate();
      consultSession.value = null;
    }
    unhold();
    sysLog('Attended Transfer cancelled', LogLevel.NOTICE);
  };

  // Watch for identity to sync history
  watch(() => ua.value, (newUa) => {
    if (newUa) syncPersonalHistory();
  });

  // Watch for global history updates to sync personal
  watch(() => state.globalActivityHistory, () => {
    syncPersonalHistory();
  }, { deep: true });

  return {
    state,
    connect,
    disconnect,
    makeCall,
    terminateCall,
    answerCall,
    clearLogs,
    sendDTMF,
    enumerateDevices,
    setAudioOutput,
    hold,
    unhold,
    blindTransfer,
    startAttendedTransfer,
    completeAttendedTransfer,
    cancelAttendedTransfer,
    consultSession,
    trackActivity,
    fetchGlobalActivity,
    fetchEndpoints
  };
};
