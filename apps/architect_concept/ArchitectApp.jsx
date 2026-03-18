import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiDownload, FiFolder, FiUser, FiLogOut, FiSettings, FiTrash2, FiSun, FiMoon, FiGrid, FiMaximize2, FiCheckCircle, FiAlertCircle, FiLayers } from "react-icons/fi";
import { HiOutlinePhotograph, HiOutlineCube, HiOutlinePencil } from "react-icons/hi";

const DEFAULT_PROJECT_NAME = "Новый проект";
const DEFAULTS = {
  plot: { width: 29, height: 16 },
  house: { width: 16, height: 10 },
  floors: 3,
  floorHeight: 3.5,
  offsets: { front: 3, back: 10, left: 3, right: 3 },
  style: "Хай‑тек",
  materials: "бетон, стекло, дерево, металл",
  location: "Сочи, Россия",
  buildingType: "Жилой дом",
};
const TYPE_PRESETS = {
  "Жилой дом": { floors: 3, poolEnabled: true, parkingEnabled: true, style: "Хай‑тек", materials: "бетон, стекло, дерево, металл", interiorA: "Гостиная", interiorB: "Спальня", label: "дом" },
  "Гостиница": { floors: 5, poolEnabled: true, parkingEnabled: true, style: "Современный хай‑тек", materials: "бетон, стекло, металл, дерево", interiorA: "Лобби", interiorB: "Номер", label: "гостиница" },
  "Офис":     { floors: 4, poolEnabled: false, parkingEnabled: true, style: "Хай‑тек, минимализм", materials: "стекло, металл, бетон", interiorA: "Опен‑спейс", interiorB: "Переговорная", label: "офисное здание" },
  "Магазин":  { floors: 2, poolEnabled: false, parkingEnabled: true, style: "Современный ритейл", materials: "стекло, металл, бетон, дерево", interiorA: "Торговый зал", interiorB: "Витрина/кассовая", label: "магазин" },
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const farea = (n) => `${Number(n).toFixed(1)} м²`;
function footprintPoints(hW, hH, shapeType, p) {
  const pts = []; const w = hW, h = hH;
  switch (shapeType) {
    case "Прямоугольник": return [[0,0],[w,0],[w,h],[0,h]];
    case "Эллипс": { const seg = clamp(Number(p.segments||48), 12, 256); const rx = w/2, ry = h/2; const cx = rx, cy = ry; for (let i=0;i<seg;i++){ const a= (i/seg)*Math.PI*2; pts.push([cx+rx*Math.cos(a), cy+ry*Math.sin(a)]);} return pts; }
    case "Круг": { const seg = clamp(Number(p.segments||48), 12, 256); const r = Math.min(w,h)/2; const cx = w/2, cy = h/2; for (let i=0;i<seg;i++){ const a=(i/seg)*Math.PI*2; pts.push([cx+r*Math.cos(a), cy+r*Math.sin(a)]);} return pts; }
    case "L‑образный": { const wingX = clamp(Number(p.wingX||w*0.5), 0.5, w); const wingY = clamp(Number(p.wingY||h*0.5), 0.5, h); return [[0,0],[w,0],[w,wingY],[wingX,wingY],[wingX,h],[0,h]]; }
    case "U‑образный": { const side = clamp(Number(p.side||w*0.3), 0.5, w*0.49); const courtD = clamp(Number(p.courtD||h*0.5), 0.5, h*0.9); return [[0,0],[w,0],[w,h],[w-side,h],[w-side,courtD],[side,courtD],[side,h],[0,h]]; }
    case "T‑образный": { const barH = clamp(Number(p.barH||h*0.4), 0.5, h*0.9); const stemW = clamp(Number(p.stemW||w*0.4), 0.5, w*0.9); const cx = w/2; return [[0,0],[w,0],[w,barH],[cx+stemW/2,barH],[cx+stemW/2,h],[cx-stemW/2,h],[cx-stemW/2,barH],[0,barH]]; }
    case "Треугольник": { return [[0,0],[w,0],[w/2,h]]; }
    case "Произвольный многоугольник": {
      const parts = String(p.polyStr||"").split(';').flatMap(t => t.split('\n')).map(s=>s.trim()).filter(Boolean);
      const arr = parts.map(s=>{ const bits = s.includes(',') ? s.split(',') : s.split(' ').filter(Boolean); return [Number(bits[0]), Number(bits[1])]; });
      if (arr.length>=3 && arr.every(t=>t.length===2 && isFinite(t[0]) && isFinite(t[1]))) return arr; return [[0,0],[w,0],[w,h],[0,h]];
    }
    default: return [[0,0],[w,0],[w,h],[0,h]];
  }
}
function Section({ title, icon, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center mb-4">
        <div className="text-xl text-indigo-600 dark:text-indigo-400 mr-2">{icon}</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}
function StatCard({ icon, label, value }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm">
      <div className="text-2xl text-indigo-600 dark:text-indigo-400 mb-1">{icon}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
    </motion.div>
  );
}
function UserProfile({ user, logout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">
        <FiUser /> <span className="text-sm">{user.email}</span>
      </button>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
            <button onClick={logout} className="w-full text-left px-4 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"><FiLogOut /> Выйти</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function LoginButton({ onLogin }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const handleLogin = (e) => { e.preventDefault(); if (email) onLogin(email); setOpen(false); };
  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-2"><FiUser /> Войти</button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 grid place-items-center p-4" onClick={() => setOpen(false)}>
            <motion.form initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onSubmit={handleLogin} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-sm border border-slate-200 dark:border-slate-700 shadow-xl">
              <div className="text-lg font-semibold mb-2">Вход</div>
              <label className="flex flex-col text-sm"><span className="text-slate-600 dark:text-slate-400">Email</span><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="input" placeholder="you@domain.com"/></label>
              <div className="flex gap-2 mt-4"><button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-sm">Продолжить</button><button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white text-sm">Отмена</button></div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ArchitectApp() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);

  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("archapp_user") || "null"); } catch { return null; } });
  const handleLogin = (email) => { const u = { email }; setUser(u); localStorage.setItem("archapp_user", JSON.stringify(u)); };
  const logout = () => { setUser(null); localStorage.removeItem("archapp_user"); };

  const [allProjects, setAllProjects] = useState(() => { try { return JSON.parse(localStorage.getItem("archapp_all_projects") || "{}"); } catch { return {}; } });
  const [currentProjectId, setCurrentProjectId] = useState(() => Object.keys(allProjects)[0] || Date.now().toString());
  const [projectName, setProjectName] = useState(allProjects[currentProjectId]?.name || DEFAULT_PROJECT_NAME);

  const defaultParams = { ...DEFAULTS, shapeType: "Прямоугольник", shapeParams: { wingX: 8, wingY: 5, side: 5, courtD: 5, barH: 4, stemW: 6, segments: 48, polyStr: "" }, poolEnabled: true, parkingEnabled: true };
  const [params, setParams] = useState(allProjects[currentProjectId]?.data || defaultParams);
  const updateParam = useCallback((key, value) => setParams(p => ({ ...p, [key]: value })), []);
  const updateNestedParam = useCallback((parent, key, value) => setParams(p => ({ ...p, [parent]: { ...p[parent], [key]: value } })), []);

  const validation = useMemo(() => { const errs=[]; if(params.house.width > params.plot.width - params.offsets.left - params.offsets.right) errs.push("Здание шире участка"); if(params.house.height > params.plot.height - params.offsets.front - params.offsets.back) errs.push("Здание длиннее участка"); return errs; }, [params]);
  const footprint = useMemo(() => footprintPoints(params.house.width, params.house.height, params.shapeType, params.shapeParams), [params.shapeType, params.shapeParams, params.house.width, params.house.height]);
  const stats = useMemo(() => {
    const plotArea = params.plot.width * params.plot.height;
    const buildingArea = Math.abs(footprint.reduce((s, [x1, y1], i, arr) => { const [x2,y2] = arr[(i+1)%arr.length]; return s+(x1*y2-x2*y1); }, 0) / 2);
    const volume = Math.abs(buildingArea) * params.floors * params.floorHeight; const pricePerMeter = 150000;
    return { plotArea, buildingArea, volume, estimatedCost: Math.abs(buildingArea) * params.floors * pricePerMeter };
  }, [params, footprint]);
  const prompts = useMemo(() => {
    const preset = TYPE_PRESETS[params.buildingType] || TYPE_PRESETS["Жилой дом"];
    const base = { ...params, label: preset.label, size: `${params.house.height}×${params.house.width} м` };
    const common = "ультрареализм, 8K, кинематографическое освещение";
    return [
      { goal: "Экстерьер (вечер)", prompt: `Современное ${base.label} ${base.size}, форма: ${base.shapeType}, панорамные фасады, стиль ${base.style}, материалы: ${base.materials}, бассейн, парковка, море на заднем плане, вечерний свет, ${common}.` },
      { goal: "Генплан (дрон)", prompt: `Вид сверху на участок ${params.plot.width}×${params.plot.height} м, ${base.label}, этажей: ${base.floors}, бассейн/парковка/зелень, дневной свет, ${common}.` },
      { goal: preset.interiorA, prompt: `${preset.interiorA} с панорамным остеклением, стиль ${base.style}, материалы: ${base.materials}, дневной свет, ${common}.` },
      { goal: preset.interiorB, prompt: `${preset.interiorB} с видом на море, стиль ${base.style}, материалы: ${base.materials}, мягкое освещение, ${common}.` },
      { goal: "Ночной фасад", prompt: `Ночной фасад ${base.label}, панорамное остекление, тёплый свет, отражение в бассейне, хай‑тек, ${common}.` },
    ];
  }, [params]);

  const [renders, setRenders] = useState(allProjects[currentProjectId]?.renders || []);
  const [generating, setGenerating] = useState(false);
  const threeMountRef = useRef(null);

  const saveProject = useCallback(() => {
    setAllProjects(prev => {
      const next = { ...prev, [currentProjectId]: { name: projectName, data: params, renders } };
      localStorage.setItem("archapp_all_projects", JSON.stringify(next));
      return next;
    });
  }, [currentProjectId, projectName, params, renders]);
  useEffect(() => { saveProject(); }, [params, projectName, renders, saveProject]);

  const createNewProject = useCallback(() => {
    const id = Date.now().toString();
    setAllProjects(prev => {
      const next = { ...prev, [id]: { name: DEFAULT_PROJECT_NAME, data: defaultParams, renders: [] } };
      localStorage.setItem("archapp_all_projects", JSON.stringify(next));
      return next;
    });
    setCurrentProjectId(id);
    setProjectName(DEFAULT_PROJECT_NAME);
    setParams(defaultParams);
    setRenders([]);
  }, [defaultParams]);

  const switchProject = useCallback((id) => {
    setCurrentProjectId(id);
    setAllProjects(prev => {
      const proj = prev[id];
      if (proj) {
        setParams(proj.data);
        setRenders(proj.renders || []);
        setProjectName(proj.name);
      }
      return prev;
    });
  }, []);

  const deleteProject = useCallback((id) => {
    setAllProjects(prev => {
      const keys = Object.keys(prev);
      if (keys.length <= 1) return prev;
      const next = { ...prev };
      delete next[id];
      localStorage.setItem("archapp_all_projects", JSON.stringify(next));
      if (id === currentProjectId) {
        const nextId = Object.keys(next)[0];
        const proj = next[nextId];
        setCurrentProjectId(nextId);
        if (proj) {
          setParams(proj.data);
          setRenders(proj.renders || []);
          setProjectName(proj.name);
        }
      }
      return next;
    });
  }, [currentProjectId]);

  const generateImages = async () => { setGenerating(true); const newRenders = prompts.map(p => ({ ...p, url: `https://dummyimage.com/1280x720/edf2f7/1f2937&text=${encodeURIComponent(p.goal)}`, id: Math.random() })); setTimeout(() => { setRenders(newRenders); setGenerating(false); }, 1200); };

  const exportPDF = useCallback(async () => { alert('Экспорт PDF (демо-версия)'); }, []);
  const exportDXF = useCallback(() => { alert('Экспорт DXF (демо-версия)'); }, []);
  const exportGLTF = useCallback(async () => { alert('Экспорт GLTF (демо-версия)'); }, []);

  useEffect(() => {
    try {
      console.assert(footprintPoints(10,10,"Прямоугольник",{}).length===4, "TEST: rect");
      console.assert(footprintPoints(10,10,"Произвольный многоугольник",{polyStr:"0,0;10,0;10,10"}).length===3, "TEST: poly parse");
      console.assert(Array.isArray(prompts) && prompts.length===5 && typeof prompts[0].prompt==="string", "TEST: prompts");
    } catch(e) { console.warn("tests", e); }
  }, [prompts]);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${isDark ? 'from-slate-900 via-slate-800 to-slate-900' : 'from-slate-100 via-blue-50 to-indigo-100'} text-slate-900 dark:text-white transition-colors duration-300`}>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3"><FiLayers className="w-8 h-8 text-indigo-600 dark:text-indigo-400" /><div>
            <input value={projectName} onChange={e=>setProjectName(e.target.value)} className="text-lg font-bold bg-transparent border-b border-transparent hover:border-slate-400 focus:border-indigo-500 outline-none transition"/>
            <div className="text-xs text-slate-500 dark:text-slate-400">AI-концепт-дизайн | Версия 2.0</div>
          </div></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">{isDark ? <FiSun /> : <FiMoon />}</button>
            <button onClick={generateImages} disabled={generating} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60">{generating ? "Генерация..." : <><HiOutlinePhotograph /> Генерировать рендеры</>}</button>
            <div className="relative group"><button className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"><FiDownload /></button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 hidden group-hover:block">
                <button onClick={exportPDF} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"><FiDownload /> PDF</button>
                <button onClick={exportDXF} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"><FiDownload /> DXF</button>
                <button onClick={exportGLTF} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"><FiDownload /> GLTF</button>
              </div>
            </div>
            {user ? <UserProfile user={user} logout={logout} /> : <LoginButton onLogin={handleLogin} />}
          </div>
        </div>
      </header>
      <aside className="fixed left-0 top-20 bottom-0 w-64 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Мои проекты</h3><button onClick={createNewProject} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Новый проект"><FiFolder /></button></div>
        <ul className="space-y-2">{Object.entries(allProjects).map(([id, proj]) => (
          <li key={id} className={`p-3 rounded-xl cursor-pointer flex items-center justify-between group text-sm ${id === currentProjectId ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`} onClick={() => switchProject(id)}>
            <span className="font-medium">{proj.name}</span>
            <button onClick={(e) => {e.stopPropagation(); deleteProject(id);}} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><FiTrash2 /></button>
          </li>
        ))}</ul>
      </aside>
      <main className="max-w-5xl mx-auto px-4 py-6 ml-72">
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard icon={<FiMaximize2 />} label="Площадь участка" value={farea(stats.plotArea)} />
          <StatCard icon={<FiGrid />} label="Площадь застройки" value={farea(stats.buildingArea)} />
          <StatCard icon={<HiOutlineCube />} label="Объем здания" value={`${Number(stats.volume).toFixed(0)} м³`} />
          <StatCard icon={<FiCheckCircle />} label="Этажность" value={`${params.floors} × ${params.floorHeight} м`} />
          <StatCard icon={<FiAlertCircle />} label="Оценочная стоимость" value={`${Number(stats.estimatedCost / 1000000).toFixed(1)} млн ₽`} />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Section title="Параметры проекта" icon={<FiSettings />}>
              <div className="grid grid-cols-2 gap-4 text-sm space-y-2">
                <label className="flex flex-col"><span className="text-slate-600 dark:text-slate-400">Назначение</span><select className="input" value={params.buildingType} onChange={e=>updateParam('buildingType', e.target.value)}>{Object.keys(TYPE_PRESETS).map(k=><option key={k}>{k}</option>)}</select></label>
                <label className="flex flex-col"><span className="text-slate-600 dark:text-slate-400">Форма здания</span><select className="input" value={params.shapeType} onChange={e=>updateParam('shapeType', e.target.value)}>{["Прямоугольник","Эллипс","Круг","L‑образный","U‑образный","T‑образный","Треугольник","Произвольный многоугольник"].map(k=><option key={k}>{k}</option>)}</select></label>
                <label className="flex flex-col"><span className="text-slate-600 dark:text-slate-400">Ширина участка (м)</span><input className="input" type="number" step="0.1" value={params.plot.width} onChange={e=>updateNestedParam('plot', 'width', +e.target.value)}/></label>
                <label className="flex flex-col"><span className="text-slate-600 dark:text-slate-400">Длина участка (м)</span><input className="input" type="number" step="0.1" value={params.plot.height} onChange={e=>updateNestedParam('plot', 'height', +e.target.value)}/></label>
                <label className="flex flex-col"><span className="text-slate-600 dark:text-slate-400">Ширина здания (м)</span><input className="input" type="number" step="0.1" value={params.house.width} onChange={e=>updateNestedParam('house', 'width', +e.target.value)}/></label>
                <label className="flex flex-col"><span className="text-slate-600 dark:text-slate-400">Длина здания (м)</span><input className="input" type="number" step="0.1" value={params.house.height} onChange={e=>updateNestedParam('house', 'height', +e.target.value)}/></label>
              </div>
              {validation.length > 0 && <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">{validation.map((e, i) => <div key={i}>⚠ {e}</div>)}</div>}
            </Section>
            <Section title="Промты для генерации" icon={<HiOutlinePencil />}>{prompts.map((p,i)=>(<div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"><div className="font-semibold mb-1">{p.goal}</div><div className="text-slate-600 dark:text-slate-400">{p.prompt.slice(0,120)}...</div></div>))}</Section>
          </div>
          <div className="space-y-6">
            <Section title="2D-План" icon={<FiGrid />}><div className="w-full h-64 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500">Здесь будет 2D SVG план</div></Section>
            <Section title="3D-Предпросмотр" icon={<HiOutlineCube />}><div ref={threeMountRef} className="w-full h-64 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500">Здесь будет 3D сцена</div></Section>
          </div>
        </div>
        {renders.length > 0 && (
          <Section title="Галерея рендеров" icon={<HiOutlinePhotograph />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{renders.map(r=>(<img key={r.id} src={r.url} alt={r.goal} className="rounded-lg w-full h-auto object-cover shadow-md"/>))}</div>
          </Section>
        )}
      </main>
    </div>
  );
}
