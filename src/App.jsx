import { useState, useEffect, useRef, useCallback } from "react";

// Route through our server-side proxy so the API key stays secret
const ANTHROPIC_API = "/api/claude";

const callClaude = async (messages, system = "", maxTokens = 1200) => {
  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.content?.[0]?.text || "";
};

const callClaudeFast = async (messages, system = "") => {
  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, system, messages }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  if (!data.content) throw new Error("No content in response: " + JSON.stringify(data).slice(0, 200));
  return data.content[0]?.text || "";
};

// Extract JSON array or object from a response that may have extra prose around it
const extractJSON = (s) => {
  // Find the first [ or { and the matching last ] or }
  const arrStart = s.indexOf("[");
  const objStart = s.indexOf("{");
  if (arrStart === -1 && objStart === -1) return null;
  // Prefer array if it comes first
  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    const end = s.lastIndexOf("]");
    if (end > arrStart) return s.slice(arrStart, end + 1);
  }
  const end = s.lastIndexOf("}");
  if (end > objStart) return s.slice(objStart, end + 1);
  return null;
};

const parsePartialMeals = (text) => {
  const extracted = extractJSON(text);
  if (!extracted) return [];
  try { 
    const parsed = JSON.parse(extracted);
    return Array.isArray(parsed) ? parsed : [];
  } catch {}
  // Fallback: extract complete {...} objects one by one
  const results = [];
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") { if (depth === 0) start = i; depth++; }
    else if (text[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { results.push(JSON.parse(text.slice(start, i + 1))); } catch {}
        start = -1;
      }
    }
  }
  return results;
};

// Safe JSON parse with extraction
const safeParseJSON = (raw) => {
  const extracted = extractJSON(raw);
  if (!extracted) throw new Error("Invalid response format");
  try { return JSON.parse(extracted); }
  catch(e) { throw new Error("Could not parse response: " + e.message); }
};

function GenieLogo({size=56}) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
    <ellipse cx="28" cy="11" rx="9" ry="9" fill="#F9D262"/>
    <path d="M34 8 Q44 4 46 10 Q48 16 40 16 Q36 15 34 13Z" fill="#F9D262"/>
    <rect x="32" y="9" width="5" height="3" rx="1.5" fill="#E91E8C"/>
    <ellipse cx="28" cy="13" rx="7.5" ry="8" fill="#FCDDB0"/>
    <ellipse cx="25" cy="12" rx="1.2" ry="1.4" fill="#3B2A1A"/>
    <ellipse cx="31" cy="12" rx="1.2" ry="1.4" fill="#3B2A1A"/>
    <circle cx="25.6" cy="11.4" r="0.4" fill="white"/>
    <circle cx="31.6" cy="11.4" r="0.4" fill="white"/>
    <path d="M23.5 10 Q25 9.2 26.5 10" stroke="#C8860A" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
    <path d="M29.5 10 Q31 9.2 32.5 10" stroke="#C8860A" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
    <path d="M27.5 14 Q28 15 28.5 14" stroke="#D4956A" strokeWidth="0.7" strokeLinecap="round" fill="none"/>
    <path d="M25.5 16.5 Q28 18.5 30.5 16.5" stroke="#C0724A" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
    <path d="M25.5 16.5 Q28 17.8 30.5 16.5" fill="#E8735A" opacity="0.6"/>
    <rect x="25.5" y="20" width="5" height="5" rx="2" fill="#FCDDB0"/>
    <path d="M18 25 Q21 22 28 22 Q35 22 38 25 L37 35 Q28 37 19 35Z" fill="#E91E8C"/>
    <path d="M18 25 Q21 22 28 22 Q35 22 38 25" stroke="#FFD700" strokeWidth="1.2" fill="none"/>

    <path d="M19 28 Q22 26 26 29 Q29 31 32 30" stroke="#FCDDB0" strokeWidth="4" strokeLinecap="round" fill="none"/>
    <path d="M37 28 Q34 26 30 29 Q27 31 24 30" stroke="#FCDDB0" strokeWidth="4" strokeLinecap="round" fill="none"/>
    <circle cx="32.5" cy="30" r="2.5" fill="#FCDDB0"/>
    <circle cx="23.5" cy="30" r="2.5" fill="#FCDDB0"/>
    <path d="M19 35 Q16 42 17 50 Q22 52 28 51 Q34 52 39 50 Q40 42 37 35 Q28 38 19 35Z" fill="#E91E8C"/>
    <path d="M21 38 Q24 37 27 39" stroke="#FF69B4" strokeWidth="1" opacity="0.6" fill="none"/>
    <path d="M29 39 Q32 37 35 38" stroke="#FF69B4" strokeWidth="1" opacity="0.6" fill="none"/>
    <ellipse cx="28" cy="35.5" rx="10" ry="2" fill="#FFD700"/>
    <circle cx="28" cy="35.5" r="2" fill="#FFA500"/>
    <circle cx="21" cy="35.5" r="1.2" fill="#FFA500"/>
    <circle cx="35" cy="35.5" r="1.2" fill="#FFA500"/>
    <path d="M19 50 Q15 52 16 54 Q19 56 22 53Z" fill="#E91E8C"/>
    <path d="M37 50 Q41 52 40 54 Q37 56 34 53Z" fill="#E91E8C"/>
    <path d="M15.5 53 Q16 55.5 18 54" stroke="#FFD700" strokeWidth="0.8" fill="none"/>
    <path d="M40.5 53 Q40 55.5 38 54" stroke="#FFD700" strokeWidth="0.8" fill="none"/>
    <path d="M12 20 L13 18 L14 20 L13 22Z" fill="#FFD700"/>
    <path d="M42 15 L43 13 L44 15 L43 17Z" fill="#FFD700"/>
    <path d="M44 38 L45 36 L46 38 L45 40Z" fill="#FF69B4"/>
  </svg>
  );
}

const STORAGE_KEY = "genie_v2";
const loadStorage = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } };
const saveStorage = (data) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} };

// ── Constants ──────────────────────────────────────────────────────────────
const EXPERTISE_LEVELS = [
  { id: "beginner",     label: "Home Cook",     icon: "🥄", desc: "Simple recipes, 30 min or less" },
  { id: "intermediate", label: "Confident Cook", icon: "🍳", desc: "Most techniques, up to 1 hour" },
  { id: "advanced",     label: "Skilled Cook",   icon: "👨‍🍳", desc: "Multi-step, specialty techniques, 1–2 hrs" },
  { id: "expert",       label: "Home Chef",      icon: "⭐", desc: "Restaurant-quality, no limits" },
];
const CUISINE_TYPES = ["American","Italian","Mexican","Asian","Mediterranean","Indian","Japanese","Middle Eastern","French","Thai","Greek","Korean","Latin American","Comfort Food"];
const DIETARY_OPTIONS = ["No Pork","Vegetarian","Vegan","Gluten-Free","Dairy-Free","Nut-Free","Shellfish-Free","Egg-Free","Soy-Free","Low-Carb","Kosher","Halal"];
const FOOD_CATS = [
  { id: "proteins", label: "Proteins",       options: ["Chicken","Beef","Fish","Shrimp","Lamb","Turkey","Plant-based"] },
  { id: "veggies",  label: "Vegetables",     options: ["Broccoli","Asparagus","Zucchini","Spinach","Mushrooms","Bell Peppers","Sweet Potato","Cauliflower","Kale","Brussels Sprouts","Green Beans","Artichoke","Eggplant","Tomatoes","Corn","Peas","Leeks","Bok Choy"] },
  { id: "salads",   label: "Salads",         options: ["Caesar","Greek","Arugula","Caprese","Nicoise","Cobb","Chopped","Asian Slaw","Kale & Quinoa","Wedge","Fattoush","Panzanella"] },
  { id: "grains",   label: "Grains & Sides", options: ["Rice","Pasta","Quinoa","Potatoes","Polenta","Couscous","Lentils"] },
];
const KIDS_BREAKFAST_OPTIONS = {
  "🍓 Fruits":          ["Bananas","Strawberries","Blueberries","Apples","Grapes","Mango","Pineapple","Watermelon","Raspberries","Blackberries","Peaches","Cherries","Kiwi","Clementines","Cantaloupe","Honeydew"],
  "🥞 Breakfast Foods": ["Waffles","Pancakes","Bubble Pancakes","French Toast","Eggs","Avocado Toast","Yogurt Parfait","Oatmeal"],
  "🍞 Breads":          ["Whole Wheat Bread","Sourdough","English Muffins","Bagels","Brioche","Croissants","Pita"],
  "🧃 Snacks":          ["Yogurt","Granola Bars","String Cheese","Hummus & Crackers","Apple Slices & PB","Oatmeal Packets"],
};
// On mobile, amazon:// deep link opens the Amazon app directly to Whole Foods search
const wholeFoodsItemUrl = (item) => {
  const query = encodeURIComponent(item + " whole foods");
  // amazon:// scheme opens the app on iOS/Android; falls back to web on desktop
  return `https://www.amazon.com/s?k=${encodeURIComponent(item)}&i=wholefoods`;
};
const wholeFoodsAppUrl = (item) => `amazon://search?phrase=${encodeURIComponent(item)}&node=wholefoods`;

// ── Theme ──────────────────────────────────────────────────────────────────
const t = {
  bg:"#FDFAF5", card:"#FFFFFF",
  accent:"#2D6A4F", accentLight:"#52B788", accentPale:"#D8F3DC",
  warm:"#F4A261", warmLight:"#FDEBD0",
  text:"#1B2A1F", muted:"#6B7C72", border:"#E0EBE4",
  red:"#c0392b", redPale:"#fdecea",
  purple:"#6C63FF", purplePale:"#EEEEFF",
};

// ── UI Primitives ──────────────────────────────────────────────────────────
function Tag({ label, selected, onClick, colorScheme = "green" }) {
  const s = { green:{border:t.accent,bg:t.accentPale,color:t.accent}, red:{border:t.red,bg:t.redPale,color:t.red}, warm:{border:t.warm,bg:t.warmLight,color:"#7d4c00"} }[colorScheme];
  return <button onClick={onClick} style={{ padding:"8px 16px", borderRadius:40, border:`2px solid ${selected?s.border:t.border}`, background:selected?s.bg:t.card, color:selected?s.color:t.muted, fontFamily:"'Lora',serif", fontSize:14, fontWeight:selected?700:400, cursor:"pointer", transition:"all 0.18s ease" }}>{label}</button>;
}

function Card({ children, style }) {
  return <div style={{ background:t.card, borderRadius:20, border:`1.5px solid ${t.border}`, padding:"22px 26px", boxShadow:"0 4px 24px rgba(45,106,79,0.07)", ...style }}>{children}</div>;
}

function Btn({ children, onClick, variant="primary", disabled, style }) {
  const base = { padding:"12px 26px", borderRadius:50, border:"none", fontFamily:"'Lora',serif", fontSize:15, fontWeight:700, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1, transition:"all 0.18s ease", ...style };
  const v = { primary:{background:t.accent,color:"#fff"}, secondary:{background:"transparent",color:t.accent,border:`2px solid ${t.accent}`}, warm:{background:t.warm,color:"#fff"}, ghost:{background:t.accentPale,color:t.accent}, purple:{background:t.purple,color:"#fff"} }[variant];
  return <button onClick={onClick} disabled={disabled} style={{...base,...v}}>{children}</button>;
}

function Stars({ value, onChange }) {
  return <div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(n=><span key={n} onClick={()=>onChange(n)} style={{fontSize:26,cursor:"pointer",color:n<=value?t.warm:t.border,transition:"color 0.1s"}}>★</span>)}</div>;
}

function Spinner({ label }) {
  return (
    <div style={{textAlign:"center",padding:"40px 0"}}>
      <div style={{fontSize:34,marginBottom:10}}>✨</div>
      <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:14}}>{label}</p>
      <div style={{display:"flex",gap:8,justifyContent:"center"}}>
        {[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:t.accentLight,animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}} />)}
      </div>

    </div>
  );
}

function Notice({ icon, children, color="warm" }) {
  const c = color==="green" ? {bg:t.accentPale,border:t.accentLight,text:t.accent} : {bg:t.warmLight,border:t.warm,text:"#7d4c00"};
  return <div style={{background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:14,padding:"12px 16px",marginBottom:16}}><p style={{margin:0,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:c.text}}>{icon} {children}</p></div>;
}

// Custom add-item input for tag groups
function AddCustomItem({ onAdd, placeholder = "Add your own…" }) {
  const [val, setVal] = useState("");
  const submit = () => { const v = val.trim(); if (v) { onAdd(v); setVal(""); } };
  return (
    <div style={{display:"flex",gap:8,marginTop:10}}>
      <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={placeholder}
        style={{flex:1,padding:"8px 14px",borderRadius:30,border:`1.5px solid ${t.border}`,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:t.text,outline:"none",background:t.bg}} />
      <button onClick={submit} style={{padding:"8px 16px",borderRadius:30,background:t.accent,color:"#fff",border:"none",fontFamily:"'Lora',serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>+ Add</button>
    </div>
  );
}

const STEP_IDX = { expertise:0, preferences:1, foods:2, breakfast:3, mealcount:4, inspire:5, plan:6, review:7, nanny:8, feedback:9, done:10 };
function Progress({ step }) {
  const cur = STEP_IDX[step] ?? 0; const total = 10;
  return <div style={{display:"flex",gap:4,alignItems:"center"}}>{Array.from({length:total}).map((_,i)=><div key={i} style={{width:i<cur?16:8,height:8,borderRadius:4,background:i<cur?t.accentLight:i===cur?"#fff":"rgba(255,255,255,0.3)",transition:"all 0.3s ease"}} />)}</div>;
}

const sectionLabel = (k) => ({"produce":"🥦 Produce","meat_seafood":"🥩 Meat & Seafood","dairy":"🧀 Dairy","pantry":"🫙 Pantry & Dry Goods","bakery":"🥖 Bakery","kids_breakfast":"🍓 Breakfast & Snacks"}[k] || k.replace(/_/g," "));

// ── Print/Export helpers ───────────────────────────────────────────────────
function buildPrintHTML(meals, groceryList, chefInstructions, kidsBreakfast) {
  const mealRows = meals.map(m=>`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">${m.day}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${m.emoji||"🍽️"} ${m.name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#666">${m.prepTime}</td></tr>`).join("");
  const grocerySections = groceryList ? Object.entries(groceryList).map(([s,items])=>Array.isArray(items)&&items.length?`<div style="margin-bottom:16px"><strong style="color:#2D6A4F">${sectionLabel(s)}</strong><div style="margin-top:6px">${items.map(i=>`<span style="display:inline-block;margin:3px 4px;padding:3px 10px;background:#D8F3DC;border-radius:20px;font-size:13px">${i}</span>`).join("")}</div></div>`:"").join("") : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Genie Weekly Plan</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1B2A1F}h1{color:#2D6A4F}h2{color:#2D6A4F;margin-top:32px;border-bottom:2px solid #D8F3DC;padding-bottom:8px}table{width:100%;border-collapse:collapse}@media print{body{margin:20px}}</style></head><body>
<h1>✨ Genie Weekly Meal Plan</h1>
<h2>This Week's Dinners</h2>
<table>${mealRows}</table>
<h2>Grocery List</h2>${grocerySections}
${kidsBreakfast?.length?`<h2>Breakfast & Snacks</h2><div>${kidsBreakfast.map(i=>`<span style="display:inline-block;margin:3px 4px;padding:3px 10px;background:#FDEBD0;border-radius:20px;font-size:13px">${i}</span>`).join("")}</div>`:""}
<h2>Chef Instructions</h2><div style="white-space:pre-wrap;background:#f9f9f9;padding:20px;border-radius:12px;font-size:15px;line-height:1.8">${chefInstructions}</div>
</body></html>`;
}

function buildSkylightEmail(meals, kidsBreakfast) {
  const lines = meals.map(m=>`${m.day}: ${m.emoji||"🍽️"} ${m.name} (${m.prepTime})`).join("\n");
  const bfast = kidsBreakfast?.length ? `\n\nBreakfast & Snacks: ${kidsBreakfast.join(", ")}` : "";
  return `This Week's Meal Plan:\n\n${lines}${bfast}`;
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function Genie() {
  const [step, setStepRaw]                    = useState("expertise");
  const setStep = useCallback((s) => { setStepRaw(s); window.scrollTo({top:0,behavior:"instant"}); }, []);
  const [profile, setProfile]                 = useState({ expertise:null, cuisines:[], dietary:[], foods:{}, mealCount:5, kidsBreakfast:[], customFoods:{}, customBreakfast:[] });
  const [recipeLibrary, setRecipeLibrary]     = useState([]);
  const [savedCustomFoods, setSavedCustomFoods]         = useState({}); // persisted across weeks
  const [savedCustomBreakfast, setSavedCustomBreakfast] = useState([]); // [{name, source, url, notes, emoji}]
  const [newRecipe, setNewRecipe]             = useState({ name:"", source:"", url:"", notes:"" });
  const [suggestions, setSuggestions]         = useState([]);
  const [inspirationError, setInspirationError] = useState("");
  const [loadingS, setLoadingS]               = useState(false);
  const [meals, setMeals]                     = useState([]);
  const [loadingM, setLoadingM]               = useState(false);
  const [approvedMeals, setApprovedMeals]     = useState([]);
  const [swappingIdx, setSwappingIdx]         = useState(null);
  const [groceryList, setGroceryList]         = useState(null);
  const [loadingG, setLoadingG]               = useState(false);
  const [chefInstructions, setChefInstructions]             = useState("");
  const [loadingN, setLoadingN]               = useState(false);
  const [feedback, setFeedback]               = useState({});
  const [rotation, setRotation]               = useState([]);
  const [pastWeekMeals, setPastWeekMeals]     = useState([]);
  const [profileSaved, setProfileSaved]       = useState(false);
  const [exportTab, setExportTab]             = useState("text");
  const [weekSummary, setWeekSummary]         = useState(null);
  const [loadingWS, setLoadingWS]             = useState(false);
  const [showSummary, setShowSummary]         = useState(false);
  const [groceryChecked, setGroceryChecked]   = useState({});
  const [skylightEmail, setSkylightEmail]     = useState("");
  const printRef = useRef();

  useEffect(() => {
    const s = loadStorage();
    if (s.rotation)      setRotation(s.rotation);
    if (s.pastWeekMeals) setPastWeekMeals(s.pastWeekMeals);
    if (s.recipeLibrary) setRecipeLibrary(s.recipeLibrary);
    if (s.savedCustomFoods)    setSavedCustomFoods(s.savedCustomFoods);
    if (s.savedCustomBreakfast) setSavedCustomBreakfast(s.savedCustomBreakfast);
    if (s.profile) { setProfile(p=>({...p,...s.profile})); setProfileSaved(true); }
  }, []);

  const persist = (u) => saveStorage({...loadStorage(),...u});
  const toggleArr = (arr,val) => arr.includes(val)?arr.filter(x=>x!==val):[...arr,val];
  const toggleFood = (cat,val) => { const cur=profile.foods[cat]||[]; setProfile(p=>({...p,foods:{...p.foods,[cat]:toggleArr(cur,val)}})); };

  const addCustomItem = (key, val) => {
    setProfile(p=>({ ...p, customFoods:{ ...p.customFoods, [key]:[...(p.customFoods[key]||[]), val] } }));
    setSavedCustomFoods(prev => {
      const updated = { ...prev, [key]: [...new Set([...(prev[key]||[]), val])] };
      persist({ savedCustomFoods: updated });
      return updated;
    });
  };
  const addCustomBreakfast = (val) => {
    setProfile(p=>({...p, customBreakfast:[...(p.customBreakfast||[]), val]}));
    setSavedCustomBreakfast(prev => {
      const updated = [...new Set([...prev, val])];
      persist({ savedCustomBreakfast: updated });
      return updated;
    });
  };

  // ── Recipe library ──
  const saveRecipe = () => {
    if (!newRecipe.name.trim()) return;
    const entry = { ...newRecipe, emoji: "📖", id: Date.now() };
    const updated = [...recipeLibrary, entry];
    setRecipeLibrary(updated);
    persist({ recipeLibrary: updated });
    setNewRecipe({ name:"", source:"", url:"", notes:"" });
  };
  const removeRecipe = (id) => {
    const updated = recipeLibrary.filter(r=>r.id!==id);
    setRecipeLibrary(updated);
    persist({ recipeLibrary: updated });
  };

  // ── AI calls ──
  const fetchSuggestions = async (keepLiked = []) => {
    setLoadingS(true); setInspirationError("");
    const rotFavs = rotation.filter(r=>r.inRotation&&r.rating>=4).map(r=>r.name).join(", ");
    const libNames = recipeLibrary.map(r=>r.name).join(", ");
    const allProteins = [...(profile.foods.proteins||[]), ...(profile.customFoods.proteins||[])];
    const allVeggies  = [...(profile.foods.veggies||[]),  ...(profile.customFoods.veggies||[])];
    const allGrains   = [...(profile.foods.grains||[]),   ...(profile.customFoods.grains||[])];
    const alreadySeen = [...pastWeekMeals.map(m=>m.name), ...keepLiked.map(m=>m.name)];
    const system = `You are a meal planning assistant. Return ONLY a valid JSON array of exactly 10 dinner idea objects: [{"name":"...","description":"5 words max","emoji":"...","difficulty":"..."},...]. No markdown, no explanation.`;
    const msg = `Profile: expertise=${profile.expertise}, cuisines=${profile.cuisines.join(",")}, dietary=${profile.dietary.join(",")||"none"}, proteins=${allProteins.join(",")}, veggies=${allVeggies.join(",")}, grains=${allGrains.join(",")}. Rotation favorites: ${rotFavs||"none"}. Do NOT suggest any of these: ${alreadySeen.join(", ")||"none"}. Known family recipes to possibly include: ${libNames||"none"}. Return 10 diverse dinners for a ${profile.expertise} cook.`;
    try {
      const raw = await callClaudeFast([{role:"user",content:msg}], system);
      const parsed = parsePartialMeals(raw);
      if (parsed.length > 0) {
        // Put liked items first (pinned), then new suggestions
        setSuggestions([...keepLiked, ...parsed]);
      } else setInspirationError("No meals returned — tap Try Again.");
    } catch(e) {
      setInspirationError(e.message || "Unknown error");
    }
    setLoadingS(false);
  };

  const getInspirations = async () => {
    setSuggestions([]); setStep("inspire");
    persist({ profile:{ expertise:profile.expertise, cuisines:profile.cuisines, dietary:profile.dietary, foods:profile.foods } });
    setProfileSaved(true);
    await fetchSuggestions([]);
  };

  const refreshInspirations = async () => {
    const liked = suggestions.filter(s=>s.liked);
    await fetchSuggestions(liked);
  };

  const buildMealPlan = async () => {
    setLoadingM(true); setStep("plan");
    const liked = suggestions.filter(s=>s.liked).map(s=>s.name);
    const rotFavs = rotation.filter(r=>r.inRotation&&r.rating>=4).map(r=>r.name);
    const libNames = recipeLibrary.map(r=>r.name);
    const system = `You are a meal planning assistant. Return ONLY a JSON array: [{name,day,description,ingredients,prepTime,emoji}]. No markdown.`;
    const msg = `Create exactly ${profile.mealCount} dinners. Liked: ${liked.join(",")||"none"}. Family favorites: ${rotFavs.join(",")||"none"}. Known family recipes to potentially include: ${libNames.join(",")||"none"}. Profile: expertise=${profile.expertise}, dietary=${profile.dietary.join(",")||"none"}, cuisines=${profile.cuisines.join(",")}. Assign different weekdays. Include variety.`;
    const raw = await callClaude([{role:"user",content:msg}], system, 1500);
    try {
      const p=safeParseJSON(raw);
      setMeals(p); setApprovedMeals(p.map(()=>true));
      setWeekSummary(null); setShowSummary(false);
      buildWeekSummary(p);
    } catch { setMeals([]); }
    setLoadingM(false);
  };

  const buildWeekSummary = async (currentMeals) => {
    setLoadingWS(true); setShowSummary(true);
    const approved = currentMeals.map(m=>m.name);
    const system = `You are a concise nutrition and meal planning expert. Return ONLY valid JSON — no markdown, no explanation. Every string value must be SHORT (under 12 words). Arrays must have 2-4 items max.
Return this exact structure:
{
  "scores": {"protein":0-10,"vegetables":0-10,"variety":0-10,"balance":0-10,"fiber":0-10},
  "vsRecommended": [{"nutrient":"string","status":"good|low|high","note":"under 10 words"}],
  "takeaways": ["string max 10 words","string","string","string"],
  "tastebuds": ["string max 10 words","string","string"],
  "swapSuggestion": {"remove":"mealName","replaceWith":"specific meal name","reason":"under 10 words"}
}`;
    const msg = `Meals this week: ${approved.join(", ")}. Prior week: ${pastWeekMeals.map(m=>m.name).join(", ")||"none"}. Dietary: ${profile.dietary.join(",")||"none"}. Analyze vs a balanced weekly diet (USDA guidelines: 5-6 servings vegetables, 2-3 protein sources, whole grains, healthy fats, fiber). Be crisp.`;
    try {
      const raw = await callClaude([{role:"user",content:msg}], system, 700);
      const parsed=safeParseJSON(raw);
      setWeekSummary(parsed);
    } catch { setWeekSummary(null); }
    setLoadingWS(false);
  };

  const swapMeal = async (idx) => {
    setSwappingIdx(idx);
    const cur = meals[idx];
    const others = meals.filter((_,i)=>i!==idx).map(m=>m.name);
    const system = `Return ONLY a single JSON object: {name,day,description,ingredients,prepTime,emoji}. No markdown.`;
    const msg = `Replace "${cur.name}" for ${cur.day}. Cook: ${profile.expertise}. Dietary: ${profile.dietary.join(",")||"none"}. Cuisines: ${profile.cuisines.join(",")}. Week already has: ${others.join(", ")}. Pick something different in cuisine and protein.`;
    const raw = await callClaude([{role:"user",content:msg}], system);
    let newMeals = meals;
    try {
      const nm=safeParseJSON(raw);
      newMeals = meals.map((m,i)=>i===idx?{...nm,day:cur.day}:m);
      setMeals(newMeals);
    } catch {}
    setSwappingIdx(null);
    return newMeals;
  };

  // Insert a specific named meal (used by Health summary swap suggestion)
  const insertSpecificMeal = async (idx, mealName) => {
    setSwappingIdx(idx);
    const cur = meals[idx];
    const system = `Return ONLY a single JSON object: {name,day,description,ingredients,prepTime,emoji}. No markdown.`;
    const msg = `Build a meal plan entry for "${mealName}" on ${cur.day}. Cook level: ${profile.expertise}. Dietary: ${profile.dietary.join(",") || "none"}. Return the object with name="${mealName}" exactly as given.`;
    const raw = await callClaude([{role:"user",content:msg}], system);
    let newMeals = meals;
    try {
      const nm = safeParseJSON(raw);
      // Force the name to be exactly what was suggested, not whatever Claude returned
      newMeals = meals.map((m,i) => i===idx ? {...nm, name: mealName, day: cur.day} : m);
      setMeals(newMeals);
    } catch {}
    setSwappingIdx(null);
    return newMeals;
  };

  const buildGroceryList = async () => {
    setLoadingG(true); setGroceryChecked({});
    const approved = meals.filter((_,i)=>approvedMeals[i]);
    const allBreakfast = [...(profile.kidsBreakfast||[]), ...(profile.customBreakfast||[])];
    const bfHint = allBreakfast.length ? allBreakfast.join(", ") : "seasonal fruits, whole grain bread, healthy snacks";
    const system = `You are a grocery list assistant. Return ONLY valid JSON — no markdown. Return an object where each key is a meal name (exact), and the value is an array of ingredient strings needed for that meal. Add one final key called "Breakfast & Snacks" with the breakfast/snack items as an array. Keep ingredient strings short (e.g. "chicken thighs", "garlic", "olive oil"). Do not duplicate items across meals.`;
    const msg = `Build a per-meal grocery list for these dinners: ${approved.map(m=>`${m.name} (${m.day})`).join(", ")}. Dietary: ${profile.dietary.join(",")||"none"}. Also add "Breakfast & Snacks" key with: ${bfHint}.`;
    const raw = await callClaude([{role:"user",content:msg}], system, 1400);
    try { setGroceryList(safeParseJSON(raw)); } catch { setGroceryList({}); }
    setLoadingG(false);
  };

  const buildChefInstructions = async () => {
    setLoadingN(true);
    const approved = meals.filter((_,i)=>approvedMeals[i]);
    const allBreakfast = [...(profile.kidsBreakfast||[]), ...(profile.customBreakfast||[])];
    const bfItems = allBreakfast.length ? allBreakfast.join(", ") : "seasonal fruits, whole grain bread, and healthy snacks";
    const recipeDetails = approved.map(m=>{
      const lib = recipeLibrary.find(r=>r.name===m.name);
      return lib
        ? `${m.day} — ${m.name}${lib.url ? ` [recipe: ${lib.url}]` : ""}${lib.notes ? ` (note: ${lib.notes})` : ""}: use the linked recipe`
        : `${m.day} — ${m.name} (${m.prepTime})`;
    }).join("\n");
    const system = `You are writing concise chef instructions for a home cook. Use plain text only — no markdown, no asterisks. For each meal: one header line (DAY — MEAL NAME — total time), then 4-6 numbered steps covering key techniques, temperatures, and timing. Keep each meal under 120 words. End with a brief breakfast/snacks note and a one-line groceries note.`;
    const msg = `Write chef instructions for a ${profile.expertise}-level cook. Meals this week:\n${recipeDetails}\n\nAfter all meals add: "Breakfast & Snacks: ${bfItems}"\nEnd with: "Groceries arriving from Whole Foods pickup — let us know if anything is missing."\nDietary restrictions: ${profile.dietary.join(", ") || "none"}.\nBe concise — cover every meal but keep each one brief.`;
    const text = await callClaude([{role:"user",content:msg}], system, 3000);
    setChefInstructions(text);
    setLoadingN(false);
    setStep("nanny");
  };

  const submitFeedback = () => {
    const updated = [...rotation];
    pastWeekMeals.forEach((meal,i)=>{
      const fb=feedback[i]||{};
      const entry={name:meal.name,rating:fb.taste||0,difficultyOk:fb.difficulty||0,inRotation:fb.keepInRotation===true};
      const ex=updated.findIndex(r=>r.name===meal.name);
      if (ex>=0) updated[ex]=entry; else updated.push(entry);
    });
    setRotation(updated); persist({rotation:updated}); setStep("done");
  };

  const finishWeek = () => {
    const approved=meals.filter((_,i)=>approvedMeals[i]);
    const newPast=approved.map(m=>({name:m.name,date:"Last week"}));
    setPastWeekMeals(newPast); persist({pastWeekMeals:newPast});
    setStep("expertise");
    setMeals([]); setApprovedMeals([]); setSuggestions([]);
    setGroceryList(null); setChefInstructions(""); setFeedback({}); setWeekSummary(null); setShowSummary(false); setGroceryChecked({});
    setProfile(p=>({...p,mealCount:5,kidsBreakfast:[],customBreakfast:[]}));
  };

  const doPrint = () => {
    const approved=meals.filter((_,i)=>approvedMeals[i]);
    const allBreakfast=[...(profile.kidsBreakfast||[]),...(profile.customBreakfast||[])];
    const w=window.open("","_blank");
    w.document.write(buildPrintHTML(approved,groceryList,chefInstructions,allBreakfast));
    w.document.close(); w.focus(); w.print();
  };

  const doSkylightEmail = () => {
    const approved=meals.filter((_,i)=>approvedMeals[i]);
    const allBreakfast=[...(profile.kidsBreakfast||[]),...(profile.customBreakfast||[])];
    const body=buildSkylightEmail(approved,allBreakfast);
    const subject=encodeURIComponent("This Week's Meal Plan — Genie");
    const encodedBody=encodeURIComponent(body);
    const to=skylightEmail?encodeURIComponent(skylightEmail):"";
    window.open(`mailto:${to}?subject=${subject}&body=${encodedBody}`);
  };

  const expertiseLbl = EXPERTISE_LEVELS.find(e=>e.id===profile.expertise);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"'Lora',serif",color:t.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{__html: "@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}} @keyframes bounce{0%,80%,100%{transform:scale(0.8);opacity:0.4}40%{transform:scale(1.2);opacity:1}}"}} />

      {/* Header */}
      <div style={{background:t.accent,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,flexShrink:0}}><GenieLogo /></div>
          <span style={{fontSize:20,fontWeight:700,color:"#fff"}}>Genie</span>
        </div>
        {!["expertise","done"].includes(step) && <Progress step={step} />}
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"32px 18px 80px"}}>

        {/* ── EXPERTISE ── */}
        {step==="expertise" && (
          <div>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{width:100,height:100,margin:"0 auto 10px"}}><GenieLogo /></div>
              <h1 style={{fontSize:32,fontWeight:700,margin:0}}>Welcome to Genie</h1>
              <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",fontSize:15,marginTop:8}}>Your family's weekly meal planning assistant.</p>
              {profileSaved && <div style={{display:"inline-block",marginTop:10,background:t.accentPale,color:t.accent,padding:"5px 14px",borderRadius:30,fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>✓ Preferences saved from last week</div>}
            </div>
            {rotation.filter(r=>r.inRotation).length>0 && <Notice icon="⭐" color="green">Your rotation has <strong>{rotation.filter(r=>r.inRotation).length} approved meals</strong> — Genie will factor in family favorites.</Notice>}
            <p style={{fontWeight:700,fontSize:15,marginBottom:12}}>What's your cook's skill level?</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28}}>
              {EXPERTISE_LEVELS.map(level=>(
                <div key={level.id} onClick={()=>setProfile(p=>({...p,expertise:level.id}))} style={{padding:"20px 16px",borderRadius:16,border:`2.5px solid ${profile.expertise===level.id?t.accent:t.border}`,background:profile.expertise===level.id?t.accentPale:t.card,cursor:"pointer",transition:"all 0.18s",boxShadow:profile.expertise===level.id?"0 4px 14px rgba(45,106,79,0.14)":"none"}}>
                  <div style={{fontSize:28,marginBottom:6}}>{level.icon}</div>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{level.label}</div>
                  <div style={{fontSize:12,color:t.muted,fontFamily:"'DM Sans',sans-serif"}}>{level.desc}</div>
                </div>
              ))}
            </div>
            <div style={{textAlign:"center"}}>
              <Btn onClick={()=>setStep("preferences")} disabled={!profile.expertise}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* ── PREFERENCES ── */}
        {step==="preferences" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Cuisine & Dietary Needs</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:22}}>Select your favorite cuisines and any restrictions.</p>
            <Card style={{marginBottom:18}}>
              <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:700}}>Favorite Cuisines</h3>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {CUISINE_TYPES.map(c=><Tag key={c} label={c} selected={profile.cuisines.includes(c)} onClick={()=>setProfile(p=>({...p,cuisines:toggleArr(p.cuisines,c)}))} />)}
              </div>
            </Card>
            <Card style={{marginBottom:26}}>
              <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:700}}>Dietary Restrictions / Allergies</h3>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {DIETARY_OPTIONS.map(d=><Tag key={d} label={d} colorScheme="red" selected={profile.dietary.includes(d)} onClick={()=>setProfile(p=>({...p,dietary:toggleArr(p.dietary,d)}))} />)}
              </div>
              {profile.dietary.length===0 && <p style={{color:t.muted,fontSize:12,fontFamily:"'DM Sans',sans-serif",marginTop:10}}>No restrictions? Leave blank.</p>}
            </Card>
            <div style={{display:"flex",gap:12,justifyContent:"space-between"}}>
              <Btn variant="secondary" onClick={()=>setStep("expertise")}>← Back</Btn>
              <Btn onClick={()=>setStep("foods")} disabled={profile.cuisines.length===0}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* ── FOODS ── */}
        {step==="foods" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Food Preferences</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:22}}>Pick ingredients your family enjoys. Type in anything not listed.</p>
            {FOOD_CATS.map(cat=>{
              const builtIn = cat.options;
              const saved = (savedCustomFoods[cat.id]||[]).filter(o=>!builtIn.includes(o));
              const allOptions = [...builtIn, ...saved];
              return (
                <Card key={cat.id} style={{marginBottom:16}}>
                  <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:700}}>{cat.label}</h3>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {allOptions.map(o=>{
                      const isSelected = (profile.foods[cat.id]||[]).includes(o) || (profile.customFoods[cat.id]||[]).includes(o);
                      return <Tag key={o} label={o} selected={isSelected} onClick={()=>{
                        if (builtIn.includes(o)) toggleFood(cat.id,o);
                        else setProfile(p=>({...p,customFoods:{...p.customFoods,[cat.id]:isSelected?(p.customFoods[cat.id]||[]).filter(x=>x!==o):[...(p.customFoods[cat.id]||[]),o]}}));
                      }} />;
                    })}
                  </div>
                  <AddCustomItem onAdd={v=>addCustomItem(cat.id,v)} placeholder={`Add a ${cat.label.toLowerCase().replace(" & sides","")} not listed…`} />
                </Card>
              );
            })}
            <div style={{display:"flex",gap:12,justifyContent:"space-between",marginTop:8}}>
              <Btn variant="secondary" onClick={()=>setStep("preferences")}>← Back</Btn>
              <Btn onClick={()=>setStep("breakfast")}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* ── KIDS BREAKFAST ── */}
        {step==="breakfast" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Breakfast & Snacks</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:18}}>Select what to stock this week. Type in anything not listed.</p>
            <Card style={{marginBottom:16}}>
              {Object.entries(KIDS_BREAKFAST_OPTIONS).map(([section,options])=>(
                <div key={section} style={{marginBottom:18}}>
                  <h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:t.accent}}>{section}</h3>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {options.map(o=><Tag key={o} label={o} colorScheme="warm" selected={profile.kidsBreakfast.includes(o)} onClick={()=>setProfile(p=>({...p,kidsBreakfast:toggleArr(p.kidsBreakfast,o)}))} />)}
                  </div>
                </div>
              ))}
              {savedCustomBreakfast.length>0 && (
                <div style={{marginBottom:18}}>
                  <h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:t.accent}}>⭐ Your Additions</h3>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {savedCustomBreakfast.map((o,i)=>{
                      const selected = (profile.kidsBreakfast||[]).includes(o)||(profile.customBreakfast||[]).includes(o);
                      return <Tag key={o+i} label={o} colorScheme="warm" selected={selected} onClick={()=>{
                        if (selected) {
                          setProfile(p=>({...p,kidsBreakfast:p.kidsBreakfast.filter(x=>x!==o),customBreakfast:(p.customBreakfast||[]).filter(x=>x!==o)}));
                        } else {
                          setProfile(p=>({...p,customBreakfast:[...(p.customBreakfast||[]),o]}));
                        }
                      }} />;
                    })}
                  </div>
                </div>
              )}
              <AddCustomItem onAdd={addCustomBreakfast} placeholder="Add a fruit, bread, or snack not listed…" />
            </Card>
            <Notice icon="🛒">Selected items appear as a dedicated <strong>Breakfast & Snacks</strong> section in the grocery list, each linking to Whole Foods.</Notice>
            <div style={{display:"flex",gap:12,justifyContent:"space-between"}}>
              <Btn variant="secondary" onClick={()=>setStep("foods")}>← Back</Btn>
              <Btn onClick={()=>setStep("mealcount")}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* ── MEAL COUNT + RECIPE LIBRARY ── */}
        {step==="mealcount" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Plan This Week</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:24}}>Set how many dinners you need, then add any recipes you'd like Genie to include.</p>

            {/* Dinner count */}
            <Card style={{marginBottom:24,background:t.warmLight,border:`1.5px solid ${t.warm}`}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>How many dinners this week?</div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
                <div style={{display:"flex",alignItems:"center",gap:24}}>
                  <button onClick={()=>setProfile(p=>({...p,mealCount:Math.max(3,p.mealCount-1)}))} style={{width:52,height:52,borderRadius:"50%",border:`2px solid ${t.warm}`,background:"transparent",fontSize:26,cursor:"pointer",color:t.warm,fontWeight:700,lineHeight:1}}>−</button>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:64,fontWeight:700,color:t.accent,lineHeight:1}}>{profile.mealCount}</div>
                    <div style={{fontSize:13,color:t.muted,fontFamily:"'DM Sans',sans-serif",marginTop:4}}>nights</div>
                  </div>
                  <button onClick={()=>setProfile(p=>({...p,mealCount:Math.min(7,p.mealCount+1)}))} style={{width:52,height:52,borderRadius:"50%",border:`2px solid ${t.warm}`,background:"transparent",fontSize:26,cursor:"pointer",color:t.warm,fontWeight:700,lineHeight:1}}>+</button>
                </div>
                <div style={{display:"flex",gap:10}}>
                  {[3,4,5,6,7].map(n=>(
                    <button key={n} onClick={()=>setProfile(p=>({...p,mealCount:n}))} style={{width:42,height:42,borderRadius:"50%",cursor:"pointer",fontFamily:"'Lora',serif",fontWeight:700,fontSize:15,border:`2px solid ${profile.mealCount===n?t.accent:t.border}`,background:profile.mealCount===n?t.accentPale:t.card,color:profile.mealCount===n?t.accent:t.muted,transition:"all 0.15s"}}>{n}</button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Recipe library */}
            <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📖 Your Recipe Library <span style={{fontWeight:400,fontSize:13,color:t.muted,fontFamily:"'DM Sans',sans-serif"}}>(optional)</span></div>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",fontSize:14,marginTop:-8,marginBottom:16}}>Add meals you already know — Genie will weave them into the plan.</p>

            {recipeLibrary.length>0 && (
              <div style={{marginBottom:16}}>
                {recipeLibrary.map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",borderRadius:14,border:`1.5px solid ${t.border}`,background:t.card,marginBottom:8}}>
                    <div style={{fontSize:20,flexShrink:0}}>📖</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14}}>{r.name}</div>
                      {r.source && <div style={{fontSize:12,color:t.muted,fontFamily:"'DM Sans',sans-serif"}}>{r.source}</div>}
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:t.accent,fontFamily:"'DM Sans',sans-serif",wordBreak:"break-all"}}>{r.url}</a>}
                      {r.notes && <div style={{fontSize:12,color:t.muted,fontFamily:"'DM Sans',sans-serif",marginTop:3,fontStyle:"italic"}}>{r.notes}</div>}
                    </div>
                    <button onClick={()=>removeRecipe(r.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:15,color:t.muted,flexShrink:0}}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <Card style={{marginBottom:22}}>
              <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700}}>➕ Add a Recipe</h3>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input value={newRecipe.name} onChange={e=>setNewRecipe(p=>({...p,name:e.target.value}))} placeholder="Meal name (e.g. Mom's Chicken Tikka Masala) *"
                  style={{padding:"10px 14px",borderRadius:12,border:`1.5px solid ${t.border}`,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:t.text,outline:"none",background:t.bg}} />
                <input value={newRecipe.source} onChange={e=>setNewRecipe(p=>({...p,source:e.target.value}))} placeholder="Source (e.g. NYT Cooking, Mom's Recipe Box)"
                  style={{padding:"10px 14px",borderRadius:12,border:`1.5px solid ${t.border}`,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:t.text,outline:"none",background:t.bg}} />
                <input value={newRecipe.url} onChange={e=>setNewRecipe(p=>({...p,url:e.target.value}))} placeholder="Recipe link / URL (optional)"
                  style={{padding:"10px 14px",borderRadius:12,border:`1.5px solid ${t.border}`,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:t.text,outline:"none",background:t.bg}} />
                <textarea value={newRecipe.notes} onChange={e=>setNewRecipe(p=>({...p,notes:e.target.value}))} placeholder="Notes for the cook (e.g. use less chili, kids love this one)" rows={2}
                  style={{padding:"10px 14px",borderRadius:12,border:`1.5px solid ${t.border}`,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:t.text,outline:"none",background:t.bg,resize:"vertical"}} />
                <div style={{textAlign:"right"}}>
                  <Btn onClick={saveRecipe} disabled={!newRecipe.name.trim()} style={{padding:"9px 20px",fontSize:14}}>Save Recipe</Btn>
                </div>
              </div>
            </Card>

            <div style={{display:"flex",gap:12,justifyContent:"space-between"}}>
              <Btn variant="secondary" onClick={()=>setStep("breakfast")}>← Back</Btn>
              <Btn onClick={getInspirations}>Get Meal Ideas →</Btn>
            </div>
          </div>
        )}

        {/* ── INSPIRE ── */}
        {step==="inspire" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Meal Inspiration</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:14}}>Tap meals that sound good — Genie builds the week around your picks.</p>
            {/* Skeleton shown while loading */}
            {loadingS && (
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
                {Array.from({length:6}).map((_,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:14,border:`1.5px solid ${t.border}`,background:t.card}}>
                    <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,background:`linear-gradient(90deg,${t.border} 25%,#f0f0f0 50%,${t.border} 75%)`,backgroundSize:"400px 100%",animation:"shimmer 1.4s ease-in-out infinite"}} />
                    <div style={{flex:1}}>
                      <div style={{width:"60%",height:13,borderRadius:6,marginBottom:7,background:`linear-gradient(90deg,${t.border} 25%,#f0f0f0 50%,${t.border} 75%)`,backgroundSize:"400px 100%",animation:`shimmer 1.4s ease-in-out ${i*0.1}s infinite`}} />
                      <div style={{width:"85%",height:9,borderRadius:6,background:`linear-gradient(90deg,${t.border} 25%,#f0f0f0 50%,${t.border} 75%)`,backgroundSize:"400px 100%",animation:`shimmer 1.4s ease-in-out ${i*0.1}s infinite`}} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cards once loaded */}
            {!loadingS && suggestions.length>0 && (
              <>
                {/* Status + refresh bar */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"10px 14px",borderRadius:12,background:t.accentPale,border:`1px solid ${t.accentLight}`,gap:10}}>
                  <div style={{fontSize:13,fontFamily:"'DM Sans',sans-serif",color:t.accent,fontWeight:600,flex:1,minWidth:0}}>
                    {suggestions.filter(s=>s.liked).length > 0
                      ? "✓ " + suggestions.filter(s=>s.liked).length + " picked"
                      : "Tap meals that sound good"}
                  </div>
                  <button onClick={refreshInspirations}
                    style={{display:"flex",alignItems:"center",gap:4,padding:"7px 13px",borderRadius:20,border:`1.5px solid ${t.accent}`,background:"white",color:t.accent,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                    🔄 More Ideas
                  </button>
                </div>

                {/* Your Picks — horizontal scroll row */}
                {suggestions.filter(s=>s.liked).length > 0 && (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontFamily:"'DM Sans',sans-serif",color:t.muted,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Your Picks</div>
                    <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
                      {suggestions.filter(s=>s.liked).map((s,i)=>(
                        <div key={"liked-"+i}
                          onClick={()=>setSuggestions(prev=>prev.map(x=>x.name===s.name?{...x,liked:false}:x))}
                          style={{flexShrink:0,width:120,padding:"12px 10px",borderRadius:14,position:"relative",border:`2.5px solid ${t.accentLight}`,background:t.accentPale,cursor:"pointer"}}>
                          <div style={{position:"absolute",top:7,right:8,fontSize:11,color:t.accent,fontWeight:700}}>✓</div>
                          <div style={{fontSize:22,marginBottom:4}}>{s.emoji}</div>
                          <div style={{fontSize:12,fontWeight:700,lineHeight:1.3}}>{s.name}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{height:1,background:t.border,marginTop:14,marginBottom:16}} />
                  </div>
                )}

                {/* All unselected — single column list rows */}
                <div style={{fontSize:11,fontFamily:"'DM Sans',sans-serif",color:t.muted,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                  {suggestions.filter(s=>s.liked).length > 0 ? "More Options" : "All Ideas"}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:22}}>
                  {suggestions.filter(s=>!s.liked).map((s,i)=>(
                    <div key={i}
                      onClick={()=>setSuggestions(prev=>prev.map(x=>x.name===s.name?{...x,liked:true}:x))}
                      style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderRadius:14,border:`1.5px solid ${t.border}`,background:t.card,cursor:"pointer",transition:"border 0.15s",animation:`fadeUp 0.22s ease ${i*0.03}s both`,position:"relative"}}>
                      {recipeLibrary.find(r=>r.name===s.name) && (
                        <div style={{position:"absolute",top:8,right:10,fontSize:10,background:t.purplePale,color:t.purple,padding:"1px 7px",borderRadius:20,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>📖 yours</div>
                      )}
                      <div style={{fontSize:28,flexShrink:0}}>{s.emoji}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{s.name}</div>
                        <div style={{fontSize:12,color:t.muted,fontFamily:"'DM Sans',sans-serif",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.description}</div>
                      </div>
                      <div style={{fontSize:20,color:t.border,flexShrink:0}}>+</div>
                    </div>
                  ))}
                </div>

                <div style={{display:"flex",gap:12,justifyContent:"space-between"}}>
                  <Btn variant="secondary" onClick={()=>setStep("mealcount")}>← Back</Btn>
                  <Btn onClick={buildMealPlan}>Build My Meal Plan →</Btn>
                </div>
              </>
            )}

            {/* Failed to load */}
            {!loadingS && suggestions.length===0 && (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <div style={{fontSize:36,marginBottom:12}}>🍱</div>
                <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:8}}>Couldn’t load suggestions.</p>
                {inspirationError && (
                  <div style={{background:"#fdecea",border:"1px solid #f5c6cb",borderRadius:10,padding:"10px 16px",marginBottom:16,maxWidth:400,margin:"0 auto 16px",textAlign:"left"}}>
                    <div style={{fontSize:12,fontFamily:"'DM Sans',sans-serif",color:"#721c24",wordBreak:"break-word"}}>{inspirationError}</div>
                  </div>
                )}
                <Btn onClick={getInspirations}>Try Again</Btn>
              </div>
            )}
          </div>
        )}

        {/* ── PLAN ── */}
        {step==="plan" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Your Weekly Meal Plan</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>Uncheck to remove, tap the day to change it, or hit 🔄 to swap a meal.</p>
            {loadingM && <Spinner label={`Building your ${profile.mealCount}-night meal plan…`} />}
            {!loadingM && meals.length>0 && (
              <>
                {/* Meal cards */}
                <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
                  {meals.map((m,i)=>(
                    <div key={i} style={{borderRadius:14,overflow:"hidden",border:`2px solid ${approvedMeals[i]?t.accentLight:t.border}`,background:approvedMeals[i]?t.accentPale:"#f5f5f5",opacity:approvedMeals[i]?1:0.45,transition:"all 0.18s"}}>
                      {swappingIdx===i ? <div style={{padding:"16px"}}><Spinner label="Finding a replacement…" /></div> : (
                        <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"16px 18px"}}>
                          <div onClick={()=>setApprovedMeals(prev=>prev.map((v,j)=>j===i?!v:v))} style={{cursor:"pointer",paddingTop:3,flexShrink:0}}>
                            <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${approvedMeals[i]?t.accent:t.muted}`,background:approvedMeals[i]?t.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {approvedMeals[i] && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}
                            </div>
                          </div>
                          <div style={{fontSize:26,flexShrink:0}}>{m.emoji||"🍽️"}</div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                              <div style={{fontWeight:700,fontSize:15}}>{m.name}
                                {recipeLibrary.find(r=>r.name===m.name) && <span style={{marginLeft:8,fontSize:11,background:t.purplePale,color:t.purple,padding:"1px 8px",borderRadius:20,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>📖 your recipe</span>}
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                                <select
                                  value={m.day}
                                  onChange={e => setMeals(prev => prev.map((meal,j) => j===i ? {...meal, day: e.target.value} : meal))}
                                  style={{fontSize:12,color:t.accent,fontFamily:"'DM Sans',sans-serif",background:t.accentPale,border:`1px solid ${t.accentLight}`,padding:"3px 6px",borderRadius:8,cursor:"pointer",outline:"none",fontWeight:600}}>
                                  {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d=>(
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                                <div style={{fontSize:11,color:t.muted,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>{m.prepTime}</div>
                                {approvedMeals[i] && <button onClick={()=>swapMeal(i)} title="Swap this meal" style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,padding:"1px 3px"}}>🔄</button>}
                              </div>
                            </div>
                            <div style={{fontSize:12,color:t.muted,fontFamily:"'DM Sans',sans-serif",marginTop:4,lineHeight:1.5}}>{m.description}</div>
                            {recipeLibrary.find(r=>r.name===m.name)?.url && (
                              <a href={recipeLibrary.find(r=>r.name===m.name).url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:t.accent,fontFamily:"'DM Sans',sans-serif",marginTop:4,display:"inline-block"}}>View recipe ↗</a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Health & TasteBuds Summary */}
                <div style={{marginBottom:20}}>
                  <button onClick={()=>setShowSummary(v=>!v)}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",borderRadius:showSummary?"14px 14px 0 0":14,border:`1.5px solid ${t.border}`,borderBottom:showSummary?"none":undefined,background:t.card,cursor:"pointer",fontFamily:"'Lora',serif",fontWeight:700,fontSize:14,color:t.text}}>
                    <span>🧠 Health & TasteBuds Report</span>
                    <span style={{fontSize:12,color:t.muted,fontWeight:400}}>
                      {loadingWS ? "Analyzing…" : (!weekSummary && showSummary) ? "Updating…" : showSummary ? "▲ Hide" : "▼ Show"}
                    </span>
                  </button>

                  {showSummary && (
                    <div style={{border:`1.5px solid ${t.border}`,borderTop:"none",borderRadius:"0 0 14px 14px",background:t.card,padding:"16px 18px 18px"}}>
                      {(loadingWS || (!weekSummary && showSummary)) ? <Spinner label={loadingWS?"Analyzing your week…":"Updating after swap…"} /> : weekSummary ? (
                        <div style={{display:"flex",flexDirection:"column",gap:16}}>

                          {/* Score bar row */}
                          {weekSummary.scores && (
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:t.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Weekly Nutrition Scores</div>
                              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                                {Object.entries(weekSummary.scores).map(([key,val])=>{
                                  const color = val>=8?"#2E7D32":val>=5?t.warm:"#c0392b";
                                  const labels = {protein:"Protein",vegetables:"Vegetables",variety:"Variety",balance:"Balance",fiber:"Fiber"};
                                  return (
                                    <div key={key} style={{display:"flex",alignItems:"center",gap:10}}>
                                      <div style={{width:80,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:t.muted,flexShrink:0}}>{labels[key]||key}</div>
                                      <div style={{flex:1,height:8,borderRadius:4,background:"#eee",overflow:"hidden"}}>
                                        <div style={{width:`${val*10}%`,height:"100%",borderRadius:4,background:color,transition:"width 0.6s ease"}} />
                                      </div>
                                      <div style={{width:24,fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:700,color,textAlign:"right"}}>{val}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* vs Recommended */}
                          {weekSummary.vsRecommended?.length>0 && (
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:t.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>vs. Recommended Weekly Diet</div>
                              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                {weekSummary.vsRecommended.map((item,i)=>{
                                  const icons = {good:"✅",low:"⚠️",high:"⬆️"};
                                  const colors = {good:"#2E7D32",low:"#8B6914",high:"#c0392b"};
                                  return (
                                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 12px",borderRadius:8,background:item.status==="good"?"#E8F5E9":item.status==="low"?"#FFF8E7":"#FFF0F0"}}>
                                      <span style={{fontSize:14,flexShrink:0}}>{icons[item.status]||"•"}</span>
                                      <div style={{flex:1}}>
                                        <span style={{fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:colors[item.status]||t.text}}>{item.nutrient}: </span>
                                        <span style={{fontSize:13,fontFamily:"'DM Sans',sans-serif",color:t.text}}>{item.note}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Takeaways */}
                          {weekSummary.takeaways?.length>0 && (
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:t.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Key Takeaways</div>
                              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                                {weekSummary.takeaways.map((t_,i)=>(
                                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,fontFamily:"'DM Sans',sans-serif",color:t.text,lineHeight:1.4}}>
                                    <span style={{color:t.accent,fontWeight:700,flexShrink:0}}>•</span>{t_}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* TasteBuds */}
                          {weekSummary.tastebuds?.length>0 && (
                            <div style={{background:t.warmLight,borderRadius:10,padding:"12px 14px",border:`1px solid ${t.warm}`}}>
                              <div style={{fontSize:11,fontWeight:700,color:"#7d4c00",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>🔥 TasteBuds</div>
                              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                                {weekSummary.tastebuds.map((t_,i)=>(
                                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#5D4037",lineHeight:1.4}}>
                                    <span style={{fontWeight:700,flexShrink:0}}>•</span>{t_}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Swap Suggestion */}
                          {weekSummary.swapSuggestion?.remove && (
                            <div style={{background:"#E8F5E9",borderRadius:10,padding:"12px 14px",border:"1px solid #A5D6A7"}}>
                              <div style={{fontSize:11,fontWeight:700,color:"#2E7D32",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>💡 Suggested Swap</div>
                              <div style={{fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#1B5E20",marginBottom:10,lineHeight:1.4}}>
                                Replace <strong>{weekSummary.swapSuggestion.remove}</strong> → <strong>{weekSummary.swapSuggestion.replaceWith}</strong>
                                <div style={{fontSize:12,color:"#2E7D32",marginTop:3}}>{weekSummary.swapSuggestion.reason}</div>
                              </div>
                              <button onClick={async()=>{
                                const idx = meals.findIndex(m=>m.name===weekSummary.swapSuggestion.remove);
                                if (idx < 0) return;
                                const replaceWith = weekSummary.swapSuggestion.replaceWith;
                                const prevSummary = weekSummary;
                                setWeekSummary(null);
                                try {
                                  const newMeals = await insertSpecificMeal(idx, replaceWith);
                                  setTimeout(() => {
                                    setMeals(prev => { buildWeekSummary(prev); return prev; });
                                  }, 100);
                                } catch {
                                  setWeekSummary(prevSummary);
                                }
                              }} style={{padding:"7px 16px",borderRadius:20,border:"1.5px solid #2E7D32",background:"white",color:"#2E7D32",fontFamily:"'Lora',serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                                🔄 Make This Swap
                              </button>
                            </div>
                          )}

                        </div>
                      ) : <div style={{fontSize:13,fontFamily:"'DM Sans',sans-serif",color:t.muted,paddingTop:8}}>Couldn’t load summary.</div>}
                    </div>
                  )}
                </div>

                <div style={{display:"flex",gap:12,justifyContent:"space-between"}}>
                  <Btn variant="secondary" onClick={()=>setStep("inspire")}>← Back</Btn>
                  <Btn onClick={async()=>{setStep("review");await buildGroceryList();}}>Build Grocery List →</Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── GROCERY ── */}
        {step==="review" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Grocery List</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:16}}>Organized by meal. Mark each item as “Need to Order” or “Have at Home.”</p>

            {loadingG && <Spinner label="Building your grocery list by meal…" />}
            {!loadingG && groceryList && (
              <>
                {/* Top action bar */}
                <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
                  <a href="https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo"
                    target="_blank" rel="noopener noreferrer"
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 14px",borderRadius:12,background:t.warm,color:"#fff",textDecoration:"none",fontFamily:"'Lora',serif",fontWeight:700,fontSize:14,minWidth:140}}>
                    🛒 Amazon Fresh
                  </a>
                  <button onClick={()=>{
                    const ordered = Object.entries(groceryList).flatMap(([meal,items])=>
                      Array.isArray(items) ? items.filter(item => groceryChecked[meal+":"+item] === "order") : []
                    );
                    const allItems = Object.entries(groceryList).flatMap(([meal,items])=>
                      Array.isArray(items) ? items : []
                    );
                    const list = ordered.length > 0 ? ordered : allItems;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(list.join("\n")).catch(()=>{
                        const el=document.createElement("textarea"); el.value=list.join("\n");
                        document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
                      });
                    } else {
                      const el=document.createElement("textarea"); el.value=list.join("\n");
                      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
                    }
                  }} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 14px",borderRadius:12,background:t.accentPale,color:t.accent,border:`1.5px solid ${t.accentLight}`,fontFamily:"'Lora',serif",fontWeight:700,fontSize:14,cursor:"pointer",minWidth:140}}>
                    📋 Copy List
                  </button>
                </div>

                {/* Legend */}
                <div style={{display:"flex",gap:12,marginBottom:16,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:t.muted,alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:16,height:16,borderRadius:4,background:t.warm,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:9,fontWeight:700}}>O</span></div>
                    Need to Order
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:16,height:16,borderRadius:4,background:t.accent,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:9,fontWeight:700}}>✓</span></div>
                    Have at Home
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${t.border}`}} />
                    Unmarked
                  </div>
                </div>

                {/* Per-meal sections */}
                {Object.entries(groceryList).map(([meal, items]) => {
                  if (!Array.isArray(items) || items.length === 0) return null;
                  const isBreakfast = meal === "Breakfast & Snacks";
                  const mealObj = meals.find(m => m.name === meal);
                  const orderedCount = items.filter(item => groceryChecked[meal+":"+item] === "order").length;
                  const haveCount = items.filter(item => groceryChecked[meal+":"+item] === "have").length;
                  return (
                    <Card key={meal} style={{marginBottom:14}}>
                      {/* Meal header */}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:18}}>{isBreakfast ? "🍱" : (mealObj?.emoji || "🍽️")}</span>
                          <div>
                            <div style={{fontWeight:700,fontSize:14,color:t.text}}>{meal}</div>
                            {mealObj?.day && <div style={{fontSize:11,color:t.muted,fontFamily:"'DM Sans',sans-serif"}}>{mealObj.day} · {mealObj.prepTime}</div>}
                          </div>
                        </div>
                        {(orderedCount+haveCount)>0 && (
                          <div style={{fontSize:11,fontFamily:"'DM Sans',sans-serif",color:t.muted,textAlign:"right"}}>
                            {orderedCount>0 && <span style={{color:t.warm,fontWeight:600}}>{orderedCount} to order</span>}
                            {orderedCount>0 && haveCount>0 && " · "}
                            {haveCount>0 && <span style={{color:t.accent,fontWeight:600}}>{haveCount} have</span>}
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {items.map((item, i) => {
                          const key = meal+":"+item;
                          const status = groceryChecked[key] !== undefined ? groceryChecked[key] : "have"; // default have
                          return (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,
                              background: status==="have" ? "#f5f5f5" : status==="order" ? "#FFF8F0" : t.bg,
                              border: `1px solid ${status==="have"?"#e0e0e0":status==="order"?"#FFD090":t.border}`,
                              opacity: status==="have" ? 0.55 : 1, transition:"all 0.12s"}}>
                              {/* Item name + WF link */}
                              <a href={wholeFoodsItemUrl(item)} target="_blank" rel="noopener noreferrer"
                                style={{flex:1,textDecoration:"none",fontSize:14,fontFamily:"'DM Sans',sans-serif",
                                  color: status==="have" ? t.muted : t.text,
                                  textDecoration: status==="have" ? "line-through" : "none"}}>
                                {item}
                              </a>
                              {/* Two-button toggle: Order | Have */}
                              <div style={{display:"flex",gap:5,flexShrink:0}}>
                                <button onClick={()=>setGroceryChecked(p=>({...p,[key]:p[key]==="order"?undefined:"order"}))}
                                  title="Need to Order"
                                  style={{width:28,height:28,borderRadius:7,border:`1.5px solid ${status==="order"?t.warm:"#e0e0e0"}`,
                                    background:status==="order"?t.warm:"transparent",
                                    color:status==="order"?"#fff":t.muted,
                                    cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"}}>
                                  🛒
                                </button>
                                <button onClick={()=>setGroceryChecked(p=>({...p,[key]:p[key]==="have"?undefined:"have"}))}
                                  title="Have at Home"
                                  style={{width:28,height:28,borderRadius:7,border:`1.5px solid ${status==="have"?t.accent:"#e0e0e0"}`,
                                    background:status==="have"?t.accent:"transparent",
                                    color:status==="have"?"#fff":t.muted,
                                    cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"}}>
                                  ✓
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}

                {/* Summary footer */}
                {Object.values(groceryChecked).some(v=>v==="order"||v==="have") && (
                  <div style={{display:"flex",gap:10,marginBottom:16,padding:"12px 16px",borderRadius:12,background:t.accentPale,border:`1px solid ${t.accentLight}`}}>
                    <div style={{flex:1,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
                      <span style={{color:t.warm,fontWeight:700}}>🛒 {Object.values(groceryChecked).filter(v=>v==="order").length} to order</span>
                      <span style={{color:t.muted,margin:"0 8px"}}>·</span>
                      <span style={{color:t.accent,fontWeight:700}}>✓ {Object.values(groceryChecked).filter(v=>v==="have").length} at home</span>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:12,justifyContent:"space-between",marginTop:4}}>
                  <Btn variant="secondary" onClick={()=>setStep("plan")}>← Back</Btn>
                  <Btn onClick={buildChefInstructions} disabled={loadingN}>{loadingN?"Generating…":"Generate Chef Instructions →"}</Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── NANNY + EXPORT ── */}
        {step==="nanny" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Chef Instructions & Send</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>Full cooking instructions for the week. Review, edit, then send to your chef.</p>
            {loadingN && <Spinner label="Generating chef instructions…" />}
            {!loadingN && chefInstructions && (
              <>
                {/* Editable message */}
                <Card style={{marginBottom:22}}>
                  <div style={{fontWeight:700,fontSize:14,color:t.accent,marginBottom:10}}>👨‍🍳 Chef Instructions</div>
                  <textarea value={chefInstructions} onChange={e=>setChefInstructions(e.target.value)} rows={13}
                    style={{width:"100%",border:"none",resize:"vertical",fontFamily:"'DM Sans',sans-serif",fontSize:15,lineHeight:1.75,color:t.text,background:"transparent",outline:"none",boxSizing:"border-box"}} />
                </Card>

                {/* Export tabs */}
                <div style={{display:"flex",gap:0,marginBottom:20,borderRadius:12,overflow:"hidden",border:`1.5px solid ${t.border}`}}>
                  {[["text","💬 Text / Copy"],["email","📧 Email"],["print","🖨️ Print"],["skylight","🗓️ Skylight"]].map(([id,label])=>(
                    <button key={id} onClick={()=>setExportTab(id)}
                      style={{flex:1,padding:"11px 8px",border:"none",background:exportTab===id?t.accent:"transparent",color:exportTab===id?"#fff":t.muted,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:exportTab===id?700:400,cursor:"pointer",transition:"all 0.15s"}}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Text / Copy tab */}
                {exportTab==="text" && (
                  <Card style={{marginBottom:16}}>
                    <p style={{margin:"0 0 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:t.muted}}>Copy the full instructions and paste into iMessage, WhatsApp, or any messaging app.</p>
                    <Btn variant="ghost" onClick={()=>{
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(chefInstructions).catch(()=>{
                          const el = document.createElement("textarea");
                          el.value = chefInstructions;
                          document.body.appendChild(el);
                          el.select();
                          document.execCommand("copy");
                          document.body.removeChild(el);
                        });
                      } else {
                        const el = document.createElement("textarea");
                        el.value = chefInstructions;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand("copy");
                        document.body.removeChild(el);
                      }
                    }}>📋 Copy Instructions</Btn>
                  </Card>
                )}

                {/* Email tab */}
                {exportTab==="email" && (
                  <Card style={{marginBottom:16}}>
                    <p style={{margin:"0 0 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:t.muted}}>Opens your default email app pre-filled with the full weekly plan and message.</p>
                    <Btn variant="ghost" onClick={()=>{
                      const subject=encodeURIComponent("This Week\'s Chef Instructions");
                      window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(chefInstructions)}`);
                    }}>📧 Open in Email App</Btn>
                  </Card>
                )}

                {/* Print tab */}
                {exportTab==="print" && (
                  <Card style={{marginBottom:16}}>
                    <p style={{margin:"0 0 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:t.muted}}>Generates a clean printable page with the full meal plan, recipe instructions, and grocery list — great for posting in the kitchen.</p>
                    <Btn variant="ghost" onClick={doPrint}>🖨️ Print / Save as PDF</Btn>
                  </Card>
                )}

                {/* Skylight tab */}
                {exportTab==="skylight" && (
                  <Card style={{marginBottom:16}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>🗓️ Send to Skylight Calendar</div>
                    <p style={{margin:"0 0 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:t.muted}}>
                      Skylight's <strong>Magic Import</strong> can convert an emailed meal plan directly into your Skylight Calendar. Just forward the email to your Skylight address.
                    </p>
                    <div style={{background:t.accentPale,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                      <div style={{fontSize:13,fontFamily:"'DM Sans',sans-serif",color:t.accent,fontWeight:600,marginBottom:6}}>How it works:</div>
                      <div style={{fontSize:13,fontFamily:"'DM Sans',sans-serif",color:t.text,lineHeight:1.7}}>
                        1. Open the Skylight app → Settings → find your <strong>Magic Import email address</strong><br/>
                        2. Enter it below, then tap "Open in Email App"<br/>
                        3. Send — Skylight will auto-import the meals onto your calendar
                      </div>
                    </div>
                    <label style={{fontSize:13,fontFamily:"'DM Sans',sans-serif",color:t.muted,display:"block",marginBottom:6}}>Your Skylight Magic Import email (optional)</label>
                    <input value={skylightEmail} onChange={e=>setSkylightEmail(e.target.value)} placeholder="e.g. magicimport+abc123@myskylight.com"
                      style={{width:"100%",padding:"10px 14px",borderRadius:12,border:`1.5px solid ${t.border}`,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:t.text,outline:"none",background:t.bg,boxSizing:"border-box",marginBottom:14}} />
                    <Btn variant="ghost" onClick={doSkylightEmail}>🗓️ Open in Email for Skylight</Btn>
                  </Card>
                )}

                <div style={{marginTop:8}}>
                  <Btn variant="warm" onClick={()=>setStep("feedback")}>Rate Last Week →</Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {step==="feedback" && (
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:6}}>How Was Last Week?</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:22}}>Rate each meal. Genie learns your family's tastes over time.</p>
            {pastWeekMeals.length===0 ? (
              <Notice icon="💡">No meals to rate yet — this fills in after your first full week with Genie.</Notice>
            ) : pastWeekMeals.map((meal,i)=>(
              <Card key={i} style={{marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>{meal.name}</div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13,color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:6}}>Did your family enjoy it?</div>
                  <Stars value={feedback[i]?.taste||0} onChange={v=>setFeedback(p=>({...p,[i]:{...p[i],taste:v}}))} />
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13,color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:6}}>Was the difficulty level right?</div>
                  <Stars value={feedback[i]?.difficulty||0} onChange={v=>setFeedback(p=>({...p,[i]:{...p[i],difficulty:v}}))} />
                </div>
                <div>
                  <div style={{fontSize:13,color:t.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:9}}>Keep in rotation?</div>
                  <div style={{display:"flex",gap:9}}>
                    <button onClick={()=>setFeedback(p=>({...p,[i]:{...p[i],keepInRotation:true}}))} style={{padding:"7px 16px",borderRadius:30,cursor:"pointer",fontFamily:"'Lora',serif",fontWeight:700,fontSize:13,border:`2px solid ${feedback[i]?.keepInRotation===true?t.accent:t.border}`,background:feedback[i]?.keepInRotation===true?t.accentPale:"transparent",color:feedback[i]?.keepInRotation===true?t.accent:t.muted}}>👍 Yes, keep it</button>
                    <button onClick={()=>setFeedback(p=>({...p,[i]:{...p[i],keepInRotation:false}}))} style={{padding:"7px 16px",borderRadius:30,cursor:"pointer",fontFamily:"'Lora',serif",fontWeight:700,fontSize:13,border:`2px solid ${feedback[i]?.keepInRotation===false?t.red:t.border}`,background:feedback[i]?.keepInRotation===false?t.redPale:"transparent",color:feedback[i]?.keepInRotation===false?t.red:t.muted}}>👎 Skip it</button>
                  </div>
                </div>
              </Card>
            ))}
            <div style={{textAlign:"center",marginTop:16}}>
              <Btn onClick={submitFeedback} variant="warm">Save Feedback & Finish</Btn>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step==="done" && (
          <div style={{textAlign:"center",padding:"36px 0"}}>
            <div style={{width:90,height:90,margin:"0 auto 14px"}}><GenieLogo /></div>
            <h2 style={{fontSize:28,fontWeight:700,marginBottom:8}}>All done for this week!</h2>
            <p style={{color:t.muted,fontFamily:"'DM Sans',sans-serif",fontSize:15,lineHeight:1.6,marginBottom:28}}>Meal plan locked in. Grocery list ready. Message sent. See you next Sunday!</p>
            {rotation.filter(r=>r.inRotation).length>0 && (
              <Card style={{textAlign:"left",marginBottom:22}}>
                <h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:t.accent}}>⭐ Your Rotation ({rotation.filter(r=>r.inRotation).length} approved meals)</h3>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  {rotation.filter(r=>r.inRotation).map((m,i)=>(
                    <div key={i} style={{padding:"5px 12px",borderRadius:30,background:t.accentPale,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:t.accent}}>{"★".repeat(m.rating)} {m.name}</div>
                  ))}
                </div>
              </Card>
            )}
            <Btn onClick={finishWeek}>Start Next Week →</Btn>
          </div>
        )}

      </div>
    </div>
  );
}
