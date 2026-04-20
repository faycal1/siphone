import { markRaw } from 'vue';

export function useSounds() {
  // Use public folder paths
  const ringtone = markRaw(new Audio('/sounds/Ringtone_1.mp3'));
  const dialTone = markRaw(new Audio('/sounds/Tone_EarlyMedia-US.mp3'));
  const busyTone = markRaw(new Audio('/sounds/Tone_Busy-US.mp3'));
  const alertTone = markRaw(new Audio('/sounds/Alert.mp3'));

  ringtone.loop = true;
  dialTone.loop = true;

  const playRingtone = () => {
    stopAll();
    ringtone.play().catch(e => console.warn('Ringtone play blocked by browser. User interaction required.', e));
  };

  const playDialTone = () => {
    stopAll();
    dialTone.play().catch(e => console.warn('DialTone play blocked by browser.', e));
  };

  const playBusyTone = () => {
    stopAll();
    busyTone.play().catch(e => console.warn('BusyTone play failed:', e));
    // Automatically stop after a few seconds
    setTimeout(() => {
      busyTone.pause();
      busyTone.currentTime = 0;
    }, 4000);
  };

  const playAlert = () => {
    alertTone.play().catch(e => console.warn('Alert play failed:', e));
  };

  const stopAll = () => {
    [ringtone, dialTone, busyTone, alertTone].forEach(a => {
      a.pause();
      a.currentTime = 0;
    });
  };

  return {
    playRingtone,
    playDialTone,
    playBusyTone,
    playAlert,
    stopAll
  };
}
