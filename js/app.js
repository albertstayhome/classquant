/**
 * ClassQuant Hub - Main App Controller v1.4.0
 * Theme Switcher, Native Web Audio Chime Engine, Smart Auto-Collapsing Header on Scroll,
 * Delightful Micro-Animations, Tab Router, In-App Live Over-The-Air (OTA) Remote Update Engine,
 * and System Bulletin / Changelog Center.
 */

class AppState {
  constructor() {
    this.currentClassId = '801';
    this.activeTab = 'matrix';
    this.deferredPrompt = null;
    this.isHeaderCollapsed = false;
    this.audioCtx = null;
    this.appVersion = '1.9.14';

    // Official COTE Terminal Quotes Database for Easter Egg
    this.coteTerminalQuotes = [
      {
        source: "【第1季 第12話 結尾白室獨白】",
        quote: "「我從來沒有把你們當成同伴。不管是堀北，還是櫛田。所有人對我來說，都只不過是道具而已。只要最後贏的人是我，過程怎樣都無所謂。」"
      },
      {
        source: "【尼采 (Friedrich Nietzsche) // 第1季第1話】",
        quote: "「惡性並非誕生於軟弱，而是誕生於無知。人生來就是平等的嗎？如果真有平等的存在，那這個世界就太不合理了。」"
      },
      {
        source: "【讓·保羅·薩特 (Jean-Paul Sartre) // 第1季第3話】",
        quote: "「地獄即他人。他人不是鏡子，而是隨時會反噬你的深淵。」"
      },
      {
        source: "【尼可羅·馬基維利 (Niccolò Machiavelli) // 第2季第2話】",
        quote: "「如果要讓人畏懼或愛戴，若無法兼得，讓人畏懼遠比受人愛戴更加安全。」"
      },
      {
        source: "【杜斯妥也夫斯基 (Fyodor Dostoevsky) // 第2季第6話】",
        quote: "「如果一切都被允許，那麼任何事情都可以被做。但真正的強者，在於明知可以肆意妄為，卻依舊保持克制。」"
      },
      {
        source: "【綾小路 清隆 // 處世原則】",
        quote: "「人不付出犧牲，就無法得到任何回報。要想得到什麼，就必須付出同等的代價——這是這個世界唯一的常理。」"
      },
      {
        source: "【綾小路 清隆 // 白室生存哲學】",
        quote: "「隱藏實力並不是為了謙虛，而是在關鍵時刻，擁有隨時將整張棋盤掀翻的絕對餘裕。」"
      },
      {
        source: "【伏爾泰 (Voltaire) // 第3季第1話】",
        quote: "「歷史不過是一幕幕藉人類的罪惡、愚昧和災禍編織而成的戲劇。而勝者，永遠是操縱提線的那個人。」"
      }
    ];
    this.currentCoteQuoteIdx = 0;

    // Official COTE Characters Database for Dramatic Cut-In Easter Egg (35-Character Full Hierarchy)
    this.coteSilhouettes = [
      {
        id: 'ayanokoji',
        name: '綾小路 清隆',
        kana: 'AYANOKOJI KIYOTAKA',
        classTitle: '白色房間最高傑作 // 幕後支配者',
        image: './assets/cote/official/ayanokoji_full.webp',
        avatar: './assets/cote/official/ayanokoji.webp',
        shoutedQuote: '「世上所謂的『平等』只不過是虛妄。所有人對我來說，都只不過是道具而已！」',
        subQuote: '只要最後贏的人是我，過程怎樣都無所謂。',
        auraColor: '#ef4444'
      },
      {
        id: 'sakayanagi',
        name: '坂柳 有栖',
        kana: 'SAKAYANAGI ARISU',
        classTitle: '高度育成 2年A班 // 天賦領袖・天才棋手',
        image: './assets/cote/official/sakayanagi_full.webp',
        avatar: './assets/cote/official/sakayanagi.webp',
        shoutedQuote: '「呵呵……天才與凡人的差距，可不是靠努力就能彌補的呢。」',
        subQuote: '偽物終究只是偽物，就由我來親自粉碎你的幻想。',
        auraColor: '#a855f7'
      },
      {
        id: 'koenji',
        name: '高圓寺 六助',
        kana: 'KOENJI ROKUSUKE',
        classTitle: '高度育成 2年D班 // 規格外全能超人・唯我獨尊',
        image: './assets/cote/official/koenji_full.webp',
        avatar: './assets/cote/official/koenji.webp',
        shoutedQuote: '「哈哈哈哈！世俗的規矩對美麗的我毫無意義，唯有我才是極致的真理！」',
        subQuote: '任何人想命令我，都還太早了一百年呢，Girl～',
        auraColor: '#f59e0b'
      },
      {
        id: 'nagumo',
        name: '南雲 雅',
        kana: 'NAGUMO MIYABI',
        classTitle: '生徒會長 // 3年A班絕對霸者',
        image: './assets/cote/official/nagumo_full.webp',
        avatar: './assets/cote/official/nagumo.webp',
        shoutedQuote: '「我要把這所學校徹底改造成由實力支配的真正戰場！」',
        subQuote: '實力弱小的傢伙，連站在我面前的資格都沒有。',
        auraColor: '#eab308'
      },
      {
        id: 'ryuen',
        name: '龍園 翔',
        kana: 'RYUEN KAKERU',
        classTitle: '高度育成 2年C班 // 暴君統率・無情破局者',
        image: './assets/cote/official/ryuen_full.webp',
        avatar: './assets/cote/official/ryuen.webp',
        shoutedQuote: '「規則？規矩就是用來打破的！在我的字典裡只有獲勝與臣服！」',
        subQuote: '只要能贏，用什麼骯髒手段我都奉陪到底！',
        auraColor: '#dc2626'
      },
      {
        id: 'ichinose',
        name: '一之瀨 帆波',
        kana: 'ICHINOSE HONAMI',
        classTitle: '高度育成 2年B班 // 信任與博愛的核心領袖',
        image: './assets/cote/official/ichinose_full.webp',
        avatar: './assets/cote/official/ichinose.webp',
        shoutedQuote: '「只要大家同心協力、彼此信任，B 班一定能全員一起升上 A 班！」',
        subQuote: '我絕對不會放棄任何一個同伴！',
        auraColor: '#ec4899'
      },
      {
        id: 'horikita',
        name: '堀北 鈴音',
        kana: 'HORIKITA SUZUNE',
        classTitle: '高度育成 2年D班 // 實權領袖・孤高的銳刃',
        image: './assets/cote/official/horikita_full.webp',
        avatar: './assets/cote/official/horikita.webp',
        shoutedQuote: '「我絕不會向任何人低頭！我要用自己的雙手，帶領班級登上 A 班頂點！」',
        subQuote: '無須同情，也不需要藉口，實力自會證明一切。',
        auraColor: '#3b82f6'
      },
      {
        id: 'amasawa',
        name: '天澤 一夏',
        kana: 'AMASAWA ICHIKA',
        classTitle: '高度育成 1年A班 // 五期白室小惡魔刺客',
        image: './assets/cote/official/amasawa_full.webp',
        avatar: './assets/cote/official/amasawa.webp',
        shoutedQuote: '「前輩真敏銳呢～不過，稍微玩得太過火的話，可是會受傷的喔～」',
        subQuote: '在崇拜你之前，先讓我測測前輩有沒有那個資格吧～',
        auraColor: '#f97316'
      },
      {
        id: 'yagami',
        name: '八神 拓也',
        kana: 'YAGAMI TAKUYA',
        classTitle: '高度育成 1年B班 // 五期白室生・生徒會書記',
        image: './assets/cote/official/yagami_full.webp',
        avatar: './assets/cote/official/yagami.webp',
        shoutedQuote: '「我一直都在注視著你……綾小路清隆，我才是最優秀的存在。」',
        subQuote: '所有的光環，都該由我親手奪回來。',
        auraColor: '#6366f1'
      },
      {
        id: 'karuizawa',
        name: '輕井澤 惠',
        kana: 'KARUIZAWA KEI',
        classTitle: '高度育成 2年D班 // 女生核心領袖・契約之鎖',
        image: './assets/cote/official/karuizawa_full.webp',
        avatar: './assets/cote/official/karuizawa.webp',
        shoutedQuote: '「保護我……這是我們之間的契約吧？清隆君……我相信你！」',
        subQuote: '即使被所有人背叛，我也絕不會出賣你。',
        auraColor: '#f43f5e'
      },
      {
        id: 'hirata',
        name: '平田 洋介',
        kana: 'HIRATA YOSUKE',
        classTitle: '高度育成 2年D班 // 文武雙全・秩序幹部',
        image: './assets/cote/official/hirata_full.webp',
        avatar: './assets/cote/official/hirata.webp',
        shoutedQuote: '「我不會再讓任何人受到傷害！大家一定要一起笑著畢業！」',
        subQuote: '為了守護大家，我願意承擔所有的痛苦。',
        auraColor: '#14b8a6'
      },
      {
        id: 'sudo',
        name: '須藤 健',
        kana: 'SUDO KEN',
        classTitle: '高度育成 2年D班 // 體能怪物・籃球王牌',
        image: './assets/cote/official/sudo_full.webp',
        avatar: './assets/cote/official/sudo.webp',
        shoutedQuote: '「老子可不是只會用拳頭的笨蛋！我要用真正的實力得到認可！」',
        subQuote: '鈴音……我一定會證明給你看的！',
        auraColor: '#ea580c'
      },
      {
        id: 'katsuragi',
        name: '葛城 康平',
        kana: 'KATSURAGI KOHEI',
        classTitle: '高度育成 2年A班 // 穩健防禦型智謀策士',
        image: './assets/cote/official/katsuragi_full.webp',
        avatar: './assets/cote/official/katsuragi.webp',
        shoutedQuote: '「冒險往往伴隨著毀滅。沉穩行事才是通往最終勝利的唯一正途。」',
        subQuote: '我不做沒有把握的賭局。',
        auraColor: '#78716c'
      },
      {
        id: 'shiina',
        name: '椎名 日和',
        kana: 'SHIINA HIYORI',
        classTitle: '高度育成 2年C班 // 知性書蟲・幕後智囊',
        image: './assets/cote/official/shiina_full.webp',
        avatar: './assets/cote/official/shiina.webp',
        shoutedQuote: '「平靜地閱讀是最好的享受……不過這本書的結局，我早就猜到了呢。」',
        subQuote: '只要能看透動機，對手的行動就一目了然。',
        auraColor: '#cbd5e1'
      },
      {
        id: 'kanzaki',
        name: '神崎 隆二',
        kana: 'KANZAKI RYUJI',
        classTitle: '高度育成 2年B班 // 冷靜參謀・副領袖',
        image: './assets/cote/official/kanzaki_full.webp',
        avatar: './assets/cote/official/kanzaki.webp',
        shoutedQuote: '「光憑天真是無法在殘酷的考試中生存的。我們必須做出改變。」',
        subQuote: '為了守護一之瀨，我必須成為冷澈的影子。',
        auraColor: '#0284c7'
      },
      {
        id: 'hosen',
        name: '寶泉 和臣',
        kana: 'HOSEN KAZUOMI',
        classTitle: '高度育成 1年D班 // 暴力怪物暴君',
        image: './assets/cote/official/hosen_full.webp',
        avatar: './assets/cote/official/hosen.webp',
        shoutedQuote: '「管你是二年級還是前輩，惹到老子照樣打得你滿地找牙！」',
        subQuote: '實力？拳頭硬就是這間學校最大的實力！',
        auraColor: '#b91c1c'
      },
      {
        id: 'nanase',
        name: '七瀨 翼',
        kana: 'NANASE TSUBASA',
        classTitle: '高度育成 1年D班 // 正義與執念的代行者',
        image: './assets/cote/official/nanase_full.webp',
        avatar: './assets/cote/official/nanase.webp',
        shoutedQuote: '「我不會允許卑劣的手段！綾小路前輩，我一定會看清你的真實實力！」',
        subQuote: '為了那個人的願望，我不能在這裡止步。',
        auraColor: '#0ea5e9'
      },
      {
        id: 'tsubaki',
        name: '椿 櫻子',
        kana: 'TSUBAKI SAKURAKO',
        classTitle: '高度育成 1年C班 // 冷澈幕後操盤手',
        image: './assets/cote/official/tsubaki_full.webp',
        avatar: './assets/cote/official/tsubaki.webp',
        shoutedQuote: '「棒棒糖很甜呢……只要按部就班，勝利自然會落入手中。」',
        subQuote: '不要小看一年C班的決心。',
        auraColor: '#8b5cf6'
      },
      {
        id: 'utomiya',
        name: '宇都宮 陸',
        kana: 'UTOMIYA RIKU',
        classTitle: '高度育成 1年C班 // 武術實權統率',
        image: './assets/cote/official/utomiya_full.webp',
        avatar: './assets/cote/official/utomiya.webp',
        shoutedQuote: '「一年C班有自己的行事方針，任何人休想隨意干涉！」',
        subQuote: '為了守護班級同伴，我不會有任何猶豫。',
        auraColor: '#10b981'
      },
      {
        id: 'ibuki',
        name: '伊吹 澪',
        kana: 'IBUKI MIO',
        classTitle: '高度育成 2年C班 // 格鬥孤狼刺客',
        image: './assets/cote/official/ibuki_full.webp',
        avatar: './assets/cote/official/ibuki.webp',
        shoutedQuote: '「別跟在我後面晃悠，煩死了！我只靠自己的實力說話。」',
        subQuote: '堀北鈴音，下次我一定會打敗你！',
        auraColor: '#64748b'
      },
      {
        id: 'kushida',
        name: '櫛田 桔梗',
        kana: 'KUSHIDA KIKYO',
        classTitle: '高度育成 2年D班 // 天使的面具與暗黑本性',
        image: './assets/cote/official/kushida_full.webp',
        avatar: './assets/cote/official/kushida.webp',
        shoutedQuote: '「大家都最喜歡我了對吧？……（切換冷笑）別得意忘形了，找死嗎？」',
        subQuote: '敢阻礙我的人，我會不惜一切代價徹底毀掉。',
        auraColor: '#e11d48'
      },
      {
        id: 'yukimura',
        name: '幸村 輝彥',
        kana: 'YUKIMURA TERUHIKO',
        classTitle: '高度育成 2年D班 // 頂尖學力策士',
        image: './assets/cote/official/yukimura_full.webp',
        avatar: './assets/cote/official/yukimura.webp',
        shoutedQuote: '「叫我啟誠就好。在學術考試上，我絕對不會輸給任何其他班級！」',
        subQuote: '冷靜分析，找出破綻，這才是致勝法門。',
        auraColor: '#2563eb'
      },
      {
        id: 'matsushita',
        name: '松下 千秋',
        kana: 'MATSUSHITA CHIAKI',
        classTitle: '高度育成 2年D班 // 隱藏實力敏銳觀察者',
        image: './assets/cote/official/matsushita_full.webp',
        avatar: './assets/cote/official/matsushita.webp',
        shoutedQuote: '「大家都在隱藏實力呢……特別是綾小路同學，你究竟藏到了哪種程度？」',
        subQuote: '在看清全貌之前，我會保持安靜。',
        auraColor: '#d97706'
      },
      {
        id: 'hasebe',
        name: '長谷部 波瑠加',
        kana: 'HASEBE HARUKA',
        classTitle: '高度育成 2年D班 // 綾小路組核心夥伴',
        image: './assets/cote/official/hasebe_full.webp',
        avatar: './assets/cote/official/hasebe.webp',
        shoutedQuote: '「清隆、幸村、三宅、愛里……大家聚在一起的時光，比升上A班更重要！」',
        subQuote: '敢欺負我組裡的人，我可饒不了你喔！',
        auraColor: '#ec4899'
      },
      {
        id: 'miyake',
        name: '三宅 明人',
        kana: 'MIYAKE AKITO',
        classTitle: '高度育成 2年D班 // 弓道沉穩守護者',
        image: './assets/cote/official/miyake_full.webp',
        avatar: './assets/cote/official/miyake.webp',
        shoutedQuote: '「只要瞄準目標，心無雜念，箭矢就絕不會偏離方向。」',
        subQuote: '綾小路組是我最想守護的地方。',
        auraColor: '#059669'
      },
      {
        id: 'sato',
        name: '佐藤 麻耶',
        kana: 'SATO MAYA',
        classTitle: '高度育成 2年D班 // 積極開朗同儕',
        image: './assets/cote/official/sato_full.webp',
        avatar: './assets/cote/official/sato.webp',
        shoutedQuote: '「就算成績不拔尖，只要拼盡全力，我們也能跟上大家的腳步！」',
        subQuote: '今天也要元氣滿滿地加油！',
        auraColor: '#f472b6'
      },
      {
        id: 'sakura',
        name: '佐倉 愛里',
        kana: 'SAKURA AIRI',
        classTitle: '高度育成 2年D班 // 前網路偶像少女',
        image: './assets/cote/official/sakura_full.webp',
        avatar: './assets/cote/official/sakura.webp',
        shoutedQuote: '「我也想……成為對大家有用的人！清隆同學……我會努力鼓起勇氣的！」',
        subQuote: '謝謝你一直在背後默默守護著我。',
        auraColor: '#fb7185'
      },
      {
        id: 'asahina',
        name: '朝比奈 なずな',
        kana: 'ASAHINA NAZUNA',
        classTitle: '高度育成 3年A班 // 御守副官情報線',
        image: './assets/cote/official/asahina_full.webp',
        avatar: './assets/cote/official/asahina.webp',
        shoutedQuote: '「學弟，這枚御守會為你帶來好運喔～三年級的局勢，可沒那麼簡單呢。」',
        subQuote: '南雲君有時候確實太過火了呢。',
        auraColor: '#a855f7'
      },
      {
        id: 'ishizaki',
        name: '石崎 大地',
        kana: 'ISHIZAKI DAICHI',
        classTitle: '高度育成 2年C班 // 突擊特攻先鋒',
        image: './assets/cote/official/ishizaki_full.webp',
        avatar: './assets/cote/official/ishizaki.webp',
        shoutedQuote: '「少瞧不起人了！為了龍園老大的計畫，我們C班什麼都幹得出來！」',
        subQuote: '雖然打不過你，但我可不會輕易認輸！',
        auraColor: '#ef4444'
      },
      {
        id: 'ike',
        name: '池 寬治',
        kana: 'IKE KANJI',
        classTitle: '高度育成 2年D班 // 戶外生存達人',
        image: './assets/cote/official/ike_full.webp',
        avatar: './assets/cote/official/ike.webp',
        shoutedQuote: '「在野外生存考核，我可是專家！大家跟著我準沒錯啦！」',
        subQuote: '就算是吊車尾，我也要證明自己的用處！',
        auraColor: '#eab308'
      },
      {
        id: 'shinohara',
        name: '篠原 さつき',
        kana: 'SHINOHARA SATSUKI',
        classTitle: '高度育成 2年D班 // 班級常態骨幹',
        image: './assets/cote/official/shinohara_full.webp',
        avatar: './assets/cote/official/shinohara.webp',
        shoutedQuote: '「池！你又在偷懶了是不是！大家都在努力，你也給我認真點啦！」',
        subQuote: '雖然常常吵架，但我們D班一個都不能少。',
        auraColor: '#f43f5e'
      },
      {
        id: 'kiriyama',
        name: '桐山 生叶',
        kana: 'KIRIYAMA IKUTO',
        classTitle: '高度育成 3年B班 // 前生徒會副會長',
        image: './assets/cote/official/kiriyama_full.webp',
        avatar: './assets/cote/official/kiriyama.webp',
        shoutedQuote: '「為了打破南雲雅的獨裁體系，我們必須繼承前會長堀北學的意志。」',
        subQuote: '實力主義的學校，不應淪為私慾的玩物。',
        auraColor: '#3b82f6'
      },
      {
        id: 'chabashira',
        name: '茶柱 佐枝',
        kana: 'CHABASHIRA SAE',
        classTitle: '高度育成 2年D班導師 // 冷澈的引導者',
        image: './assets/cote/official/chabashira_full.webp',
        avatar: './assets/cote/official/chabashira.webp',
        shoutedQuote: '「歡迎來到實力至上主義教室。在這裡，點數就是一切，實力決定命運。」',
        subQuote: '能登上A班的，只有真正跨越極限的人。',
        auraColor: '#991b1b'
      },
      {
        id: 'hoshinomiya',
        name: '星之宮 知惠',
        kana: 'HOSHINOMIYA CHIE',
        classTitle: '高度育成 2年B班導師 // 隨和的監視者',
        image: './assets/cote/official/hoshinomiya_full.webp',
        avatar: './assets/cote/official/hoshinomiya.webp',
        shoutedQuote: '「哎呀～佐枝醬的班級最近真厲害呢！不過我們B班的孩子們可不會輸喔～」',
        subQuote: '老師我也會一直看著你們的成長呢～',
        auraColor: '#db2777'
      },
      {
        id: 'tsukishiro',
        name: '月城 理事長代理',
        kana: 'TSUKISHIRO',
        classTitle: '高度育成 理事長代理 // 白室特派刺客',
        image: './assets/cote/official/tsukishiro_full.webp',
        avatar: './assets/cote/official/tsukishiro.webp',
        shoutedQuote: '「綾小路清隆君，白色房間不會允許有自由的造物。請做好退學準備吧。」',
        subQuote: '規則在我手中，勝負早就已經注定。',
        auraColor: '#475569'
      }
    ];
    this.currentSilhouetteIdx = 0;
    this.silhouetteTimeout = null;

    this.init();
  }

  init() {
    // 1. Initialize Theme
    const currentTheme = window.appStore.getTheme();
    this.applyTheme(currentTheme);

    // 2. Initial Class detection
    const active = window.timetableEngine.getActiveClassId();
    this.currentClassId = active.classId || '801';

    // 3. Listen to Timetable Engine changes
    window.timetableEngine.onClassChange((newClassId, context) => {
      if (newClassId && newClassId !== this.currentClassId) {
        this.currentClassId = newClassId;
        this.showToast(`課表自動感知切換至：${newClassId} 班`, 'info');
      }
      this.updateHeaderStatus();
      this.refreshActiveTab();
    });

    // 4. Setup clock ticker
    setInterval(() => {
      this.updateHeaderClock();
    }, 1000);

    // 5. Setup PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.classList.remove('hidden');
    });

    // 6. Network online/offline detection & Auto OTA check
    window.addEventListener('online', () => {
      this.updateNetworkBadge(true);
      this.showToast('網路連線已恢復 🌐', 'success');
      this.checkForUpdates(true);
    });
    window.addEventListener('offline', () => {
      this.updateNetworkBadge(false);
      this.showToast('目前為離線模式，所有本機功能正常運作 📴', 'info');
    });
    this.updateNetworkBadge(navigator.onLine);

    // 7. Initial OTA check & tab resume check
    setTimeout(() => {
      this.checkForUpdates(true);
    }, 1500);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates(true);
      }
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('ClassQuant ServiceWorker controller updated. Reloading for fresh assets...');
        window.location.reload();
      });
    }

    // Initial render
    this.updateHeaderStatus();
    this.updateHeaderClock();
    this.renderClassDropdown();
    this.updateSoundButtonUI();
    this.updateHeaderVersionBadge();
    this.switchTab('matrix');
  }

  updateHeaderVersionBadge() {
    const badge = document.getElementById('header-version-badge');
    if (badge) {
      badge.innerHTML = `<span>v${this.appVersion}</span><span>📢</span>`;
    }
  }

  toggleHeader(forceExpand = null) {
    const header = document.getElementById('global-header');
    const unhidePill = document.getElementById('header-unhide-pill');
    if (!header) return;

    if (forceExpand !== null) {
      this.isHeaderCollapsed = !forceExpand;
    } else {
      this.isHeaderCollapsed = !this.isHeaderCollapsed;
    }

    if (this.isHeaderCollapsed) {
      header.classList.add('header-collapsed');
      if (unhidePill) unhidePill.classList.remove('hidden');
    } else {
      header.classList.remove('header-collapsed');
      if (unhidePill) unhidePill.classList.add('hidden');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  updateNetworkBadge(isOnline) {
    const badge = document.getElementById('header-schedule-status');
    if (badge && !isOnline) {
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span><span class="opacity-70">離線狀態</span>';
    }
    const netIcon = document.getElementById('network-status-indicator');
    if (netIcon) {
      netIcon.innerHTML = isOnline 
        ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="text-[10px] text-emerald-600 font-bold hidden sm:inline">已連線</span>'
        : '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span class="text-[10px] text-slate-500 font-bold hidden sm:inline">離線模式</span>';
    }
  }

  // --- OTA Live Push Update Engine & Proactive Release Notes ---
  async checkForUpdates(silent = true) {
    if (!navigator.onLine) {
      if (!silent) this.showToast('目前處於離線狀態，無法檢查更新', 'info');
      return;
    }

    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const info = await res.json();
        if (info.version && info.version !== this.appVersion) {
          this.showReleaseNotesModal(info, false);
        } else if (!silent) {
          this.showToast(`✅ 目前已是最新版本 (v${this.appVersion})`, 'success');
        }
      }
    } catch (e) {
      if (!silent) this.showToast('無法取得更新資訊，請檢查網路連線', 'warning');
    }
  }

  showReleaseNotesModal(info, isNewVersionNotice = false) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';

    modalContent.innerHTML = `
      <div class="p-6 text-center animate-fade-in-up">
        <div class="flex justify-center mb-3">
          ${isOAA ? `
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-900 to-slate-900 flex items-center justify-center text-2xl shadow-lg border-2 border-amber-400">🏛️</div>
          ` : `
            <div class="sanrio-twinstars-badge !w-16 !h-16"></div>
          `}
        </div>
        <h3 class="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center gap-2 ${isOAA ? 'text-amber-300' : 'text-pink-600'}">
          ${isOAA ? '🏛️' : (isNewVersionNotice ? '🎉 歡迎使用' : '🌟 發現新版本')} ClassQuant Hub v${info.version}
          ${isOAA ? '<span class="text-xs px-2 py-0.5 rounded bg-rose-950 text-amber-400 border border-amber-500/40 font-mono">高度育成 S-SYSTEM</span>' : '<span class="kitty-bow"></span>'}
        </h3>
        <p class="text-xs ${isOAA ? 'text-amber-200/70 font-mono' : 'text-slate-500'} mb-4 font-bold">發布日期：${info.releaseDate || '2026-09-04'}</p>

        <div class="text-left p-4 rounded-2xl ${isOAA ? 'bg-[#250d1a] border border-amber-500/40 text-amber-100 shadow-md' : 'bg-pink-50 border border-pink-200 text-slate-800'} text-xs space-y-2 mb-5 font-bold">
          <div class="${isOAA ? 'text-amber-300' : 'text-pink-900'} font-black flex items-center gap-1">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 ${isOAA ? 'text-amber-400' : 'text-pink-600'}"></i>
            【本次更新重點】：
          </div>
          ${(info.releaseNotes || []).map(note => `
            <div class="flex items-start gap-1.5 leading-relaxed">
              <span class="${isOAA ? 'text-amber-400' : 'text-pink-500'} font-black">•</span>
              <span>${note}</span>
            </div>
          `).join('')}
        </div>

        <div class="flex items-center justify-center gap-3">
          <button onclick="appState.dismissReleaseNotes('${info.version}')" 
            class="w-full py-3 rounded-2xl font-black text-white ${isOAA ? 'bg-gradient-to-r from-rose-900 via-rose-800 to-amber-700 hover:from-rose-800 hover:to-amber-600 border border-amber-400/60 shadow-lg text-amber-100 shadow-rose-950/50' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-500/25'} transition text-sm flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer">
            ${isOAA ? '<span>⚡ 確認系統升級並重載終端</span>' : '<span class="kitty-bow !w-3.5 !h-3.5"></span><span>✨ 立即更新並體驗最新功能！</span>'}
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async dismissReleaseNotes(version) {
    localStorage.setItem('classquant_last_seen_version', version);
    this.closeModal();
    this.showToast(`正在更新至 v${version}... 🎀`, 'info');

    if ('caches' in window) {
      const keys = await caches.keys();
      for (let k of keys) {
        await caches.delete(k);
      }
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let reg of registrations) {
        await reg.update();
      }
    }
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + '?v=' + encodeURIComponent(version);
      window.location.href = cleanUrl;
    }, 400);
  }

  // --- System Bulletin Board & Full Changelog Archive (📢 系統公佈欄 & 歷史更新日誌) ---
  openBulletinModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';

    modalContent.innerHTML = `
      <div class="p-5 sm:p-7 max-h-[85vh] overflow-y-auto animate-fade-in-up">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3.5 border-b ${isOAA ? 'border-amber-500/30' : 'border-pink-100'} mb-4">
          <div class="flex items-center space-x-3">
            ${isOAA ? `
              <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 via-rose-900 to-slate-900 flex items-center justify-center text-xl shadow-md border-2 border-amber-400 shrink-0">🏛️</div>
            ` : `
              <div class="sanrio-kitty-badge !w-12 !h-12"></div>
            `}
            <div>
              <h3 class="text-lg sm:text-xl font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'} flex items-center gap-1.5">
                ${isOAA ? '🏛️ S-SYSTEM 系統公告與履歷檔案' : '📢 系統公佈欄 & 更新日誌'}
                ${isOAA ? '<span class="text-xs px-2 py-0.5 rounded bg-rose-950 text-amber-400 border border-amber-500/40 font-mono">COTE OAA</span>' : '<span class="kitty-bow"></span>'}
              </h3>
              <p class="text-xs ${isOAA ? 'text-amber-200/70 font-mono' : 'text-slate-500 font-bold'}">當前版本：v${this.appVersion} • ${isOAA ? '高度育成考評與實力分析終端' : '國中導師與數學科任專用'}</p>
            </div>
          </div>
          <button onclick="appState.closeModal()" class="w-8 h-8 rounded-full ${isOAA ? 'bg-rose-950/80 hover:bg-rose-900 text-amber-300 border border-amber-500/40' : 'bg-pink-50 hover:bg-pink-100 text-pink-700'} font-bold flex items-center justify-center transition cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Section 1: Active Activities & Teaching Reminders -->
        <div class="p-4 rounded-2xl ${isOAA ? 'bg-[#250d1a] border border-amber-500/40 text-amber-100 shadow-md' : 'bg-gradient-to-r from-pink-50 via-rose-50 to-sky-50 border border-pink-200 shadow-sm'} mb-5">
          <div class="flex items-center gap-1.5 text-xs font-black ${isOAA ? 'text-amber-300' : 'text-pink-900'} mb-2">
            <span class="text-base">${isOAA ? '🏛️' : '📌'}</span>
            <span>【${isOAA ? '高度育成教務指揮與考評指引' : '當前活動與課堂教學提醒'}】</span>
          </div>
          <div class="space-y-1.5 text-xs ${isOAA ? 'text-amber-100/90' : 'text-slate-700'} font-medium">
            <div class="flex items-start gap-1.5">
              <span class="${isOAA ? 'text-amber-400' : 'text-pink-600'} font-bold">🎯</span>
              <span><strong>段考小考${isOAA ? '實力數據統計' : '量化統計'}</strong>：利用「統計戰情室」的四象限分析，可即時掌握各班高分低常規或雙低需關懷之學生名單。</span>
            </div>
            <div class="flex items-start gap-1.5">
              <span class="text-emerald-500 font-bold">⏰</span>
              <span><strong>課堂事後回憶補記</strong>：課堂現場無法掏手機時，下課或放學回到辦公室點擊頂部「事後補記」，1 秒批次補齊記錄！</span>
            </div>
            <div class="flex items-start gap-1.5">
              <span class="${isOAA ? 'text-amber-300' : 'text-blue-600'} font-bold">📶</span>
              <span><strong>100% 離線支援</strong>：在地下室或無 Wi-Fi 教室操作，所有資料皆自動安全存放於本機，連網時自動背景熱更新。</span>
            </div>
          </div>
        </div>

        <!-- Section 2: Full Changelog History -->
        <div class="space-y-3.5 mb-5">
          <div class="text-xs font-black ${isOAA ? 'text-amber-300' : 'text-slate-800'} flex items-center gap-1">
            <i data-lucide="history" class="w-3.5 h-3.5 ${isOAA ? 'text-amber-400' : 'text-pink-600'}"></i>
            <span>歷史版本發布日誌 (Changelog)：</span>
          </div>

          <!-- v1.9.11 -->
          <div class="p-3.5 rounded-2xl border-2 border-amber-400 bg-[#2b0e1e] text-white shadow-md">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-700 via-amber-600 to-rose-800 text-white font-black text-xs shadow-sm font-mono">
                v1.9.11 (全站風格單一開關嚴格同調 • 公佈欄與互動板暗色修復 • 震撼實力者剪影降臨彩蛋)
              </span>
              <span class="text-[11px] text-amber-300 font-mono font-bold">2026-09-04</span>
            </div>
            <ul class="text-xs text-amber-100 space-y-1.5 font-medium pl-1">
              <li>• 【學生檔案風格開關移除】嚴格廢除學生檔案內部的額外切換按鈕！全站單一主題開關（頂部導覽列），所有模組 100% 同步沉浸。</li>
              <li>• 【公佈欄與互動板暗色完全修復】全面清除粉紅螢光與亮白背景，公佈欄與更新彈窗在 OAA 模式下完美呈現高度育成學院深酒紅與燙金風骨。</li>
              <li>• 【本格動漫實力者剪影降臨彩蛋】新增本格動漫角色巨幅半身剪影入場！震撼低頻音效、紅黑肅殺背光、高對比輪廓與經典立體台詞橫幅，原汁原味重現！</li>
            </ul>
          </div>

          <!-- v1.9.10 -->
          <div class="p-3.5 rounded-2xl border-2 border-amber-500/80 bg-[#230b18] text-white shadow-md">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-800 to-amber-700 text-white font-black text-xs shadow-sm font-mono">
                v1.9.10 (課堂標籤高對比全面重構 • 選單收合排版保護 • 本格動漫語錄台詞彩蛋實裝)
              </span>
              <span class="text-[11px] text-amber-300 font-mono font-bold">2026-09-04</span>
            </div>
            <ul class="text-xs text-amber-100 space-y-1.5 font-medium pl-1">
              <li>• 【課堂標籤高對比度全面重構】徹底消滅淺色螢光薄荷綠與粉色！加分標籤全面改採深邃墨綠，扣分標籤改採制服深酒紅，按鈕標題文字純白立體加陰影，黑底一目了然！</li>
              <li>• 【手機選單收合排版保護】重構頂部手機導航佈局，預留安全間距，選單「收合」按鈕不再與版本號重疊碰撞；選單收合後膠囊條同步標示版本號！</li>
              <li>• 【本格動漫互動彩蛋實裝】點擊頂部 COTE 校徽開啟「S-SYSTEM 綾小路清隆內部終端」，輪播經典哲學語錄與白室獨白；點擊學生頭貼即觸發專屬 11 位角色的動漫經典台詞！</li>
            </ul>
          </div>

          <!-- v1.9.9 -->
          <div class="p-3.5 rounded-2xl border-2 border-amber-500 bg-[#250d1a] text-white shadow-md">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-800 to-amber-700 text-white font-black text-xs shadow-sm font-mono">
                v1.9.9 (《實力至上主義教室》本格高校風格全面實裝 • 官方動漫頭貼 & 100% 高對比文字修復)
              </span>
              <span class="text-[11px] text-amber-300 font-mono font-bold">2026-09-04</span>
            </div>
            <ul class="text-xs text-amber-100 space-y-1.5 font-medium pl-1">
              <li>• 【官方本格高校風格】揚棄生硬科技與軍事感，回歸《實力至上》深酒紅制服與金色滾邊高校視覺，導入官方高清 Logo 與校園美術壁紙！</li>
              <li>• 【官方動漫角色頭貼】徹底告別三麗鷗貼紙！學生座位卡全面實裝綾小路清隆、堀北鈴音、輕井澤惠、一之瀨帆波、坂柳有栖等 11 位官方角色頭像與 OAA 階級徽章！</li>
              <li>• 【文字高對比度 100% 修復】全面重構文字色盤！學生姓名白字清晰、學業與常規數據採用高對比金與翡翠綠，導覽列各分頁文字在深色背景下字字銳利分明！</li>
            </ul>
          </div>

          <!-- v1.9.8 -->
          <div class="p-3.5 rounded-2xl border-2 border-cyan-500 bg-slate-900 text-white shadow-md">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black text-xs shadow-sm font-mono">
                v1.9.8 (全域 [OAA 科技主題] 上線 • 導覽列依使用頻率黃金排序)
              </span>
              <span class="text-[11px] text-cyan-300 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-cyan-100 space-y-1.5 font-medium pl-1">
              <li>• 【全域 OAA 科技主題】將通用深色模式直接升級為「OAA 高度育成科技主題」！右上角一鍵在「三麗鷗」與「OAA」間無縫切換全站風格！</li>
              <li>• 【導覽列依使用頻率重排】導覽列順序依每日上課動線調整：點記板 ➔ 補記 ➔ 記事檢索 ➔ 學生檔案 ➔ 班級統計 ➔ 成績匯入 ➔ 班級名單 ➔ 課表排程 ➔ 互動板。</li>
              <li>• 【卡片文案精簡】移除 OAA 卡片中二標語，回歸冷靜純粹的高科技數據儀表板。</li>
            </ul>
          </div>

          <!-- v1.9.7 -->
          <div class="p-3.5 rounded-2xl border border-cyan-500/40 bg-slate-900/60 text-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-cyan-900 text-cyan-200 font-bold text-xs font-mono">
                v1.9.7
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-300 space-y-1 font-medium pl-1">
              <li>• 【實裝 OAA 模式】學生個人檔案新增「[OAA模式]」自由切換與硬核卡階。</li>
            </ul>
          </div>

          <!-- v1.9.6 -->
          <div class="p-3.5 rounded-2xl border-2 border-slate-400 bg-slate-50/50 shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-800 text-white font-bold text-xs shadow-sm">
                v1.9.6 (互動留言板上線 • 留言資料重置與介面語氣調整)
              </span>
              <span class="text-[11px] text-slate-500 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-800 space-y-1.5 font-medium pl-1">
              <li>• 【互動留言板上線】提供使用者回饋意見、提出功能需求或回報問題。開發者可直接檢視並進行回覆。</li>
              <li>• 【資料清空與語氣調整】移除所有預設範例留言，保持空白狀態，並調整介面文字為簡約中性風格。</li>
            </ul>
          </div>

          <!-- v1.9.5 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-bold text-xs border border-pink-300">
                v1.9.5
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【互動留言板初版實裝】新增分頁與回覆機制。</li>
            </ul>
          </div>

          <!-- v1.9.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.9.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【修復 AI 成績匯入頁面載入】確保在所有手機與電腦上 100% 正常呈現！</li>
            </ul>
          </div>

          <!-- v1.9.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.9.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【鑫吾專屬金鑰加密就緒】已完成密鑰封裝！通關密語 0228 即刻啟用！</li>
            </ul>
          </div>

          <!-- v1.9.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.9.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【親友生日通關解鎖】輸入 0228 驗證親友身份！</li>
            </ul>
          </div>

          <!-- v1.9.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.9.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【Google Gemini 2.5 Flash 智慧成績轉換】貼上文字或拍照，1 秒自動對應花名冊座號與分數並彈出預覽！</li>
            </ul>
          </div>

          <!-- v1.9.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.9.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【手機端頂部橫幅雙行排版】第 1 行專屬商標與收合鈕，第 2 行寬敞班級選單與快捷工具，字體按鈕 100% 絕不重疊！</li>
            </ul>
          </div>

          <!-- v1.8.9 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.9
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【修復頂部選單重疊問題】將頂部橫幅與導覽分頁列整合至單一吸頂容器！</li>
            </ul>
          </div>

          <!-- v1.8.8 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.8
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-09-03</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【座位表拖曳引擎全面升級】全面移植 1:1 原生硬體觸控鎖定與精確像素槽位推移，支援螢幕邊緣智慧自動滾動與全局防漏接！</li>
              <li>• 【標籤管理中心彈窗捲動鎖定優化】彈窗 100% 保持在當前滾動位置，操作不再突兀跳回頂部！</li>
              <li>• 【本地歷史快照自動防呆機制】重大操作前自動建立本機快照，支援 1 秒無痛還原！</li>
            </ul>
          </div>

          <!-- v1.8.7 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.7
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【頂部選單最小化按鈕常駐】右上角最小化鈕常駐，展開按鈕整合至吸頂導覽列！</li>
            </ul>
          </div>

          <!-- v1.8.6 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.6
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【修正邊界滾動消失 Bug】實時校準滾動位移差！</li>
            </ul>
          </div>

          <!-- v1.8.5 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.5
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【人體直覺過半中線與間隙判定】拖曳虛影唯有越過中線才觸發推開！</li>
            </ul>
          </div>

          <!-- v1.8.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【觸控滑動智慧防誤觸】手指滑動頁面時即時取消長按判定！</li>
            </ul>
          </div>

          <!-- v1.8.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【1:1 指尖真硬體鎖定】原生 Touch 座標直推，120fps 絕對等速同步！</li>
            </ul>
          </div>

          <!-- v1.8.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【極速 0 延遲指尖追蹤】解除拖曳縮影的 CSS 過渡限制！</li>
            </ul>
          </div>

          <!-- v1.8.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【業界標準 SortableJS FLIP 流體擠開】正式引進國際標準 SortableJS 引擎！</li>
            </ul>
          </div>

          <!-- v1.8.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【水漾氣泡流體擠開動效】全面改採高彈力 cubic-bezier(0.34, 1.56, 0.64, 1) 彈簧物理曲線！</li>
            </ul>
          </div>

          <!-- v1.7.9 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.9
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【各班級快速標籤 100% 獨立管理】每個班級擁有專屬自訂標籤庫與獨立排序順序！</li>
              <li>• 【頂部常駐固定叉叉】標籤管理中心頂部橫幅永久鎖定於視窗上方！</li>
            </ul>
          </div>

          <!-- v1.7.8 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.8
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【啟動即時自動偵測更新】桌面安裝版 App 每次開啟時主動檢測雲端版本！</li>
            </ul>
          </div>

          <!-- v1.7.7 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.7
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【標籤清單擠開塞入動效】自訂標籤清單拖曳時滑經的項目向上下擠開讓位，放手平滑塞入目標位置！</li>
            </ul>
          </div>

          <!-- v1.7.6 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.6
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【浮起立體縮影視覺層次還原】長按浮起的卡片維持 100% 完整清晰、高對比立體高亮縮影！</li>
            </ul>
          </div>

          <!-- v1.7.5 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.5
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【系統防護與事件檢討報告】永久記錄升級防護指引，落實全流程發布品質把關！</li>
            </ul>
          </div>

          <!-- v1.7.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【手指精準接觸點浮起】長按卡片浮起時保持在手指按壓位置！</li>
              <li>• 【拖曳對調後頁面滾動位置凍結】放手對調後畫面鎖定在當前瀏覽位置！</li>
            </ul>
          </div>

          <!-- v1.7.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【全系統語法與快取穿透防護】修復版本日誌模版嵌套字元問題，全面強化 Service Worker 離線快取穿透！</li>
            </ul>
          </div>

          <!-- v1.7.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【iOS 桌面級長按拖曳排座位】長按學生卡片 350ms 進入如 iPhone 桌面晃動模式（Jiggle Mode），手指拖移即可自由滑動，放手瞬間對調，支援「✅ 完成」一鍵鎖定！</li>
              <li>• 【標籤清單自由拖曳排序】標籤管理中心同步支援手指長按上下拖拽！</li>
            </ul>
          </div>

          <!-- v1.7.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【真實教室排座位】頂部標註【🏫 講台/黑板】方位，支援常規直排、S型蛇行、隨機換位！</li>
              <li>• 【課堂快速標籤自訂排序】標籤管理中心支援「▲ 上移 / ▼ 下移」，前 4 個標籤優先顯示於第 1 頁，並支援「📌 依自訂順序」與「📊 依使用頻率」一鍵切換！</li>
              <li>• 【班級名單與主頁同步】建立新班級或匯入名冊後，全域狀態自動同步切換，點記板即時更新！</li>
            </ul>
          </div>

          <!-- v1.6.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.6.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【標籤管理中心強化】自訂行為與表現標籤增刪改查、分值微調與類別色彩規則強化。</li>
            </ul>
          </div>

          <!-- v1.6.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.6.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【事後補記專區優化】課堂事後回憶補記支援多生批次勾選、常用評語模組與提交記錄流。</li>
            </ul>
          </div>

          <!-- v1.6.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.6.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【課表排程編輯器】週一至週五第 1~8 節課表視覺化網格編輯，科任與導師班快速切換。</li>
            </ul>
          </div>

          <!-- v1.6.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.6.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【PWA 離線同步】全新 Service Worker 智能快取與版本原子化同步，保證 100% 離線可用。</li>
            </ul>
          </div>

          <!-- v1.5.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【繁體中文編碼防護】全介面 UTF-8 編碼與觸控手勢事件防禦。</li>
            </ul>
          </div>

          <!-- v1.5.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【動態座標追蹤】60fps 平滑轉場與導航欄水平置中。</li>
            </ul>
          </div>

          <!-- v1.5.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【實戰級動態教學】升級 12 大沉浸式操作關卡（點選座位、課堂加分動效、自訂標籤、Excel 批次貼上、名冊細項改名調座號、事後補記勾選評語提交、四象限戰情解讀）！</li>
              <li>• 【手機導航水平自動置中】徹底解決手機螢幕狹窄時導航欄後方按鈕在畫面外導致指針指歪的座標跑位問題！</li>
            </ul>
          </div>

          <!-- v1.5.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 徹底修復步驟 7 點擊加分標籤後切換至步驟 8 無限卡死的嚴重 Bug！</li>
            </ul>
          </div>

          <!-- v1.5.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【獨立專區】新增一級主導航「⏰ 課堂事後補記」專區（支援多生快選、常用評語模組、分值微調與補記歷史流）！</li>
              <li>• 【介面優化】移除新手教學按鈕閃爍動畫，回歸優雅穩重設計。</li>
              <li>• 【導覽重構】實裝步驟 3「1秒批次貼上名冊」完整教育展示，並直通步驟 4 名冊個別微調！</li>
            </ul>
          </div>

          <!-- v1.4.9 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.9
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 徹底修復步驟 3「1秒批次貼上名冊」彈窗與導覽遮罩衝突卡死的 Bug！</li>
              <li>• 全面消除步驟間人為延遲，改採 requestAnimationFrame 16ms 毫秒級即時流暢切換！</li>
            </ul>
          </div>

          <!-- v1.4.8 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.8
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 修復步驟 3 頂部橫幅反覆收合/展開閃爍問題，教學期間橫幅維持 100% 絕對穩固！</li>
              <li>• 移除頂部干擾且擠出選單的「恢復課表」黃色按鈕，班級選單全螢幕視野無遮擋。</li>
            </ul>
          </div>

          <!-- v1.4.7 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.7
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 實裝 9999px Box-Shadow 暗化聚光燈，100% 保證全螢幕深黑 85%、目標 100% 原始透光高亮！</li>
              <li>• 全部 8 個教學步驟全面實裝精準功能目標定位與方位跳動箭頭。</li>
            </ul>
          </div>

          <!-- v1.4.6 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.6
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 實裝 CSS Polygon Clip-Path 聚光遮罩，全螢幕壓暗 82%，唯獨目標 100% 亮起且四周點擊全阻擋！</li>
              <li>• 實裝 document touchmove passive:false 全阻斷事件，徹底禁止手機上下滑動，畫面 100% 穩定！</li>
            </ul>
          </div>

          <!-- v1.4.5 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.5
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 4-Curtain 實體物理開孔光圈：目標處於完全開放空間，100% 自然鮮豔、100% 順暢點擊！</li>
              <li>• 智慧方位感應指針：上方目標使用 👆 由下往上指、下方目標使用 👇 由上往下指，方向 100% 正確！</li>
            </ul>
          </div>

          <!-- v1.4.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 目標元素直接穿透提亮 (z-index 提拔)，100% 亮起且 100% 順暢可點！</li>
              <li>• 教學彈窗全面加入 Safe Area 安全邊界約束，保證任何尺寸手機 100% 完整落在畫面內。</li>
            </ul>
          </div>

          <!-- v1.4.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 修正教學導覽光圈偏移問題，採用 Fixed 實時動態座標追蹤。</li>
              <li>• 實裝目標專屬 ID 精準錨定，高亮框與跳動手指 100% 貼合目標。</li>
            </ul>
          </div>

          <!-- v1.4.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 頂部按鈕全面改為全螢幕可見之醒目「🎓 新手教學」膠囊標籤。</li>
              <li>• 移除彈窗上的代點按鈕，改為目標上方漂浮「👆 請點這裡！」跳動手指，強制親手操作！</li>
            </ul>
          </div>

          <!-- v1.4.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 全新「動態高亮聚焦 ＋ 動態箭頭強制互動導覽 (Spotlight Tour)」，真實動手操作指引。</li>
              <li>• 實裝步驟強制性點擊驗證與各步驟「跳過此步」功能。</li>
              <li>• 升級 Network-First 網路優先更新架構，徹底杜絕離線快取卡舊版本問題。</li>
            </ul>
          </div>

          <!-- v1.4.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 新增「🌱 新手引導」互動教學嚮導，一步步帶領新老師建班與標籤。</li>
              <li>• 新增「📢 系統公佈欄 & 歷史更新日誌」，永久保存過去版本功能與教學活動。</li>
              <li>• 修復更新彈窗重複顯示問題，設定為每次發布僅主動提示一次。</li>
            </ul>
          </div>

          <!-- v1.3.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.3.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 頂部橫幅隨頁面往下滑動智慧自動收合，往上滑自動還原，極大化座位視野。</li>
              <li>• 新增全站三麗鷗精緻流暢微動畫（卡片微彈回饋、加分星星/愛心粒子）。</li>
              <li>• 乾淨移除用不到的 NAS 模組，介面更加輕快。</li>
            </ul>
          </div>

          <!-- v1.2.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.2.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 標籤排版重構為 4 大按鈕並直接放置於座位表下方，字體大且絕對不遮字。</li>
              <li>• 導師班與數學科任班徹底分開，標籤使用頻率各班獨立計算排序。</li>
              <li>• 新增「⏰ 課堂事後快速補記助手」與「📅 日期時序時間軸 / 👥 多生交叉查詢」。</li>
            </ul>
          </div>

          <!-- v1.1.0 & v1.0.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.1.0 ~ v1.0.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 三階統一色彩規範（🌿加分綠、🌹扣分紅、☁️記事灰）。</li>
              <li>• 全校多班橫向對比、分層作業建議與因材施教戰術板。</li>
              <li>• ClassQuant Hub 雙軌課堂量化管理系統正式發布。</li>
            </ul>
          </div>
        </div>

        <!-- Footer Action -->
        <div class="flex items-center justify-between pt-3 border-t border-pink-100">
          <button onclick="appState.applyLiveOTAUpdate()" class="text-xs text-pink-600 font-black hover:underline flex items-center gap-1">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> 🔄 強制檢查並更新至最新版
          </button>
          <button onclick="appState.closeModal()" class="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs shadow-md transition">
            關閉公佈欄
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async applyLiveOTAUpdate() {
    this.showToast('🔄 正在清除舊快取並載入最新版本...', 'info');
    if ('caches' in window) {
      const keys = await caches.keys();
      for (let k of keys) {
        await caches.delete(k);
      }
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let reg of registrations) {
        await reg.update();
      }
    }
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
      window.location.href = cleanUrl;
    }, 500);
  }

  // --- Web Audio API Native Sound Engine ---
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  isSoundEnabled() {
    return window.appStore.data.settings?.enableSound !== false;
  }

  toggleSound() {
    if (!window.appStore.data.settings) window.appStore.data.settings = {};
    const current = this.isSoundEnabled();
    window.appStore.data.settings.enableSound = !current;
    window.appStore.save();
    this.showToast(!current ? '🔔 已開啟可愛操作音效' : '🔕 已靜音操作音效', 'info');
    this.updateSoundButtonUI();
    if (!current) this.playChime();
  }

  updateSoundButtonUI() {
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      const enabled = this.isSoundEnabled();
      btn.innerHTML = enabled
        ? '<i data-lucide="volume-2" class="w-4 h-4 text-pink-600"></i>'
        : '<i data-lucide="volume-x" class="w-4 h-4 text-slate-400"></i>';
      btn.title = enabled ? '音效已開啟 (點擊靜音)' : '音效已關閉 (點擊開啟)';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  playChime() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.35);
      });
    } catch (e) {}
  }

  playPop() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } catch (e) {}
  }

  playWarning() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(280, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  }

  applyTheme(themeName) {
    if (themeName === 'dark') themeName = 'oaa';
    const html = document.documentElement;
    html.setAttribute('data-theme', themeName);
    if (themeName === 'kitty') {
      html.classList.remove('dark');
      html.classList.remove('oaa');
    } else {
      html.classList.add('dark');
      html.classList.add('oaa');
    }
    window.appStore.setTheme(themeName);
    this.updateThemeButtonUI(themeName);

    // Refresh active views to sync OAA mode immediately
    if (this.activeTab === 'student-dossier' && window.studentDossierView) {
      window.studentDossierView.render('student-dossier-view');
    }
    if (this.activeTab === 'matrix' && window.matrixView) {
      window.matrixView.render('classroom-matrix-view');
    }
  }

  toggleTheme() {
    const current = window.appStore.getTheme();
    const next = current === 'kitty' ? 'oaa' : 'kitty';
    this.applyTheme(next);
    this.showToast(`已切換至：${next === 'kitty' ? '🎀 三麗鷗粉嫩主題' : '🏛️ 《歡迎來到實力至上主義的教室》本格風格'}`, 'info');
  }

  updateThemeButtonUI(themeName) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      if (themeName === 'oaa') {
        btn.innerHTML = '<span class="text-xs">🏛️</span><span class="text-xs font-black text-amber-200 ml-0.5 hidden md:inline">高度育成 OAA</span>';
        btn.className = "px-2.5 py-1.5 rounded-xl border border-amber-500 bg-rose-950/80 hover:bg-rose-900 text-amber-200 transition active:scale-95 flex items-center gap-1 shrink-0 shadow-sm cursor-pointer";
        btn.title = "目前為《實力至上主義教室》高度育成 OAA 主題，點擊切換為三麗鷗主題";
      } else {
        btn.innerHTML = '<span class="kitty-bow !w-3.5 !h-3.5"></span><span class="text-xs font-bold text-pink-600 ml-0.5 hidden md:inline">三麗鷗</span>';
        btn.className = "px-2.5 py-1.5 rounded-xl border border-pink-300 hover:bg-pink-100 transition active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer";
        btn.title = "目前為三麗鷗主題，點擊切換為《實力至上主義教室》OAA 模式";
      }
      if (window.lucide) window.lucide.createIcons();
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update Nav buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('tab-active');
      } else {
        btn.classList.remove('tab-active');
      }
    });

    // Hide all tab containers
    const tabContainers = [
      'classroom-matrix-view',
      'roster-manager-view',
      'retro-log-view',
      'dashboard-view',
      'timetable-editor-view',
      'events-log-view',
      'student-dossier-view',
      'ai-hub-view',
      'feedback-board-view',
      'user-guide-view'
    ];

    tabContainers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Show active tab
    const viewIdMap = {
      'matrix': 'classroom-matrix-view',
      'roster': 'roster-manager-view',
      'retro': 'retro-log-view',
      'dashboard': 'dashboard-view',
      'timetable': 'timetable-editor-view',
      'events': 'events-log-view',
      'student-dossier': 'student-dossier-view',
      'ai-hub': 'ai-hub-view',
      'feedback-board': 'feedback-board-view',
      'guide': 'user-guide-view'
    };

    const targetViewId = viewIdMap[tabId];
    const activeEl = document.getElementById(targetViewId);
    if (activeEl) {
      activeEl.classList.remove('hidden');
      this.refreshActiveTab();
    }
  }

  refreshActiveTab() {
    if (this.activeTab === 'matrix') {
      window.matrixView.render('classroom-matrix-view', this.currentClassId);
    } else if (this.activeTab === 'roster') {
      window.rosterManager.render('roster-manager-view');
    } else if (this.activeTab === 'retro' && window.retroLogView) {
      window.retroLogView.render('retro-log-view', this.currentClassId);
    } else if (this.activeTab === 'dashboard') {
      window.dashboardCharts.renderClassDashboard('dashboard-view', this.currentClassId);
    } else if (this.activeTab === 'timetable') {
      window.timetableEditorView.render('timetable-editor-view');
    } else if (this.activeTab === 'events') {
      window.eventsLogView.render('events-log-view', this.currentClassId);
    } else if (this.activeTab === 'student-dossier') {
      window.studentDossierView.render('student-dossier-view', this.currentClassId);
    } else if (this.activeTab === 'ai-hub') {
      window.aiHub.render('ai-hub-view');
    } else if (this.activeTab === 'feedback-board' && window.feedbackBoard) {
      window.feedbackBoard.render('feedback-board-view');
    } else if (this.activeTab === 'guide') {
      window.userGuideView.render('user-guide-view');
    }
  }

  renderClassDropdown() {
    const select = document.getElementById('global-class-select');
    if (!select) return;

    const classes = Object.values(window.appStore.getClasses());
    const homeroomClasses = classes.filter(c => c.type === 'homeroom');
    const subjectClasses = classes.filter(c => c.type !== 'homeroom');

    let html = '';
    if (homeroomClasses.length > 0) {
      html += `<optgroup label="🎀 導師本班 (常規與生活)">`;
      html += homeroomClasses.map(c => `
        <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
          ${c.name} (導師本班)
        </option>
      `).join('');
      html += `</optgroup>`;
    }

    if (subjectClasses.length > 0) {
      html += `<optgroup label="📘 數學科任班 (解題與作業)">`;
      html += subjectClasses.map(c => `
        <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
          ${c.name} (數學科任)
        </option>
      `).join('');
      html += `</optgroup>`;
    }

    select.innerHTML = html;
  }

  handleManualClassChange(classId) {
    this.currentClassId = classId;
    window.timetableEngine.setManualOverride(classId);
    this.showToast(`已切換至：${classId} 班 (手動調課模式)`, 'info');
    this.updateHeaderStatus();
    this.refreshActiveTab();
  }

  restoreTimetableAuto() {
    window.timetableEngine.clearManualOverride();
    const active = window.timetableEngine.getActiveClassId();
    this.currentClassId = active.classId || '801';
    this.showToast('已恢復課表自動感知模式', 'success');
    this.updateHeaderStatus();
    this.renderClassDropdown();
    this.refreshActiveTab();
  }

  updateHeaderStatus() {
    const active = window.timetableEngine.getActiveClassId();
    const slotInfo = active.slotInfo;
    const isOverride = active.isOverride;

    const statusBadge = document.getElementById('header-schedule-status');
    const overrideBtn = document.getElementById('header-override-restore-btn');
    const select = document.getElementById('global-class-select');

    if (select) select.value = this.currentClassId;

    if (statusBadge) {
      if (isOverride) {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-amber-600 font-bold">手動調課 (${this.currentClassId}班)</span>
        `;
      } else if (slotInfo.status === 'in_session') {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500 live-indicator"></span>
          <span class="text-emerald-600 font-bold">${slotInfo.message}</span>
        `;
      } else if (slotInfo.status === 'in_break') {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-sky-500"></span>
          <span class="text-sky-600">${slotInfo.message}</span>
        `;
      } else {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-slate-400"></span>
          <span class="opacity-70">${slotInfo.message || '非課堂時段'}</span>
        `;
      }
    }

    if (overrideBtn) {
      overrideBtn.classList.add('hidden');
    }
  }

  updateHeaderClock() {
    const clockEl = document.getElementById('header-live-clock');
    if (!clockEl) return;

    const { day, timeStr, isSimulated } = window.timetableEngine.getCurrentTimeInfo();
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    clockEl.innerHTML = `
      <span>週${dayNames[day]} ${timeStr}</span>
      ${isSimulated ? '<span class="text-[10px] text-amber-500 bg-amber-100 px-1.5 py-0.2 rounded-md font-bold ml-1">模擬中</span>' : ''}
    `;
  }

  // --- PWA Installation Action ---
  async installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.showToast('🎉 已成功將 App 安裝至主畫面！', 'success');
      }
      this.deferredPrompt = null;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.classList.add('hidden');
    } else {
      alert('【手機離線安裝教學】\n\n• Android (Chrome)：點選右上角選單 (⋮)，選擇「安裝應用程式」或「新增至主螢幕」。\n• iOS (Safari)：點擊底部「分享 (↑)」按鈕，選擇「加入主畫面 (Add to Home Screen)」。');
    }
  }

  // --- Modal & Toast System ---
  closeModal() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.add('hidden');
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('global-toast');
    if (!toast) return;

    const bgMap = {
      success: 'bg-emerald-600 border-emerald-500 text-white',
      warning: 'bg-amber-600 border-amber-500 text-white',
      danger: 'bg-rose-600 border-rose-500 text-white',
      info: 'bg-pink-600 border-pink-500 text-white'
    };

    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-2 transition-all transform duration-300 ${bgMap[type] || bgMap.info}`;
    toast.innerHTML = `<span>${message}</span>`;
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');

    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3200);
  }

  // --- COTE Official Anime Easter Egg Engine ---
  triggerCoteEasterEgg() {
    const modal = document.getElementById('cote-terminal-modal');
    if (!modal) return;

    this.playEliteTerminalChime();

    // Show modal with animation
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });

    this.renderCurrentCoteQuote();
  }

  closeCoteEasterEgg() {
    const modal = document.getElementById('cote-terminal-modal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 280);
  }

  shuffleCoteQuote() {
    this.playEliteTerminalChime();
    this.currentCoteQuoteIdx = (this.currentCoteQuoteIdx + 1) % this.coteTerminalQuotes.length;
    this.renderCurrentCoteQuote();
  }

  renderCurrentCoteQuote() {
    const quoteObj = this.coteTerminalQuotes[this.currentCoteQuoteIdx];
    const textEl = document.getElementById('cote-terminal-quote-text');
    const sourceEl = document.getElementById('cote-quote-source');
    const indexEl = document.getElementById('cote-quote-index');

    if (textEl && quoteObj) {
      textEl.style.opacity = '0';
      textEl.style.transform = 'translateY(4px)';
      setTimeout(() => {
        textEl.textContent = quoteObj.quote;
        if (sourceEl) sourceEl.textContent = quoteObj.source;
        if (indexEl) indexEl.textContent = `語錄 ${this.currentCoteQuoteIdx + 1}/${this.coteTerminalQuotes.length}`;
        textEl.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        textEl.style.opacity = '1';
        textEl.style.transform = 'translateY(0)';
      }, 100);
    }
  }

  triggerWhiteRoomProtocol() {
    this.playEliteTerminalChime();
    const activeClassId = this.currentClassId;
    const students = window.appStore.getStudents(activeClassId);
    const textEl = document.getElementById('cote-terminal-quote-text');
    const sourceEl = document.getElementById('cote-quote-source');
    const indexEl = document.getElementById('cote-quote-index');

    if (textEl) {
      textEl.style.opacity = '0';
      textEl.style.transform = 'translateY(4px)';
      setTimeout(() => {
        if (sourceEl) sourceEl.textContent = '【S-SYSTEM // 白室內部評估報告】';
        if (indexEl) indexEl.textContent = `機密層級: TOP SECRET`;
        textEl.innerHTML = `「已檢索 ${activeClassId} 班共 ${students.length} 名學生之日常考評與點數流向。目前一切行為數據均在精密控制的軌道之內。只要按照既定方針執行，升上 A 班的勝率就是 100%。」`;
        textEl.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        textEl.style.opacity = '1';
        textEl.style.transform = 'translateY(0)';
      }, 100);
    }
  }

  playCinematicBoomSFX() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // 1. Sub-bass boom drop (cinematic anime impact: 120Hz -> 30Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 1.2);
      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 1.45);

      // 2. Mid punch impact
      const punchOsc = ctx.createOscillator();
      const punchGain = ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(220, now);
      punchOsc.frequency.exponentialRampToValueAtTime(55, now + 0.35);
      punchGain.gain.setValueAtTime(0.18, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      punchOsc.connect(punchGain);
      punchGain.connect(ctx.destination);
      punchOsc.start(now);
      punchOsc.stop(now + 0.45);

      // 3. Metallic tension shimmer
      [523.25, 659.25, 830.61, 1046.5].forEach((freq, idx) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'sawtooth';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.05 + idx * 0.03);
        chimeGain.gain.setValueAtTime(0.025, now + 0.05 + idx * 0.03);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chimeOsc.start(now + 0.05 + idx * 0.03);
        chimeOsc.stop(now + 0.9);
      });
    } catch(e) {}
  }

  // Retrieve canonical COTE character based on student rank in class
  getCoteCharacterByRank(rank) {
    if (!rank || rank < 1) rank = 1;
    const idx = (rank - 1) % this.coteSilhouettes.length;
    return this.coteSilhouettes[idx] || this.coteSilhouettes[0];
  }

  // --- Dramatic Anime Character Silhouette Easter Egg (Non-Q Cut-In) ---
  triggerSilhouetteCutIn(charIdxOrRank) {
    this.playCinematicBoomSFX();

    let char;
    if (typeof charIdxOrRank === 'number') {
      const idx = Math.max(0, charIdxOrRank) % this.coteSilhouettes.length;
      char = this.coteSilhouettes[idx] || this.coteSilhouettes[0];
    } else {
      char = this.coteSilhouettes[this.currentSilhouetteIdx % this.coteSilhouettes.length];
      this.currentSilhouetteIdx++;
    }

    let stage = document.getElementById('cote-silhouette-stage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'cote-silhouette-stage';
      stage.onclick = () => this.dismissSilhouetteCutIn();
      document.body.appendChild(stage);
    }

    if (this.silhouetteTimeout) {
      clearTimeout(this.silhouetteTimeout);
      this.silhouetteTimeout = null;
    }

    stage.innerHTML = `
      <div class="cote-speed-lines"></div>
      <button type="button" onclick="appState.dismissSilhouetteCutIn()" class="cote-stage-close-btn" title="關閉">✕</button>
      
      <!-- Character Cut-In Stage (Upper & Center Area, Cleanly Framed & Never Overlapped) -->
      <div class="cote-figure-container">
        <div class="cote-portrait-frame" style="--aura-color: ${char.auraColor}">
          <img src="${char.image}" id="cote-silhouette-img" class="cote-cutin-figure" alt="${char.name}">
          <div class="cote-portrait-glow"></div>
          <div class="cote-eye-flare"></div>
        </div>
      </div>

      <!-- Shouted Anime Dialogue Banner -->
      <div class="cote-dialogue-banner" onclick="event.stopPropagation()">
        <div class="cote-banner-header">
          <span class="cote-banner-badge">🏛️ S-SYSTEM // ELITE CUT-IN 實力者降臨</span>
          <span class="cote-banner-romaji">${char.kana}</span>
          <button type="button" onclick="appState.toggleSilhouetteUnveil()" class="cote-unveil-btn" title="切換暗影/全彩">
            ⚡ 暗影 / 全彩
          </button>
        </div>
        <div class="cote-banner-name">
          <span>${char.name}</span>
          <span class="cote-banner-sub">${char.classTitle}</span>
        </div>
        <div class="cote-banner-quote">${char.shoutedQuote}</div>
        <div class="cote-banner-subquote">${char.subQuote}</div>
        <div class="flex items-center justify-between text-[10px] text-amber-400/80 font-mono pt-1 border-t border-amber-500/20">
          <span>高度育成高等學校 機密實力者資料檔案</span>
          <span class="cursor-pointer hover:underline text-rose-300" onclick="appState.dismissSilhouetteCutIn()">[ 點擊任意處退場 ]</span>
        </div>
      </div>
    `;

    stage.classList.remove('hidden');
    stage.classList.add('show');

    // Auto dismiss after 5.5 seconds
    this.silhouetteTimeout = setTimeout(() => {
      this.dismissSilhouetteCutIn();
    }, 5500);
  }

  toggleSilhouetteUnveil() {
    const img = document.getElementById('cote-silhouette-img');
    if (img) {
      img.classList.toggle('silhouette-mode');
      this.playEliteTerminalChime();
    }
  }

  dismissSilhouetteCutIn() {
    const stage = document.getElementById('cote-silhouette-stage');
    if (!stage) return;
    if (this.silhouetteTimeout) {
      clearTimeout(this.silhouetteTimeout);
      this.silhouetteTimeout = null;
    }
    stage.classList.remove('show');
    setTimeout(() => {
      stage.classList.add('hidden');
    }, 280);
  }

  playEliteTerminalChime() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch(e) {}
  }
}

// Global App State Instance
window.appState = new AppState();
