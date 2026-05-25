/**
 * Articulate Storyline 360 Yerel Oyunlaştırma Modülü JS
 * Geliştirici: Sayid Özcan Özel IDE Sürümü
 * 
 * Bu dosya; Prosedürel Ses Sentezleyici, Parçacık Motoru, Sınav Akışı,
 * Harici Yapılandırma (config.json) ve Storyline Değişken Aşımı (Overrides),
 * Liderlik Veri Yönetimi ve Articulate Storyline Köprüsü'nü içerir.
 */

// Global Oyunlaştırma Ayarları (Fallback ve Öntanımlı Yapı)
let CONFIG = {
  questionSource: "auto",
  useTimer: true,
  timerSeconds: 15,
  useTimeBonus: true, // kalan sürenin bonus olarak eklenmesi
  pointsRule: "difficultyBased", // "flat" veya "difficultyBased"
  flatPointsPerQuestion: 20,
  easyPoints: 10,
  mediumPoints: 15,
  hardPoints: 20,
  veryHardPoints: 30,
  bronzePercent: 50,
  silverPercent: 80,
  goldPercent: 100,
  passingPercent: 70,
  reportScoreToLMS: true
};

// Global Uygulama Durumu (State)
const state = {
  playerName: '',
  playerScore: 0,
  currentQuestionIndex: 0,
  isQuizActive: false,
  timerInterval: null,
  timeLeft: 15,
  maxPossibleScore: 100, // Sınavdaki maksimum puan (dinamik hesaplanır)
  badges: {
    bronze: false,
    silver: false,
    gold: false
  },
  leaderboard: [],
  answersHistory: [], // { questionIndex, isCorrect, userAnswer, correctAnswer, timeLeft, pointsEarned }
  currentReviewIndex: 0,
  emulatedStorylineVars: {
    active_question_source: 'Yerel Yedek (Gömülü)',
    playerName: '',
    playerScore: 0,
    rank1_name: '-', rank1_score: 0,
    rank2_name: '-', rank2_score: 0,
    rank3_name: '-', rank3_score: 0,
    rank4_name: '-', rank4_score: 0,
    rank5_name: '-', rank5_score: 0,
    badge_bronze: false,
    badge_silver: false,
    badge_gold: false,
    lms_lesson_status: 'Not Attempted',
    lms_score_raw: 0,
    lms_score_scaled: 0
  }
};

// Sabitler
const LOCAL_STORAGE_KEY = 'sayid_edtech_leaderboard';

// Gömülü Yedek Soru Veritabanı (Harici dosya yüklenemezse devreye girer - 8 adet Genel Kültür Sorusu)
let QUESTIONS = [
  {
    "question": "Gökyüzünün mavi görünmesinin temel bilimsel sebebi aşağıdakilerden hangisidir?",
    "choices": [
      "Güneş ışığının atmosferdeki gazlar tarafından saçılması (Rayleigh Saçılması)",
      "Atmosferdeki su buharının okyanusların rengini yansıtması",
      "Ozon tabakasının kendiliğinden mavi renkli bir gaz olması",
      "Uzay boşluğunun karanlığının atmosferde kırılması"
    ],
    "correct": 0,
    "difficulty": "kolay"
  },
  {
    "question": "Dünya'nın en büyük okyanusu aşağıdakilerden hangisidir?",
    "choices": [
      "Atlas Okyanusu (Atlantik)",
      "Hint Okyanusu",
      "Büyük Okyanus (Pasifik)",
      "Kuzey Buz Denizi (Arktik)"
    ],
    "correct": 2,
    "difficulty": "kolay"
  },
  {
    "question": "Prestijli Nobel Ödülleri töreni, her yıl hangi ülkenin başkenti Stockholm'de düzenlenmektedir?",
    "choices": [
      "Norveç",
      "İsveç",
      "Finlandiya",
      "Danimarka"
    ],
    "correct": 1,
    "difficulty": "orta"
  },
  {
    "question": "Güneş sistemindeki en sıcak gezegen hangisidir?",
    "choices": [
      "Güneş'e en yakın olan Merkür",
      "Yoğun sera gazı içeren atmosferiyle Venüs",
      "Kızıl gezegen olarak bilinen Mars",
      "Sistemimizin en büyük gaz devi Jüpiter"
    ],
    "correct": 1,
    "difficulty": "orta"
  },
  {
    "question": "İlk Türkçe sözlük ve dil bilgisi kitabı olan Divânu Lugâti't-Türk hangi yüzyılda yazılmıştır?",
    "choices": [
      "9. Yüzyıl",
      "10. Yüzyıl",
      "11. Yüzyıl",
      "12. Yüzyıl"
    ],
    "correct": 2,
    "difficulty": "zor"
  },
  {
    "question": "Tarihte bilinen ilk yazılı barış antlaşması olan Kadeş Antlaşması hangi iki büyük imparatorluk arasında imzalanmıştır?",
    "choices": [
      "Hitit İmparatorluğu - Mısır İmparatorluğu",
      "Roma İmparatorluğu - Kartaca İmparatorluğu",
      "Asur İmparatorluğu - Babil İmparatorluğu",
      "Pers İmparatorluğu - Antik Yunan Şehir Devletleri"
    ],
    "correct": 0,
    "difficulty": "zor"
  },
  {
    "question": "Leonardo da Vinci'nin dünyaca ünlü Mona Lisa tablosu, Fransa'daki Louvre Müzesi'nin hangi salonunda sergilenmektedir?",
    "choices": [
      "Salle des États (Devlet Salonu)",
      "Grande Galerie (Büyük Galeri)",
      "Salle Daru",
      "Galerie d'Apollon"
    ],
    "correct": 0,
    "difficulty": "cok_zor"
  },
  {
    "question": "Periyodik cetvelde atom numarası 1 olan hidrojen elementinden sonra gelen en hafif ikinci element hangisidir?",
    "choices": [
      "Lityum (Li)",
      "Helyum (He)",
      "Berilyum (Be)",
      "Bor (B)"
    ],
    "correct": 1,
    "difficulty": "cok_zor"
  }
];

// --- 1. PROSEDÜREL SES SENTEZLEYİCİ (Web Audio API) ---
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'tick') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } 
    else if (type === 'success') {
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      frequencies.forEach((freq, index) => {
        const chordOsc = audioCtx.createOscillator();
        const chordGain = audioCtx.createGain();
        chordOsc.connect(chordGain);
        chordGain.connect(audioCtx.destination);
        
        chordOsc.type = 'sine';
        chordOsc.frequency.setValueAtTime(freq, now + (index * 0.08));
        
        chordGain.gain.setValueAtTime(0, now);
        chordGain.gain.linearRampToValueAtTime(0.12, now + (index * 0.08) + 0.02);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + (index * 0.08) + 0.4);
        
        chordOsc.start(now + (index * 0.08));
        chordOsc.stop(now + (index * 0.08) + 0.4);
      });
    } 
    else if (type === 'failure') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.35);
      
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.4);
    } 
    else if (type === 'fanfare') {
      const notes = [
        { f: 349.23, d: 0.1 },  // F4
        { f: 440.00, d: 0.1 },  // A4
        { f: 523.25, d: 0.1 },  // C5
        { f: 587.33, d: 0.1 },  // D5
        { f: 659.25, d: 0.15 }, // E5
        { f: 783.99, d: 0.3 }   // G5
      ];
      
      let startTime = now;
      notes.forEach((note) => {
        const noteOsc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        noteOsc.connect(noteGain);
        noteGain.connect(audioCtx.destination);
        
        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(note.f, startTime);
        
        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);
        
        noteOsc.start(startTime);
        noteOsc.stop(startTime + note.d);
        
        startTime += note.d * 0.8;
      });
    }
  } catch (e) {
    console.warn("AudioContext ses sentezleme hatası: ", e);
  }
}

// --- 2. CANVAs DİNAMİK PARÇACIK MOTORU (Background Particles) ---
let particleEngineActive = true;

function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let particles = [];
  const properties = {
    bgColor: 'rgba(9, 13, 22, 1)',
    particleColor: 'rgba(0, 243, 255, 0.15)',
    lineColor: 'rgba(189, 0, 255, 0.04)',
    particleRadius: 2.2,
    particleCount: 50,
    maxVelocity: 0.35,
    lineLength: 120
  };

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.velocityX = (Math.random() * 2 - 1) * properties.maxVelocity;
      this.velocityY = (Math.random() * 2 - 1) * properties.maxVelocity;
    }

    position() {
      if (this.x + this.velocityX > canvas.width || this.x + this.velocityX < 0) {
        this.velocityX = -this.velocityX;
      }
      if (this.y + this.velocityY > canvas.height || this.y + this.velocityY < 0) {
        this.velocityY = -this.velocityY;
      }
      this.x += this.velocityX;
      this.y += this.velocityY;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, properties.particleRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = properties.particleColor;
      ctx.fill();
    }
  }

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dist = Math.sqrt(
          Math.pow(particles[i].x - particles[j].x, 2) +
          Math.pow(particles[i].y - particles[j].y, 2)
        );
        if (dist < properties.lineLength) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.closePath();
          ctx.strokeStyle = `rgba(189, 0, 255, ${(1 - dist/properties.lineLength) * 0.07})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  for (let i = 0; i < properties.particleCount; i++) {
    particles.push(new Particle());
  }

  function loop() {
    if (!particleEngineActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawLines();
    particles.forEach(p => {
      p.position();
      p.draw();
    });
    
    requestAnimationFrame(loop);
  }
  
  loop();
}

function spawnExplosion(x, y) {
  const container = document.body;
  const count = 18;
  const colors = ['#00f3ff', '#bd00ff', '#00ff66', '#ffd700'];

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${Math.random() * 8 + 4}px`;
    el.style.height = `${Math.random() * 8 + 4}px`;
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = '50%';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '999';
    el.style.boxShadow = '0 0 8px currentColor';
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 5 + 3;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity;
    
    let curX = x;
    let curY = y;
    let opacity = 1;
    
    container.appendChild(el);
    
    function animateExplosion() {
      curX += dx;
      curY += dy;
      opacity -= 0.035;
      
      el.style.left = `${curX}px`;
      el.style.top = `${curY}px`;
      el.style.opacity = opacity;
      
      if (opacity > 0) {
        requestAnimationFrame(animateExplosion);
      } else {
        el.remove();
      }
    }
    
    requestAnimationFrame(animateExplosion);
  }
}

// --- 3. HARİCİ YAPILANDIRMA & SORU VERİTABANI YÜKLEYİCİ ---
async function loadDynamicConfig() {
  // 1. Yerel config.json dosyasını yükle
  try {
    const response = await fetch('config.json');
    if (response.ok) {
      const data = await response.json();
      Object.assign(CONFIG, data);
      console.log("Ayarlar harici JSON dosyasından başarıyla yüklendi: ", CONFIG);
    }
  } catch (e) {
    console.warn("Harici config.json yüklenemedi. Varsayılan yerel ayarlar kullanılacak:", e);
  }

  // 2. Storyline değişkeni aşımlarını (overrides) denetle
  if (isEmbeddedInStoryline()) {
    try {
      const player = window.parent.GetPlayer();
      
      const slQuestionSource = player.GetVar("config_questionSource");
      const slUseTimer = player.GetVar("config_useTimer");
      const slTimerSeconds = player.GetVar("config_timerSeconds");
      const slUseTimeBonus = player.GetVar("config_useTimeBonus");
      const slPointsRule = player.GetVar("config_pointsRule");
      const slFlatPoints = player.GetVar("config_flatPointsPerQuestion");
      const slEasyPoints = player.GetVar("config_easyPoints");
      const slMediumPoints = player.GetVar("config_mediumPoints");
      const slHardPoints = player.GetVar("config_hardPoints");
      const slVeryHardPoints = player.GetVar("config_veryHardPoints");
      const slBronzePercent = player.GetVar("config_bronzePercent");
      const slSilverPercent = player.GetVar("config_silverPercent");
      const slGoldPercent = player.GetVar("config_goldPercent");
      const slPassingPercent = player.GetVar("config_passingPercent");
      const slReportScoreToLMS = player.GetVar("config_reportScoreToLMS");

      if (slQuestionSource && slQuestionSource.trim() !== '') CONFIG.questionSource = slQuestionSource;
      if (typeof slUseTimer === 'boolean') CONFIG.useTimer = slUseTimer;
      if (typeof slTimerSeconds === 'number') CONFIG.timerSeconds = slTimerSeconds;
      if (typeof slUseTimeBonus === 'boolean') CONFIG.useTimeBonus = slUseTimeBonus;
      if (slPointsRule && slPointsRule.trim() !== '') CONFIG.pointsRule = slPointsRule;
      if (typeof slFlatPoints === 'number') CONFIG.flatPointsPerQuestion = slFlatPoints;
      if (typeof slEasyPoints === 'number') CONFIG.easyPoints = slEasyPoints;
      if (typeof slMediumPoints === 'number') CONFIG.mediumPoints = slMediumPoints;
      if (typeof slHardPoints === 'number') CONFIG.hardPoints = slHardPoints;
      if (typeof slVeryHardPoints === 'number') CONFIG.veryHardPoints = slVeryHardPoints;
      if (typeof slBronzePercent === 'number') CONFIG.bronzePercent = slBronzePercent;
      if (typeof slSilverPercent === 'number') CONFIG.silverPercent = slSilverPercent;
      if (typeof slGoldPercent === 'number') CONFIG.goldPercent = slGoldPercent;
      if (typeof slPassingPercent === 'number') CONFIG.passingPercent = slPassingPercent;
      if (typeof slReportScoreToLMS === 'boolean') CONFIG.reportScoreToLMS = slReportScoreToLMS;

      console.log("Storyline değişken aşımları uygulandı: ", CONFIG);
    } catch (e) {
      console.warn("Storyline değişkenleri okunurken hata: ", e);
    }
  }

  state.timeLeft = CONFIG.timerSeconds;
}

// CSV Ayrıştırma Yardımcı Fonksiyonu (Excel Formatı İçin)
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  const result = [];
  
  if (lines.length <= 1) return result;
  
  // Excel doğrudan açma ayarı "sep=;" satırı varsa, başlık satırını atlamak için indisi ayarla
  let startIndex = 1;
  if (lines[0].trim().startsWith('sep=')) {
    startIndex = 2;
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    
    // Türkçe ve Avrupa Excel çıktılarında noktalı virgül (;), ABD çıktılarında virgül (,) kullanılır.
    let separator = ';';
    if (!line.includes(';') && line.includes(',')) {
      separator = ',';
    }
    
    const columns = line.split(separator).map(col => {
      col = col.trim();
      if (col.startsWith('"') && col.endsWith('"')) {
        col = col.substring(1, col.length - 1);
      }
      return col.replace(/""/g, '"');
    });
    
    if (columns.length >= 7) {
      const question = columns[0];
      const choices = [columns[1], columns[2], columns[3], columns[4]];
      
      // Doğru şıkkı dönüştür (0-3 sayısal indeks veya A-D harfi)
      let correct = parseInt(columns[5]);
      if (isNaN(correct)) {
        const letter = columns[5].trim().toUpperCase();
        if (letter === 'A') correct = 0;
        else if (letter === 'B') correct = 1;
        else if (letter === 'C') correct = 2;
        else if (letter === 'D') correct = 3;
      }
      
      const difficulty = columns[6] || 'kolay';
      
      result.push({
        question: question,
        choices: choices,
        correct: isNaN(correct) ? 0 : correct,
        difficulty: difficulty.toLowerCase()
      });
    }
  }
  return result;
}

async function loadDynamicQuestions() {
  const source = (CONFIG.questionSource || 'auto').toLowerCase().trim();
  
  // JSON Dosyasını yükleme denemesi
  const tryJSON = async () => {
    try {
      const response = await fetch('questions.json');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          QUESTIONS = data;
          state.emulatedStorylineVars.active_question_source = "questions.json (JSON Dosyası)";
          console.log("Sorular harici JSON dosyasından başarıyla yüklendi! Soru sayısı: " + QUESTIONS.length);
          return true;
        }
      }
    } catch (e) {
      console.warn("questions.json yükleme hatası:", e);
    }
    return false;
  };

  // CSV Dosyasını yükleme denemesi
  const tryCSV = async () => {
    try {
      const response = await fetch('questions.csv');
      if (response.ok) {
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        if (parsedData.length > 0) {
          QUESTIONS = parsedData;
          state.emulatedStorylineVars.active_question_source = "questions.csv (Excel Dosyası)";
          console.log("Sorular harici CSV dosyasından başarıyla yüklendi! Soru sayısı: " + QUESTIONS.length);
          return true;
        }
      }
    } catch (e) {
      console.warn("questions.csv yükleme hatası:", e);
    }
    return false;
  };

  // Seçilen kaynağa göre yükleme akışı
  if (source === 'json') {
    if (await tryJSON()) return;
  } else if (source === 'csv') {
    if (await tryCSV()) return;
  } else {
    // 'auto' modu önceliği
    if (await tryJSON()) return;
    if (await tryCSV()) return;
  }

  // Her şey başarısız olursa
  state.emulatedStorylineVars.active_question_source = "Yerel Yedek (Gömülü)";
  console.log("Harici dosyalar yüklenemedi. Gömülü sorular kullanılıyor.");
}


// Sınavdaki maksimum alınabilecek skoru hesapla
function calculateMaxPossibleScore() {
  let total = 0;
  QUESTIONS.forEach(q => {
    total += getPointsForQuestion(q);
  });
  state.maxPossibleScore = total || 100;
  console.log("Maksimum alınabilecek sınav skoru hesaplandı: " + state.maxPossibleScore);
}

// Soruya göre kazanılacak puanı hesapla
function getPointsForQuestion(question) {
  if (CONFIG.pointsRule === 'flat') {
    return CONFIG.flatPointsPerQuestion;
  }
  const diff = (question.difficulty || 'kolay').toLowerCase();
  if (diff === 'kolay') return CONFIG.easyPoints;
  if (diff === 'orta') return CONFIG.mediumPoints;
  if (diff === 'zor') return CONFIG.hardPoints;
  if (diff === 'cok_zor') return CONFIG.veryHardPoints;
  return CONFIG.easyPoints;
}

// --- 4. LOCAL STORAGE VE VERİTABANI KONTROLÜ ---
async function initLeaderboard() {
  if (CONFIG.useFirebase && CONFIG.firebaseURL && CONFIG.firebaseURL.trim() !== '') {
    await fetchLeaderboardFromFirebase();
    return;
  }

  let rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!rawData) {
    const defaultData = Array(50).fill(null).map(() => ({ name: "-", score: 0 }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultData));
    state.leaderboard = defaultData;
  } else {
    try {
      state.leaderboard = JSON.parse(rawData);
    } catch (e) {
      console.error("Liderlik tablosu parse hatası, varsayılana sıfırlanıyor: ", e);
      const defaultData = Array(50).fill(null).map(() => ({ name: "-", score: 0 }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultData));
      state.leaderboard = defaultData;
    }
  }
  
  updateEmulatorVarsFromLeaderboard();
  syncWithStoryline();
}

async function saveScoreToLeaderboard(name, score) {
  if (!name || name.trim() === '-' || name.trim() === '') return;
  
  if (CONFIG.useFirebase && CONFIG.firebaseURL && CONFIG.firebaseURL.trim() !== '') {
    await saveScoreToFirebase(name, score);
    return;
  }
  
  state.leaderboard.push({ name: name, score: score });
  state.leaderboard.sort((a, b) => b.score - a.score);
  state.leaderboard = state.leaderboard.slice(0, 50);
  
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.leaderboard));
  
  updateEmulatorVarsFromLeaderboard();
  syncWithStoryline();
}

function updateEmulatorVarsFromLeaderboard() {
  for (let i = 0; i < 5; i++) {
    const entry = state.leaderboard[i] || { name: '-', score: 0 };
    state.emulatedStorylineVars[`rank${i+1}_name`] = entry.name;
    state.emulatedStorylineVars[`rank${i+1}_score`] = entry.score;
  }
}

// --- 5. ARTICULATE STORYLINE 360 ENTEGRASYON KÖPRÜSÜ ---
function isEmbeddedInStoryline() {
  try {
    return !!(window.parent && window.parent.GetPlayer);
  } catch (e) {
    return false;
  }
}

function syncWithStoryline() {
  const isEmbedded = isEmbeddedInStoryline();
  
  if (isEmbedded) {
    try {
      const player = window.parent.GetPlayer();
      
      for (let i = 0; i < 5; i++) {
        const nameKey = `rank${i+1}_name`;
        const scoreKey = `rank${i+1}_score`;
        player.SetVar(nameKey, state.emulatedStorylineVars[nameKey]);
        player.SetVar(scoreKey, state.emulatedStorylineVars[scoreKey]);
      }
      
      player.SetVar("badge_bronze", state.emulatedStorylineVars.badge_bronze);
      player.SetVar("badge_silver", state.emulatedStorylineVars.badge_silver);
      player.SetVar("badge_gold", state.emulatedStorylineVars.badge_gold);
      
      if (state.playerName) {
        player.SetVar("playerName", state.playerName);
      }
      player.SetVar("playerScore", state.playerScore);
      
      // Moodle SCORM entegrasyonu için yüzdelik ve geçme durumunu Storyline'a da gönderelim
      try { player.SetVar("lms_score_raw", state.emulatedStorylineVars.lms_score_raw); } catch (err) {}
      try { player.SetVar("lms_score_scaled", state.emulatedStorylineVars.lms_score_scaled); } catch (err) {}
      try { player.SetVar("lms_lesson_status", state.emulatedStorylineVars.lms_lesson_status); } catch (err) {}
      
    } catch (e) {
      console.warn("Storyline GetPlayer() erişim hatası: ", e);
    }
  }

  renderEmulatorVars();
}

function pullFromStoryline() {
  if (isEmbeddedInStoryline()) {
    try {
      const player = window.parent.GetPlayer();
      const stName = player.GetVar("playerName");
      const stScore = player.GetVar("playerScore");
      
      if (stName && stName.trim() !== '') {
        state.playerName = stName;
        state.emulatedStorylineVars.playerName = stName;
      }
      if (typeof stScore === 'number') {
        state.playerScore = stScore;
        state.emulatedStorylineVars.playerScore = stScore;
      }
      
      updatePlayerUI();
    } catch (e) {
      console.warn("Storyline'dan veri çekme hatası: ", e);
    }
  }
}

// --- 6. UYGULAMA AKIŞ VE ARAYÜZ KONTROLLERİ ---
function switchScreen(screenId) {
  playSound('tick');
  
  document.querySelectorAll('.screen').forEach(scr => {
    scr.classList.remove('active');
  });
  
  document.querySelectorAll('.nav-item').forEach(nav => {
    nav.classList.remove('active');
    if (nav.dataset.screen === screenId) {
      nav.classList.add('active');
    }
  });

  const targetScreen = document.getElementById(`${screenId}-screen`);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }

  if (screenId === 'leaderboard') {
    renderLeaderboard();
  }

  if (screenId === 'badges') {
    renderBadges();
  }
}

function updatePlayerUI() {
  const elements = document.querySelectorAll('.user-display-name');
  elements.forEach(el => {
    el.textContent = state.playerName || 'Oyuncu';
  });
  
  const scoreElements = document.querySelectorAll('.user-display-score');
  scoreElements.forEach(el => {
    el.textContent = `${state.playerScore} Puan`;
  });
  
  const avatar = document.querySelector('.player-avatar');
  if (avatar && state.playerName) {
    avatar.textContent = state.playerName.charAt(0).toUpperCase();
  }
}

function handleLogin(e) {
  e.preventDefault();
  const input = document.getElementById('player-name-input');
  const name = input.value.trim();
  
  if (name === '') {
    alert('Lütfen geçerli bir isim yazın.');
    return;
  }
  
  state.playerName = name;
  state.emulatedStorylineVars.playerName = name;
  
  updatePlayerUI();
  syncWithStoryline();
  startQuiz();
}

function startQuiz() {
  state.playerScore = 0;
  state.emulatedStorylineVars.playerScore = 0;
  state.currentQuestionIndex = 0;
  state.isQuizActive = true;
  state.answersHistory = []; // Önceki sınav geçmişini sıfırla
  state.badges = { bronze: false, silver: false, gold: false };
  state.emulatedStorylineVars.badge_bronze = false;
  state.emulatedStorylineVars.badge_silver = false;
  state.emulatedStorylineVars.badge_gold = false;
  
  document.getElementById('app-navigation').style.display = 'flex';
  
  const welcomeActions = document.getElementById('leaderboard-welcome-actions');
  if (welcomeActions) welcomeActions.style.display = 'none';
  
  switchScreen('quiz');
  loadQuestion();
}

function loadQuestion() {
  clearInterval(state.timerInterval);
  state.timeLeft = CONFIG.timerSeconds;
  
  const q = QUESTIONS[state.currentQuestionIndex];
  
  // Sayaç ve Zorluk Arayüzü Güncelleme (Masif & Net)
  const curNumEl = document.getElementById('current-q-num');
  const totNumEl = document.getElementById('total-q-num');
  const diffBadgeEl = document.getElementById('quiz-difficulty-badge');
  
  if (curNumEl) curNumEl.textContent = String(state.currentQuestionIndex + 1).padStart(2, '0');
  if (totNumEl) totNumEl.textContent = String(QUESTIONS.length).padStart(2, '0');
  
  if (diffBadgeEl) {
    const diffKey = q.difficulty || "kolay";
    const diffText = { "kolay": "Kolay", "orta": "Orta", "zor": "Zor", "cok_zor": "Çok Zor" }[diffKey];
    diffBadgeEl.textContent = diffText.toUpperCase();
    
    // Zorluğa göre renk/neon sınıfını güncelle
    diffBadgeEl.className = 'difficulty-badge';
    diffBadgeEl.classList.add(`diff-${diffKey}`);
  }
  
  const fillPercentage = ((state.currentQuestionIndex + 1) / QUESTIONS.length) * 100;
  document.getElementById('quiz-progress-fill').style.width = `${fillPercentage}%`;
  
  document.getElementById('quiz-score-val').textContent = state.playerScore;
  
  // Zamanlayıcı UI Kontrolleri
  const timerBox = document.getElementById('quiz-timer-box');
  if (CONFIG.useTimer) {
    if (timerBox) timerBox.style.display = 'flex';
    document.getElementById('quiz-timer-val').textContent = `${state.timeLeft}s`;
  } else {
    if (timerBox) timerBox.style.display = 'none';
  }
  
  // Soru metni
  document.getElementById('question-box').innerHTML = `
    <span class="question-text">${q.question}</span>
    ${CONFIG.useTimer ? '<div id="timer-bar" class="timer-line"></div>' : ''}
  `;
  
  // Şıklar
  const choicesGrid = document.getElementById('choices-box');
  choicesGrid.innerHTML = '';
  
  const labelMap = ['A', 'B', 'C', 'D'];
  q.choices.forEach((choice, index) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `
      <div class="choice-indicator">${labelMap[index]}</div>
      <span>${escapeHTML(choice)}</span>
    `;
    btn.addEventListener('click', (e) => handleAnswer(index, e));
    choicesGrid.appendChild(btn);
  });

  // Zamanlayıcıyı Başlat
  if (CONFIG.useTimer) {
    startTimer();
  }
}

function startTimer() {
  const timerBar = document.getElementById('timer-bar');
  
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    document.getElementById('quiz-timer-val').textContent = `${state.timeLeft}s`;
    
    if (timerBar) {
      const percentage = (state.timeLeft / CONFIG.timerSeconds) * 100;
      timerBar.style.width = `${percentage}%`;
    }
    
    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      playSound('failure');
      highlightCorrectAnswer();
      disableChoices();
      
      // Süre aşımını tarihçeye kaydet
      state.answersHistory.push({
        questionIndex: state.currentQuestionIndex,
        isCorrect: false,
        userAnswer: -1, // süre aşımı/boş
        correctAnswer: QUESTIONS[state.currentQuestionIndex].correct,
        timeLeft: 0,
        pointsEarned: 0
      });
      
      setTimeout(nextQuestion, 1800);
    }
  }, 1000);
}

function handleAnswer(selectedIndex, event) {
  clearInterval(state.timerInterval);
  disableChoices();
  
  const q = QUESTIONS[state.currentQuestionIndex];
  const choiceButtons = document.querySelectorAll('.choice-btn');
  const isCorrect = selectedIndex === q.correct;
  
  // Soru sonucunu tarihçeye kaydet (süre bonusu sonradan özet ekranında eklenecek)
  state.answersHistory.push({
    questionIndex: state.currentQuestionIndex,
    isCorrect: isCorrect,
    userAnswer: selectedIndex,
    correctAnswer: q.correct,
    timeLeft: CONFIG.useTimer ? state.timeLeft : 0,
    pointsEarned: isCorrect ? getPointsForQuestion(q) : 0
  });
  
  if (isCorrect) {
    playSound('success');
    choiceButtons[selectedIndex].classList.add('correct');
    
    // Skor artışı - SADECE TABAN PUAN ekleniyor
    const earnedPoints = getPointsForQuestion(q);
    state.playerScore += earnedPoints;
    state.emulatedStorylineVars.playerScore = state.playerScore;
    document.getElementById('quiz-score-val').textContent = state.playerScore;
    
    const rect = choiceButtons[selectedIndex].getBoundingClientRect();
    spawnExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2);
    
    console.log(`Doğru cevap! Taban Puan: +${earnedPoints} eklendi. Süre Bonusu özet ekranında birikecek.`);
    
    checkBadges();
  } else {
    playSound('failure');
    choiceButtons[selectedIndex].classList.add('incorrect');
    highlightCorrectAnswer();
    console.log(`Yanlış cevap! Puan eklenmedi.`);
  }
  
  setTimeout(nextQuestion, 1600);
}

function highlightCorrectAnswer() {
  const q = QUESTIONS[state.currentQuestionIndex];
  const choiceButtons = document.querySelectorAll('.choice-btn');
  if (choiceButtons[q.correct]) {
    choiceButtons[q.correct].classList.add('correct');
  }
}

function disableChoices() {
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.classList.add('disabled');
  });
}

function nextQuestion() {
  state.currentQuestionIndex++;
  
  if (state.currentQuestionIndex < QUESTIONS.length) {
    loadQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  state.isQuizActive = false;
  updatePlayerUI();
  showSummaryScreen(); // Sınav bitince özet ekranını aç
}

// --- 5B. SCORM/LMS DOĞRUDAN API BAĞLANTISI ---
let scormAPI = null;

function findSCORMAPI(win) {
  let findAttempts = 0;
  let currentWindow = win;
  
  while (currentWindow) {
    try {
      // 1. Mevcut penceredeki gerçek SCORM API nesnelerini aramayı dene (lmsAPI nesnesi gerçek SCORM standardı değildir!)
      if (currentWindow.API) return currentWindow.API;
      if (currentWindow.API_1484_11) return currentWindow.API_1484_11;
    } catch (e) {
      // Cross-origin engellemesi durumunda aramayı güvenli şekilde sonlandır
      console.warn("SCORM API aranırken tarayıcı cross-origin engellemesi oluştu, durduruluyor:", e);
      break;
    }
    
    try {
      // 2. Bir üst parent veya opener pencereye geçiş yapmayı dene
      if (currentWindow.parent && currentWindow.parent !== currentWindow) {
        currentWindow = currentWindow.parent;
      } else if (currentWindow.opener) {
        currentWindow = currentWindow.opener;
      } else {
        break;
      }
    } catch (e) {
      // Parent pencereye erişim engeli (SecurityError) durumunda aramayı sonlandır
      console.warn("Parent pencereye erişirken cross-origin engeli oluştu, aramadan çıkılıyor:", e);
      break;
    }
    
    findAttempts++;
    if (findAttempts > 10) break;
  }
  return null;
}

function reportScoreToLMS(baseScore, maxPossibleScore) {
  if (!CONFIG.reportScoreToLMS) return;
  
  // Sadece taban puanlar üzerinden 100 üzerinden yüzdelik skor hesapla (Zaman bonusları hariç!)
  const percentage = Math.min(100, Math.max(0, Math.round((baseScore / maxPossibleScore) * 100)));
  const isPassed = percentage >= (CONFIG.passingPercent || 70);
  const statusString = isPassed ? "passed" : "failed";
  
  console.log(`LMS SCORM Yüzdelik Raporlama: Taban Skor = ${baseScore}/${maxPossibleScore} (%${percentage}), Durum = ${statusString}`);
  
  // Emülatör Değişkenlerini Güncelle (Moodle için 100 üzerinden değerler)
  state.emulatedStorylineVars.lms_lesson_status = statusString;
  state.emulatedStorylineVars.lms_score_raw = percentage; // Moodle 100 üzerinden puan görür
  state.emulatedStorylineVars.lms_score_scaled = Number((percentage / 100).toFixed(4));
  syncWithStoryline();

  // 1. Yol: Storyline Global SCORM Metotları veya lmsAPI nesnesi (Güvenli Aşım)
  try {
    const parentWin = window.parent;
    if (parentWin) {
      if (typeof parentWin.SCORM_SetScore === 'function') {
        parentWin.SCORM_SetScore(percentage, 100, 0);
        parentWin.SCORM_SetStatus(statusString);
        if (typeof parentWin.SCORM_CommitData === 'function') parentWin.SCORM_CommitData();
        console.log("Storyline SCORM_SetScore metoduyla Moodle'a yüzdelik (%"+percentage+") yazıldı.");
        return;
      }
      if (typeof parentWin.SCORM2004_SetScore === 'function') {
        parentWin.SCORM2004_SetScore(percentage, 100, 0);
        parentWin.SCORM2004_SetStatus(statusString);
        if (typeof parentWin.SCORM2004_CommitData === 'function') parentWin.SCORM2004_CommitData();
        console.log("Storyline SCORM2004_SetScore metoduyla Moodle'a yüzdelik (%"+percentage+") yazıldı.");
        return;
      }
      if (parentWin.lmsAPI && typeof parentWin.lmsAPI.SetScore === 'function') {
        parentWin.lmsAPI.SetScore(percentage, 100, 0);
        parentWin.lmsAPI.SetStatus(statusString);
        if (typeof parentWin.lmsAPI.CommitData === 'function') {
          parentWin.lmsAPI.CommitData();
        }
        console.log("Storyline lmsAPI.SetScore metoduyla Moodle'a yüzdelik (%"+percentage+") yazıldı.");
        return;
      }
    }
  } catch (e) {
    console.warn("Storyline global SCORM metotları üzerinden yazma başarısız (CORS veya tanımsız):", e);
  }

  // 2. Yol: Standart SCORM API nesnesi (Direct search & execute)
  const api = findSCORMAPI(window);
  if (api) {
    try {
      const isSCORM2004 = typeof api.GetValue === 'function' || typeof api.SetValue === 'function';
      
      if (isSCORM2004) {
        api.SetValue("cmi.score.raw", percentage);
        api.SetValue("cmi.score.max", 100);
        api.SetValue("cmi.score.min", 0);
        api.SetValue("cmi.score.scaled", Number((percentage / 100).toFixed(4)));
        api.SetValue("cmi.completion_status", "completed");
        api.SetValue("cmi.success_status", statusString);
        api.Commit("");
        console.log("SCORM 2004 API üzerinden Moodle'a yüzdelik (%"+percentage+") olarak başarıyla yazıldı.");
      } else {
        api.LMSSetValue("cmi.core.score.raw", percentage);
        api.LMSSetValue("cmi.core.score.max", 100);
        api.LMSSetValue("cmi.core.score.min", 0);
        api.LMSSetValue("cmi.core.lesson_status", statusString);
        api.LMSCommit("");
        console.log("SCORM 1.2 API üzerinden Moodle'a yüzdelik (%"+percentage+") olarak başarıyla yazıldı.");
      }
    } catch (err) {
      console.error("Doğrudan SCORM SetValue yazma hatası:", err);
    }
  } else {
    console.warn("Aktif bir SCORM/LMS API bulunamadı (Yerel Mod / LMS Dışı Sınav).");
  }
}

function checkBadges() {
  let newUnlock = false;
  
  // Alınan skor yüzdesini hesapla
  const percentScore = Math.round((state.playerScore / state.maxPossibleScore) * 100);
  
  // Bronz Rozet Kontrolü
  if (percentScore >= CONFIG.bronzePercent && !state.badges.bronze) {
    state.badges.bronze = true;
    state.emulatedStorylineVars.badge_bronze = true;
    newUnlock = true;
  }
  
  // Gümüş Rozet Kontrolü
  if (percentScore >= CONFIG.silverPercent && !state.badges.silver) {
    state.badges.silver = true;
    state.emulatedStorylineVars.badge_silver = true;
    newUnlock = true;
  }
  
  // Altın Rozet Kontrolü
  if (percentScore >= CONFIG.goldPercent && !state.badges.gold) {
    state.badges.gold = true;
    state.emulatedStorylineVars.badge_gold = true;
    newUnlock = true;
  }

  if (newUnlock) {
    setTimeout(() => playSound('fanfare'), 200);
  }
  
  syncWithStoryline();
}

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-screen');
  if (!container) return;
  
  const searchQuery = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  
  const podiumSpot1 = document.getElementById('podium-1st-spot');
  const podiumSpot2 = document.getElementById('podium-2nd-spot');
  const podiumSpot3 = document.getElementById('podium-3rd-spot');
  const podiumArea = document.querySelector('.podium-area');
  const listContainer = document.getElementById('leaderboard-list-box');
  
  const resetSpot = (spot, rank) => {
    if (!spot) return;
    spot.style.visibility = 'hidden';
    const avatar = spot.querySelector('.podium-avatar');
    const nameEl = spot.querySelector('.podium-name');
    const scoreEl = spot.querySelector('.podium-score');
    if (avatar) avatar.textContent = '';
    if (nameEl) nameEl.textContent = '-';
    if (scoreEl) scoreEl.textContent = '0 Pts';
  };

  listContainer.innerHTML = '';
  
  // Her bir liderlik öğesine orijinal sıralama indeksini (1 tabanlı) ekleyelim
  const rankedData = state.leaderboard.map((item, index) => ({
    ...item,
    originalRank: index + 1
  }));

  // Arama sorgusuna göre filtreleyelim
  const filteredData = rankedData.filter(item => {
    if (searchQuery === '') return true;
    return item.name.toLowerCase().includes(searchQuery);
  });

  if (searchQuery !== '') {
    // Arama yapılıyorsa 3D Podyumu gizleyelim ve tüm eşleşenleri listede gösterelim
    if (podiumArea) podiumArea.style.display = 'none';
    
    const validHits = filteredData.filter(item => item.name !== '-');
    
    if (validHits.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-leaderboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-frown"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
          <span>Aramanızla eşleşen sonuç bulunamadı.</span>
        </div>
      `;
    } else {
      validHits.forEach(item => {
        const isCurUser = item.name === state.playerName;
        const div = document.createElement('div');
        div.className = `leader-item ${isCurUser ? 'current-user' : ''}`;
        div.innerHTML = `
          <div class="leader-left">
            <span class="leader-rank">${item.originalRank}</span>
            <div class="leader-avatar">${item.name.charAt(0).toUpperCase()}</div>
            <span class="leader-name">${escapeHTML(item.name)}</span>
          </div>
          <span class="leader-score">${item.score} Puan</span>
        `;
        listContainer.appendChild(div);
      });
    }
  } else {
    // Arama boşsa 3D podyumu geri getirelim
    if (podiumArea) podiumArea.style.display = 'flex';
    
    resetSpot(podiumSpot1, 1);
    resetSpot(podiumSpot2, 2);
    resetSpot(podiumSpot3, 3);
    
    const topThree = filteredData.slice(0, 3);
    topThree.forEach((item, index) => {
      let spot = null;
      if (index === 0) spot = podiumSpot1;
      else if (index === 1) spot = podiumSpot2;
      else if (index === 2) spot = podiumSpot3;
      
      if (spot && item.name !== '-') {
        spot.style.visibility = 'visible';
        const avatar = spot.querySelector('.podium-avatar');
        const nameEl = spot.querySelector('.podium-name');
        const scoreEl = spot.querySelector('.podium-score');
        
        if (avatar) avatar.textContent = item.name.charAt(0).toUpperCase();
        if (nameEl) nameEl.textContent = item.name;
        if (scoreEl) scoreEl.textContent = `${item.score} Puan`;
        
        if (item.name === state.playerName) {
          spot.classList.add('active-player-spot');
        } else {
          spot.classList.remove('active-player-spot');
        }
      }
    });

    const bottomRankings = filteredData.slice(3, 50);
    const validBottomRankings = bottomRankings.filter(item => item.name !== '-');
    
    if (validBottomRankings.length === 0 && topThree.filter(x => x.name !== '-').length === 0) {
      listContainer.innerHTML = `
        <div class="empty-leaderboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-frown"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
          <span>Tabloya henüz kimse girmedi. İlk skoru sen kaydet!</span>
        </div>
      `;
    } else {
      validBottomRankings.forEach(item => {
        const isCurUser = item.name === state.playerName;
        const div = document.createElement('div');
        div.className = `leader-item ${isCurUser ? 'current-user' : ''}`;
        div.innerHTML = `
          <div class="leader-left">
            <span class="leader-rank">${item.originalRank}</span>
            <div class="leader-avatar">${item.name.charAt(0).toUpperCase()}</div>
            <span class="leader-name">${escapeHTML(item.name)}</span>
          </div>
          <span class="leader-score">${item.score} Puan</span>
        `;
        listContainer.appendChild(div);
      });
    }
  }
}

function renderBadges() {
  const bronzeCard = document.getElementById('badge-bronze-card');
  const silverCard = document.getElementById('badge-silver-card');
  const goldCard = document.getElementById('badge-gold-card');
  
  const updateCard = (card, isUnlocked) => {
    if (!card) return;
    if (isUnlocked) {
      card.classList.add('unlocked');
      const statusEl = card.querySelector('.badge-status');
      if (statusEl) statusEl.textContent = 'Kilit Açıldı';
    } else {
      card.classList.remove('unlocked');
      const statusEl = card.querySelector('.badge-status');
      if (statusEl) statusEl.textContent = 'Kilitli';
    }
  };

  updateCard(bronzeCard, state.badges.bronze);
  updateCard(silverCard, state.badges.silver);
  updateCard(goldCard, state.badges.gold);
}

// --- 7. DEV EMULATOR & STORYLINE JS TRIGGER GENERATOR ---
function toggleDevDrawer() {
  playSound('tick');
  const drawer = document.getElementById('dev-drawer');
  drawer.classList.toggle('open');
  
  const toggleBtn = document.getElementById('dev-toggle-btn');
  if (drawer.classList.contains('open')) {
    toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
      Panel Kapat
    `;
  } else {
    toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      Storyline Konsolu
    `;
  }
}

function switchDevTab(tabId) {
  playSound('tick');
  
  document.querySelectorAll('.dev-tab').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    }
  });

  document.querySelectorAll('.dev-content').forEach(cont => {
    cont.classList.remove('active');
  });
  
  const targetContent = document.getElementById(`dev-tab-${tabId}`);
  if (targetContent) {
    targetContent.classList.add('active');
  }

  if (tabId === 'code') {
    renderGeneratedCode('load');
  }
}

function renderEmulatorVars() {
  const grid = document.getElementById('vars-grid-box');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  Object.keys(state.emulatedStorylineVars).forEach(key => {
    const val = state.emulatedStorylineVars[key];
    let valClass = '';
    
    if (val === true) valClass = 'true';
    else if (val === false) valClass = 'false';
    else if (typeof val === 'number' && val > 0) valClass = 'highlight';
    
    const card = document.createElement('div');
    card.className = 'var-card';
    card.innerHTML = `
      <span class="var-name">%${key}%</span>
      <span class="var-val ${valClass}">${val}</span>
    `;
    grid.appendChild(card);
  });
}

function renderGeneratedCode(type) {
  const codeArea = document.getElementById('code-output');
  if (!codeArea) return;
  
  document.querySelectorAll('.code-selector-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.code === type) {
      btn.classList.add('active');
    }
  });

  let codeText = '';
  
  if (type === 'load') {
    codeText = `// ==========================================
// KOD 1: LİDERLİK TABLOSUNU OKUMA VE YÜKLEME
// Tetikleyici Zamanı: İlk Slayt (Liderlik Ekranı) Yüklendiğinde
// ==========================================

try {
  var dbKey = 'sayid_edtech_leaderboard';
  var rawData = localStorage.getItem(dbKey);
  var leaderboardData = [];

  if (!rawData) {
    for (var i = 0; i < 50; i++) {
      leaderboardData.push({ name: "-", score: 0 });
    }
    localStorage.setItem(dbKey, JSON.stringify(leaderboardData));
  } else {
    leaderboardData = JSON.parse(rawData);
  }

  var player = GetPlayer();

  // Storyline ekranında sadece ilk 5 lideri gösterelim
  for (var index = 0; index < 5; index++) {
    var entry = leaderboardData[index] || { name: "-", score: 0 };
    var rankNum = index + 1;
    
    player.SetVar("rank" + rankNum + "_name", entry.name);
    player.SetVar("rank" + rankNum + "_score", entry.score);
  }

  console.log("Liderlik tablosu başarıyla yüklendi!");

} catch (error) {
  console.error("Storyline yerel leaderboard yükleme hatası: ", error);
}`;
  } else if (type === 'save') {
    codeText = `// ==========================================
// KOD 2: YENİ SKOR KAYDETME VE SIRALAMA (TOP 50)
// Tetikleyici Zamanı: Quiz Tamamlandığında veya Gönder Butonunda
// ==========================================

try {
  var player = GetPlayer();
  var playerName = player.GetVar("playerName");
  var playerScore = player.GetVar("playerScore");

  if (!playerName || playerName.trim() === '' || playerName.trim() === '-') {
    console.warn("Oyuncu ismi boş olduğu için puan kaydedilmedi.");
  } else {
    var dbKey = 'sayid_edtech_leaderboard';
    var rawData = localStorage.getItem(dbKey);
    var leaderboardData = [];

    if (rawData) {
      leaderboardData = JSON.parse(rawData);
    } else {
      for (var i = 0; i < 50; i++) {
        leaderboardData.push({ name: "-", score: 0 });
      }
    }

    leaderboardData.push({
      name: playerName,
      score: playerScore
    });

    leaderboardData.sort(function(a, b) {
      return b.score - a.score;
    });

    leaderboardData = leaderboardData.slice(0, 50); // En yüksek 50 skoru tut
    localStorage.setItem(dbKey, JSON.stringify(leaderboardData));

    // Storyline ekranındaki ilk 5 lider değişkenini güncelleyelim
    for (var index = 0; index < 5; index++) {
      var entry = leaderboardData[index] || { name: "-", score: 0 };
      var rankNum = index + 1;
      
      player.SetVar("rank" + rankNum + "_name", entry.name);
      player.SetVar("rank" + rankNum + "_score", entry.score);
    }

    // Harici ayarlardaki kazanma yüzdelerine göre rozet kontrolü
    var badgeBronze = playerScore >= 50; 
    var badgeSilver = playerScore >= 80;
    var badgeGold = playerScore >= 100;

    player.SetVar("badge_bronze", badgeBronze);
    player.SetVar("badge_silver", badgeSilver);
    player.SetVar("badge_gold", badgeGold);

    console.log("Skor başarıyla kaydedildi ve sıralandı!");
  }

} catch (error) {
  console.error("Storyline yerel leaderboard kaydetme hatası: ", error);
}`;
  } else if (type === 'scorm') {
    codeText = `// ==========================================
// KOD 3: MOODLE / LMS SCORM ZORUNLU NOT GÖNDERME TETİKLEYİCİSİ
// Tetikleyici Zamanı: Sınav Tamamlandığında (Summary sayfasında) veya slayt sonunda
// ==========================================

try {
  var player = GetPlayer();
  var percentage = player.GetVar("lms_score_raw") || 0; // iframe'den gelen taban puan yüzdesi
  var status = player.GetVar("lms_lesson_status") || "passed"; // "passed" veya "failed"

  console.log("Storyline'dan Moodle'a skor gönderiliyor... Yüzde: %" + percentage + ", Durum: " + status);

  // 1. Katman: Storyline Global SCORM Fonksiyonları (En kararlı ve Moodle uyumlu yöntem)
  if (typeof SCORM_SetScore === 'function') {
    SCORM_SetScore(percentage, 100, 0);
    SCORM_SetStatus(status);
    if (typeof SCORM_CommitData === 'function') SCORM_CommitData();
    console.log("SCORM_SetScore üzerinden başarıyla kaydedildi.");
  } else if (typeof SCORM2004_SetScore === 'function') {
    SCORM2004_SetScore(percentage, 100, 0);
    SCORM2004_SetStatus(status);
    if (typeof SCORM2004_CommitData === 'function') SCORM2004_CommitData();
    console.log("SCORM2004_SetScore üzerinden başarıyla kaydedildi.");
  } else if (typeof lmsAPI !== 'undefined' && typeof lmsAPI.SetScore === 'function') {
    lmsAPI.SetScore(percentage, 100, 0);
    lmsAPI.SetStatus(status);
    if (typeof lmsAPI.CommitData === 'function') {
      lmsAPI.CommitData();
    }
    console.log("lmsAPI.SetScore üzerinden başarıyla kaydedildi.");
  } else {
    // 2. Katman: Alternatif doğrudan SCORM API erişimi (Yerel / iframe dışı)
    var findAPI = function(win) {
      var maxTries = 10;
      var currentWin = win;
      while (currentWin && maxTries > 0) {
        try {
          if (currentWin.API) return currentWin.API;
          if (currentWin.API_1484_11) return currentWin.API_1484_11;
        } catch(e) {}
        if (currentWin.parent && currentWin.parent !== currentWin) currentWin = currentWin.parent;
        else if (currentWin.opener) currentWin = currentWin.opener;
        else break;
        maxTries--;
      }
      return null;
    };
    var api = findAPI(window);
    if (api) {
      if (typeof api.SetValue === 'function') { // SCORM 2004
        api.SetValue("cmi.score.raw", percentage);
        api.SetValue("cmi.score.max", 100);
        api.SetValue("cmi.score.min", 0);
        api.SetValue("cmi.score.scaled", percentage / 100);
        api.SetValue("cmi.completion_status", "completed");
        api.SetValue("cmi.success_status", status);
        api.Commit("");
      } else if (typeof api.LMSSetValue === 'function') { // SCORM 1.2
        api.LMSSetValue("cmi.core.score.raw", percentage);
        api.LMSSetValue("cmi.core.score.max", 100);
        api.LMSSetValue("cmi.core.score.min", 0);
        api.LMSSetValue("cmi.core.lesson_status", status);
        api.LMSCommit("");
      }
      console.log("Doğrudan SCORM API üzerinden başarıyla kaydedildi.");
    } else {
      console.warn("SCORM API bulunamadı, yerel moddasınız.");
    }
  }
} catch (error) {
  console.error("Storyline Moodle/SCORM puan gönderme hatası: ", error);
}`;
  }

  codeArea.textContent = codeText;
}

function copyCodeToClipboard() {
  const codeArea = document.getElementById('code-output');
  if (!codeArea) return;
  
  navigator.clipboard.writeText(codeArea.textContent)
    .then(() => {
      const copyBtn = document.getElementById('btn-copy-code');
      if (copyBtn) {
        copyBtn.textContent = 'Kopyalandı!';
        setTimeout(() => {
          copyBtn.textContent = 'Kodu Kopyala';
        }, 1500);
      }
    })
    .catch(err => {
      alert('Kopyalama başarısız oldu: ' + err);
    });
}

function emulateSetVariable(key, value) {
  state.emulatedStorylineVars[key] = value;
  
  if (key === 'playerName') {
    state.playerName = value;
    updatePlayerUI();
  }
  if (key === 'playerScore') {
    state.playerScore = value;
    updatePlayerUI();
  }

  syncWithStoryline();
}

function resetAllData() {
  if (confirm("Liderlik tablosu verilerini tamamen temizlemek ve varsayılan değerlere döndürmek istediğinize emin misiniz?")) {
    playSound('failure');
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    initLeaderboard();
    if (document.getElementById('leaderboard-screen').classList.contains('active')) {
      renderLeaderboard();
    }
    alert("Liderlik tablosu sıfırlandı!");
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// --- 8. BAŞLANGIÇ TETİKLEYİCİLERİ ---
document.addEventListener('DOMContentLoaded', async () => {
  initParticles();

  // 1. Dinamik Konfigürasyon ve Soruları Yükle (questions.json & config.json)
  await loadDynamicConfig();
  await loadDynamicQuestions();
  calculateMaxPossibleScore();

  // 2. Liderlik Tablosunu Başlat
  initLeaderboard();

  const loginForm = document.getElementById('welcome-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderLeaderboard();
    });
  }

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchScreen(btn.dataset.screen);
    });
  });

  document.getElementById('dev-toggle-btn').addEventListener('click', toggleDevDrawer);
  document.getElementById('dev-close-btn').addEventListener('click', toggleDevDrawer);
  
  document.querySelectorAll('.dev-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchDevTab(btn.dataset.tab);
    });
  });

  document.querySelectorAll('.code-selector-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      renderGeneratedCode(btn.dataset.code);
    });
  });

  document.getElementById('btn-copy-code').addEventListener('click', copyCodeToClipboard);
  document.getElementById('btn-reset-db').addEventListener('click', resetAllData);

  // Özet Sayfası ve İnceleme Ekranı Tetikleyicileri
  document.getElementById('btn-review-questions').addEventListener('click', openReview);
  document.getElementById('btn-finish-summary').addEventListener('click', finalizeQuizFromSummary);
  document.getElementById('btn-close-review').addEventListener('click', closeReview);
  document.getElementById('btn-prev-review').addEventListener('click', prevReview);
  document.getElementById('btn-next-review').addEventListener('click', nextReview);

  // Giriş Öncesi Liderlik Tablosu Tetikleyicileri
  document.getElementById('btn-view-leaderboard-welcome').addEventListener('click', showLeaderboardFromWelcome);
  document.getElementById('btn-back-to-welcome').addEventListener('click', () => {
    playSound('tick');
    document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
    document.getElementById('welcome-screen').classList.add('active');
  });

  document.body.addEventListener('click', initAudio, { once: true });

  if (isEmbeddedInStoryline()) {
    pullFromStoryline();
    setInterval(pullFromStoryline, 1000);
  }
});

// --- YENİ İNTERAKTİF ÖZET EKRANI & ZAMAN BONUSU SİSTEMİ ---
function showSummaryScreen() {
  playSound('tick');
  switchScreen('summary');
  
  // Detayları hesapla
  const totalCorrect = state.answersHistory.filter(a => a.isCorrect).length;
  const totalIncorrect = state.answersHistory.filter(a => !a.isCorrect).length;
  const baseScore = state.answersHistory.reduce((sum, a) => sum + a.pointsEarned, 0);
  
  // Kalan saniye süreleri bonus olarak birikiyor
  const accumulatedTimeBonus = state.answersHistory.reduce((sum, a) => {
    return sum + (a.isCorrect && CONFIG.useTimer && CONFIG.useTimeBonus ? a.timeLeft : 0);
  }, 0);
  
  const finalTotalScore = baseScore + accumulatedTimeBonus;
  
  // Başlangıç Değerlerini Sıfırla (Göz alıcı artış animasyonu için)
  document.getElementById('summary-correct-count').textContent = '0';
  document.getElementById('summary-incorrect-count').textContent = '0';
  document.getElementById('summary-base-score').textContent = '0';
  document.getElementById('summary-time-bonus').textContent = '+0';
  document.getElementById('summary-total-score').textContent = '0';
  document.getElementById('summary-score-fill').style.width = '0%';
  
  // SCORM / LMS Geçti-Kaldı Yüzde Analizi
  const percentage = Math.round((finalTotalScore / state.maxPossibleScore) * 100);
  const isPassed = percentage >= (CONFIG.passingPercent || 70);
  const statusLabel = document.getElementById('summary-lms-status');
  if (statusLabel) {
    statusLabel.textContent = `Sınav Durumu: ${isPassed ? 'BAŞARILI (GEÇTİ)' : 'BAŞARISIZ (KALDI)'} (Başarı Eşiği: %${CONFIG.passingPercent || 70})`;
    statusLabel.className = `lms-status-label ${isPassed ? '' : 'failed'}`;
  }
  
  // Mini rozet görünümlerini kilide göre güncelle
  updateSummaryBadges(percentage);
  
  // --- ARTAN SAYAC ANİMASYONLARI (HIGH-PERFORMANCE requestAnimationFrame) ---
  setTimeout(() => {
    // 1. Doğru sayısı sayacı
    animateValue(document.getElementById('summary-correct-count'), 0, totalCorrect, 700);
    
    // 2. Yanlış sayısı sayacı
    animateValue(document.getElementById('summary-incorrect-count'), 0, totalIncorrect, 700);
    
    // 3. Taban puan sayacı
    animateValue(document.getElementById('summary-base-score'), 0, baseScore, 900, null, () => {
      
      // 4. Taban puan dolunca Süre Bonusu sayacı başlar
      animateValue(document.getElementById('summary-time-bonus'), 0, accumulatedTimeBonus, 1100, (currentBonus) => {
        // Süre bonusu artarken Toplam Skoru ve Skor Çubuğunu da senkronize güncelle
        const currentSum = baseScore + currentBonus;
        document.getElementById('summary-total-score').textContent = currentSum;
        
        const barPercent = Math.min(100, Math.round((currentSum / state.maxPossibleScore) * 100));
        document.getElementById('summary-score-fill').style.width = `${barPercent}%`;
        
        // Hızlı hafif ses tıkırtısı (büyülü etki)
        if (currentBonus % 2 === 0) {
          playSound('tick');
        }
      }, () => {
        // Tüm sayma işlemi başarıyla bitince zafer melodisi çalınır
        playSound('success');
      });
      
    });
  }, 500);
}

function updateSummaryBadges(percentScore) {
  const br = document.getElementById('summary-badge-bronze');
  const sl = document.getElementById('summary-badge-silver');
  const gd = document.getElementById('summary-badge-gold');
  
  const setBadge = (el, isUnlocked) => {
    if (!el) return;
    if (isUnlocked) {
      el.classList.add('unlocked');
    } else {
      el.classList.remove('unlocked');
      el.style.color = '#78716c'; // kilitli rengi
    }
  };
  
  setBadge(br, percentScore >= CONFIG.bronzePercent);
  setBadge(sl, percentScore >= CONFIG.silverPercent);
  setBadge(gd, percentScore >= CONFIG.goldPercent);
}

function animateValue(obj, start, end, duration, onUpdate, onComplete) {
  if (!obj) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const val = Math.floor(progress * (end - start) + start);
    
    if (onUpdate) {
      onUpdate(val);
    } else {
      obj.textContent = obj.id.includes('bonus') ? `+${val}` : val;
    }
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      if (onComplete) {
        onComplete();
      } else {
        obj.textContent = obj.id.includes('bonus') ? `+${end}` : end;
      }
    }
  };
  window.requestAnimationFrame(step);
}

// --- YENİ SORU İNCELEME MODALI VE SLIDER ALGORİTMASI ---
function openReview() {
  playSound('tick');
  state.currentReviewIndex = 0;
  document.getElementById('review-modal').classList.add('open');
  renderReviewQuestion();
}

function closeReview() {
  playSound('tick');
  document.getElementById('review-modal').classList.remove('open');
}

function nextReview() {
  if (state.currentReviewIndex < QUESTIONS.length - 1) {
    playSound('tick');
    state.currentReviewIndex++;
    renderReviewQuestion();
  }
}

function prevReview() {
  if (state.currentReviewIndex > 0) {
    playSound('tick');
    state.currentReviewIndex--;
    renderReviewQuestion();
  }
}

function renderReviewQuestion() {
  const idx = state.currentReviewIndex;
  const q = QUESTIONS[idx];
  
  // Tarihçeden ilgili sorunun denemesini al (güvenli fallback ile)
  const attempt = state.answersHistory[idx] || {
    isCorrect: false,
    userAnswer: -1,
    timeLeft: 0,
    pointsEarned: 0
  };
  
  // Soru Sayısı ve İlerleme
  document.getElementById('review-progress-text').textContent = `SORU ${idx + 1} / ${QUESTIONS.length}`;
  
  // Soru Metni
  document.getElementById('review-question-box').innerHTML = `
    <span class="question-text">${q.question}</span>
  `;
  
  // Şıklar Çizelgesi
  const choicesGrid = document.getElementById('review-choices-box');
  choicesGrid.innerHTML = '';
  
  const labels = ['A', 'B', 'C', 'D'];
  q.choices.forEach((choice, choiceIdx) => {
    const div = document.createElement('div');
    div.className = 'review-choice-btn';
    
    // Doğru olanı yeşil, kullanıcının yanlış yaptığını kırmızı boya
    if (choiceIdx === q.correct) {
      div.classList.add('correct');
    } else if (choiceIdx === attempt.userAnswer && !attempt.isCorrect) {
      div.classList.add('incorrect');
    }
    
    div.innerHTML = `
      <div class="choice-indicator">${labels[choiceIdx]}</div>
      <span>${escapeHTML(choice)}</span>
    `;
    choicesGrid.appendChild(div);
  });
  
  // Detay Paneli Bilgileri
  const statusLabel = document.getElementById('review-status-text');
  const timeLabel = document.getElementById('review-time-text');
  
  if (attempt.userAnswer === -1) {
    statusLabel.textContent = 'BOŞ BIRAKILDI / SÜRE DOLDU';
    statusLabel.className = 'review-status-text incorrect';
  } else if (attempt.isCorrect) {
    statusLabel.textContent = 'DOĞRU';
    statusLabel.className = 'review-status-text correct';
  } else {
    statusLabel.textContent = 'YANLIŞ';
    statusLabel.className = 'review-status-text incorrect';
  }
  
  if (CONFIG.useTimer) {
    timeLabel.textContent = `Kalan Süre: ${attempt.timeLeft}s`;
  } else {
    timeLabel.textContent = 'Zamanlayıcı Kapalı';
  }
  
  // Buton Aktiflik Durumları
  const prevBtn = document.getElementById('btn-prev-review');
  const nextBtn = document.getElementById('btn-next-review');
  
  if (idx === 0) {
    prevBtn.style.opacity = '0.4';
    prevBtn.style.pointerEvents = 'none';
  } else {
    prevBtn.style.opacity = '1';
    prevBtn.style.pointerEvents = 'auto';
  }
  
  if (idx === QUESTIONS.length - 1) {
    nextBtn.style.opacity = '0.4';
    nextBtn.style.pointerEvents = 'none';
  } else {
    nextBtn.style.opacity = '1';
    nextBtn.style.pointerEvents = 'auto';
  }
}

// Sınavı Özet Ekranından Tamamen Bitirip Lider Tablosuna Geçiş
async function finalizeQuizFromSummary() {
  const btn = document.getElementById('btn-finish-summary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      Kaydediliyor...
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-dasharray="32" stroke-dashoffset="16" fill="none"/></svg>
    `;
  }
  
  const baseScore = state.answersHistory.reduce((sum, a) => sum + a.pointsEarned, 0);
  const accumulatedTimeBonus = state.answersHistory.reduce((sum, a) => {
    return sum + (a.isCorrect && CONFIG.useTimer && CONFIG.useTimeBonus ? a.timeLeft : 0);
  }, 0);
  
  const finalTotalScore = baseScore + accumulatedTimeBonus;
  
  state.playerScore = finalTotalScore;
  state.emulatedStorylineVars.playerScore = finalTotalScore;
  
  // Uzak veritabanı (Firebase) veya yerel kaydın tamamlanmasını BEKLE
  await saveScoreToLeaderboard(state.playerName, finalTotalScore);
  
  // LMS SCORM raporla (Sadece taban puanlar üzerinden 100 üzerinden yüzdelik gönderilir, zaman bonusları hariç!)
  reportScoreToLMS(baseScore, state.maxPossibleScore);
  
  updatePlayerUI();
  
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `
      Skor Tablosuna Git
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
    `;
  }
  
  switchScreen('leaderboard');
}

// --- YENİ BÜTÜNLEŞİK FİREBASE RTDB REST API YARDIMCILARI ---
async function fetchLeaderboardFromFirebase() {
  try {
    let url = CONFIG.firebaseURL.trim();
    if (!url.endsWith('.json')) {
      // URL sonu "/" ile bitiyorsa veya doğrudan alan adıysa düzelt
      url = url.endsWith('/') ? `${url}leaderboard.json` : `${url}/leaderboard.json`;
    }
    
    console.log("Firebase REST API verileri çekiliyor: ", url);
    const response = await fetch(url);
    const data = await response.json();
    
    let list = [];
    if (data) {
      // Firebase POST verileri { "-Nxyz...": { name: 'A', score: 10 }, ... } şeklinde depolar.
      // Bunları diziye dönüştürüp sıralayalım
      list = Object.keys(data).map(key => data[key]);
      list.sort((a, b) => b.score - a.score);
    }
    
    // Sadece en yüksek 50 skoru al
    state.leaderboard = list.slice(0, 50);
    
    // Tablonun 50'ye tamamlanmasını sağla
    while (state.leaderboard.length < 50) {
      state.leaderboard.push({ name: "-", score: 0 });
    }
    
    updateEmulatorVarsFromLeaderboard();
    syncWithStoryline();
    console.log("Firebase Liderlik tablosu başarıyla güncellendi: ", state.leaderboard);
  } catch (e) {
    console.error("Firebase veri çekme hatası, yerel veriye dönülüyor:", e);
    // Hata durumunda yerel depolama verisini oku (Offline Dayanıklılığı)
    let rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawData) {
      try {
        state.leaderboard = JSON.parse(rawData);
      } catch (err) {
        state.leaderboard = Array(50).fill(null).map(() => ({ name: "-", score: 0 }));
      }
    }
    updateEmulatorVarsFromLeaderboard();
    syncWithStoryline();
  }
}

async function saveScoreToFirebase(name, score) {
  try {
    let url = CONFIG.firebaseURL.trim();
    if (!url.endsWith('.json')) {
      url = url.endsWith('/') ? `${url}leaderboard.json` : `${url}/leaderboard.json`;
    }
    
    console.log("Firebase REST API'ye yeni skor kaydediliyor: ", url);
    const attemptData = {
      name: name,
      score: score,
      timestamp: new Date().toISOString()
    };
    
    // REST API POST işlemi (Eşsiz anahtarla yeni kayıt ekler)
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attemptData)
    });
    
    console.log("Skor Firebase'e kaydedildi. Güncel liste çekiliyor...");
    await fetchLeaderboardFromFirebase();
  } catch (e) {
    console.error("Firebase'e kayıt hatası:", e);
  }
}

// Giriş Yapmadan Önce Liderlik Tablosunu Önizleme Fonksiyonu
function showLeaderboardFromWelcome() {
  playSound('tick');
  // Navigasyonu gizli tut (Henüz giriş yapılmadığı için kafa karıştırmasın)
  document.getElementById('app-navigation').style.display = 'none';
  
  // Giriş ekranına dönüş butonunu aktif et
  const welcomeActions = document.getElementById('leaderboard-welcome-actions');
  if (welcomeActions) welcomeActions.style.display = 'block';
  
  // Skor tablosunu güncelle ve ekrana geç
  switchScreen('leaderboard');
}
