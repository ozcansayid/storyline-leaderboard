# 🏆 Storyline 360 Çift Yönlü Liderlik Tablosu & Moodle SCORM Entegrasyon Modülü (v2.0.0)

Bu modül, Articulate Storyline 360 projeleriniz için geliştirilmiş, hem çevrimdışı (offline-first) **`localStorage`** üzerinde çalışan hem de isterseniz **Firebase Realtime Database REST API** aracılığıyla ortak/canlı bir bulut veritabanına bağlanabilen kalıcı bir **Liderlik Tablosu (Leaderboard - Top 50)**, **Rozet/Yıldız Takip Sistemi** ve **Gelişmiş Sınav/Test Modülü** sağlar.

Ayrıca modül, Storyline 360'ın kendi SCORM motoruyla çift yönlü değişken köprüsü kurarak sınav başarı puanlarını ve geçti/kaldı durumlarını Moodle gibi LMS sistemlerine tarayıcı güvenlik kısıtlamalarına takılmadan (CORS-safe) kusursuzca raporlar.

---

## 🌟 Yeni Sürüm Öne Çıkan Özellikler (v2.0.0)
1.  **🚀 Genişletilmiş Kapasite (Top 50)**: Liderlik tablosu kayıt kapasitesi 5 kişiden 50 kişiye çıkarılmıştır.
2.  **🎚️ Modern Neon Scrollbar UI**: Tabloda 4 ile 50. sıra arasındaki oyuncuların taşma yapmadan, son derece şık ve akıcı şekilde listelenmesini sağlayan özel neon cyan-to-purple webkit scrollbar eklenmiştir.
3.  **🔍 Akıllı Arama & Dinamik Podyum**: Arama kutusuna bir isim yazıldığında tüm 50-oyunculu liste anlık olarak filtrelenir. Arama esnasında 3D Podyum otomatik gizlenerek flat bir liste tasarımı sunulur ve oyuncuların orijinal sıralama numaraları (`originalRank`) matematiksel olarak korunur.
4.  **🔌 SCORM Değişken Köprüsü (CORS-Safe Moodle Entegrasyonu)**: Web Nesnesi (iframe) içinde hesaplanan taban yüzdelik puan (%0-100), Storyline'ın `lms_score_raw` ve `lms_lesson_status` değişkenlerine anlık olarak yazılır. Böylece tarayıcı CORS güvenlik engelleri aşılır.
5.  **📋 Hazır LMS Tetikleyicisi (KOD 3)**: Moodle not defterine (Gradebook) puan yazmayı garanti altına alan 3 katmanlı (SCORM_SetScore, lmsAPI.SetScore, raw SCORM API) yedekli JavaScript tetikleyici şablonu eklenmiştir.
6.  **🔐 Güvenli Yapılandırma (Privacy-First)**: Kişisel veritabanı URL'lerinizin GitHub üzerinde ifşa olmasını önlemek amacıyla `config.json` dosyası `.gitignore` kapsamına alınmış ve açık kaynak paylaşım için `config.sample.json` şablonu oluşturulmuştur.

---

## 🔌 Entegrasyon Modelleri: Hangisini Seçmelisiniz?

Bu modülü Storyline 360 projenizde iki farklı yöntemle entegre edebilirsiniz:

### Yöntem A: 🚀 Tam Web Nesnesi Modu (Önerilen - En Kolay & Modern Yol)
*   **Nasıl Çalışır?**: Sınav ekranı, Soruları İnceleme modalı, Özet ekranı ve Liderlik Tablosu **tamamen bu Web Nesnesi (iframe) arayüzü ile** Storyline slaytı üzerinde gösterilir.
*   **Tetikleyici Gereksinimi**: Bu yöntemde **KOD 1 ve KOD 2'ye hiç ihtiyacınız yoktur!** Çünkü tüm veritabanı okuma, yazma ve Firebase kayıt işlemleri Web Nesnesi tarafından otomatik yapılır.
*   **Moodle İçin Tek Gereksinim**: Sadece puanı Moodle not defterine göndermek için **KOD 3** tetikleyicisini eklemeniz yeterlidir.

### Yöntem B: 🔗 Hibrit Mod (Storyline Sınavı + Web Nesnesi Liderlik Tablosu)
*   **Nasıl Çalışır?**: Sınav sorularını Storyline'ın kendi yerel slaytlarında hazırlarsınız. Kullanıcı testi bitirdiğinde, veriler Storyline üzerinden yerel veritabanına kaydedilir ve Web Nesnesi sadece "Skor Tablosunu Göstermek" için çağrılır.
*   **Tetikleyici Gereksinimi**: Bu yöntemde Storyline'ın veritabanı ile konuşabilmesi için **KOD 1 ve KOD 2 tetikleyicilerinin her ikisini de** projenize eklemeniz gerekmektedir.

---

## 🏗️ 1. Storyline Değişkenleri (Variables) Kurulumu

Entegrasyonun çalışabilmesi için Articulate Storyline 360 editöründeki **Variables (Değişkenler)** panelinden aşağıdaki değişkenleri tam olarak belirtilen isim ve türlerle tanımlamanız gerekmektedir. Değişkenler tanımlanmadığı takdirde tarayıcı konsolunda uyarılar görünecek ve Moodle'a puan aktarımı sağlanamayacaktır.

| Değişken Adı | Türü (Type) | Varsayılan Değer | Açıklama |
| :--- | :--- | :--- | :--- |
| `playerName` | Text | (Boş) | Oyuncunun giriş ekranında yazdığı ad ve soyad. |
| `playerScore` | Number | 0 | Zaman bonusları dahil oyuncunun toplam skoru. |
| `lms_score_raw` | Number | 0 | **(Kritik)** Zaman bonusları hariç Moodle'a gönderilecek saf başarı yüzdesi. |
| `lms_lesson_status` | Text | "failed" | Sınavın geçti/kaldı durumu ("passed" veya "failed"). |
| `rank1_name` ... `rank5_name` | Text | "-" | En iyi 5 liderin isimlerini Storyline slaytında göstermek için. |
| `rank1_score` ... `rank5_score` | Number | 0 | En iyi 5 liderin skorlarını Storyline slaytında göstermek için. |
| `badge_bronze` | True/False | False | Bronz rozet kazanım durumu (Başarı >= %50). |
| `badge_silver` | True/False | False | Gümüş rozet kazanım durumu (Başarı >= %80). |
| `badge_gold` | True/False | False | Altın rozet kazanım durumu (Başarı == %100). |

---

## ⚡ 2. Storyline JS Tetikleyicileri (Triggers)

Storyline projenizde uygun olaylar tetiklendiğinde aşağıdaki JavaScript kod bloklarını **"Execute JavaScript"** tetikleyicisi olarak ekleyin:

### 📥 A. KOD 1: Liderlik Tablosunu Okuma ve Arayüze Yükleme
*   **Çalışma Zamanı**: Liderlik Tablosunun bulunduğu slayt veya sahne ilk yüklendiğinde (`When timeline starts on this slide`).
*   **Amaç**: Kaydedilmiş liderlik tablosu verilerini tarayıcıdan çekmek ve Storyline arayüzündeki ilk 5 lider değişkenini doldurmak.

```javascript
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

  // Storyline ekranındaki ilk 5 lideri dolduralım
  for (var index = 0; index < 5; index++) {
    var entry = leaderboardData[index] || { name: "-", score: 0 };
    var rankNum = index + 1;
    
    player.SetVar("rank" + rankNum + "_name", entry.name);
    player.SetVar("rank" + rankNum + "_score", entry.score);
  }

  console.log("Liderlik tablosu başarıyla yüklendi!");

} catch (error) {
  console.error("Storyline yerel leaderboard yükleme hatası: ", error);
}
```

### 💾 B. KOD 2: Yeni Skor Kaydetme ve Rozet Kontrolü (Top 50)
*   **Çalışma Zamanı**: Test tamamlandığında veya "Skoru Kaydet" butonuna tıklandığında (`When user clicks or when timeline starts on results slide`).
*   **Amaç**: Oyuncu bilgilerini alıp liderlik tablosunu 50 oyuncuya kadar güncellemek ve rozet durumlarını Storyline'a göndermek.

```javascript
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

    leaderboardData = leaderboardData.slice(0, 50); // En iyi 50 oyuncuyu tut
    localStorage.setItem(dbKey, JSON.stringify(leaderboardData));

    // Storyline ekranındaki ilk 5 lideri güncelleyelim
    for (var index = 0; index < 5; index++) {
      var entry = leaderboardData[index] || { name: "-", score: 0 };
      var rankNum = index + 1;
      
      player.SetVar("rank" + rankNum + "_name", entry.name);
      player.SetVar("rank" + rankNum + "_score", entry.score);
    }

    // Rozet kontrolleri
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
}
```

### 🔌 C. KOD 3: Moodle / LMS SCORM Gradebook Puan Raporlayıcı
*   **Çalışma Zamanı**: `lms_score_raw` değişkeni değiştiğinde (`When lms_score_raw changes`).
*   **Amaç**: Web Nesnesi iframe'inden gelen yüzdelik başarı puanını tarayıcı güvenlik engellerine takılmadan Moodle not defterine kaydetmek. 3 katmanlı yedekli yapısı sayesinde SCORM sürümü ne olursa olsun çalışmayı garanti eder.

```javascript
try {
  var player = GetPlayer();
  var percentage = player.GetVar("lms_score_raw") || 0; // iframe'den gelen yüzdelik başarı puanı
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
}
```

---

## 🔌 3. Web Object (Web Nesnesi) Olarak Entegrasyon

Uygulamanın şık ve modern tam arayüzünü doğrudan Storyline slaytı üzerinde göstermek isterseniz:
1.  Storyline üst menüsünden **Insert > Web Object** yolunu izleyin.
2.  Açılan pencerede **Address** kısmına, bu klasörün yerel yolunu gösterin.
3.  Modül Storyline içinde bir iframe olarak yüklenecektir.
4.  Modülün sağ alt köşesindeki **Storyline Konsolu** butonuna tıklayarak Storyline değişkenlerinin emülasyon durumlarını anlık takip edebilirsiniz.
5.  *Not:* Canlı yayına almadan önce `app.js` dosyasının en altındaki dom event dinleyicilerinden konsol butonunu gizleyebilirsiniz.

---

## ⚙️ 4. Canlı Bulut Veritabanı Kurulumu (Firebase RTDB REST API)

Ortak ve canlı bir liderlik tablosu çalıştırmak istiyorsanız:
1.  Bir Firebase projesi oluşturun ve **Realtime Database** (RTDB) servisini aktif edin.
2.  Veritabanı kurallarını (Rules) hem okuma hem yazma için `true` yapın:
    ```json
    {
      "rules": {
        ".read": true,
        ".write": true
      }
    }
    ```
3.  Proje klasörünüzdeki **`config.sample.json`** dosyasının adını **`config.json`** olarak değiştirin (Local'de kalacak, GitHub'a gitmeyecektir).
4.  `config.json` dosyasını açıp ayarları güncelleyin:
    *   `useFirebase`: `true` yapın.
    *   `firebaseURL`: Kendi Firebase veritabanı URL'nizi yapıştırın.
        *(Örn: `"https://PROJE_ID-default-rtdb.europe-west1.firebasedatabase.app"`)*

---

## 🌟 5. Soru Bankası (`questions.json` & `questions.csv`) Düzenleme

Sınav modülünüzün soruları tamamen dinamiktir. İki farklı yolla soruları güncelleyebilirsiniz:
*   **questions.json**: JSON dosyasını açarak soru metni (`question`), şıklar (`choices`) ve doğru şık indeksini (`correct`: 0=A, 1=B, 2=C, 3=D) düzenleyebilirsiniz.
*   **questions.csv**: Excel veya Google Sheets ile açıp Sütunları bozmadan soruları ekleyebilir, ardından CSV (Noktalı Virgül veya Virgül ayrılmış) olarak kaydedip klasöre yerleştirebilirsiniz.

---

## 📄 Lisans
Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.
