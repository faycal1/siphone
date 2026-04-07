import { reactive, shallowRef, markRaw } from 'vue';
import * as JsSIP from 'jssip';

export function useSIP() {
  const socket = shallowRef<any>(null);
  const ua = shallowRef<JsSIP.UA | null>(null);
  const session = shallowRef<any>(null);
  
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
      
      socket.value = markRaw(new JsSIP.WebSocketInterface(config.wsUrl));
      
      const configuration = {
        sockets: [socket.value],
        uri: `sip:${config.extension}@127.0.0.1`,
        password: config.password,
        display_name: `Agent ${config.extension}`
      };

      ua.value = markRaw(new JsSIP.UA(configuration));

      ua.value.on('connected', () => {
        state.isConnected = true;
        addLog('WebSocket Connected', 'success');
      });

      ua.value.on('disconnected', () => {
        state.isConnected = false;
        state.isRegistered = false;
        addLog('WebSocket Disconnected', 'error');
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
        addLog(`Registration Failed: ${data.cause}`, 'error');
      });

      ua.value.on('newRTCSession', (data: { session: any; originator: string }) => {
        const newSession = markRaw(data.session);
        session.value = newSession;

        state.currentCall = {
          remoteIdentity: newSession.remote_identity.uri.user,
          status: data.originator === 'local' ? 'Calling...' : 'Incoming Call...',
          isIncoming: data.originator === 'remote'
        };

        newSession.on('peerconnection', (pcData: { peerconnection: RTCPeerConnection }) => {
          pcData.peerconnection.ontrack = (event: RTCTrackEvent) => {
            if (state.currentCall) {
              state.currentCall.remoteStream = event.streams[0];
            }
          };
        });

        newSession.on('connecting', () => addLog('Call Connecting...'));
        newSession.on('accepted', () => {
          if (state.currentCall) state.currentCall.status = 'In Call';
          addLog('Call Accepted', 'success');
        });
        
        newSession.on('failed', (e: any) => {
          state.currentCall = null;
          session.value = null;
          addLog(`Call Failed: ${e.cause}`, 'error');
        });

        newSession.on('ended', () => {
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
    }
  };

  const makeCall = (target: string) => {
    if (!ua.value || !state.isRegistered) {
      addLog('Cannot call: Not registered', 'error');
      return;
    }
    const options = {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false }
    };
    ua.value.call(`sip:${target}@127.0.0.1`, options);
  };

  const terminateCall = () => {
    if (session.value) {
      session.value.terminate();
    }
  };

  const answerCall = () => {
    if (session.value && state.currentCall?.isIncoming) {
      session.value.answer({
        mediaConstraints: { audio: true, video: false }
      });
    }
  };

  const clearLogs = () => {
    state.logs = [];
  };

  return {
    state,
    connect,
    disconnect,
    makeCall,
    terminateCall,
    answerCall,
    clearLogs
  };
}
