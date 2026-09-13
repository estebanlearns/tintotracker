import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coffee, User, BarChart2, Trash2, Moon, Zap, Activity, Info, 
  Plus, Globe, Check, LogIn, Flame, WifiOff, Loader2, AlertCircle,
  Share2, Download, Star, Settings, PlusCircle, Crown, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithCustomToken, 
  signInAnonymously, onAuthStateChanged, deleteUser 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  addDoc, deleteDoc, updateDoc, getDocs 
} from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'tintotracker-default';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
let app, auth, db;

if (firebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase init error:", e);
  }
}

const MAX_DAILY_CAFFEINE = 400; // FDA limit (mg)

const BASE_DRINKS = [
  { id: 'tinto', mgPerUnit: 50, defaultAmount: 1 },
  { id: 'tinto_ml', mgPerUnit: 0.5, defaultAmount: 100 },
  { id: 'espresso', mgPerUnit: 65, defaultAmount: 1 },
  { id: 'decaf', mgPerUnit: 3, defaultAmount: 1 },
  { id: 'redbull', mgPerUnit: 80, defaultAmount: 1 },
  { id: 'vive100', mgPerUnit: 90, defaultAmount: 1 },
  { id: 'speedmax', mgPerUnit: 80, defaultAmount: 1 },
  { id: 'preworkout', mgPerUnit: 200, defaultAmount: 1 },
];

const TRANSLATIONS = {
  es: {
    locale: 'es-ES',
    welcome: "Selecciona tu idioma",
    start: "Continuar",
    headerTitle: "TintoTracker",
    greeting: "Hola",
    loading: "Cargando...",
    offline: "Sin conexión. Guardando localmente.",
    synced: "Sincronizado con la nube.",
    onboarding: { title: "Completa tu perfil", subtitle: "Usaremos estos datos para calcular cómo tu cuerpo procesa la cafeína.", name: "Tu Nombre", namePlaceholder: "Ej. Juan", googleAuth: "Guardar con Google", startApp: "Empezar a Trackear", syncText: "Inicia sesión para guardar tu historial en la nube." },
    tabs: { today: "HOY", stats: "STATS", profile: "PERFIL" },
    today: {
      active: "Activa", totalConsumed: "Total hoy", register: "Registrar Consumo", add: "Agregar",
      quickAdd: "Agregar Habitual",
      processed: "Procesado", eliminatedMsg: "Eliminado desde última toma", bedtime: "Hora de dormir", estimatedAt: "Estimados a las",
      suggestionTitle: "Sugerencia Inteligente", suggestionNoMore: "No deberías tomar más cafeína hoy si quieres dormir a las", suggestionMaxNow1: "Para no afectar tu sueño, ahora podrías tomar máximo", suggestionMaxNow2: "extra.", suggestionTime1: "Si quieres tomar 1", suggestionTime2: "estándar, hazlo antes de las", suggestionTooLate: "Ya es muy tarde para tomarte un café entero.", history: "Historial de Hoy", mg: "mg",
      wrapUpTitle: "Resumen de Ayer", wrapUpGood: "¡Excelente! Ayer lograste dormir con niveles óptimos de cafeína.", wrapUpBad: "Ayer superaste tu límite de cafeína al dormir. ¡Hoy mejoraremos!",
      shareScore: "Compartir mi día", copied: "¡Copiado al portapapeles!",
      feedbackTitle: "¿Cómo dormiste anoche?", feedbackGood: "Bien", feedbackBad: "Mal", feedbackAdjusted: "¡Anotado! Hemos ajustado tu tolerancia de cafeína para proteger tu sueño."
    },
    profile: {
      title: "Perfil Metabólico", name: "Nombre", sex: "Sexo Biológico", male: "Masculino", female: "Femenino", weight: "Peso (kg)", height: "Altura (cm)", activity: "Nivel de Actividad", low: "Sedentario", moderate: "Moderado", high: "Activo", halfLife1: "Tu vida media estimada es", halfLife2: "horas", sleepHygiene: "Higiene del Sueño", idealBedtime: "Hora de dormir ideal", maxTolerance: "Límite de cafeína al dormir", tol30: "30 mg", tol50: "50 mg", tol75: "75 mg",
      proTitle: "TintoTracker PRO", proDesc: "Desbloquea exportación CSV, analíticas avanzadas y bebidas ilimitadas.", proUpgrade: "Actualizar a PRO", proActive: "PRO Activado",
      customDrinks: "Tus Bebidas Personalizadas", addDrink: "Nueva Bebida", drinkName: "Nombre", drinkMg: "mg por unidad", drinkUnit: "Unidad (ej. vaso)",
      settings: "Configuraciones", notifLimit: "Avisarme si supero mi límite", notifMorning: "Pedir feedback de sueño matutino",
      dangerZone: "Zona de Peligro", deleteAccount: "Eliminar Cuenta y Datos", deleteConfirm: "¿Seguro? Toca de nuevo", deleteSuccess: "Cuenta eliminada", deleteError: "Error."
    },
    stats: { dailyAvg: "Promedio Diario", daysOver: "Días sobre Límite", days: "días", history7: "Historial Semanal", limit: "Límite FDA", generateMock: "Generar datos de prueba", exportCSV: "Exportar a CSV" },
    drinks: { tinto: "Tinto", tinto_ml: "Tinto (Custom)", espresso: "Espresso", decaf: "Descafeinado", redbull: "Red Bull", vive100: "Vive 100", speedmax: "Speed Max", preworkout: "Pre-entreno" },
    units: { tinto: "taza(s)", tinto_ml: "mL", espresso: "shot(s)", decaf: "taza(s)", redbull: "lata(s)", vive100: "botella(s)", speedmax: "botella(s)", preworkout: "scoop(s)" }
  },
  en: {
    locale: 'en-US',
    welcome: "Select language", start: "Continue", headerTitle: "CoffeeTracker", greeting: "Hi", loading: "Loading...", offline: "Offline. Saving locally.", synced: "Synced.",
    onboarding: { title: "Profile", subtitle: "Data for caffeine processing.", name: "Name", namePlaceholder: "e.g. John", googleAuth: "Save with Google", startApp: "Start Tracking", syncText: "Sign in to save to cloud." },
    tabs: { today: "TODAY", stats: "STATS", profile: "PROFILE" },
    today: { active: "Active", totalConsumed: "Total today", register: "Log Intake", add: "Add", quickAdd: "Quick Add", processed: "Processed", eliminatedMsg: "Eliminated", bedtime: "Bedtime", estimatedAt: "Est. at", suggestionTitle: "Smart Suggestion", suggestionNoMore: "No more caffeine to sleep at", suggestionMaxNow1: "Max extra now:", suggestionMaxNow2: "", suggestionTime1: "Drink 1 standard", suggestionTime2: "before", suggestionTooLate: "Too late for coffee.", history: "History", mg: "mg", wrapUpTitle: "Yesterday", wrapUpGood: "Great sleep hygiene yesterday!", wrapUpBad: "Exceeded limit yesterday. Improve today!", shareScore: "Share Score", copied: "Copied!", feedbackTitle: "How did you sleep?", feedbackGood: "Good", feedbackBad: "Bad", feedbackAdjusted: "Tolerance adjusted for better sleep!" },
    profile: { title: "Profile", name: "Name", sex: "Sex", male: "Male", female: "Female", weight: "Weight (kg)", height: "Height (cm)", activity: "Activity", low: "Sedentary", moderate: "Moderate", high: "Active", halfLife1: "Half-life:", halfLife2: "hrs", sleepHygiene: "Sleep Hygiene", idealBedtime: "Bedtime", maxTolerance: "Max tolerance", tol30: "30 mg", tol50: "50 mg", tol75: "75 mg", proTitle: "CoffeeTracker PRO", proDesc: "Unlock CSV & more.", proUpgrade: "Upgrade to PRO", proActive: "PRO Active", customDrinks: "Custom Drinks", addDrink: "Add Drink", drinkName: "Name", drinkMg: "mg/unit", drinkUnit: "Unit", settings: "Settings", notifLimit: "Limit warnings", notifMorning: "Morning sleep feedback", dangerZone: "Danger Zone", deleteAccount: "Delete Account", deleteConfirm: "Sure? Tap again", deleteSuccess: "Deleted", deleteError: "Error." },
    stats: { dailyAvg: "Daily Avg", daysOver: "Days Over Limit", days: "days", history7: "Weekly History", limit: "FDA Limit", generateMock: "Generate mock data", exportCSV: "Export CSV" },
    drinks: { tinto: "Black Coffee", tinto_ml: "Coffee (mL)", espresso: "Espresso", decaf: "Decaf", redbull: "Red Bull", vive100: "Vive 100", speedmax: "Speed Max", preworkout: "Pre-workout" },
    units: { tinto: "cup(s)", tinto_ml: "mL", espresso: "shot(s)", decaf: "cup(s)", redbull: "can(s)", vive100: "bottle(s)", speedmax: "bottle(s)", preworkout: "scoop(s)" }
  },
  // Fallbacks for space
  fr: { locale: 'fr-FR', welcome: "Langue", start: "Continuer", headerTitle: "TintoTracker", greeting: "Salut", loading: "...", offline: "Hors ligne.", synced: "Synchronisé.", onboarding: { title: "Profil", subtitle: "Données.", name: "Nom", namePlaceholder: "Jean", googleAuth: "Google", startApp: "Commencer", syncText: "Connexion." }, tabs: { today: "AUJ.", stats: "STATS", profile: "PROFIL" }, today: { active: "Active", totalConsumed: "Total", register: "Ajouter", add: "+", quickAdd: "Rapide", processed: "Traité", eliminatedMsg: "Éliminé", bedtime: "Coucher", estimatedAt: "Estimé", suggestionTitle: "Suggestion", suggestionNoMore: "Stop", suggestionMaxNow1: "Max:", suggestionMaxNow2: "", suggestionTime1: "Avant", suggestionTime2: "", suggestionTooLate: "Trop tard.", history: "Historique", mg: "mg", wrapUpTitle: "Hier", wrapUpGood: "Bien!", wrapUpBad: "Mal!", shareScore: "Partager", copied: "Copié", feedbackTitle: "Sommeil?", feedbackGood: "Bien", feedbackBad: "Mal", feedbackAdjusted: "Ajusté!" }, profile: { title: "Profil", name: "Nom", sex: "Sexe", male: "H", female: "F", weight: "Poids", height: "Taille", activity: "Activité", low: "Bas", moderate: "Moyen", high: "Haut", halfLife1: "Demi-vie", halfLife2: "h", sleepHygiene: "Sommeil", idealBedtime: "Coucher", maxTolerance: "Max", tol30: "30mg", tol50: "50mg", tol75: "75mg", proTitle: "PRO", proDesc: "Premium", proUpgrade: "Go PRO", proActive: "PRO Actif", customDrinks: "Boissons", addDrink: "Ajouter", drinkName: "Nom", drinkMg: "mg", drinkUnit: "Unité", settings: "Config", notifLimit: "Alertes", notifMorning: "Feedback", dangerZone: "Danger", deleteAccount: "Supprimer", deleteConfirm: "Sûr?", deleteSuccess: "Ok", deleteError: "Err" }, stats: { dailyAvg: "Moy", daysOver: "Jours +", days: "j", history7: "7J", limit: "Limite", generateMock: "Mock", exportCSV: "CSV" }, drinks: { tinto: "Café", tinto_ml: "mL", espresso: "Espresso", decaf: "Décaf", redbull: "Redbull", vive100: "Vive100", speedmax: "Speedmax", preworkout: "Pre" }, units: { tinto: "tasse", tinto_ml: "mL", espresso: "shot", decaf: "tasse", redbull: "can", vive100: "bot", speedmax: "bot", preworkout: "scoop" } },
  pt: { locale: 'pt-BR', welcome: "Idioma", start: "Continuar", headerTitle: "TintoTracker", greeting: "Olá", loading: "...", offline: "Offline.", synced: "Sincronizado.", onboarding: { title: "Perfil", subtitle: "Dados.", name: "Nome", namePlaceholder: "João", googleAuth: "Google", startApp: "Começar", syncText: "Login." }, tabs: { today: "HOJE", stats: "STATS", profile: "PERFIL" }, today: { active: "Ativo", totalConsumed: "Total", register: "Adicionar", add: "+", quickAdd: "Rápido", processed: "Processado", eliminatedMsg: "Eliminado", bedtime: "Dormir", estimatedAt: "Estimado", suggestionTitle: "Sugestão", suggestionNoMore: "Parar", suggestionMaxNow1: "Max:", suggestionMaxNow2: "", suggestionTime1: "Antes", suggestionTime2: "", suggestionTooLate: "Muito tarde.", history: "Histórico", mg: "mg", wrapUpTitle: "Ontem", wrapUpGood: "Bom!", wrapUpBad: "Mau!", shareScore: "Compartilhar", copied: "Copiado", feedbackTitle: "Sono?", feedbackGood: "Bom", feedbackBad: "Mau", feedbackAdjusted: "Ajustado!" }, profile: { title: "Perfil", name: "Nome", sex: "Sexo", male: "M", female: "F", weight: "Peso", height: "Altura", activity: "Atividade", low: "Baixa", moderate: "Média", high: "Alta", halfLife1: "Meia-vida", halfLife2: "h", sleepHygiene: "Sono", idealBedtime: "Dormir", maxTolerance: "Max", tol30: "30mg", tol50: "50mg", tol75: "75mg", proTitle: "PRO", proDesc: "Premium", proUpgrade: "Go PRO", proActive: "PRO Ativo", customDrinks: "Bebidas", addDrink: "Adicionar", drinkName: "Nome", drinkMg: "mg", drinkUnit: "Unidade", settings: "Config", notifLimit: "Alertas", notifMorning: "Feedback", dangerZone: "Perigo", deleteAccount: "Excluir", deleteConfirm: "Certeza?", deleteSuccess: "Ok", deleteError: "Err" }, stats: { dailyAvg: "Méd", daysOver: "Dias +", days: "d", history7: "7D", limit: "Limite", generateMock: "Mock", exportCSV: "CSV" }, drinks: { tinto: "Café", tinto_ml: "mL", espresso: "Espresso", decaf: "Descafeinado", redbull: "Redbull", vive100: "Vive100", speedmax: "Speedmax", preworkout: "Pre" }, units: { tinto: "xícara", tinto_ml: "mL", espresso: "shot", decaf: "xícara", redbull: "lata", vive100: "garrafa", speedmax: "garrafa", preworkout: "scoop" } },
  de: { locale: 'de-DE', welcome: "Sprache", start: "Weiter", headerTitle: "TintoTracker", greeting: "Hallo", loading: "...", offline: "Offline.", synced: "Synchronisiert.", onboarding: { title: "Profil", subtitle: "Daten.", name: "Name", namePlaceholder: "Johann", googleAuth: "Google", startApp: "Starten", syncText: "Anmelden." }, tabs: { today: "HEUTE", stats: "STATS", profile: "PROFIL" }, today: { active: "Aktiv", totalConsumed: "Gesamt", register: "Hinzufügen", add: "+", quickAdd: "Schnell", processed: "Verarbeitet", eliminatedMsg: "Eliminiert", bedtime: "Schlafen", estimatedAt: "Geschätzt", suggestionTitle: "Vorschlag", suggestionNoMore: "Stopp", suggestionMaxNow1: "Max:", suggestionMaxNow2: "", suggestionTime1: "Vorher", suggestionTime2: "", suggestionTooLate: "Zu spät.", history: "Verlauf", mg: "mg", wrapUpTitle: "Gestern", wrapUpGood: "Gut!", wrapUpBad: "Schlecht!", shareScore: "Teilen", copied: "Kopiert", feedbackTitle: "Schlaf?", feedbackGood: "Gut", feedbackBad: "Schlecht", feedbackAdjusted: "Angepasst!" }, profile: { title: "Profil", name: "Name", sex: "Geschlecht", male: "M", female: "W", weight: "Gewicht", height: "Größe", activity: "Aktivität", low: "Niedrig", moderate: "Mittel", high: "Hoch", halfLife1: "Halbwertszeit", halfLife2: "h", sleepHygiene: "Schlaf", idealBedtime: "Schlafen", maxTolerance: "Max", tol30: "30mg", tol50: "50mg", tol75: "75mg", proTitle: "PRO", proDesc: "Premium", proUpgrade: "Go PRO", proActive: "PRO Aktiv", customDrinks: "Getränke", addDrink: "Hinzufügen", drinkName: "Name", drinkMg: "mg", drinkUnit: "Einheit", settings: "Config", notifLimit: "Alarme", notifMorning: "Feedback", dangerZone: "Gefahr", deleteAccount: "Löschen", deleteConfirm: "Sicher?", deleteSuccess: "Ok", deleteError: "Err" }, stats: { dailyAvg: "Durchschnitt", daysOver: "Tage +", days: "t", history7: "7T", limit: "Limit", generateMock: "Mock", exportCSV: "CSV" }, drinks: { tinto: "Kaffee", tinto_ml: "mL", espresso: "Espresso", decaf: "Entkoffeiniert", redbull: "Redbull", vive100: "Vive100", speedmax: "Speedmax", preworkout: "Pre" }, units: { tinto: "Tasse", tinto_ml: "mL", espresso: "shot", decaf: "Tasse", redbull: "Dose", vive100: "Flasche", speedmax: "Flasche", preworkout: "scoop" } },
  zh: { locale: 'zh-CN', welcome: "语言", start: "继续", headerTitle: "TintoTracker", greeting: "你好", loading: "...", offline: "离线", synced: "已同步", onboarding: { title: "个人资料", subtitle: "数据", name: "姓名", namePlaceholder: "王", googleAuth: "Google", startApp: "开始", syncText: "登录" }, tabs: { today: "今天", stats: "统计", profile: "配置文件" }, today: { active: "活跃", totalConsumed: "总计", register: "添加", add: "+", quickAdd: "快速", processed: "已处理", eliminatedMsg: "已消除", bedtime: "睡觉时间", estimatedAt: "估计", suggestionTitle: "建议", suggestionNoMore: "停止", suggestionMaxNow1: "最大:", suggestionMaxNow2: "", suggestionTime1: "之前", suggestionTime2: "", suggestionTooLate: "太晚了", history: "历史", mg: "mg", wrapUpTitle: "昨天", wrapUpGood: "好!", wrapUpBad: "坏!", shareScore: "分享", copied: "已复制", feedbackTitle: "睡眠?", feedbackGood: "好", feedbackBad: "坏", feedbackAdjusted: "已调整!" }, profile: { title: "配置文件", name: "姓名", sex: "性别", male: "男", female: "女", weight: "体重", height: "身高", activity: "活动", low: "低", moderate: "中等", high: "高", halfLife1: "半衰期", halfLife2: "小时", sleepHygiene: "睡眠", idealBedtime: "睡觉时间", maxTolerance: "最大", tol30: "30mg", tol50: "50mg", tol75: "75mg", proTitle: "PRO", proDesc: "Premium", proUpgrade: "升级", proActive: "PRO 已激活", customDrinks: "饮料", addDrink: "添加", drinkName: "名称", drinkMg: "mg", drinkUnit: "单位", settings: "设置", notifLimit: "警报", notifMorning: "反馈", dangerZone: "危险", deleteAccount: "删除", deleteConfirm: "确定?", deleteSuccess: "好的", deleteError: "错误" }, stats: { dailyAvg: "平均", daysOver: "天数 +", days: "天", history7: "7天", limit: "限制", generateMock: "Mock", exportCSV: "CSV" }, drinks: { tinto: "咖啡", tinto_ml: "mL", espresso: "浓缩咖啡", decaf: "无咖啡因", redbull: "红牛", vive100: "Vive100", speedmax: "Speedmax", preworkout: "Pre" }, units: { tinto: "杯", tinto_ml: "mL", espresso: "shot", decaf: "杯", redbull: "罐", vive100: "瓶", speedmax: "瓶", preworkout: "勺" } }
};

export default function App() {
  const [lang, setLang] = useState('es');
  const [appState, setAppState] = useState('lang'); 
  const [activeTab, setActiveTab] = useState('today');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [coffees, setCoffees] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [user, setUser] = useState(null);

  // Profile Data including new PRO and Custom Drinks features
  const [profile, setProfile] = useState({
    name: '', gender: 'male', weight: 70, height: 170, activity: 'moderate',
    bedtime: '22:00', sleepThreshold: 50,
    isPro: false,
    customDrinks: [],
    usualDrink: 'tinto',
    notifications: { limitWarning: true, morningWrapup: true },
    lastFeedbackDate: null
  });

  const [selectedDrink, setSelectedDrink] = useState('tinto');
  const [drinkAmount, setDrinkAmount] = useState(1);
  const [newCustomDrink, setNewCustomDrink] = useState({ name: '', mg: 50, unit: 'taza' });

  // Merge Base drinks with Custom drinks
  const ALL_DRINKS = useMemo(() => {
    const custom = profile.customDrinks.map(d => ({
      id: d.id, mgPerUnit: d.mg, defaultAmount: 1, isCustom: true, name: d.name, unitName: d.unit
    }));
    return [...BASE_DRINKS, ...custom];
  }, [profile.customDrinks]);

  const t = (path) => path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : path), TRANSLATIONS[lang] || TRANSLATIONS['es']);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineQueue(); showToast(t('synced'), 'success'); };
    const handleOffline = () => { setIsOnline(false); showToast(t('offline'), 'warning'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [lang]);

  useEffect(() => {
    if (!auth) return;
    const initialToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    const initAuth = async () => {
      setIsLoading(true);
      try { if (initialToken) await signInWithCustomToken(auth, initialToken); else await signInAnonymously(auth); } catch (e) {}
      setIsLoading(false);
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && appState === 'main') syncCloudData(currentUser.uid);
    });
    return () => unsubscribe();
  }, [appState]);

  const syncOfflineQueue = async () => {
    if (!auth || !auth.currentUser || !isOnline || !db) return;
    const queueStr = localStorage.getItem('tt_offline');
    if (queueStr) {
      const queue = JSON.parse(queueStr);
      setIsLoading(true);
      for (const item of queue) {
        try { await addDoc(collection(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'coffees'), item); } catch (e) {}
      }
      localStorage.removeItem('tt_offline');
      setIsLoading(false);
    }
  };

  const syncCloudData = async (uid) => {
    if (!db || !isOnline) return;
    setIsLoading(true);
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'config', 'profile');
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) setProfile(prev => ({ ...prev, ...profileSnap.data() }));
      else await setDoc(profileRef, profile);

      const coffeesRef = collection(db, 'artifacts', appId, 'users', uid, 'coffees');
      onSnapshot(coffeesRef, (snapshot) => {
        const cloudCoffees = [];
        snapshot.forEach(doc => cloudCoffees.push({ dbId: doc.id, ...doc.data() }));
        setCoffees(cloudCoffees.sort((a,b) => a.timestamp - b.timestamp));
        setIsLoading(false);
      }, () => setIsLoading(false));
    } catch (e) { setIsLoading(false); }
  };

  const saveProfileToCloud = async (newProfile) => {
    if (!user || !db || !isOnline) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'config', 'profile'), newProfile); } catch (e) {}
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const metabolism = useMemo(() => {
    let halfLife = 5; 
    if (profile.gender === 'female') halfLife += 0.5;
    
    // Actividad física según aproximación a tasa metabólica (Harris-Benedict)
    const activityImpact = {
      'sedentary': 1.0,
      'light': 0.5,
      'moderate': 0,
      'active': -0.5,
      'extra_active': -1.0
    };
    halfLife += (activityImpact[profile.activity] || 0);

    const heightM = profile.height / 100;
    const bmi = profile.weight / (heightM * heightM);
    if (bmi > 25) halfLife += 0.5;
    return { halfLife, k: Math.LN2 / halfLife };
  }, [profile]);

  const weeklyData = useMemo(() => {
    const days = [];
    const now = new Date(currentTime);
    now.setHours(0, 0, 0, 0);
    const locale = TRANSLATIONS[lang]?.locale || 'es-ES';

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
      
      let dailyTotal = 0;
      let activeAtDailyBedtime = 0;
      const [bHours, bMins] = profile.bedtime.split(':').map(Number);
      const dayBedtime = new Date(d);
      dayBedtime.setHours(bHours, bMins, 0, 0);

      coffees.forEach(c => {
        const cDate = new Date(c.timestamp);
        if (cDate.getTime() >= d.getTime() && cDate.getTime() < d.getTime() + 86400000) {
          dailyTotal += c.mg;
          const hoursToBed = (dayBedtime.getTime() - cDate.getTime()) / (1000 * 60 * 60);
          if (hoursToBed > 0) activeAtDailyBedtime += c.mg * Math.exp(-metabolism.k * hoursToBed);
        }
      });
      days.push({ date: d, dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1), total: dailyTotal, activeAtBedtime: activeAtDailyBedtime });
    }
    return days;
  }, [coffees, currentTime, lang, profile.bedtime, metabolism.k]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = 5; i >= 0; i--) { 
      if (weeklyData[i].activeAtBedtime <= profile.sleepThreshold) streak++;
      else break; 
    }
    return streak;
  }, [weeklyData, profile.sleepThreshold]);

  const stats = useMemo(() => {
    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);
    const todayCoffees = coffees.filter(c => c.timestamp >= today.getTime());
    
    let totalConsumed = 0;
    let currentActive = 0;

    todayCoffees.forEach(coffee => {
      totalConsumed += coffee.mg;
      const hoursPassed = (currentTime - coffee.timestamp) / (1000 * 60 * 60);
      currentActive += hoursPassed > 0 ? coffee.mg * Math.exp(-metabolism.k * hoursPassed) : coffee.mg;
    });

    const eliminatedSinceLast = totalConsumed - currentActive;
    const [bedHours, bedMins] = profile.bedtime.split(':').map(Number);
    const bedtimeDate = new Date(currentTime);
    bedtimeDate.setHours(bedHours, bedMins, 0, 0);
    
    let timeToBedtimeHours = (bedtimeDate.getTime() - currentTime) / (1000 * 60 * 60);
    if (timeToBedtimeHours < 0) timeToBedtimeHours += 24; 

    const activeAtBedtime = currentActive * Math.exp(-metabolism.k * timeToBedtimeHours);
    const remainingLimitAtBedtime = profile.sleepThreshold - activeAtBedtime;
    let maxMgNow = 0;
    let latestCupTime = null;

    if (remainingLimitAtBedtime > 0) {
      maxMgNow = remainingLimitAtBedtime / Math.exp(-metabolism.k * timeToBedtimeHours);
      if (maxMgNow >= 50) { 
        let timeDiffHours = 0;
        // Si el limite restante ya es mayor a 50, se la puede tomar a la hora de dormir (0 horas de diferencia)
        if (remainingLimitAtBedtime < 50) {
          timeDiffHours = Math.log(remainingLimitAtBedtime / 50) / -metabolism.k;
        }
        latestCupTime = new Date(bedtimeDate.getTime() - (timeDiffHours * 60 * 60 * 1000));
      }
    }

    return { todayCoffees, totalConsumed, currentActive: Math.max(0, currentActive), eliminatedSinceLast: Math.max(0, eliminatedSinceLast), activeAtBedtime, suggestion: { maxMgNow, latestCupTime } };
  }, [coffees, currentTime, metabolism.k, profile.bedtime, profile.sleepThreshold]);

  const handleAddDrink = async (specificDrinkId = null, specificAmount = null) => {
    const dId = specificDrinkId || selectedDrink;
    const amt = specificAmount || drinkAmount;
    const drink = ALL_DRINKS.find(d => d.id === dId);
    const mg = drink.mgPerUnit * amt;
    
    const newCoffee = { id: Date.now(), timestamp: currentTime, mg: mg, drinkId: drink.id, amount: amt };
    
    if (user && db && !user.isAnonymous && isOnline) { 
       setIsLoading(true);
       try { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'coffees'), newCoffee); } catch (e) { setCoffees([...coffees, newCoffee]); }
       setIsLoading(false);
    } else {
      setCoffees([...coffees, newCoffee]);
      if (!isOnline) {
        const q = JSON.parse(localStorage.getItem('tt_offline') || '[]');
        q.push(newCoffee);
        localStorage.setItem('tt_offline', JSON.stringify(q));
      }
    }
  };

  const handleEditCoffee = async (coffee, updates) => {
    const updatedCoffee = { ...coffee, ...updates };
    if (updates.amount) {
      const drink = ALL_DRINKS.find(d => d.id === coffee.drinkId);
      updatedCoffee.mg = drink.mgPerUnit * updates.amount;
    }
    if (user && db && coffee.dbId && isOnline) {
      try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'coffees', coffee.dbId), updatedCoffee); } catch (e) {}
    } else { setCoffees(coffees.map(c => c.id === coffee.id ? updatedCoffee : c)); }
  };

  const handleDelete = async (coffee) => {
    if (user && db && coffee.dbId && isOnline) {
      try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'coffees', coffee.dbId)); } catch (e) {}
    } else { setCoffees(coffees.filter(c => c.id !== coffee.id && c.dbId !== coffee.dbId)); }
  };

  const exportCSV = () => {
    if (!profile.isPro) { showToast(t('profile.proTitle') + " Requerido", "warning"); return; }
    const header = "Fecha,Hora,Bebida,Cantidad,Mg\n";
    const rows = coffees.map(c => {
      const dName = ALL_DRINKS.find(d=>d.id===c.drinkId)?.isCustom ? ALL_DRINKS.find(d=>d.id===c.drinkId).name : t(`drinks.${c.drinkId}`);
      return `${new Date(c.timestamp).toLocaleDateString()},${new Date(c.timestamp).toLocaleTimeString()},${dName},${c.amount},${c.mg}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tintotracker_export.csv'; a.click();
  };

  const handleSleepFeedback = (isGood) => {
    const newProf = { ...profile, lastFeedbackDate: new Date().toLocaleDateString() };
    if (!isGood) {
      // Smart Calibration: lower threshold by 5mg if they slept bad to be stricter
      newProf.sleepThreshold = Math.max(10, profile.sleepThreshold - 5);
      showToast(t('today.feedbackAdjusted'), 'success');
    }
    setProfile(newProf);
    saveProfileToCloud(newProf);
  };

  if (appState === 'lang') {
    const languages = [ { code: 'es', name: 'Español', flag: '🇪🇸' }, { code: 'en', name: 'English', flag: '🇬🇧' }, { code: 'fr', name: 'Français', flag: '🇫🇷' }, { code: 'pt', name: 'Português', flag: '🇧🇷' }, { code: 'de', name: 'Deutsch', flag: '🇩🇪' }, { code: 'zh', name: '中文', flag: '🇨🇳' } ];
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 selection:bg-orange-200">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl text-center border border-gray-100 dark:border-gray-700">
          <Globe className="w-16 h-16 mx-auto mb-4 text-orange-500" />
          <h1 className="text-2xl font-black mb-2 text-gray-800 dark:text-white">TintoTracker</h1>
          <p className="text-gray-500 mb-8">{t('welcome')}</p>
          <div className="grid grid-cols-1 gap-3 mb-8">
            {languages.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)} className={`flex items-center justify-center p-4 rounded-2xl border-2 transition-all ${lang === l.code ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-gray-100 dark:border-gray-700'}`}>
                <span className="text-2xl mr-2">{l.flag}</span>
                <span className={`font-bold ${lang === l.code ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>{l.name}</span>
                {lang === l.code && <Check className="w-5 h-5 absolute ml-32 text-orange-500" />}
              </button>
            ))}
          </div>
          <button onClick={() => setAppState('onboarding')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl text-lg">{t('start')}</button>
        </div>
      </div>
    );
  }

  if (appState === 'onboarding') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center p-6 overflow-y-auto">
        <div className="max-w-md w-full mt-4 mb-10 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-black mb-2 text-gray-800 dark:text-white">{t('onboarding.title')}</h2>
          <p className="text-gray-500 text-sm mb-8">{t('onboarding.subtitle')}</p>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('onboarding.name')}</label>
              <input type="text" placeholder={t('onboarding.namePlaceholder')} value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border rounded-xl px-4 py-3 outline-none text-gray-800 dark:text-white font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">{t('profile.weight')}</label><input type="number" value={profile.weight} onChange={(e) => setProfile({...profile, weight: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-900 border rounded-xl px-4 py-3 text-gray-800 dark:text-white" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">{t('profile.height')}</label><input type="number" value={profile.height} onChange={(e) => setProfile({...profile, height: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-900 border rounded-xl px-4 py-3 text-gray-800 dark:text-white" /></div>
            </div>
            
            {/* Nuevos campos de Actividad, Sueño y Tolerancia en Onboarding */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('profile.activity')}</label>
              <select value={profile.activity} onChange={(e) => setProfile({...profile, activity: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none">
                <option value="sedentary">Sedentario (Poco/Ningún ejercicio)</option>
                <option value="light">Ligero (1-3 días/sem)</option>
                <option value="moderate">Moderado (3-5 días/sem)</option>
                <option value="active">Activo (6-7 días/sem)</option>
                <option value="extra_active">Muy Activo (Físico/Doble turno)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('profile.idealBedtime')}</label>
                  <input type="time" value={profile.bedtime} onChange={(e) => setProfile({...profile, bedtime: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('profile.maxTolerance')}</label>
                  <div className="flex flex-col space-y-1">
                    <div className="flex space-x-1">
                      <button onClick={() => setProfile({...profile, sleepThreshold: 30})} className={`flex-1 py-1 rounded font-bold text-[10px] ${profile.sleepThreshold <= 30 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>30</button>
                      <button onClick={() => setProfile({...profile, sleepThreshold: 50})} className={`flex-1 py-1 rounded font-bold text-[10px] ${profile.sleepThreshold > 30 && profile.sleepThreshold <= 50 ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>50</button>
                      <button onClick={() => setProfile({...profile, sleepThreshold: 75})} className={`flex-1 py-1 rounded font-bold text-[10px] ${profile.sleepThreshold > 50 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>75</button>
                    </div>
                    <span className="text-[9px] text-center text-gray-400">mg cafeína</span>
                  </div>
               </div>
            </div>

            <hr className="my-4" />
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-center">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-3">{t('onboarding.syncText')}</p>
              <button onClick={async () => { if (!auth) return; setIsLoading(true); try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch(e){} setIsLoading(false); }} className="w-full bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl flex items-center justify-center shadow-sm">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <LogIn className="w-5 h-5 mr-2 text-blue-500" />} {user && !user.isAnonymous ? '¡Conectado!' : t('onboarding.googleAuth')}
              </button>
            </div>
            <button disabled={profile.name.trim() === ''} onClick={() => { saveProfileToCloud(profile); setAppState('main'); }} className="w-full mt-6 bg-orange-500 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl text-lg shadow-md">{t('onboarding.startApp')}</button>
          </div>
        </div>
      </div>
    );
  }

  const renderToday = () => {
    const percentage = Math.min((stats.currentActive / MAX_DAILY_CAFFEINE) * 100, 100);
    const yesterdayData = weeklyData[5];
    const showWrapUp = profile.notifications.morningWrapup && yesterdayData && (yesterdayData.total > 0 || currentStreak > 0);
    const yesterdayGood = yesterdayData && yesterdayData.activeAtBedtime <= profile.sleepThreshold;
    
    // AI Calibration check (only show if it's morning < 12PM, yesterday was tracked, and we haven't asked today)
    const isMorning = new Date().getHours() < 12;
    const askFeedback = isMorning && yesterdayData && yesterdayData.total > 0 && profile.lastFeedbackDate !== new Date().toLocaleDateString();

    return (
      <div className="space-y-6 pb-20">
        
        {/* Morning AI Feedback Loop */}
        {askFeedback && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 shadow-sm animate-fade-in-down">
             <h4 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm mb-2 flex items-center"><Star className="w-4 h-4 mr-1"/> {t('today.feedbackTitle')}</h4>
             <div className="flex space-x-2">
               <button onClick={()=>handleSleepFeedback(true)} className="flex-1 py-2 bg-white dark:bg-gray-800 rounded-lg text-indigo-600 font-medium flex justify-center border border-indigo-100 shadow-sm hover:bg-indigo-100"><ThumbsUp className="w-4 h-4 mr-1"/> {t('today.feedbackGood')}</button>
               <button onClick={()=>handleSleepFeedback(false)} className="flex-1 py-2 bg-white dark:bg-gray-800 rounded-lg text-gray-600 font-medium flex justify-center border border-gray-200 shadow-sm hover:bg-gray-100"><ThumbsDown className="w-4 h-4 mr-1"/> {t('today.feedbackBad')}</button>
             </div>
          </div>
        )}

        {/* Wrap Up */}
        {showWrapUp && !askFeedback && (
          <div className={`p-4 rounded-2xl border shadow-sm flex items-start space-x-3 ${yesterdayGood ? 'bg-green-50/80 border-green-200' : 'bg-orange-50/80 border-orange-200'}`}>
             <div className={`p-2 rounded-full mt-1 ${yesterdayGood ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{yesterdayGood ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}</div>
             <div><h4 className="font-bold text-gray-800 dark:text-white text-sm">{t('today.wrapUpTitle')}</h4><p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{yesterdayGood ? t('today.wrapUpGood') : t('today.wrapUpBad')}</p></div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={stats.currentActive > MAX_DAILY_CAFFEINE ? "#ef4444" : "#f97316"} strokeWidth="8" strokeDasharray={`${percentage * 2.83} 283`} className="transition-all duration-1000 ease-out"/>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-bold text-gray-800 dark:text-white">{stats.currentActive.toFixed(0)}<span className="text-xl">{t('today.mg')}</span></span>
              <span className="text-sm text-gray-500 flex items-center mt-1"><Zap className="w-4 h-4 mr-1" /> {t('today.active')}</span>
            </div>
          </div>
          <p className="mt-4 text-gray-500 text-sm">{t('today.totalConsumed')}: {stats.totalConsumed.toFixed(0)} {t('today.mg')}</p>
        </div>

        {/* Quick Add & Add Form */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          
          {/* Quick Add Button (Silicon Valley Frictionless UX) */}
          <button onClick={() => handleAddDrink(profile.usualDrink, 1)} className="w-full mb-4 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 py-3 rounded-xl font-bold flex items-center justify-center transition-colors border border-orange-200 dark:border-orange-800/50 hover:bg-orange-200">
            <Zap className="w-5 h-5 mr-2 fill-current" /> {t('today.quickAdd')} (+1 {ALL_DRINKS.find(d=>d.id===profile.usualDrink)?.isCustom ? ALL_DRINKS.find(d=>d.id===profile.usualDrink).name : t(`drinks.${profile.usualDrink}`)})
          </button>

          <div className="flex space-x-2">
            <select value={selectedDrink} onChange={(e) => { setSelectedDrink(e.target.value); setDrinkAmount(ALL_DRINKS.find(d => d.id === e.target.value).defaultAmount); }} className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 outline-none text-gray-800 dark:text-white text-sm truncate">
              {ALL_DRINKS.map(d => <option key={d.id} value={d.id}>{d.isCustom ? `🌟 ${d.name}` : t(`drinks.${d.id}`)}</option>)}
            </select>
            <div className="flex w-32 bg-gray-50 dark:bg-gray-900 border rounded-xl px-2 py-1 items-center">
               <input type="number" min="0" step="any" value={drinkAmount} onChange={(e) => setDrinkAmount(Number(e.target.value))} className="w-full bg-transparent text-center outline-none text-gray-800 dark:text-white" />
               <span className="text-[10px] text-gray-400 mr-2 whitespace-nowrap overflow-hidden text-ellipsis w-10">
                 {ALL_DRINKS.find(d=>d.id===selectedDrink)?.isCustom ? ALL_DRINKS.find(d=>d.id===selectedDrink).unitName : t(`units.${selectedDrink}`)}
               </span>
            </div>
          </div>
          <button onClick={() => handleAddDrink(selectedDrink, drinkAmount)} disabled={isLoading && isOnline} className="w-full mt-3 bg-gray-900 dark:bg-gray-700 hover:bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center">
            {isLoading && isOnline ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />} {t('today.add')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100">
            <div className="flex items-center text-green-600 mb-2"><Activity className="w-4 h-4 mr-1" /><span className="text-xs font-bold uppercase">{t('today.processed')}</span></div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.eliminatedSinceLast.toFixed(0)} <span className="text-sm font-normal text-gray-500">{t('today.mg')}</span></p>
            <p className="text-[10px] text-green-700 dark:text-green-400 mt-1 leading-tight">
              {lang === 'es' ? 'Cafeína eliminada hasta la hora actual' : 'Caffeine eliminated up to current time'}
            </p>
          </div>
          <div className={`p-4 rounded-2xl border ${stats.activeAtBedtime > profile.sleepThreshold ? 'bg-red-50 dark:bg-red-900/20 border-red-100' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100'}`}>
            <div className={`flex items-center mb-2 ${stats.activeAtBedtime > profile.sleepThreshold ? 'text-red-600' : 'text-indigo-600'}`}><Moon className="w-4 h-4 mr-1" /><span className="text-xs font-bold uppercase">{t('today.bedtime')}</span></div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.activeAtBedtime.toFixed(0)} <span className="text-sm font-normal text-gray-500">{t('today.mg')}</span></p>
            <p className={`text-[10px] mt-1 leading-tight ${stats.activeAtBedtime > profile.sleepThreshold ? 'text-red-700 dark:text-red-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
              {lang === 'es' ? `Circulando en tu sistema a las ${profile.bedtime}` : `Circulating in your system at ${profile.bedtime}`}
            </p>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${stats.activeAtBedtime > profile.sleepThreshold * 1.30 ? 'bg-red-100 dark:bg-red-900/40 border-red-400' : stats.activeAtBedtime >= profile.sleepThreshold ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30'}`}>
           <h4 className={`flex items-center font-semibold mb-2 ${stats.activeAtBedtime > profile.sleepThreshold * 1.30 ? 'text-red-700 dark:text-red-400' : stats.activeAtBedtime >= profile.sleepThreshold ? 'text-orange-700 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
             {stats.activeAtBedtime > profile.sleepThreshold * 1.30 ? <AlertCircle className="w-5 h-5 mr-2" /> : <Info className="w-4 h-4 mr-2" />} 
             {t('today.suggestionTitle')}
           </h4>
           {stats.activeAtBedtime > profile.sleepThreshold * 1.30 ? (
               <p className="text-sm text-red-700 dark:text-red-400 font-bold leading-relaxed">
                 {lang === 'es' ? `¡Alerta! Has superado tu límite por más del 30%. Será aún más difícil conciliar el sueño a las ${profile.bedtime}.` : `Alert! You exceeded your limit by over 30%. It will be even harder to fall asleep at ${profile.bedtime}.`}
               </p>
           ) : stats.activeAtBedtime >= profile.sleepThreshold ? ( 
               <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">{t('today.suggestionNoMore')} {profile.bedtime}.</p> 
           ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <p>{t('today.suggestionMaxNow1')} <b>{stats.suggestion.maxMgNow.toFixed(0)} {t('today.mg')}</b> {t('today.suggestionMaxNow2')}</p>
                {stats.suggestion.maxMgNow >= 50 && stats.suggestion.latestCupTime ? ( 
                   <p>{t('today.suggestionTime1')} <b>{t('drinks.tinto')}</b> {t('today.suggestionTime2')} <b>{stats.suggestion.latestCupTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b>.</p> 
                ) : ( 
                   <p className="text-orange-600 font-medium">{t('today.suggestionTooLate')}</p> 
                )}
              </div>
           )}
        </div>

        {stats.todayCoffees.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold mb-4 text-gray-800 dark:text-white flex items-center justify-between">
              {t('today.history')}
              <button onClick={async () => {
                const text = `🔥 Sobreviví hoy con ${stats.totalConsumed}mg de cafeína y mi racha de sueño es de ${currentStreak} días en TintoTracker! ☕`;
                if (navigator.share) { try { await navigator.share({ title: 'TintoTracker', text }); } catch(e){} } 
                else { navigator.clipboard.writeText(text); showToast(t('today.copied'), "success"); }
              }} className="text-orange-500 hover:text-orange-600 flex items-center text-xs bg-orange-50 px-2 py-1 rounded"><Share2 className="w-3 h-3 mr-1"/> {t('today.shareScore')}</button>
            </h3>
            <div className="space-y-3">
              {stats.todayCoffees.map(coffee => {
                const timeStr = new Date(coffee.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
                const dName = ALL_DRINKS.find(d=>d.id===coffee.drinkId)?.isCustom ? ALL_DRINKS.find(d=>d.id===coffee.drinkId).name : t(`drinks.${coffee.drinkId}`);
                const uName = ALL_DRINKS.find(d=>d.id===coffee.drinkId)?.isCustom ? ALL_DRINKS.find(d=>d.id===coffee.drinkId).unitName : t(`units.${coffee.drinkId}`);
                return (
                  <div key={coffee.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <div className="flex-1"><p className="font-medium text-sm text-gray-800 dark:text-white">{dName}</p><p className="text-xs text-gray-500">{coffee.mg} {t('today.mg')}</p></div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-white dark:bg-gray-800 border rounded px-1 py-1"><input type="number" step="any" min="0" value={coffee.amount} onChange={(e) => handleEditCoffee(coffee, { amount: Number(e.target.value) })} className="w-10 bg-transparent text-xs text-center outline-none dark:text-white" /><span className="text-[9px] text-gray-400 w-6 truncate">{uName}</span></div>
                      <input type="time" value={timeStr} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); const d = new Date(coffee.timestamp); d.setHours(h, m); handleEditCoffee(coffee, { timestamp: d.getTime() }); }} className="bg-white border rounded px-1 py-1 text-xs outline-none dark:bg-gray-800 dark:text-white" />
                      <button onClick={() => handleDelete(coffee)} className="p-1 text-red-400 hover:text-red-600 bg-white border rounded dark:bg-gray-800"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => (
    <div className="space-y-6 pb-20">
      
      {/* PRO BANNER */}
      <div className={`p-6 rounded-3xl shadow-sm border flex items-center justify-between transition-colors ${profile.isPro ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-600' : 'bg-gray-900 border-gray-800'}`}>
        <div className="text-left text-white">
          <h3 className="font-black text-lg flex items-center"><Crown className="w-5 h-5 mr-2 text-yellow-300"/> {t('profile.proTitle')}</h3>
          <p className="text-xs opacity-80 mt-1">{t('profile.proDesc')}</p>
        </div>
        <button 
          onClick={() => { const n = {...profile, isPro: !profile.isPro}; setProfile(n); saveProfileToCloud(n); }}
          className={`px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-colors ${profile.isPro ? 'bg-white text-orange-600' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
        >
          {profile.isPro ? t('profile.proActive') : t('profile.proUpgrade')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{t('profile.title')}</h2>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-500 mb-1">{t('profile.name')}</label><input type="text" value={profile.name} onChange={(e) => { setProfile({...profile, name: e.target.value}); saveProfileToCloud({...profile, name: e.target.value}); }} className="w-full bg-gray-50 border rounded-xl px-4 py-3 outline-none dark:bg-gray-900 dark:text-white" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-500 mb-1">{t('profile.weight')}</label><input type="number" value={profile.weight} onChange={(e) => { setProfile({...profile, weight: Number(e.target.value)}); saveProfileToCloud({...profile, weight: Number(e.target.value)}); }} className="w-full bg-gray-50 border rounded-xl px-4 py-3 outline-none dark:bg-gray-900 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-500 mb-1">{t('profile.height')}</label><input type="number" value={profile.height} onChange={(e) => { setProfile({...profile, height: Number(e.target.value)}); saveProfileToCloud({...profile, height: Number(e.target.value)}); }} className="w-full bg-gray-50 border rounded-xl px-4 py-3 outline-none dark:bg-gray-900 dark:text-white" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{t('profile.sleepHygiene')}</h2>
        <div className="space-y-6">
          <div><label className="block text-sm font-medium text-gray-500 mb-2">{t('profile.idealBedtime')}</label><input type="time" value={profile.bedtime} onChange={(e) => { setProfile({...profile, bedtime: e.target.value}); saveProfileToCloud({...profile, bedtime: e.target.value}); }} className="w-full bg-gray-50 border rounded-xl px-4 py-3 outline-none dark:bg-gray-900 dark:text-white" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">{t('profile.maxTolerance')}</label>
            <div className="flex flex-col space-y-3">
               <button onClick={() => { setProfile({...profile, sleepThreshold: 30}); saveProfileToCloud({...profile, sleepThreshold: 30}); }} className={`py-3 px-4 rounded-xl font-bold text-sm ${profile.sleepThreshold <= 30 ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 dark:bg-gray-900'}`}>{t('profile.tol30')}</button>
               <button onClick={() => { setProfile({...profile, sleepThreshold: 50}); saveProfileToCloud({...profile, sleepThreshold: 50}); }} className={`py-3 px-4 rounded-xl font-bold text-sm ${profile.sleepThreshold > 30 && profile.sleepThreshold <= 50 ? 'bg-gray-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 dark:bg-gray-900'}`}>{t('profile.tol50')}</button>
               <button onClick={() => { setProfile({...profile, sleepThreshold: 75}); saveProfileToCloud({...profile, sleepThreshold: 75}); }} className={`py-3 px-4 rounded-xl font-bold text-sm ${profile.sleepThreshold > 50 ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 dark:bg-gray-900'}`}>{t('profile.tol75')}</button>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOM DRINKS CREATOR */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
         <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center justify-between">
           {t('profile.customDrinks')} 
           {!profile.isPro && profile.customDrinks.length >= 1 && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-1 rounded">PRO</span>}
         </h2>
         <div className="space-y-3 mb-4">
           {profile.customDrinks.map(d => (
             <div key={d.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
               <div><p className="font-bold text-sm dark:text-white">{d.name}</p><p className="text-xs text-gray-500">{d.mg}mg / {d.unit}</p></div>
               <button onClick={() => { const n = {...profile, customDrinks: profile.customDrinks.filter(cd => cd.id !== d.id)}; setProfile(n); saveProfileToCloud(n); }} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
             </div>
           ))}
         </div>
         {/* Creator Form */}
         {(profile.isPro || profile.customDrinks.length === 0) ? (
           <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
             <input type="text" placeholder={t('profile.drinkName')} value={newCustomDrink.name} onChange={e=>setNewCustomDrink({...newCustomDrink, name:e.target.value})} className="w-full text-sm bg-white border p-2 rounded dark:bg-gray-800 dark:text-white outline-none"/>
             <div className="flex space-x-2">
               <input type="number" placeholder="mg cafeína por porción" value={newCustomDrink.mg} onChange={e=>setNewCustomDrink({...newCustomDrink, mg:Number(e.target.value)})} className="w-2/3 text-sm bg-white border p-2 rounded dark:bg-gray-800 dark:text-white outline-none"/>
               <select value={newCustomDrink.unit} onChange={e=>setNewCustomDrink({...newCustomDrink, unit:e.target.value})} className="w-1/3 text-sm bg-white border p-2 rounded dark:bg-gray-800 dark:text-white outline-none">
                 <option value="taza">Taza</option>
                 <option value="mL">mL</option>
               </select>
             </div>
             <button disabled={!newCustomDrink.name} onClick={() => {
               const n = {...profile, customDrinks: [...profile.customDrinks, { ...newCustomDrink, id: 'custom_'+Date.now() }]};
               setProfile(n); saveProfileToCloud(n); setNewCustomDrink({name:'', mg:50, unit:'taza'});
             }} className="w-full bg-gray-800 text-white font-bold py-2 rounded flex items-center justify-center disabled:opacity-50"><PlusCircle className="w-4 h-4 mr-2"/> {t('profile.addDrink')}</button>
           </div>
         ) : (
           <p className="text-xs text-center text-gray-500 italic">Desbloquea PRO para bebidas ilimitadas.</p>
         )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
         <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center"><Settings className="w-5 h-5 mr-2"/> {t('profile.settings')}</h2>
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.notifMorning')}</span>
             <input type="checkbox" checked={profile.notifications.morningWrapup} onChange={(e) => { const n = {...profile, notifications: {...profile.notifications, morningWrapup: e.target.checked}}; setProfile(n); saveProfileToCloud(n); }} className="w-5 h-5 accent-orange-500" />
           </div>
         </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100 dark:border-red-900/30">
         <h2 className="text-lg font-bold mb-4 text-red-600">{t('profile.dangerZone')}</h2>
         <button onClick={async () => {
            if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
            if (!user || !db || !isOnline) return;
            setIsLoading(true);
            try {
              const snap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'coffees'));
              await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
              await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'config', 'profile'));
              await deleteUser(user);
              showToast(t('profile.deleteSuccess'), 'success'); setAppState('lang');
            } catch (e) { showToast(t('profile.deleteError'), 'error'); }
            setIsLoading(false);
         }} className={`w-full py-4 rounded-xl font-bold transition-colors ${confirmDelete ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}>
            {confirmDelete ? t('profile.deleteConfirm') : t('profile.deleteAccount')}
         </button>
      </div>
    </div>
  );

  const renderStats = () => {
    const maxDaily = Math.max(MAX_DAILY_CAFFEINE, ...weeklyData.map(d => d.total));
    const weeklyAverage = weeklyData.reduce((acc, curr) => acc + curr.total, 0) / 7;

    return (
      <div className="space-y-6 pb-20">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border"><p className="text-xs text-gray-500 mb-1">{t('stats.dailyAvg')}</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{weeklyAverage.toFixed(0)} <span className="text-sm font-normal text-gray-500">{t('today.mg')}</span></p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border"><p className="text-xs text-gray-500 mb-1">{t('stats.daysOver')}</p><p className="text-2xl font-bold text-red-500">{weeklyData.filter(d => d.total > MAX_DAILY_CAFFEINE).length} <span className="text-sm font-normal text-gray-500">{t('stats.days')}</span></p></div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border">
          <h2 className="text-lg font-bold mb-6 text-gray-800 dark:text-white flex items-center"><BarChart2 className="w-5 h-5 mr-2" /> {t('stats.history7')}</h2>
          <div className="relative h-48 flex items-end justify-between pt-6">
            <div className="absolute w-full border-t-2 border-dashed border-red-400 z-0 opacity-50 flex items-center" style={{ bottom: `${(MAX_DAILY_CAFFEINE / maxDaily) * 100}%` }}>
              <span className="absolute -top-5 right-0 text-[10px] font-bold text-red-500">400mg {t('stats.limit')}</span>
            </div>
            {weeklyData.map((day, idx) => {
              const heightPercent = maxDaily > 0 ? (day.total / maxDaily) * 100 : 0;
              const isOverLimit = day.total > MAX_DAILY_CAFFEINE;
              return (
                <div key={idx} className="flex flex-col items-center w-8 z-10 group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity">{day.total.toFixed(0)}mg</div>
                  <div className="w-full h-40 flex items-end rounded-t-md overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <div className={`w-full rounded-t-md transition-all duration-700 ease-out ${isOverLimit ? 'bg-red-500' : 'bg-orange-400'}`} style={{ height: `${heightPercent}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2 font-medium truncate w-10 text-center">{day.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Export CSV Button (Premium Feature) */}
        <button onClick={exportCSV} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center transition-colors ${profile.isPro ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          <Download className="w-5 h-5 mr-2"/> {t('stats.exportCSV')} {!profile.isPro && <Crown className="w-4 h-4 ml-2 text-yellow-500"/>}
        </button>

        {weeklyData.every(d => d.total === 0 || d.date.getTime() === new Date(currentTime).setHours(0,0,0,0)) && (
          <button onClick={async () => {
              const mock = []; const now = new Date(currentTime); now.setHours(0,0,0,0);
              for (let i = 1; i <= 6; i++) { const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(10, 30, 0, 0); const randomMg = Math.floor(Math.random() * 250) + 100; mock.push({ id: Date.now() - (i * 100000), timestamp: d.getTime(), mg: randomMg, drinkId: 'tinto', amount: randomMg / 50 }); }
              if (user && db && isOnline) { setIsLoading(true); for (const m of mock) { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'coffees'), m); } setIsLoading(false); } 
              else { setCoffees([...coffees, ...mock]); }
            }} className="w-full py-4 border-2 border-dashed border-orange-300 text-orange-600 rounded-2xl font-semibold hover:bg-orange-50">
            {t('stats.generateMock')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans selection:bg-orange-200">
      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
        {isLoading && ( <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-50 overflow-hidden"><div className="h-full bg-orange-500 w-1/3 animate-[pulse_1s_ease-in-out_infinite] rounded"></div></div> )}
        <header className="px-6 py-5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20 flex justify-between items-center">
          <div className="flex flex-col">
             <div className="flex items-center space-x-2 text-orange-500 mb-1"><Coffee className="w-5 h-5" /><h1 className="text-sm font-black tracking-widest uppercase text-gray-400">{t('headerTitle')}</h1></div>
             <h2 className="text-xl font-bold text-gray-800 dark:text-white">{profile.name ? `👋 ${t('greeting')}, ${profile.name}` : t('headerTitle')}</h2>
          </div>
          <div className="flex items-center space-x-3">
             {currentStreak > 0 && ( <div className="flex items-center bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-lg"><Flame className="w-5 h-5 text-orange-500" /><span className="text-orange-600 font-bold ml-1 text-sm">{currentStreak}</span></div> )}
             {!isOnline && <WifiOff className="w-5 h-5 text-red-500" />}
             <button onClick={() => setAppState('lang')} className="p-1 text-gray-400 hover:text-orange-500 transition-colors"><Globe className="w-6 h-6" /></button>
          </div>
        </header>
        <main className="p-4 flex-1 overflow-y-auto">
          {activeTab === 'today' && renderToday()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'stats' && renderStats()}
        </main>
        {toast && ( <div className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center z-50 whitespace-nowrap transition-all ${toast.type === 'error' ? 'bg-red-500 text-white' : toast.type === 'warning' ? 'bg-orange-400 text-white' : toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'}`}>{toast.msg}</div> )}
        <nav className="absolute bottom-0 w-full bg-white dark:bg-gray-800 border-t flex justify-around p-3 z-20 pb-safe">
          <button onClick={() => setActiveTab('today')} className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'today' ? 'text-orange-500 bg-orange-50' : 'text-gray-400'}`}><Coffee className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">{t('tabs.today')}</span></button>
          <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'stats' ? 'text-orange-500 bg-orange-50' : 'text-gray-400'}`}><BarChart2 className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">{t('tabs.stats')}</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'profile' ? 'text-orange-500 bg-orange-50' : 'text-gray-400'}`}><User className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">{t('tabs.profile')}</span></button>
        </nav>
      </div>
    </div>
  );
}