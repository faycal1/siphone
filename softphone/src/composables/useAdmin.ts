import { reactive, onUnmounted } from 'vue';

export function useAdmin() {
  const stats = reactive({
    channels: [] as any[],
    endpoints: [] as any[],
    registrations: [] as any[],
    isOnline: false,
    isPushActive: false,
    error: null as string | null
  });

  let socket: WebSocket | null = null;
  let reconnectTimer: any = null;
  let isActive = false;

  const fetchStats = async (baseIp: string) => {
    const baseUrl = `http://${baseIp}:8088/ari`;
    const apiKey = 'admin:adminpass';

    try {
      const [channelsRes, endpointsRes] = await Promise.all([
        fetch(`${baseUrl}/channels?api_key=${apiKey}`),
        fetch(`${baseUrl}/endpoints?api_key=${apiKey}`)
      ]);

      if (!channelsRes.ok || !endpointsRes.ok) {
        throw new Error(`API Error: Channels ${channelsRes.status}, Endpoints ${endpointsRes.status}`);
      }

      stats.channels = await channelsRes.json();
      stats.endpoints = await endpointsRes.json();
      stats.registrations = []; // Clear mock data
      stats.isOnline = true;
      stats.error = null;
    } catch (err: any) {
      stats.isOnline = false;
      stats.error = err.message;
    }
  };

  const initPushStream = (baseIp: string) => {
    if (socket) {
      socket.close();
      socket = null;
    }

    if (!isActive) return;

    const apiKey = 'admin:adminpass';
    const wsUrl = `ws://${baseIp}:8088/ari/events?api_key=${apiKey}&app=softphone_monitor&subscribeAll=true`;

    try {
      socket = new WebSocket(wsUrl);

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;

      socket.onopen = () => {
        if (!isActive) {
          socket?.close();
          return;
        }
        console.log('ARI Event Stream Connected');
        stats.isPushActive = true;
        fetchStats(baseIp); // Initial sync
        
        // Safety Net: Gentle background sync every 5s to catch any skewed states
        fallbackInterval = setInterval(() => {
          if (isActive) fetchStats(baseIp);
        }, 5000);
      };

      socket.onmessage = (event) => {
        if (!isActive) return;
        const data = JSON.parse(event.data);

        // Catch all events to trigger instant updates
        if (debounceTimer) clearTimeout(debounceTimer);
        
        debounceTimer = setTimeout(() => {
          if (isActive) {
            console.log(`ARI Sync Triggered by: ${data.type}`);
            fetchStats(baseIp);
          }
        }, 500); 
      };

      socket.onclose = () => {
        stats.isPushActive = false;
        if (fallbackInterval) clearInterval(fallbackInterval);
        
        if (isActive) {
          console.warn('ARI Stream Closed. Reconnecting...');
          scheduleReconnect(baseIp);
        }
      };

      socket.onerror = () => {
        stats.isPushActive = false;
        if (fallbackInterval) clearInterval(fallbackInterval);
        if (isActive) scheduleReconnect(baseIp);
      };
    } catch (e) {
      if (isActive) scheduleReconnect(baseIp);
    }
  };

  const scheduleReconnect = (baseIp: string) => {
    if (!isActive) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => initPushStream(baseIp), 5000);
  };

  const startMonitoring = (baseIp: string) => {
    isActive = true;
    fetchStats(baseIp);
    initPushStream(baseIp);
  };

  const stopMonitoring = () => {
    isActive = false;
    if (socket) {
      socket.close();
      socket = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  onUnmounted(() => stopMonitoring());

  return {
    stats,
    startMonitoring,
    stopMonitoring,
    fetchStats
  };
}
