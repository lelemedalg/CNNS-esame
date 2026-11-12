/* Reti & Sicurezza · logica dell'app */
(function () {
  "use strict";
  const AREAS = ["reti", "sicurezza"];
  const A = window.STUDY.areas;
  const EX = window.EXERCISES;
  const fmt = window.fmtNum;
  const NOTES = window.NOTES || { order: [], docs: {} };
  const fmtP = (x) => String(Math.round(x * 100) / 100).replace(".", ",");
  const $ = (s, el = document) => el.querySelector(s);
  const view = $("#view");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (x) => Math.round(x * 100);
  const LETTERS = ["A", "B", "C", "D", "E"];

  /* ---------- Indice dei contenuti ---------- */
  const Q = {}, MODS = {}, OPENS = {};
  AREAS.forEach((ak) => A[ak].modules.forEach((m) => {
    m.area = ak; MODS[m.id] = m;
    m.qids = m.quiz.map((q, i) => { const id = `${m.id}-${i}`; Q[id] = { id, mod: m.id, area: ak, q: q[0], opts: q[1], expl: q[2], exam: q[3] === 1 }; return id; });
    m.aperte.forEach((o, i) => { o.id = `${m.id}-o${i}`; o.mod = m.id; o.area = ak; OPENS[o.id] = o; });
  }));
  const ALLQ = Object.keys(Q);
  const EXAMQ = ALLQ.filter((id) => Q[id].exam);
  const areaQ = (ak) => ALLQ.filter((id) => Q[id].area === ak);
  const modLabel = (m) => (m.area === "reti" ? `Cap. ${m.n}` : `Lezione ${m.n}`);

  /* ---------- Progressi: browser + archivio personale dell'artifact ---------- */
  const KEY = "rs26.progress";
  const blank = () => ({ v: 1, q: {}, ex: {}, open: {}, exams: [], read: {}, updated: 0 });
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } }
  };
  let P = (() => { try { const s = ls.get(KEY); if (s) return Object.assign(blank(), JSON.parse(s)); } catch (e) { /* dati illeggibili */ } return blank(); })();
  let dbDoc = null, writing = false, pendingWrite = false, dbTimer = null;
  function flush() {
    if (!dbDoc) return;
    if (writing) { pendingWrite = true; return; }
    writing = true;
    dbDoc.set(JSON.parse(JSON.stringify(P))).catch(() => { /* senza permesso di scrittura restano i dati locali */ })
      .finally(() => { writing = false; if (pendingWrite) { pendingWrite = false; flush(); } });
  }
  function save() {
    P.updated = Date.now();
    ls.set(KEY, JSON.stringify(P));
    if (dbDoc) { clearTimeout(dbTimer); dbTimer = setTimeout(flush, 2500); }
  }
  async function initSync() {
    if (!window.claude || !window.claude.use) return;
    try {
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user || !user.id) return;
      const id = await user.id(); if (!id) return;
      dbDoc = db.doc(`data/users/${id}/progress`);
      const snap = await dbDoc.get();
      const remote = snap.exists ? snap.data() : null;
      if (remote && (remote.updated || 0) > (P.updated || 0)) { P = Object.assign(blank(), JSON.parse(JSON.stringify(remote))); ls.set(KEY, JSON.stringify(P)); route(); }
      else if (P.updated) flush();
      $("#syncState").textContent = "Progressi sincronizzati con il tuo account";
    } catch (e) { dbDoc = null; }
  }

  const qs = (id) => P.q[id] || { s: 0, c: 0, w: 0, b: 0, l: 0 };
  function record(id, ok) {
    const p = Object.assign({ s: 0, c: 0, w: 0, b: 0, l: 0 }, P.q[id]);
    p.s++; p.l = Date.now();
    if (ok) { p.c++; p.b = Math.min(3, p.b + 1); } else { p.w++; p.b = 0; }
    P.q[id] = p; save();
  }
  const mastery = (ids) => (ids.length ? ids.reduce((a, id) => a + qs(id).b, 0) / (ids.length * 3) : 0);
  const seenShare = (ids) => (ids.length ? ids.filter((id) => qs(id).s > 0).length / ids.length : 0);
  const dueIds = (ids = ALLQ) => ids.filter((id) => { const p = qs(id); return p.w > 0 && p.b < 2; }).sort((a, b) => qs(a).l - qs(b).l);
  function smartPick(ids, n) {
    const scored = ids.map((id) => { const p = qs(id); const pr = p.s === 0 ? 0.4 : p.b === 0 ? 0 : p.b; return { id, k: pr + Math.random() * 0.95 }; });
    return scored.sort((a, b) => a.k - b.k).slice(0, n).map((x) => x.id);
  }

  /* ---------- Navigazione ---------- */
  const NAV = [["", "Home"], ["teoria", "Teoria"], ["reti", "Reti"], ["sicurezza", "Sicurezza"], ["esercizi", "Esercizi"], ["ripasso", "Ripasso"], ["esame", "Esame"], ["metodo", "Metodo"]];
  function drawNav(cur) {
    const top = cur.startsWith("m-r") ? "reti" : cur.startsWith("m-s") ? "sicurezza" : cur.startsWith("ex-") ? "esercizi" : cur.startsWith("t-") ? "teoria" : cur;
    const html = NAV.map(([h, l]) => `<a href="#${h}" class="${h === top ? "on" : ""}">${l}</a>`).join("");
    $("#navMain").innerHTML = html; $("#navFloat").innerHTML = html;
  }
  let cleanup = null, activeKeys = null;
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    activeKeys = null;
    const h = decodeURIComponent(location.hash.slice(1));
    drawNav(h);
    view.classList.remove("fade"); void view.offsetWidth; view.classList.add("fade");
    if (!h) renderHome();
    else if (h === "teoria") renderTheoryList();
    else if (h.startsWith("t-") && NOTES.docs[h.slice(2)]) renderTheory(h.slice(2));
    else if (AREAS.includes(h)) renderArea(h);
    else if (h.startsWith("m-") && MODS[h.slice(2)]) renderModule(h.slice(2));
    else if (h === "esercizi") renderExList();
    else if (h.startsWith("ex-") && EX[h.slice(3)]) renderExercise(h.slice(3));
    else if (h === "ripasso") renderReview();
    else if (h === "esame") renderExamSetup();
    else if (h === "metodo") renderMethod();
    else renderHome();
    reveal(view);
  }
  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  document.addEventListener("keydown", (e) => {
    if (!activeKeys) return;
    const t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    activeKeys(e);
  });

  /* ---------- Componenti ---------- */
  const progBar = (x, label) => `<div class="prog"><span>${label ?? pct(x) + "%"}</span><div class="track"><i style="width:${pct(x)}%"></i></div></div>`;
  const metaRow = (items) => `<div class="meta">${items.map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`).join("")}</div>`;

  /* ---------- Stima della preparazione ----------
     Modello: probabilità di rispondere giusto a ogni domanda chiusa (dal livello nel ripasso),
     di risolvere ogni esercizio d'esame (dai tentativi) e voto atteso delle aperte (dall'autovalutazione).
     Il peso di ogni elemento segue il formato della simulazione: 12 chiuse di reti e 6 di sicurezza (metà tipo esame),
     un esercizio CIDR + 3 esercizi di reti, una aperta sul firewall + una su un'altra lezione di sicurezza. */
  const P_UNSEEN = 0.3, P_LVL = [0, 0.65, 0.8, 0.92], TARGET = 0.95;
  const pQ = (id) => { const p = qs(id); if (!p.s) return P_UNSEEN; return p.b ? P_LVL[p.b] : 0.25 + 0.2 * (p.c / p.s); };
  const pEx = (k) => { const s = P.ex[k]; return s && s.t ? Math.min(0.92, (s.ok + 0.2) / (s.t + 1)) : 0.2; };
  const pOpen = (o) => (P.open[o.id] ? P.open[o.id].v / 3 : 0.3);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  function readiness() {
    const items = []; // { mod, kind, w (punti in palio), p (prob. stimata), seen }
    [["reti", 12], ["sicurezza", 6]].forEach(([ak, n]) => {
      const pool = areaQ(ak), ex = pool.filter((id) => Q[id].exam), rest = pool.filter((id) => !Q[id].exam);
      const groups = ex.length && rest.length ? [[ex, n / 2], [rest, n / 2]] : [[pool, n]];
      groups.forEach(([ids, pts]) => ids.forEach((id) => items.push({ mod: Q[id].mod, kind: "q", w: pts / ids.length, p: pQ(id), seen: qs(id).s > 0 })));
    });
    const exPool = Object.values(EX).filter((e) => e.exam && e.mod.startsWith("r") && e.id !== "cidr8").map((e) => e.id);
    if (EX.cidr8) items.push({ mod: EX.cidr8.mod, kind: "e", w: 2, p: pEx("cidr8"), seen: !!(P.ex.cidr8 && P.ex.cidr8.t) });
    exPool.forEach((k) => items.push({ mod: EX[k].mod, kind: "e", w: 6 / exPool.length, p: pEx(k), seen: !!(P.ex[k] && P.ex[k].t) }));
    const opS = Object.values(OPENS).filter((o) => o.area === "sicurezza"), fw = opS.filter((o) => o.mod === "s8"), oth = opS.filter((o) => o.mod !== "s8");
    [[fw, 3], [oth, 3]].forEach(([os, pts]) => os.forEach((o) => items.push({ mod: o.mod, kind: "o", w: pts / os.length, p: pOpen(o), seen: !!P.open[o.id] })));
    const part = (k) => items.filter((x) => x.kind === k).reduce((a, x) => a + x.w * x.p, 0);
    const parts = { q: part("q"), e: part("e"), o: part("o") };
    const total = parts.q + parts.e + parts.o;
    const coverage = items.reduce((a, x) => a + (x.seen ? x.w : 0), 0) / 32;
    const gains = {};
    items.forEach((x) => { const g = x.w * Math.max(0, TARGET - x.p); const m = (gains[x.mod] = gains[x.mod] || { q: 0, e: 0, o: 0 }); m[x.kind] += g; });
    const top = Object.entries(gains).map(([id, g]) => ({ m: MODS[id], g, tot: g.q + g.e + g.o })).filter((x) => x.m && x.tot >= 0.05).sort((a, b) => b.tot - a.tot).slice(0, 4);
    return { total, parts, coverage, top };
  }
  function readinessHtml() {
    const r = readiness(), PASS = 18;
    const ex = (P.exams || []).filter((e) => e.total != null).slice(-1)[0];
    const conf = r.coverage < 0.25 ? "bassa: hai visto ancora poco materiale, la stima si basa soprattutto su valori di partenza" : r.coverage < 0.6 ? "media: diventa più precisa man mano che fai quiz, esercizi e aperte" : "buona: si basa su gran parte del materiale d'esame";
    const why = (g) => [["q", "quiz"], ["e", "esercizi"], ["o", "aperte"]].filter(([k]) => g[k] >= 0.05).sort((a, b) => g[b[0]] - g[a[0]]).map(([k, l]) => `${l} +${fmtP(Math.round(g[k] * 10) / 10)}`).join(" · ");
    return `
      <section>
        <h2 class="h2">Preparazione</h2>
        <div class="ready">
          <div class="score-big"><span>${fmtP(Math.round(r.total * 2) / 2)}</span><span class="muted" style="font-size:.4em;letter-spacing:-0.03em"> / 32</span></div>
          <p class="body-text">Punteggio stimato se l'esame fosse oggi, calcolato dai tuoi risultati su quiz, esercizi e domande aperte. ${r.total >= PASS ? "Sei sopra la sufficienza: punta a renderla stabile." : `Ti mancano circa <b>${fmtP(Math.round((PASS - r.total) * 2) / 2)} punti</b> per la sufficienza.`}</p>
          <div class="ready-bar" role="img" aria-label="Stima ${fmtP(Math.round(r.total * 2) / 2)} su 32, sufficienza a ${PASS}"><i style="width:${Math.min(100, (r.total / 32) * 100)}%"></i><span class="pass" style="left:${(PASS / 32) * 100}%"></span></div>
          <div class="ready-scale"><span>0</span><span style="position:absolute;left:${(PASS / 32) * 100}%;transform:translateX(-50%)">${PASS}</span><span>32</span></div>
        </div>
        ${metaRow([["Domande chiuse", `${fmtP(Math.round(r.parts.q * 10) / 10)} / 18`], ["Esercizi", `${fmtP(Math.round(r.parts.e * 10) / 10)} / 8`], ["Aperte", `${fmtP(Math.round(r.parts.o * 10) / 10)} / 6`]])}
        <p class="note" style="margin-top:12px">Affidabilità ${conf}.${ex ? ` Ultima simulazione completa: ${fmtP(ex.total)}/32.` : ""}</p>
        ${r.top.length ? `<h3 class="h3" style="margin-top:28px">Dove guadagni più punti</h3>
        <div class="mods">${r.top.map(({ m, g, tot }) => `<a class="mod-row" href="#m-${m.id}"><span class="n">${m.area === "reti" ? "R" : "S"}${m.n}</span><span><span class="t">${esc(m.title)}</span><br><span class="s">${why(g)}</span></span><span class="prog"><span class="gain">+${fmtP(Math.round(tot * 10) / 10)} pt</span></span><span class="arr">→</span></a>`).join("")}</div>
        <p class="note" style="margin-top:10px">Punti in più che otterresti portando il modulo a padronanza piena, pesati su quanto conta all'esame.</p>` : ""}
      </section>`;
  }

  /* ---------- Home ---------- */
  function renderHome() {
    const due = dueIds().length;
    const ex = Object.values(P.exams || []).slice(-1)[0];
    const cover = (ak, cls) => {
      const a = A[ak], ids = areaQ(ak), m = mastery(ids);
      return `<a class="cover ${cls}" href="#${ak}"><div class="eyebrow">${a.sub}</div><div><div class="ttl">${a.title}</div>
        <div class="row" style="margin-top:14px"><span>${a.modules.length} moduli · ${ids.length} domande</span><span class="mono">${pct(m)}%</span></div>
        <div class="bar"><i style="width:${pct(m)}%"></i></div></div></a>`;
    };
    view.innerHTML = `
      <section>
        <p class="lead">Preparazione all'esame di <b>Computer Networks and Network Security</b>: <b>26 punti</b> tra domande chiuse ed esercizi, <b>6 punti</b> da due domande aperte. Studi la teoria sugli appunti, ti alleni con quiz che ripropongono i tuoi errori, esercizi con valori sempre nuovi e risposte aperte da autovalutare con la traccia. Tutto è tarato sul formato d'esame.</p>
        ${metaRow([["Teoria", `${NOTES.order.length} capitoli e lezioni`], ["Domande", `${ALLQ.length} chiuse (${EXAMQ.length} tipo esame) · ${Object.keys(OPENS).length} aperte`], ["Esercizi", `${Object.keys(EX).length} tipi, valori casuali`]])}
      </section>
      <section>
        <div class="covers">
          ${cover("reti", "reti")}
          ${cover("sicurezza", "sic")}
          <a class="cover exam" href="#esame"><div class="eyebrow">Simulazione a tempo</div><div><div class="ttl">Esame</div>
            <div class="row" style="margin-top:14px"><span>Chiuse, esercizi e 2 aperte · 32 punti</span><span class="mono">${ex ? `ultima: ${ex.total != null ? fmtP(ex.total) + "/32" : fmtP(ex.closed) + "/26"}` : "mai svolta"}</span></div></div></a>
        </div>
      </section>
      ${readinessHtml()}
      <section>
        <h2 class="h2">Per oggi</h2>
        <div class="mods">
          <a class="mod-row" href="#teoria"><span class="n">00</span><span><span class="t">Studia la teoria</span><br><span class="s">${(() => { const k = NOTES.order.find((x) => !(P.read || {})[x]); return k ? `Prossimo: ${NOTES.docs[k].title}` : "Tutti gli appunti letti"; })()}</span></span>${progBar(NOTES.order.length ? Object.keys(P.read || {}).filter((k) => NOTES.docs[k]).length / NOTES.order.length : 0, `${Object.keys(P.read || {}).filter((k) => NOTES.docs[k]).length}/${NOTES.order.length} letti`)}<span class="arr">→</span></a>
          <a class="mod-row" href="#ripasso"><span class="n">01</span><span><span class="t">Ripassa gli errori</span><br><span class="s">${due ? `${due} domande sbagliate da rifare` : "Nessun errore in sospeso"}</span></span><span class="prog"><span>${due}</span></span><span class="arr">→</span></a>
          <a class="mod-row" href="#" data-act="mix"><span class="n">02</span><span><span class="t">Quiz misto da 15</span><br><span class="s">Reti e sicurezza, priorità alle domande nuove e deboli</span></span>${progBar(mastery(ALLQ))}<span class="arr">→</span></a>
          <a class="mod-row" href="#" data-act="rex"><span class="n">03</span><span><span class="t">Un esercizio numerico a caso</span><br><span class="s">Ritardi, checksum, cwnd, subnetting, Dijkstra, RSA…</span></span><span class="prog"><span>${Object.values(P.ex).reduce((a, x) => a + (x.ok || 0), 0)} risolti</span></span><span class="arr">→</span></a>
          <a class="mod-row" href="#" data-act="appelli"><span class="n">04</span><span><span class="t">Domande tipo esame</span><br><span class="s">Le domande chiuse più vicine a quelle d'esame, in un quiz da 15</span></span>${progBar(mastery(EXAMQ))}<span class="arr">→</span></a>
          <a class="mod-row" href="#metodo"><span class="n">05</span><span><span class="t">Come usare l'app</span><br><span class="s">Il metodo di studio e un piano di tre settimane</span></span><span class="prog"></span><span class="arr">→</span></a>
        </div>
      </section>`;
    view.querySelector('[data-act="mix"]').addEventListener("click", (e) => { e.preventDefault(); startStandaloneQuiz(smartPick(ALLQ, 15), "Quiz misto"); });
    view.querySelector('[data-act="appelli"]').addEventListener("click", (e) => { e.preventDefault(); startStandaloneQuiz(smartPick(EXAMQ, 15), "Domande tipo esame"); });
    view.querySelector('[data-act="rex"]').addEventListener("click", (e) => { e.preventDefault(); const ks = Object.keys(EX); location.hash = "ex-" + ks[Math.floor(Math.random() * ks.length)]; });
  }

  function startStandaloneQuiz(ids, title, back = "") {
    view.innerHTML = `<section><div class="crumb"><a href="#${back}">← Indietro</a></div><h2 class="page-title">${esc(title)}</h2><div id="qz"></div></section>`;
    window.scrollTo(0, 0);
    runQuiz($("#qz"), ids, { onAgain: (wrong) => startStandaloneQuiz(wrong, "Ripeti gli errori", back) });
  }

  /* ---------- Area ---------- */
  function renderArea(ak) {
    const a = A[ak], ids = areaQ(ak);
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><span>${a.title}</span></div>
        <h2 class="page-title">${a.title}</h2>
        <p class="lead">${a.sub}. Apri un modulo per la scheda, il quiz, le domande aperte e gli esercizi.</p>
        ${metaRow([["Moduli", a.modules.length], ["Domande viste", `${pct(seenShare(ids))}%`], ["Padronanza", `${pct(mastery(ids))}%`]])}
        <div class="btns"><button class="btn" id="aq">Quiz misto da 15</button><button class="btn ghost" id="ad">Solo errori (${dueIds(ids).length})</button></div>
      </section>
      <section>
        <div class="mods">${a.modules.map((m) => `<a class="mod-row" href="#m-${m.id}"><span class="n">${m.n.padStart(2, "0")}</span><span><span class="t">${m.title}</span><br><span class="s">${m.qids.length} domande · ${m.aperte.length} aperte · ${m.esercizi.length} esercizi</span></span>${progBar(mastery(m.qids))}<span class="arr">→</span></a>`).join("")}</div>
      </section>`;
    $("#aq").onclick = () => startStandaloneQuiz(smartPick(ids, 15), `Quiz misto · ${a.title}`, ak);
    const d = dueIds(ids); $("#ad").disabled = !d.length; $("#ad").onclick = () => startStandaloneQuiz(d, `Errori · ${a.title}`, ak);
  }

  /* ---------- Modulo ---------- */
  const tabMem = {};
  function renderModule(id, tab) {
    const m = MODS[id], a = A[m.area];
    tab = tab || tabMem[id] || "scheda"; tabMem[id] = tab;
    const tabs = [["scheda", "Scheda"], ["quiz", `Quiz · ${m.qids.length}`], ["aperte", `Aperte · ${m.aperte.length}`], ["esercizi", `Esercizi · ${m.esercizi.length}`]];
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><a href="#${m.area}">${a.title}</a><span>/</span><span>${modLabel(m)}</span></div>
        <h2 class="page-title">${m.title}</h2>
        ${metaRow([["Domande", m.qids.length], ["Domande viste", `${pct(seenShare(m.qids))}%`], ["Padronanza", `${pct(mastery(m.qids))}%`]])}
        ${NOTES.docs[m.id] ? `<div class="btns"><a class="btn ghost sm" href="#t-${m.id}">Leggi la teoria · ${NOTES.docs[m.id].min} min</a></div>` : ""}
        <nav class="pill tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" class="${k === tab ? "on" : ""}" aria-selected="${k === tab}">${l}</button>`).join("")}</nav>
      </section>
      <section id="tabBody"></section>`;
    view.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => renderModule(id, b.dataset.tab)));
    const body = $("#tabBody");
    if (tab === "scheda") drawScheda(body, m);
    if (tab === "quiz") drawQuizStart(body, m);
    if (tab === "aperte") body.innerHTML = "", m.aperte.forEach((o) => body.appendChild(openQuestion(o)));
    if (tab === "esercizi") drawModExercises(body, m);
    reveal(body);
  }

  function drawScheda(body, m) {
    const recall = ls.get("rs26.recall") === "1";
    body.innerHTML = `
      <div class="btns" style="justify-content:space-between">
        <label class="switch"><input type="checkbox" id="rc" ${recall ? "checked" : ""}> Nascondi le spiegazioni e prova a ricordarle</label>
        <button class="btn sm" id="toQuiz">Mettiti alla prova →</button>
      </div>
      <div class="cards ${recall ? "recall" : ""}" id="cards">${m.scheda.map(([t, d]) => `<div class="card-term"><div class="tm">${esc(t)}</div><div class="df">${esc(d)}</div></div>`).join("")}</div>`;
    $("#rc").onchange = (e) => { ls.set("rs26.recall", e.target.checked ? "1" : "0"); $("#cards").classList.toggle("recall", e.target.checked); $("#cards").querySelectorAll(".open").forEach((x) => x.classList.remove("open")); };
    $("#cards").onclick = (e) => { const c = e.target.closest(".card-term"); if (c && $("#cards").classList.contains("recall")) c.classList.toggle("open"); };
    $("#toQuiz").onclick = () => renderModule(m.id, "quiz");
  }

  function drawQuizStart(body, m) {
    const d = dueIds(m.qids);
    body.innerHTML = `
      <p class="body-text">Le domande sbagliate tornano nel ripasso finché non le indovini <b>due volte di fila</b>. La padronanza sale con le risposte giuste consecutive.</p>
      <div class="btns">
        <button class="btn" id="q10">10 domande</button>
        <button class="btn ghost" id="qall">Tutte (${m.qids.length})</button>
        <button class="btn ghost" id="qdue" ${d.length ? "" : "disabled"}>Solo errori (${d.length})</button>
      </div>
      <div id="qz"></div>`;
    const go = (ids) => { body.innerHTML = '<div id="qz"></div>'; body.scrollIntoView({ block: "start" }); runQuiz($("#qz"), ids, { onAgain: go, onExit: () => renderModule(m.id, "quiz") }); };
    $("#q10").onclick = () => go(smartPick(m.qids, 10));
    $("#qall").onclick = () => go(shuffle(m.qids));
    $("#qdue").onclick = () => go(d);
  }

  function drawModExercises(body, m) {
    if (!m.esercizi.length) { body.innerHTML = `<div class="empty">Questo modulo non ha esercizi numerici: è tutto teoria. Allenati con quiz e domande aperte.</div>`; return; }
    body.innerHTML = `<div class="ex-group">${m.esercizi.map((k) => exItem(k)).join("")}</div>`;
  }
  const exItem = (k) => { const s = P.ex[k] || { t: 0, ok: 0 }; return `<a class="ex-item" href="#ex-${k}"><span>${EX[k].title}${EX[k].exam ? ' <span class="tag">esame</span>' : ""}</span><span class="st">${s.ok ? `${s.ok} risolti` : s.t ? `${s.t} tentativi` : "nuovo"} →</span></a>`; };

  /* ---------- Motore del quiz ---------- */
  function runQuiz(root, ids, opt = {}) {
    if (!ids.length) { root.innerHTML = `<div class="empty">Nessuna domanda da mostrare.</div>`; return; }
    let i = 0, answered = false; const res = [];
    function draw() {
      const q = Q[ids[i]], m = MODS[q.mod];
      const order = shuffle(q.opts.map((_, k) => k));
      answered = false;
      root.innerHTML = `
        <div class="quiz">
          <div class="q-top"><span>${i + 1} / ${ids.length}</span><span>${q.exam ? '<span class="tag">esame</span> ' : ""}${A[q.area].title} · ${modLabel(m)}</span></div>
          <div class="q-track"><i style="width:${(i / ids.length) * 100}%"></i></div>
          <div class="q-text q-in">${esc(q.q)}</div>
          <div class="opts">${order.map((k, j) => `<button class="opt" style="--i:${j}" data-k="${k}"><span class="key">${LETTERS[j]}</span><span>${esc(q.opts[k])}</span><span class="mk"></span></button>`).join("")}</div>
          <div id="after"></div>
          <div class="kbd-hint">Tasti: A–D o 1–4 per rispondere, Invio per andare avanti</div>
        </div>`;
      const btns = [...root.querySelectorAll(".opt")];
      const choose = (b) => {
        if (answered) return; answered = true;
        const k = +b.dataset.k, ok = k === 0;
        record(q.id, ok); res.push({ id: q.id, ok, pick: k });
        btns.forEach((x) => { x.disabled = true; const kk = +x.dataset.k; if (kk === 0) { x.classList.add("ok"); x.querySelector(".mk").textContent = "✓"; } else if (x === b) { x.classList.add("bad"); x.querySelector(".mk").textContent = "✗"; } else x.classList.add("dim"); });
        $("#after", root).innerHTML = `<div class="expl"><span class="verdict ${ok ? "ok" : "bad"}">${ok ? "Corretto" : "Sbagliato"}</span><span>${esc(q.expl)}</span></div>
          <div class="btns" style="margin-top:14px"><button class="btn" id="nx">${i + 1 < ids.length ? "Avanti →" : "Vedi il risultato"}</button></div>`;
        $("#nx", root).onclick = next; $("#nx", root).focus({ preventScroll: true });
      };
      btns.forEach((b) => (b.onclick = () => choose(b)));
      activeKeys = (e) => {
        const k = e.key.toLowerCase(); const idx = "abcde".indexOf(k) >= 0 ? "abcde".indexOf(k) : "12345".indexOf(k);
        if (!answered && idx >= 0 && btns[idx]) { e.preventDefault(); choose(btns[idx]); }
        else if (answered && (e.key === "Enter" || e.key === "ArrowRight")) { e.preventDefault(); next(); }
      };
    }
    function next() { i++; if (i < ids.length) { draw(); root.scrollIntoView({ block: "nearest" }); } else done(); }
    function done() {
      activeKeys = null;
      const ok = res.filter((r) => r.ok).length, wrong = res.filter((r) => !r.ok);
      root.innerHTML = `
        <div class="quiz">
          <div class="score-big">${ok}/${res.length}</div>
          <p class="lead">${ok === res.length ? "Tutte giuste. Queste domande salgono di livello nel ripasso." : `${wrong.length} da rivedere: le trovi anche nella sezione Ripasso.`}</p>
          <div class="btns">${wrong.length ? `<button class="btn" id="again">Ripeti le ${wrong.length} sbagliate</button>` : ""}${opt.onExit ? `<button class="btn ghost" id="exit">Torna al modulo</button>` : `<a class="btn ghost" href="#ripasso">Vai al ripasso</a>`}</div>
          ${wrong.length ? `<div class="cards" style="margin-top:8px">${wrong.map((r) => { const q = Q[r.id]; return `<div class="card-term"><div class="tm">${esc(q.q)}</div><div class="df"><span class="verdict bad">Tua: ${esc(q.opts[r.pick])}</span><br><span class="verdict ok">Giusta: ${esc(q.opts[0])}</span><br>${esc(q.expl)}</div></div>`; }).join("")}</div>` : ""}
        </div>`;
      const ag = $("#again", root); if (ag) ag.onclick = () => (opt.onAgain ? opt.onAgain(shuffle(wrong.map((r) => r.id))) : runQuiz(root, shuffle(wrong.map((r) => r.id)), opt));
      const ex = $("#exit", root); if (ex) ex.onclick = opt.onExit;
    }
    draw();
  }

  /* ---------- Domande aperte ---------- */
  function openQuestion(o, cfg = {}) {
    const el = document.createElement("div");
    el.className = "open-q";
    const draftKey = (cfg.exam ? "rs26.examdraft." : "rs26.draft.") + o.id;
    const prev = P.open[o.id];
    el.innerHTML = `
      ${cfg.num ? `<div class="qn mono muted" style="font-size:13px">${cfg.num}</div>` : `<div class="mono muted" style="font-size:12px">${A[o.area].title} · ${modLabel(MODS[o.mod])}${prev ? ` · ultimo voto ${String(prev.v).replace(".", ",")}/3` : ""}</div>`}
      <div class="qt">${esc(o.q)}</div>
      <textarea id="ans-${cfg.exam ? "x" : ""}${o.id}" placeholder="Scrivi la risposta come all'esame: definizione, meccanismo, esempio, limiti. 8–12 righe."></textarea>
      <div class="btns" style="justify-content:space-between"><span class="wc">0 parole</span>
        <span class="btns">${cfg.exam && !cfg.graded ? "" : `<button class="btn sm" data-self>Autovaluta con la traccia</button>`}</span></div>
      <div class="out"></div>`;
    const ta = $("textarea", el), wc = $(".wc", el), out = $(".out", el);
    ta.value = ls.get(draftKey) || "";
    const upd = () => { const n = (ta.value.trim().match(/\S+/g) || []).length; wc.textContent = `${n} parole`; };
    upd();
    ta.addEventListener("input", () => { upd(); ls.set(draftKey, ta.value); });
    const sb = $("[data-self]", el);
    const graded = (v, how) => { P.open[o.id] = { v, t: Date.now(), how }; save(); if (cfg.onGrade) cfg.onGrade(v); };
    if (sb) sb.onclick = () => {
      out.innerHTML = `<div class="grade"><div class="gl">Traccia: spunta i punti che hai trattato correttamente</div>
        <div class="checklist">${o.punti.map((p, i) => `<label><input type="checkbox" data-i="${i}"><span>${esc(p)}</span></label>`).join("")}</div>
        <div class="btns"><button class="btn sm" data-calc>Calcola il voto</button><span class="res mono"></span></div></div>`;
      $("[data-calc]", out).onclick = () => {
        const n = out.querySelectorAll("input:checked").length, v = Math.round((3 * n) / o.punti.length * 2) / 2;
        $(".res", out).textContent = `${String(v).replace(".", ",")} / 3`; graded(v, "self");
      };
    };
    el.getAnswer = () => ta.value;
    return el;
  }

  /* ---------- Esercizi ---------- */
  function renderExList() {
    const groups = {};
    Object.values(EX).forEach((e) => (groups[e.mod] = groups[e.mod] || []).push(e.id));
    const order = [...A.reti.modules, ...A.sicurezza.modules].filter((m) => groups[m.id]);
    const tot = Object.values(P.ex).reduce((a, x) => a + (x.ok || 0), 0);
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><span>Esercizi</span></div>
        <h2 class="page-title">Esercizi</h2>
        <p class="lead">Tutti i tipi di problema numerico del corso, di reti e di sicurezza. I valori cambiano a ogni tentativo e ogni esercizio ha la soluzione passo per passo.</p>
        ${metaRow([["Tipi di esercizio", Object.keys(EX).length], ["Risolti senza errori", tot], ["Tipo esame", Object.values(EX).filter((e) => e.exam).length]])}
      </section>
      <section class="ex-list">${order.map((m) => `<div class="ex-group"><div class="gl">${A[m.area].title.toUpperCase()} · ${modLabel(m).toUpperCase()} · ${esc(m.title)}</div>${groups[m.id].map(exItem).join("")}</div>`).join("")}</section>`;
  }

  function parseNum(s) {
    let t = String(s).trim().replace(/\s/g, "").replace(/·10\^?/g, "e").replace(/[x×]10\^/gi, "e").replace(/\^/g, "");
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "");
    t = t.replace(",", ".");
    return t === "" ? NaN : Number(t);
  }
  const normTxt = (s) => String(s).trim().toLowerCase().replace(/\s+/g, "");
  function checkField(fl, v) {
    if (fl.check) return fl.check(v);
    if (fl.kind === "text" || fl.kind === "choice") return normTxt(v) === normTxt(fl.ans);
    const x = parseNum(v); if (!isFinite(x)) return false;
    const tol = Math.max(fl.abs != null ? fl.abs : 0, Math.abs(fl.ans) * (fl.tol != null ? fl.tol : 0.01), 1e-9);
    return Math.abs(x - fl.ans) <= tol + 1e-9;
  }

  function renderExercise(k) {
    const E = EX[k], m = MODS[E.mod];
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><a href="#esercizi">Esercizi</a><span>/</span><a href="#m-${m.id}">${modLabel(m)}</a></div>
        <h2 class="page-title">${E.title}</h2>
        <div class="btns"><span class="note">${A[m.area].title} · ${esc(m.title)}</span></div>
      </section>
      <section id="exBody" class="ex"></section>`;
    drawExercise($("#exBody"), k);
  }
  function drawExercise(root, k) {
    const E = EX[k], g = E.gen();
    root.innerHTML = `
      <div class="ex-body">${g.html}</div>
      <form class="fields" id="exf" autocomplete="off">
        ${fieldsHtml(g, "")}
        <div class="btns"><button class="btn" type="submit">Verifica</button><button class="btn ghost" type="button" id="showSol">Mostra la soluzione</button><button class="btn ghost" type="button" id="newEx">Nuovi valori</button></div>
      </form>
      <p class="note">Usa la virgola o il punto per i decimali; per numeri molto grandi o piccoli puoi scrivere 1,5e9. Tolleranza dell'1% salvo dove serve il valore esatto.</p>
      <div class="sol" id="sol" hidden>${g.sol}</div>`;
    const form = $("#exf", root);
    form.onsubmit = (e) => {
      e.preventDefault();
      let all = true;
      g.fields.forEach((fl, i) => {
        const box = form.querySelector(`.fld[data-i="${i}"]`), v = $("#f" + i, form).value;
        const ok = v.trim() !== "" && checkField(fl, v); all = all && ok;
        box.classList.toggle("ok", ok); box.classList.toggle("bad", !ok);
        $(".res", box).textContent = ok ? "✓" : v.trim() === "" ? "manca" : "✗";
      });
      const s = P.ex[k] || { t: 0, ok: 0 }; s.t++; if (all) s.ok++; P.ex[k] = s; save();
      if (all) { $("#sol", root).hidden = false; }
    };
    $("#showSol", root).onclick = () => { const s = $("#sol", root); s.hidden = !s.hidden; };
    $("#newEx", root).onclick = () => drawExercise(root, k);
  }

  /* ---------- Ripasso ---------- */
  function renderReview() {
    const b = [0, 0, 0, 0], unseen = ALLQ.filter((id) => qs(id).s === 0).length;
    ALLQ.forEach((id) => { const p = qs(id); if (p.s) b[p.b]++; });
    const due = dueIds();
    const seg = (n, c) => `<i style="width:${(n / ALLQ.length) * 100}%;background:${c}"></i>`;
    const weak = [...A.reti.modules, ...A.sicurezza.modules].map((m) => ({ m, x: mastery(m.qids) })).sort((a, c) => a.x - c.x).slice(0, 3);
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><span>Ripasso</span></div>
        <h2 class="page-title">Ripasso</h2>
        <p class="lead">Ogni domanda ha un livello da 0 a 3. Una risposta giusta la fa salire di un livello, una sbagliata la riporta a 0. Le domande sbagliate restano qui finché non arrivano al livello 2.</p>
        <div class="boxes">
          <div class="box"><span class="bn">${b[0]}</span><span class="bl">Livello 0 · sbagliate</span></div>
          <div class="box"><span class="bn">${b[1]}</span><span class="bl">Livello 1</span></div>
          <div class="box"><span class="bn">${b[2]}</span><span class="bl">Livello 2</span></div>
          <div class="box"><span class="bn">${b[3]}</span><span class="bl">Livello 3 · solide</span></div>
        </div>
        <div class="pie">${seg(b[3], "var(--fg)")}${seg(b[2], "var(--muted)")}${seg(b[1], "var(--faint)")}${seg(b[0], "var(--bad)")}</div>
        <div class="legend"><span style="--c:var(--fg)">Livello 3</span><span style="--c:var(--muted)">Livello 2</span><span style="--c:var(--faint)">Livello 1</span><span style="--c:var(--bad)">Livello 0</span><span style="--c:var(--chip-2)">Mai viste (${unseen})</span></div>
        <div class="btns"><button class="btn" id="rv" ${due.length ? "" : "disabled"}>Ripassa gli errori (${due.length})</button><button class="btn ghost" id="rm">Quiz misto da 20</button></div>
      </section>
      <section>
        <h2 class="h2">Moduli più deboli</h2>
        <div class="mods">${weak.map(({ m, x }) => `<a class="mod-row" href="#m-${m.id}"><span class="n">${m.area === "reti" ? "R" : "S"}${m.n}</span><span><span class="t">${m.title}</span><br><span class="s">${A[m.area].title} · ${dueIds(m.qids).length} errori in sospeso</span></span>${progBar(x)}<span class="arr">→</span></a>`).join("")}</div>
      </section>
      <section>
        <h2 class="h2">Domande aperte</h2>
        <p class="body-text">Allenati a scrivere: ne esce una a caso tra le ${Object.keys(OPENS).length} del corso.</p>
        <div id="rndOpen"></div>
        <div class="btns"><button class="btn ghost" id="otherOpen">Un'altra domanda</button></div>
      </section>`;
    $("#rv").onclick = () => startStandaloneQuiz(due.slice(0, 30), "Ripasso degli errori", "ripasso");
    $("#rm").onclick = () => startStandaloneQuiz(smartPick(ALLQ, 20), "Quiz misto", "ripasso");
    const showOpen = () => { const ks = Object.keys(OPENS); const o = OPENS[ks[Math.floor(Math.random() * ks.length)]]; const box = $("#rndOpen"); box.innerHTML = ""; box.appendChild(openQuestion(o)); };
    showOpen(); $("#otherOpen").onclick = showOpen;
  }

  /* ---------- Esame ---------- */
  function renderExamSetup() {
    const hist = (P.exams || []).slice(-6).reverse();
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><span>Esame</span></div>
        <h2 class="page-title">Simulazione d'esame</h2>
        <p class="lead">Lo stesso formato dell'esame: domande chiuse di reti e sicurezza, esercizi numerici di reti con risposta da scrivere (subnetting, Dijkstra, ALOHA, TCP…) e due domande aperte di sicurezza, di cui una su firewall e regole. Il timer è in alto; alla scadenza la prova si consegna da sola.</p>
        ${metaRow([["Parte 1", "18 chiuse × 1 punto"], ["Parte 2", "4 esercizi × 2 punti"], ["Parte 3", "2 aperte × 3 punti"]])}
        <div class="form-row">
          <div class="fld"><label for="fmt">Formato</label><select id="fmt"><option value="appello">Come all'esame (18 + 4 esercizi + 2 aperte)</option><option value="quiz">Solo domande chiuse (26 + 2 aperte)</option></select></div>
          <div class="fld"><label for="dur">Durata</label><select id="dur"><option value="60">60 minuti</option><option value="75">75 minuti</option><option value="90" selected>90 minuti</option><option value="100">100 minuti</option></select></div>
          <button class="btn" id="startEx">Inizia la prova</button>
        </div>
        <p class="note">All'esame le chiuse valgono da 0,75 a 1,5 punti e gli esercizi fino a 3: qui ogni esercizio vale 2 punti, assegnati in proporzione ai campi corretti. Totale 32.</p>
      </section>
      <section>
        <h2 class="h2">Prove precedenti</h2>
        ${hist.length ? `<div class="mods">${hist.map((h) => `<div class="mod-row" style="cursor:default"><span class="n">${new Date(h.d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</span><span><span class="t">${fmtP(h.closed)}/26 parte chiusa${h.open != null ? ` · ${fmtP(h.open)}/6 aperte` : ""}</span><br><span class="s">${h.total != null ? `Totale ${fmtP(h.total)}/32` : "Aperte non valutate"}</span></span>${progBar(h.closed / 26)}<span></span></div>`).join("")}</div>` : `<div class="empty">Nessuna prova ancora. Fai la prima dopo un giro di quiz su tutti i moduli.</div>`}
      </section>`;
    $("#startEx").onclick = () => runExam($("#fmt").value, +$("#dur").value);
  }

  const fieldsHtml = (g, pre) => g.fields.map((fl, i) => `<div class="fld" data-i="${i}"><label for="${pre}f${i}">${fl.label}</label><div class="in">${fl.kind === "choice"
    ? `<select id="${pre}f${i}"><option value="">Scegli…</option>${fl.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select>`
    : `<input id="${pre}f${i}" inputmode="${fl.kind === "text" ? "text" : "decimal"}" autocomplete="off" autocapitalize="off" spellcheck="false">`}${fl.unit ? `<span class="unit">${fl.unit}</span>` : ""}<span class="res"></span></div></div>`).join("");

  function runExam(fmtKind, minutes) {
    const app = fmtKind === "appello";
    const nQ = app ? 18 : 26, nR = app ? 12 : 13;
    const pickN = (ak, n) => { const pool = areaQ(ak); const ex = shuffle(pool.filter((id) => Q[id].exam)).slice(0, Math.ceil(n / 2)); const rest = smartPick(pool.filter((id) => !ex.includes(id)), pool.length).sort(() => Math.random() - 0.5); return [...ex, ...rest].slice(0, n); };
    const ids = shuffle([...pickN("reti", nR), ...pickN("sicurezza", nQ - nR)]);
    const exPool = Object.values(EX).filter((e) => e.exam && e.mod.startsWith("r") && e.id !== "cidr8").map((e) => e.id);
    const exIds = app ? ["cidr8", ...shuffle(exPool).slice(0, 3)] : [];
    const gens = exIds.map((k) => EX[k].gen());
    const opensS = Object.values(OPENS).filter((o) => o.area === "sicurezza");
    const fw = opensS.filter((o) => o.mod === "s8"), oth = opensS.filter((o) => o.mod !== "s8");
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    const opens = app ? [rnd(fw), rnd(oth)] : [rnd(Object.values(OPENS).filter((o) => o.area === "reti")), rnd(opensS)];
    opens.forEach((o) => ls.set("rs26.examdraft." + o.id, ""));
    const orders = ids.map((id) => shuffle(Q[id].opts.map((_, k) => k)));
    const ans = {};
    const end = Date.now() + minutes * 60000;
    view.innerHTML = `
      <section>
        <div class="timer"><span>Prova · <span id="answered">0</span>/${nQ} chiuse</span><span class="t" id="clock">--:--</span><button class="btn sm" id="hand">Consegna</button></div>
        <h2 class="page-title">Prova d'esame</h2>
        <p class="body-text">Rispondi nell'ordine che preferisci; puoi cambiare risposta fino alla consegna. Nessuna penalità per le risposte sbagliate.${app ? " Negli esercizi usa la virgola per i decimali." : ""}</p>
      </section>
      <section>
        <h2 class="h2">Parte 1 · Domande chiuse</h2>
        <div>${ids.map((id, i) => { const q = Q[id]; return `<div class="exq" data-q="${i}"><div class="qn">Domanda ${i + 1} · ${A[q.area].title}${q.exam ? ' · <span class="tag">esame</span>' : ""}</div><div class="q-text" style="font-size:18px">${esc(q.q)}</div><div class="opts">${orders[i].map((k, j) => `<button class="opt" data-k="${k}"><span class="key">${LETTERS[j]}</span><span>${esc(q.opts[k])}</span><span class="mk"></span></button>`).join("")}</div></div>`; }).join("")}</div>
      </section>
      ${app ? `<section>
        <h2 class="h2">Parte 2 · Esercizi</h2>
        <div>${gens.map((g, i) => `<div class="exq exn" data-e="${i}"><div class="qn">Esercizio ${i + 1} · ${EX[exIds[i]].title} · 2 punti</div><div class="ex-body">${g.html}</div><div class="fields">${fieldsHtml(g, `e${i}`)}</div></div>`).join("")}</div>
      </section>` : ""}
      <section>
        <h2 class="h2">Parte ${app ? 3 : 2} · Domande aperte</h2>
        <div id="exOpen"></div>
        <div class="btns"><button class="btn" id="hand2">Consegna la prova</button></div>
      </section>`;
    const openEls = opens.map((o, i) => { const el = openQuestion(o, { exam: true, num: `Domanda aperta ${i + 1} · 3 punti` }); $("#exOpen").appendChild(el); return el; });
    view.querySelectorAll(".exq[data-q]").forEach((box) => box.addEventListener("click", (e) => {
      const b = e.target.closest(".opt"); if (!b) return;
      box.querySelectorAll(".opt").forEach((x) => x.classList.toggle("sel", x === b));
      ans[+box.dataset.q] = +b.dataset.k; $("#answered").textContent = Object.keys(ans).length;
    }));
    const clock = $("#clock");
    const tick = () => {
      const left = Math.max(0, end - Date.now()), mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      clock.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`; clock.classList.toggle("low", left < 5 * 60000);
      if (left <= 0) submit();
    };
    const iv = setInterval(tick, 1000); tick();
    let submitted = false;
    cleanup = () => clearInterval(iv);
    const confirmHand = (btn) => {
      if (btn.dataset.armed) { submit(); return; }
      const missing = nQ - Object.keys(ans).length;
      btn.dataset.armed = "1"; btn.textContent = missing ? `${missing} chiuse senza risposta: consegna comunque` : "Conferma la consegna";
      setTimeout(() => { delete btn.dataset.armed; btn.textContent = btn.id === "hand" ? "Consegna" : "Consegna la prova"; }, 4000);
    };
    $("#hand").onclick = () => confirmHand($("#hand")); $("#hand2").onclick = () => confirmHand($("#hand2"));
    function submit() {
      if (submitted) return; submitted = true; clearInterval(iv); cleanup = null;
      let closed = 0;
      ids.forEach((id, i) => { const ok = ans[i] === 0; if (ok) closed++; if (ans[i] != null) record(id, ok); });
      const exRes = gens.map((g, i) => {
        const vals = g.fields.map((fl, j) => $(`#e${i}f${j}`).value);
        const oks = g.fields.map((fl, j) => vals[j].trim() !== "" && checkField(fl, vals[j]));
        const pts = (2 * oks.filter(Boolean).length) / g.fields.length;
        const s = P.ex[exIds[i]] || { t: 0, ok: 0 }; s.t++; if (oks.every(Boolean)) s.ok++; P.ex[exIds[i]] = s;
        closed += pts; return { vals, oks, pts };
      });
      closed = Math.round(closed * 100) / 100;
      const texts = openEls.map((el) => el.getAnswer());
      const rec = { d: Date.now(), closed, open: null, total: null, fmt: fmtKind };
      P.exams = (P.exams || []).concat(rec); save();
      showExamResult({ ids, ans, opens, texts, rec, nQ, gens, exIds, exRes });
    }
  }

  const ansText = (fl) => (typeof fl.ans === "number" ? fmt(fl.ans) : esc(fl.ans));
  function showExamResult(r) {
    const { ids, ans, opens, texts, rec, nQ, gens, exIds, exRes } = r;
    window.scrollTo(0, 0);
    const wrong = ids.map((id, i) => ({ id, i, pick: ans[i] })).filter((x) => x.pick !== 0);
    const quizPts = ids.filter((_, i) => ans[i] === 0).length, exPts = exRes.reduce((a, x) => a + x.pts, 0);
    const og = [null, null];
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#esame">← Simulazioni</a></div>
        <h2 class="page-title">Risultato</h2>
        <div class="score-big"><span id="tot">${fmtP(rec.closed)}</span><span class="muted" style="font-size:.4em;letter-spacing:-0.03em"> / 32</span></div>
        ${metaRow([["Chiuse", `${quizPts} / ${nQ}`], gens.length ? ["Esercizi", `${fmtP(exPts)} / ${gens.length * 2}`] : ["Senza risposta", nQ - Object.keys(ans).length], ["Aperte", `<span id="openSc">da valutare</span> / 6`]])}
        <p class="body-text">Autovaluta le due risposte aperte qui sotto con la traccia dei punti chiave per ottenere il totale.</p>
      </section>
      <section><h2 class="h2">Domande aperte</h2><div id="resOpen"></div></section>
      ${gens.length ? `<section><h2 class="h2">Esercizi</h2>${gens.map((g, i) => `<div class="exq"><div class="qn">Esercizio ${i + 1} · ${EX[exIds[i]].title} · ${fmtP(exRes[i].pts)}/2</div><div class="ex-body">${g.html}</div>
        <div class="fields">${g.fields.map((fl, j) => `<div class="fld ${exRes[i].oks[j] ? "ok" : "bad"}"><label>${fl.label}</label><div class="in"><span class="mono">${esc(exRes[i].vals[j] || "—")}</span><span class="res">${exRes[i].oks[j] ? "✓" : `✗ giusta: ${ansText(fl)}`}</span></div></div>`).join("")}</div>
        <div class="sol">${g.sol}</div></div>`).join("")}</section>` : ""}
      <section>
        <h2 class="h2">Domande chiuse da rivedere (${wrong.length})</h2>
        ${wrong.length ? `<div class="cards">${wrong.map(({ id, i, pick }) => { const q = Q[id]; return `<div class="card-term"><div class="tm"><span class="mono muted" style="font-size:12px">Domanda ${i + 1}</span><br>${esc(q.q)}</div><div class="df">${pick == null ? `<span class="verdict bad">Nessuna risposta</span>` : `<span class="verdict bad">Tua: ${esc(q.opts[pick])}</span>`}<br><span class="verdict ok">Giusta: ${esc(q.opts[0])}</span><br>${esc(q.expl)}</div></div>`; }).join("")}</div>` : `<div class="empty">Tutte giuste.</div>`}
      </section>`;
    const upd = () => {
      if (og[0] == null || og[1] == null) return;
      rec.open = og[0] + og[1]; rec.total = Math.round((rec.closed + rec.open) * 100) / 100; save();
      $("#openSc").textContent = fmtP(rec.open); $("#tot").textContent = fmtP(rec.total);
    };
    opens.forEach((o, i) => {
      ls.set("rs26.examdraft." + o.id, texts[i]);
      const el = openQuestion(o, { exam: true, graded: true, num: `Domanda aperta ${i + 1} · 3 punti`, onGrade: (v) => { og[i] = v; upd(); } });
      $("#resOpen").appendChild(el);
    });
    reveal(view);
  }

  /* ---------- Teoria ---------- */
  function renderTheoryList() {
    const read = P.read || {}, nRead = NOTES.order.filter((k) => read[k]).length;
    const mins = NOTES.order.reduce((a, k) => a + NOTES.docs[k].min, 0);
    const row = (k) => { const d = NOTES.docs[k]; return `<a class="mod-row" href="#t-${k}"><span class="n">${d.area === "reti" ? d.n.padStart(2, "0") : d.n}</span><span><span class="t">${esc(d.title)}</span><br><span class="s">${d.toc.length} sezioni · ${d.min} min</span></span><span class="prog"><span>${read[k] ? "letto ✓" : ""}</span></span><span class="arr">→</span></a>`; };
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><span>Teoria</span></div>
        <h2 class="page-title">Teoria</h2>
        <p class="lead">Gli appunti completi di ogni capitolo e lezione, con figure, esempi svolti e riquadri da ricordare. Leggi un capitolo, poi passa al quiz dello stesso modulo: la teoria serve soprattutto alle domande aperte e agli esercizi.</p>
        ${metaRow([["Documenti", NOTES.order.length], ["Letti", `${nRead} / ${NOTES.order.length}`], ["Lettura totale", `circa ${String(Math.round((mins / 60) * 10) / 10).replace(".", ",")} ore`]])}
      </section>
      <section><h2 class="h2">Reti</h2><div class="mods">${NOTES.order.filter((k) => NOTES.docs[k].area === "reti").map(row).join("")}</div></section>
      <section><h2 class="h2">Sicurezza</h2><div class="mods">${NOTES.order.filter((k) => NOTES.docs[k].area === "sicurezza").map(row).join("")}</div></section>`;
  }

  function renderTheory(k) {
    const d = NOTES.docs[k], i = NOTES.order.indexOf(k), prev = NOTES.order[i - 1], next = NOTES.order[i + 1];
    const label = d.area === "reti" ? `Cap. ${d.n}` : `Lezione ${d.n}`;
    const isRead = () => !!(P.read || {})[k];
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><a href="#teoria">Teoria</a><span>/</span><span>${label}</span></div>
        <h2 class="page-title">${esc(d.title)}</h2>
        ${metaRow([["Lettura", `${d.min} min`], ["Sezioni", d.toc.length], ["Stato", `<span id="rdState">${isRead() ? "letto ✓" : "da leggere"}</span>`]])}
        <details class="toc" ${window.innerWidth > 720 ? "open" : ""}><summary>Indice</summary><ol>${d.toc.map(([id, t]) => `<li><button type="button" data-go="${id}">${esc(t.replace(/^\d+\.\s*/, ""))}</button></li>`).join("")}</ol></details>
      </section>
      <article class="notes" id="notes">${d.html}</article>
      <section class="notes-end">
        <div class="btns">${MODS[k] ? `<a class="btn" href="#m-${k}">Mettiti alla prova: quiz ed esercizi →</a>` : ""}<button class="btn ghost" id="markRead">${isRead() ? "Segna come da rileggere" : "Segna come letto"}</button></div>
        <div class="pager">${prev ? `<a href="#t-${prev}" class="pg"><span class="mono muted">← precedente</span><span>${esc(NOTES.docs[prev].title)}</span></a>` : "<span></span>"}${next ? `<a href="#t-${next}" class="pg nx"><span class="mono muted">successivo →</span><span>${esc(NOTES.docs[next].title)}</span></a>` : "<span></span>"}</div>
      </section>`;
    view.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { const t = document.getElementById(b.dataset.go); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); if (window.innerWidth <= 720) b.closest("details").open = false; }));
    const setRead = (v) => { P.read = P.read || {}; if (v) P.read[k] = Date.now(); else delete P.read[k]; save(); $("#rdState").textContent = v ? "letto ✓" : "da leggere"; $("#markRead").textContent = v ? "Segna come da rileggere" : "Segna come letto"; };
    $("#markRead").onclick = () => setRead(!isRead());
    const art = $("#notes");
    const onScroll = () => {
      const r = art.getBoundingClientRect(), h = r.height - window.innerHeight * 0.6;
      const x = Math.max(0, Math.min(1, -r.top / Math.max(1, h)));
      if (x > 0.97 && !isRead()) setRead(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    cleanup = () => window.removeEventListener("scroll", onScroll);
  }

  /* ---------- Animazioni d'ingresso ---------- */
  const RV_SEL = ".mod-row, .cover, .card-term, .ex-item, .step, .exq, .open-q, .meta > div, .box, .notes > *, .ex-group .gl";
  let rvObs = null;
  function reveal(root) {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    const els = [...root.querySelectorAll(RV_SEL)].filter((el) => !el.classList.contains("rv"));
    if (!els.length) return;
    if (!rvObs) rvObs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rvObs.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
    let n = 0; const vh = window.innerHeight;
    els.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      el.style.setProperty("--d", top < vh ? `${Math.min(n++, 12) * 45}ms` : "0ms");
      el.classList.add("rv"); rvObs.observe(el);
    });
    setTimeout(() => els.forEach((el) => el.classList.add("in")), 2500);
  }


  /* ---------- Metodo ---------- */
  function renderMethod() {
    view.innerHTML = `
      <section>
        <div class="crumb"><a href="#">Home</a><span>/</span><span>Metodo</span></div>
        <h2 class="page-title">Il metodo</h2>
        <p class="lead"><b>26 punti su 32</b> arrivano da domande chiuse ed esercizi numerici: la maggior parte del tempo va al <b>richiamo attivo</b>, cioè rispondere e vedere subito perché una risposta è giusta. Rileggere le slide dà l'impressione di sapere ma fissa poco. I <b>6 punti</b> delle aperte premiano chi sa spiegare un meccanismo in ordine, e si allenano scrivendo.</p>
      </section>
      <section>
        <h2 class="h2">Il ciclo per ogni modulo</h2>
        <div class="steps">
          <div class="step"><span class="sn">00</span><div><h3>Teoria, una volta per capitolo</h3><p>Leggi gli appunti del capitolo nella sezione Teoria (20–40 minuti). Non sottolineare: alla fine di ogni sezione chiudi gli occhi e riassumi a voce i riquadri «da ricordare».</p></div></div>
          <div class="step"><span class="sn">01</span><div><h3>Scheda con le spiegazioni nascoste</h3><p>Attiva «Nascondi le spiegazioni»: leggi il termine, prova a dirlo a voce, poi tocca per controllare. Circa 15 minuti a modulo, dopo aver visto le slide almeno una volta.</p></div></div>
          <div class="step"><span class="sn">02</span><div><h3>Quiz da 10 domande</h3><p>Le domande nuove e quelle sbagliate escono per prime. Rileggi sempre la spiegazione, anche quando indovini. Obiettivo: padronanza di almeno 80% per modulo.</p></div></div>
          <div class="step"><span class="sn">03</span><div><h3>Esercizi numerici</h3><p>Quelli segnati «esame» escono quasi sempre: blocco CIDR in 8 sottoreti, Dijkstra con TTL, ALOHA, backoff di Ethernet, CSMA/CD, segmenti TCP, grafico di Reno, DNS con cache, P2P, NAT, tunneling, indirizzi MAC/IP, tabelle del firewall e comandi iptables. Per la sicurezza ci sono anche catene di certificati, record TLS e cipher suite. Prova senza guardare la soluzione; i valori cambiano a ogni tentativo, quindi ripeti finché lo risolvi due volte di fila.</p></div></div>
          <div class="step"><span class="sn">04</span><div><h3>Ripasso degli errori, ogni giorno</h3><p>Apri Ripasso all'inizio di ogni sessione: prima gli errori in sospeso, poi un quiz misto. Una domanda esce dal ripasso solo dopo due risposte giuste consecutive.</p></div></div>
          <div class="step"><span class="sn">05</span><div><h3>Domande aperte scritte a tempo</h3><p>10 minuti, 8–12 righe: definizione, meccanismo, esempio, limiti. Poi l'autovalutazione con la traccia dei punti chiave: spunta solo i punti che hai spiegato davvero.</p></div></div>
          <div class="step"><span class="sn">06</span><div><h3>Simulazioni complete</h3><p>Nel formato dell'esame: 18 chiuse, 4 esercizi, 2 aperte di sicurezza (una su firewall e regole). Una a settimana, due nelle ultime due settimane. Dopo ogni prova rifai subito le domande sbagliate.</p></div></div>
        </div>
      </section>
      <section>
        <h2 class="h2">Un piano di tre settimane</h2>
        <div class="cards">
          <div class="card-term"><div class="tm">Settimana 1</div><div class="df">Reti cap. 1–4 e Sicurezza 01–04. Ogni giorno: un capitolo di teoria, poi scheda, quiz ed esercizi dello stesso modulo, e 15 minuti di ripasso.</div></div>
          <div class="card-term"><div class="tm">Settimana 2</div><div class="df">Reti cap. 5–7 e Sicurezza 05–10 (firewall e iptables valgono quasi sempre una domanda aperta). A fine settimana la prima simulazione completa.</div></div>
          <div class="card-term"><div class="tm">Settimana 3</div><div class="df">Moduli più deboli (li trovi in Ripasso), esercizi misti, una domanda aperta al giorno, due simulazioni.</div></div>
          <div class="card-term"><div class="tm">Il giorno prima</div><div class="df">Solo ripasso degli errori e le schede in modalità nascosta. Niente argomenti nuovi.</div></div>
        </div>
        <p class="note">Le domande seguono il programma 2026/27: date, soglie e numeri (per esempio i 47 giorni dei certificati entro il 2029 o le regole NIST SP 800-63B-4) sono quelli presentati a lezione.</p>
      </section>`;
  }

  /* ---------- Tema e barra fluttuante ---------- */
  const themes = ["system", "dark", "light"];
  function applyTheme(t) { if (t === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t); }
  let theme = ls.get("rs26.theme") || "system"; if (!themes.includes(theme)) theme = "system";
  if (theme !== "system") applyTheme(theme);
  $("#themeBtn").onclick = () => {
    theme = themes[(themes.indexOf(theme) + 1) % themes.length]; applyTheme(theme); ls.set("rs26.theme", theme);
    $("#themeBtn").setAttribute("aria-label", `Tema: ${theme === "system" ? "di sistema" : theme === "dark" ? "scuro" : "chiaro"}`);
  };
  // Scorrimento fluido dai link della navigazione: prima si risale in cima, poi si apre la sezione
  function smoothGo(href) {
    const target = href === "#" ? "" : href.slice(1);
    const same = decodeURIComponent(location.hash.slice(1)) === target;
    const go = () => { if (!same) location.hash = href; };
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.scrollY < 4 || reduce) { if (same) window.scrollTo(0, 0); go(); return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (same) return;
    const t0 = performance.now();
    const wait = () => { if (window.scrollY < 4 || performance.now() - t0 > 900) go(); else requestAnimationFrame(wait); };
    requestAnimationFrame(wait);
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("#navMain a, #navFloat a, .word a, .float-nav .fw");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); smoothGo(a.getAttribute("href") || "#");
  });
  const fnav = $("#floatNav");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { const show = !e.isIntersecting; fnav.classList.toggle("show", show); fnav.setAttribute("aria-hidden", String(!show)); }, { threshold: 0 }).observe($("#mast"));
  }

  route();
  initSync();
})();
