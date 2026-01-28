// src/core/Receiver.ts

export type ReceiverStatus = 'listening' | 'stopped' | 'denied';

export class Receiver {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  // Callback כדי שנוכל לעדכן את ה-UI מבחוץ
  public onStatusChange: (status: ReceiverStatus) => void = () => {};
  public onFrequencyDetected: (freq: number) => void = () => {};

  constructor() {}

  async start() {
    try {
      // 1. אתחול ה-Context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 2. בקשת גישה למיקרופון
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 3. יצירת ה-Source וה-Analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      
      // הגדרות רזולוציה ל-FFT
      // 2048 נותן לנו איזון טוב בין דיוק למהירות
      this.analyser.fftSize = 2048; 
      
      source.connect(this.analyser);
      
      this.onStatusChange('listening');
      this.loop();
      
    } catch (err) {
      console.error('Microphone access denied:', err);
      this.onStatusChange('denied');
    }
  }

  stop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
    this.onStatusChange('stopped');
  }

  private loop = () => {
    if (!this.analyser) return;

    // יצירת מערך שיכיל את המידע על התדרים
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // מילוי המערך בנתונים מהמיקרופון בזמן אמת
    this.analyser.getByteFrequencyData(dataArray);

    // מציאת התדר הדומיננטי
    const dominantFreq = this.findDominantFrequency(dataArray);
    
    // שליחת התדר ל-UI (כדי שנראה את זה זז)
    if (dominantFreq > 0) {
        this.onFrequencyDetected(dominantFreq);
    }

    // הרצה חוזרת בפריים הבא
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * ממיר את המידע מה-FFT לתדר ספציפי ב-Hz
   */
  private findDominantFrequency(dataArray: Uint8Array): number {
    if (!this.audioContext) return 0;

    let maxValue = 0;
    let maxIndex = -1;

    // חיפוש ה"פיק" הכי גבוה במערך
    // אנחנו סורקים רק את החלק העליון של הספקטרום כדי לחסוך ביצועים
    // (כי אנחנו יודעים שהתדרים שלנו גבוהים)
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    // סינון רעש: אם ה"פיק" חלש מדי, מתעלמים
    if (maxValue < 50) return 0; 

    // המרה מאינדקס במערך לתדר ב-Hz
    // הנוסחה: Index * SampleRate / FFT_Size
    const nyquist = this.audioContext.sampleRate / 2;
    const frequency = maxIndex * (nyquist / dataArray.length);

    return frequency;
  }
}