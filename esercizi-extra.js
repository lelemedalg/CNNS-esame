/* Esercizi aggiuntivi: tutti i tipi di problema numerico del corso.
   Stesso formato di esercizi.js: gen() → { html, fields, sol }. exam: true = usato nella simulazione d'esame. */
(function () {
  const EX = window.EXERCISES, f = window.fmtNum;
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lines = (...l) => l.join("<br>");
  const ip2s = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
  const maskOf = (x) => (x === 0 ? 0 : (0xffffffff << (32 - x)) >>> 0);
  const norm = (v) => String(v).trim().toLowerCase().replace(/\s+/g, "");
  const cidrCheck = (ans) => (v) => norm(v).replace(/\\/g, "/") === ans;
  // insieme di numeri: "1, 4" = "4 1"; "nessuno" = vuoto
  const setCheck = (arr) => (v) => {
    const t = norm(v); if (!arr.length) return /^(nessun[oa]?|0|-|vuoto)$/.test(t);
    const got = (t.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
    return got.join(",") === arr.slice().sort((a, b) => a - b).join(",");
  };
  const vecCheck = (arr) => (v) => { const got = (String(v).match(/-?\d+/g) || []).map(Number); return got.length === arr.length && got.every((x, i) => x === arr[i]); };
  const mac = () => Array.from({ length: 6 }, () => R(0, 255).toString(16).toUpperCase().padStart(2, "0")).join("-");
  const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const pre = (s) => `<div class="code">${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`;

  // Cammini minimi con controllo di unicità (usato da routerttl)
  function shortest(names, E, src) {
    const adj = {}; names.forEach((n) => (adj[n] = []));
    E.forEach((e) => { adj[e.a].push([e.b, e.c]); adj[e.b].push([e.a, e.c]); });
    const D = {}, P = {}, done = new Set(); names.forEach((n) => (D[n] = Infinity)); D[src] = 0;
    while (done.size < names.length) {
      const cand = names.filter((n) => !done.has(n)); const w = cand.reduce((m, n) => (D[n] < D[m] ? n : m), cand[0]);
      if (!isFinite(D[w])) return null;
      done.add(w);
      for (const [n, c] of adj[w]) { if (done.has(n)) continue; if (D[w] + c < D[n]) { D[n] = D[w] + c; P[n] = w; } else if (D[w] + c === D[n]) return null; }
    }
    return { D, P };
  }

  const NEW = {
    /* ---------------- Cap. 1 ---------------- */
    pkttime: {
      title: "Tempo di trasmissione di un datagramma", mod: "r1", exam: true,
      gen() {
        const Rm = R(8, 60), pay = R(2000, 30000), tot = pay + 20, t = (tot * 8) / (Rm * 1e6) * 1000;
        return {
          html: `Due nodi A e B sono collegati da un link a <b>${Rm} Mbit/s</b>. Bisogna trasferire un datagramma IP con un payload di <b>${pay} byte</b> (header IPv4 di 20 byte, nessuna opzione). Quanto dura la trasmissione?`,
          fields: [{ label: "Tempo di trasmissione", unit: "ms", ans: t, tol: 0.006 }],
          sol: lines(`lunghezza = ${pay} + 20 = ${tot} byte = ${tot * 8} bit`, `t = L/R = ${tot * 8} / ${Rm}·10<sup>6</sup> = <b>${f(t, 3)} ms</b>`, `Qui 1 Mbit/s = 10<sup>6</sup> bit/s; il risultato si scrive con due decimali.`)
        };
      }
    },
    filexfer: {
      title: "Trasferimento di un file in segmenti", mod: "r1", exam: true,
      gen() {
        const L = R(20, 99), MSS = pick([1460, 1436, 1400, 1120, 536, 262]), hdr = pick([66, 54, 40]), S = pick([10, 20, 80, 100]);
        const B = L * 1048576, n = Math.ceil(B / MSS), t = ((n * hdr + B) * 8) / (S * 1e6);
        return {
          html: `Si trasferisce un file di <b>L = ${L} MiB</b> dall'host A all'host B. Il Maximum Segment Size è <b>MSS = ${MSS} byte</b> e l'header TCP+IP+Ethernet occupa <b>${hdr} byte</b> per segmento. Il link va a <b>S = ${S} Mbps</b>.<br><span class="note">1 MiB = 2<sup>20</sup> byte, 1 Mbps = 10<sup>6</sup> bit/s.</span>`,
          fields: [{ label: "Numero di segmenti TCP", ans: n, abs: 0 }, { label: "Tempo per trasferire tutto il file", unit: "s", ans: t, tol: 0.003 }],
          sol: lines(`L = ${L}·2<sup>20</sup> = ${B} byte`, `segmenti = ⌈${B}/${MSS}⌉ = <b>${n}</b> (si arrotonda sempre per eccesso)`, `byte totali = ${n}·${hdr} + ${B} = ${n * hdr + B}`, `t = ${n * hdr + B}·8 / ${S}·10<sup>6</sup> = <b>${f(t, 2)} s</b>`)
        };
      }
    },

    /* ---------------- Cap. 2 ---------------- */
    httptime: {
      title: "HTTP non persistente e persistente", mod: "r2", exam: true,
      gen() {
        const rtt = R(1, 4), T = R(1, 5), N = pick([10, 20, 50, 100]);
        const np = N * (2 * rtt + T), p = rtt + N * (rtt + T);
        return {
          html: `Un client e un server HTTP hanno <b>RTT = ${rtt} s</b>. Il server impiega <b>${T} s</b> a trasmettere ogni oggetto sul suo link; i messaggi senza oggetto (GET, SYN, ACK…) hanno tempo di trasmissione nullo. Il client fa <b>${N} richieste</b>, una dopo l'altra, e aspetta la risposta completa prima della successiva. Quanto tempo passa dall'apertura della prima connessione TCP alla ricezione dell'ultimo oggetto?`,
          fields: [{ label: "Con HTTP/1.0 (non persistente)", unit: "s", ans: np, abs: 0 }, { label: "Con HTTP/1.1 persistente, senza pipelining", unit: "s", ans: p, abs: 0 }],
          sol: lines(`HTTP/1.0: ogni oggetto richiede una nuova connessione → 1 RTT (handshake) + 1 RTT (GET/risposta) + trasmissione`, `${N}·(2·${rtt} + ${T}) = <b>${np} s</b>`, `persistente: un solo handshake, poi per ogni oggetto 1 RTT + trasmissione → ${rtt} + ${N}·(${rtt} + ${T}) = <b>${p} s</b>`)
        };
      }
    },
    httpresp: {
      title: "Lettura di una risposta HTTP", mod: "r2", exam: true,
      gen() {
        const ok = Math.random() < 0.7, ver = pick(["1.0", "1.1"]), conn = ver === "1.0" ? "Close" : pick(["Keep-Alive", "Close"]);
        const len = R(300, 9999), h = R(0, 23), m = R(0, 59), s = R(0, 59), hh = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        const code = ok ? "200 OK" : pick(["404 Not Found", "410 Gone"]);
        const txt = `HTTP/${ver} ${code}\r\nDate: Tue, 0${R(1, 9)} Jun 2026 ${String(R(0, 23)).padStart(2, "0")}:12:05 GMT\r\nServer: Apache/2.4.58 (Unix)\r\nLast-Modified: Mon, 0${R(1, 9)} Mar 2026 ${hh} GMT\r\nETag: "${R(4096, 65535).toString(16)}-${R(256, 4095).toString(16)}"\r\nContent-Length: ${ok ? len : 0}\r\nConnection: ${conn}\r\nContent-Type: text/html; charset=UTF-8`.replace(/\r\n/g, "\n");
        const closes = conn === "Close" ? "sì" : "no";
        return {
          html: `Un server risponde con questo messaggio:${pre(txt)}`,
          fields: [
            { label: "Il server ha trovato il documento richiesto?", ans: ok ? "sì" : "no", kind: "choice", options: ["sì", "no"] },
            { label: "Ora dell'ultima modifica (hh:mm:ss)", ans: hh, kind: "text" },
            { label: "Byte del corpo restituiti", ans: ok ? len : 0, abs: 0 },
            { label: "Il server chiuderà la connessione TCP?", ans: closes, kind: "choice", options: ["sì", "no"] }
          ],
          sol: lines(`Status line: <b>${code}</b> → ${ok ? "documento trovato" : "nessun documento nel corpo"}`, `Last-Modified → <b>${hh}</b>`, `Content-Length → <b>${ok ? len : 0}</b> byte`, `Connection: ${conn}${ver === "1.0" ? " e HTTP/1.0 non è persistente" : ""} → <b>${closes}</b>`)
        };
      }
    },
    dnscache: {
      title: "DNS iterativo con cache", mod: "r2", exam: true,
      gen() {
        const pool = { edu: ["gaia.cs.umass.edu", "cs.umd.edu", "cs.mit.edu", "www.unito.it".replace("unito.it", "stanford.edu")], com: ["www.amazon.com", "www.google.com", "news.yahoo.com"], org: ["icann.org", "www.wikipedia.org"], it: ["www.unito.it", "www.polito.it"] };
        const TTL = 20; let names = [];
        const tlds = shuffle(Object.keys(pool)).slice(0, 2);
        tlds.forEach((t) => (names = names.concat(shuffle(pool[t]).slice(0, 2))));
        const reqs = []; let t = 0;
        const seq = [names[0], names[2], names[1], names[0], names[3], names[0]];
        const gaps = [0, R(1, 2), R(3, 5), R(8, 12), R(12, 14), R(28, 34)];
        seq.forEach((n, i) => { t = gaps[i]; reqs.push({ t, n }); });
        const tldCache = {}, nameCache = {}, out = [];
        reqs.forEach((r) => {
          const tld = r.n.split(".").pop(); let d, why;
          if (nameCache[r.n] != null && nameCache[r.n] > r.t) { d = 2; why = "nome in cache: host↔locale"; }
          else if (tldCache[tld] != null && tldCache[tld] > r.t) { d = 6; why = `TLD .${tld} in cache: host↔locale + TLD + autoritativo`; nameCache[r.n] = r.t + 5 + TTL; }
          else { d = 8; why = "cache vuota o scaduta: host↔locale + root + TLD + autoritativo"; tldCache[tld] = r.t + 3 + TTL; nameCache[r.n] = r.t + 5 + TTL; }
          out.push({ ...r, d, why });
        });
        return {
          html: `Il server DNS locale mette in cache per <b>${TTL} unità di tempo</b> tutto ciò che riceve da root, TLD e server autoritativi (anche l'indirizzo dei server TLD). Cache inizialmente vuota, query iterative, <b>1 unità</b> per ogni richiesta o risposta in una direzione (host↔locale, locale↔server). Un solo server autoritativo per ciascun dominio. Richieste dell'host:<br>${out.map((r) => `t = ${r.t}: <b>${r.n}</b>`).join("<br>")}`,
          fields: out.map((r) => ({ label: `Tempo per risolvere la richiesta a t = ${r.t} (${r.n})`, unit: "unità", ans: r.d, abs: 0 })),
          sol: out.map((r) => `t = ${r.t}, ${r.n}: <b>${r.d}</b> (${r.why})`).join("<br>") + "<br>Contano i tempi in cui l'informazione arriva in cache: scade " + TTL + " unità dopo."
        };
      }
    },
    p2pexam: {
      title: "Distribuzione di file in GByte (stile esame)", mod: "r2", exam: true,
      gen() {
        const k = R(2, 11), F = k * 9 + R(0, 8), N = R(20, 90), us = F * 4, di = F, ui = F / 8;
        const p2p = Math.random() < 0.5;
        const calc = (bytes) => { const Fb = F * bytes * 8; return p2p ? Math.max(Fb / (us * 1e6), Fb / (di * 1e6), (N * Fb) / ((us + N * ui) * 1e6)) : Math.max((N * Fb) / (us * 1e6), Fb / (di * 1e6)); };
        const a10 = calc(1e9), a2 = calc(Math.pow(2, 30));
        return {
          html: `Un file di <b>${F} GByte</b> va distribuito a <b>${N} peer</b>. Il server ha upload <b>u<sub>s</sub> = ${us} Mbps</b>; ogni peer ha download <b>d<sub>i</sub> = ${di} Mbps</b> e upload <b>u<sub>i</sub> = ${f(ui)} Mbps</b>. Calcola il tempo minimo di distribuzione con un'applicazione <b>${p2p ? "peer-to-peer" : "client-server"}</b>.`,
          fields: [{ label: `D<sub>${p2p ? "P2P" : "cs"}</sub>`, unit: "s", ans: a10, check: (v) => { const x = Number(String(v).replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return [a10, a2].some((a) => Math.abs(x - a) <= a * 0.005); } }],
          sol: lines(p2p ? `D<sub>P2P</sub> = max(F/u<sub>s</sub>, F/d<sub>min</sub>, N·F/(u<sub>s</sub> + N·u<sub>i</sub>))` : `D<sub>cs</sub> = max(N·F/u<sub>s</sub>, F/d<sub>min</sub>)`,
            `con 1 GByte = 10<sup>9</sup> byte: <b>${f(a10, 2)} s</b>`, `con 1 GByte = 2<sup>30</sup> byte: <b>${f(a2, 2)} s</b>`, `All'esame si usano entrambe le convenzioni: qui sono accettate tutte e due. Le velocità sono sempre in 10<sup>6</sup> bit/s.`)
        };
      }
    },
    smtp: {
      title: "Dialogo SMTP", mod: "r2",
      gen() {
        const from = pick(["alice@crepes.fr", "anna@di.unito.it", "luca@polito.it"]), to = pick(["bob@hamburger.edu", "carla@gmail.com", "marco@unito.it"]);
        const n = R(1, 3);
        const rcpts = [to, "dario@" + to.split("@")[1], "elena@" + to.split("@")[1]].slice(0, n);
        const dlg = [`S: 220 ${to.split("@")[1]}`, `C: HELO ${from.split("@")[1]}`, `S: 250 Hello ${from.split("@")[1]}, pleased to meet you`, `C: MAIL FROM: <${from}>`, `S: 250 ${from}... Sender ok`, ...rcpts.flatMap((r) => [`C: RCPT TO: <${r}>`, `S: 250 ${r} ... Recipient ok`]), `C: DATA`, `S: 354 Enter mail, end with "." on a line by itself`, `C: Ciao!`, `C: .`, `S: 250 Message accepted for delivery`, `C: QUIT`, `S: 221 closing connection`].join("\n");
        return {
          html: `Osserva questo dialogo SMTP tra il client (C) e il server (S):${pre(dlg)}`,
          fields: [
            { label: "Numero di destinatari", ans: n, abs: 0 },
            { label: "Comando che segnala la fine del messaggio", ans: ".", kind: "choice", options: [".", "QUIT", "DATA", "221"] },
            { label: "Porta TCP del server SMTP", ans: 25, abs: 0 },
            { label: "Il server è il mail server di", ans: "destinatario", kind: "choice", options: ["destinatario", "mittente", "nessuno dei due"] },
            { label: "Protocollo che il destinatario usa per leggere la posta", ans: "IMAP o POP3", kind: "choice", options: ["IMAP o POP3", "SMTP", "FTP", "DNS"] }
          ],
          sol: lines(`un RCPT TO per destinatario → <b>${n}</b>`, `il corpo termina con una riga contenente solo <b>.</b>`, `SMTP usa TCP sulla porta <b>25</b>, trasferimento diretto tra mail server`, `è un protocollo push: il server che riceve è quello del <b>destinatario</b>; per leggere si usa IMAP/POP3 (o HTTP).`)
        };
      }
    },

    /* ---------------- Cap. 3 ---------------- */
    segloss: {
      title: "Finestra di 4 segmenti con perdite", mod: "r3", exam: true,
      gen() {
        const x = pick([0, 100, 200, 300, 500]) + R(0, 9) * 10, B = pick([100, 140, 200, 440, 512]), d = R(4, 8);
        const lost = shuffle([2, 3, 4]).slice(0, pick([1, 2])).sort();
        const seq = [0, 1, 2, 3].map((i) => x + i * B), arr = [1, 2, 3, 4].filter((s) => !lost.includes(s));
        const k = R(2, 4), j = pick(arr.slice(1).length ? arr.slice(1) : arr);
        let exp = x; const acks = {};
        [1, 2, 3, 4].forEach((s) => { if (lost.includes(s)) return; if (seq[s - 1] === exp) { exp += B; while (false); } acks[s] = exp; });
        // gestione buffer: dopo un buco l'ACK resta al primo byte mancante
        exp = x; const got = new Set();
        [1, 2, 3, 4].forEach((s) => { if (lost.includes(s)) return; got.add(s); while (got.has((exp - x) / B + 1)) exp += B; acks[s] = exp; });
        const tA = d + j;
        return {
          html: `Un mittente TCP invia una finestra di <b>4 segmenti</b> ai tempi t = 1, 2, 3, 4. Il numero di sequenza iniziale è <b>${x}</b> e ogni segmento contiene <b>${B} byte</b>. Il ritardo mittente→ricevitore è di <b>${d} unità</b>, quindi il primo segmento arriva a t = ${d + 1}. Vanno persi i segmenti <b>${lost.join(" e ")}</b>; il ricevitore conserva quelli fuori ordine e risponde con un ACK a ogni arrivo.`,
          fields: [{ label: `Numero di sequenza del segmento inviato a t = ${k}`, ans: seq[k - 1], abs: 0 }, { label: `ACK inviato in risposta al segmento che arriva a t = ${tA}`, ans: acks[j], abs: 0 }],
          sol: lines(`seq: ${seq.join(", ")} (si somma ${B} per segmento)`, `a t = ${tA} arriva il segmento ${j} (inviato a t = ${j}).`, `L'ACK indica il prossimo byte atteso in ordine: <b>${acks[j]}</b>${acks[j] !== seq[j - 1] + B ? " (ACK duplicato: manca ancora un segmento precedente)" : ""}.`)
        };
      }
    },
    lastseq: {
      title: "Numero di sequenza dell'ultimo segmento", mod: "r3", exam: true,
      gen() {
        const MSS = pick([536, 1024, 1460, 4096, 19712]), n = R(500, 5000), extra = Math.random() < 0.5 ? 0 : R(1, MSS - 1), L = (n - 1) * MSS + (extra || MSS), isn = R(0, 999);
        const nseg = Math.ceil(L / MSS), last = (isn + (nseg - 1) * MSS) % 4294967296;
        return {
          html: `Si trasferisce un file di <b>L = ${L} byte</b> con <b>MSS = ${MSS} byte</b>. I numeri di sequenza TCP partono da <b>${isn}</b> (il campo è di 4 byte). Qual è il numero di sequenza dell'ultimo segmento inviato?`,
          fields: [{ label: "Numero di segmenti", ans: nseg, abs: 0 }, { label: "Numero di sequenza dell'ultimo segmento", ans: last, abs: 0 }],
          sol: lines(`segmenti = ⌈${L}/${MSS}⌉ = <b>${nseg}</b>`, `ultimo = ISN + (n − 1)·MSS = ${isn} + ${nseg - 1}·${MSS} = <b>${last}</b> (mod 2<sup>32</sup>)`)
        };
      }
    },
    renograph: {
      title: "Grafico di TCP Reno: fasi, ssthresh, segmenti", mod: "r3", exam: true,
      gen() {
        let rows;
        for (;;) {
          const S0 = pick([16, 32]), t1 = R(8, 12), t2 = t1 + R(4, 7), T = t2 + R(4, 6);
          let cw = 1, ss = S0; rows = [];
          for (let t = 1; t <= T; t++) {
            const ph = cw < ss ? "SS" : "CA";
            rows.push({ t, cw, ss, ph, ev: t === t1 ? "dup" : t === t2 ? "to" : "" });
            if (t === t1) { ss = Math.max(Math.floor(cw / 2), 2); cw = ss + 3; } else if (t === t2) { ss = Math.max(Math.floor(cw / 2), 2); cw = 1; } else if (cw < ss) cw = Math.min(cw * 2, ss); else cw += 1;
          }
          if (rows.some((r) => r.ph === "CA") && rows.length <= 26) break;
        }
        const W = 440, H = 200, mx = Math.max(...rows.map((r) => r.cw)), X = (t) => 30 + ((t - 1) / (rows.length - 1)) * (W - 44), Y = (c) => H - 24 - (c / mx) * (H - 40);
        const svg = `<svg class="graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="cwnd per round"><line x1="30" y1="${H - 24}" x2="${W - 10}" y2="${H - 24}" class="g-edge"/><line x1="30" y1="10" x2="30" y2="${H - 24}" class="g-edge"/>${rows.map((r) => (r.t % 2 === 1 ? `<text x="${X(r.t)}" y="${H - 8}" class="g-lbl">${r.t}</text>` : "")).join("")}<polyline fill="none" stroke="currentColor" stroke-width="1.8" points="${rows.map((r) => `${X(r.t)},${Y(r.cw)}`).join(" ")}"/>${rows.map((r) => `<circle cx="${X(r.t)}" cy="${Y(r.cw)}" r="2.6" class="g-node" style="fill:var(--fg)"/>`).join("")}${[0.5, 1].map((k) => `<text x="22" y="${Y(Math.round(mx * k)) + 4}" class="g-lbl" style="text-anchor:end">${Math.round(mx * k)}</text>`).join("")}</svg>`;
        const cum = []; rows.reduce((a, r, i) => (cum[i] = a + r.cw), 0);
        const target = R(Math.max(5, cum[3]), cum[Math.min(rows.length - 2, 12)]), round = cum.findIndex((c) => c >= target) + 1;
        const qr = R(2, rows.length), ev1 = rows.find((r) => r.ev === "dup").t, ev2 = rows.find((r) => r.ev === "to").t;
        const caStart = rows.findIndex((r, i) => i >= 2 && r.cw === rows[i - 1].cw + 1) + 1;
        return {
          html: `Il grafico mostra cwnd (in segmenti) per ogni round di trasmissione di una connessione TCP Reno, a partire da cwnd = 1.${svg}<div class="tbl-wrap"><table class="tbl"><tr><th>Round</th>${rows.map((r) => `<td>${r.t}</td>`).join("")}</tr><tr><th>cwnd</th>${rows.map((r) => `<td>${r.cw}</td>`).join("")}</tr></table></div>`,
          fields: [
            { label: "Primo round in congestion avoidance (cwnd cresce di 1 MSS invece di raddoppiare)", ans: caStart, abs: 0 },
            { label: `Evento rilevato alla fine del round ${ev1}`, ans: "3 ACK duplicati", kind: "choice", options: ["3 ACK duplicati", "timeout", "nessuno"] },
            { label: `Evento rilevato alla fine del round ${ev2}`, ans: "timeout", kind: "choice", options: ["3 ACK duplicati", "timeout", "nessuno"] },
            { label: `ssthresh durante il round ${qr}`, ans: rows[qr - 1].ss, abs: 0 },
            { label: `In quale round viene trasmesso il segmento n. ${target}?`, ans: round, abs: 0 }
          ],
          sol: lines(`slow start: cwnd raddoppia (1, 2, 4, …) fino a ssthresh = ${rows[0].ss}; dal round <b>${caStart}</b> crescita lineare (+1): congestion avoidance`,
            `round ${ev1} → ${ev1 + 1}: cwnd passa da ${rows[ev1 - 1].cw} a ${rows[ev1].cw} = ⌊${rows[ev1 - 1].cw}/2⌋ + 3 → <b>3 ACK duplicati</b> (fast recovery)`,
            `round ${ev2} → ${ev2 + 1}: cwnd torna a 1 → <b>timeout</b>; ssthresh = ⌊${rows[ev2 - 1].cw}/2⌋ = ${rows[ev2].ss}`,
            `ssthresh nel round ${qr}: <b>${rows[qr - 1].ss}</b>`,
            `segmenti cumulati: ${cum.slice(0, round + 1).join(", ")} → il segmento ${target} parte nel round <b>${round}</b>`)
        };
      }
    },
    tcpretrans: {
      title: "Ritrasmissioni TCP e ACK duplicati", mod: "r3",
      gen() {
        const x = R(1, 9) * 100, B = pick([100, 200, 500]), lost = R(1, 3), N = 7, seq = Array.from({ length: N }, (_, i) => x + i * B);
        const acks = []; for (let i = 0; i < N; i++) acks.push(i < lost ? seq[i] + B : seq[lost]);
        const dupCount = N - lost - 1, fr = dupCount >= 3;
        return {
          html: `Un mittente TCP invia ${N} segmenti consecutivi da <b>${B} byte</b>, il primo con seq = <b>${x}</b>. Il segmento n. <b>${lost + 1}</b> va perso, tutti gli altri e tutti gli ACK arrivano. Il ricevitore manda un ACK per ogni segmento ricevuto.`,
          fields: [
            { label: `Valore degli ACK inviati dopo la perdita`, ans: seq[lost], abs: 0 },
            { label: "Numero di ACK duplicati ricevuti dal mittente", ans: dupCount, abs: 0 },
            { label: "Il mittente esegue il fast retransmit?", ans: fr ? "sì" : "no", kind: "choice", options: ["sì", "no"] },
            { label: "Numero di sequenza del segmento ritrasmesso", ans: seq[lost], abs: 0 }
          ],
          sol: lines(`seq: ${seq.join(", ")}`, `dopo la perdita il ricevitore continua a chiedere il byte <b>${seq[lost]}</b>`, `primo ACK ${seq[lost]} = originale, i successivi ${dupCount} sono duplicati`, fr ? `con 3 ACK duplicati TCP ritrasmette subito (fast retransmit) il segmento <b>${seq[lost]}</b>` : `meno di 3 duplicati: si aspetta il timeout, poi si ritrasmette <b>${seq[lost]}</b>`)
        };
      }
    },
    udpmux: {
      title: "Demultiplexing UDP e TCP", mod: "r3",
      gen() {
        const sp = [R(1024, 65000), R(1024, 65000)], dp = pick([53, 5060, 9876, 27015]), tcpP = 80;
        const A = "10.0.0." + R(2, 99), B = "10.0.1." + R(2, 99);
        return {
          html: `Due client A (${A}) e B (${B}) inviano datagrammi UDP al server S sulla porta <b>${dp}</b>, dalle porte sorgente <b>${sp[0]}</b> e <b>${sp[1]}</b>. Gli stessi due client aprono anche una connessione TCP ciascuno verso la porta ${tcpP} di S.`,
          fields: [
            { label: "Socket UDP necessari sul server per i due client", ans: 1, abs: 0 },
            { label: "Socket TCP di connessione sul server (escluso quello in ascolto)", ans: 2, abs: 0 },
            { label: "Porta destinazione nella risposta UDP da S a B", ans: sp[1], abs: 0 },
            { label: "Porta sorgente nella risposta UDP da S a B", ans: dp, abs: 0 }
          ],
          sol: lines(`UDP: il socket è identificato da (IP dest, porta dest) → entrambi i client arrivano allo stesso socket: <b>1</b>`, `TCP: identificato dalla quadrupla (IP e porta sorgente e destinazione) → un socket per connessione: <b>2</b>`, `nella risposta le porte si scambiano: sorgente <b>${dp}</b>, destinazione <b>${sp[1]}</b>`)
        };
      }
    },

    /* ---------------- Cap. 4 ---------------- */
    cidr8: {
      title: "Blocco CIDR e 8 sottoreti (3 punti all'esame)", mod: "r4", exam: true,
      gen() {
        const x = pick([12, 16, 18, 19, 19, 20, 21, 22]), size = Math.pow(2, 32 - x);
        const a = pick([10, 130, 134, 172, 192, 200]);
        const base = ((a << 24) >>> 0) + Math.floor(Math.random() * Math.pow(2, 24 - (32 - x) > 0 ? 24 - (32 - x) : 0)) * size;
        const net = (base >>> 0) & maskOf(x);
        const exact = Math.random() < 0.7;
        let lo = net, hi = (net + size - 1) >>> 0;
        if (!exact) { const q = size / 8; lo = (net + R(1, 3) * q) >>> 0; hi = (net + size / 2 + R(1, 3) * q - 1) >>> 0; }
        const sx = x + 3, ss = size / 8, j1 = R(2, 4), j2 = R(5, 8);
        const sub = (j) => `${ip2s((net + (j - 1) * ss) >>> 0)}/${sx}`;
        return {
          html: `Considera l'intervallo di indirizzi da <b>${ip2s(lo)}</b> a <b>${ip2s(hi)}</b>.<br>(a) Scrivi in notazione CIDR il blocco più piccolo che contiene l'intervallo.<br>(b) Dividi quel blocco in <b>8 sottoreti</b> della stessa dimensione.<br>(c) Quanti indirizzi ha ogni sottorete?`,
          fields: [
            { label: "(a) Blocco CIDR (es. 10.10.32.0/19)", ans: `${ip2s(net)}/${x}`, kind: "text", check: cidrCheck(`${ip2s(net)}/${x}`) },
            { label: "(b) Subnet 1", ans: sub(1), kind: "text", check: cidrCheck(sub(1)) },
            { label: `(b) Subnet ${j1}`, ans: sub(j1), kind: "text", check: cidrCheck(sub(j1)) },
            { label: `(b) Subnet ${j2}`, ans: sub(j2), kind: "text", check: cidrCheck(sub(j2)) },
            { label: "(c) Indirizzi per sottorete", ans: ss, abs: 0 }
          ],
          sol: lines(`Scrivi in binario gli indirizzi estremi e conta i bit iniziali uguali: sono <b>${x}</b> → <b>${ip2s(net)}/${x}</b> (${size} indirizzi)`,
            `8 = 2<sup>3</sup> sottoreti → prefisso /${x} + 3 = <b>/${sx}</b>, ognuna di ${ss} indirizzi`,
            Array.from({ length: 8 }, (_, i) => `subnet ${i + 1}: ${sub(i + 1)}`).join("<br>"), `(c) 2<sup>32−${sx}</sup> = <b>${ss}</b>`)
        };
      }
    },
    tunnel: {
      title: "Tunneling IPv6 su IPv4", mod: "r4", exam: true,
      gen() {
        const pts = { a: ["A", "B", false], b: ["B", "C", true], c: ["D", "E", true], d: ["E", "F", false] };
        const p = pick(Object.keys(pts)), [, , tun] = pts[p];
        const R6 = ["A", "B", "C", "D", "E", "F"];
        return {
          html: `Una rete mista IPv4/IPv6: <b>A</b> e <b>F</b> sono router IPv6; tra i router IPv6 <b>B</b> ed <b>E</b> c'è un tunnel IPv4 che attraversa i router solo IPv4 <b>C</b> e <b>D</b>.${pre("A ──(a)── B ══(b)══ C ──── D ══(c)══ E ──(d)── F\n IPv6      └──── tunnel IPv4 ────┘      IPv6")}A invia un datagramma IPv6 a F. Considera il punto <b>(${p})</b>.${tun ? " Qui il datagramma IPv6 viaggia incapsulato in un datagramma IPv4." : ""}`,
          fields: tun ? [
            { label: "Versione del datagramma esterno", ans: "IPv4", kind: "choice", options: ["IPv4", "IPv6"] },
            { label: "Sorgente del datagramma esterno", ans: "B", kind: "choice", options: R6 },
            { label: "Destinazione del datagramma esterno", ans: "E", kind: "choice", options: R6 },
            { label: "Sorgente del datagramma interno (incapsulato)", ans: "A", kind: "choice", options: R6 },
            { label: "Bit dell'indirizzo destinazione interno", ans: 128, abs: 0 }
          ] : [
            { label: "Versione del datagramma", ans: "IPv6", kind: "choice", options: ["IPv4", "IPv6"] },
            { label: "Indirizzo sorgente", ans: "A", kind: "choice", options: R6 },
            { label: "Indirizzo destinazione", ans: "F", kind: "choice", options: R6 },
            { label: "Bit dell'indirizzo destinazione", ans: 128, abs: 0 }
          ],
          sol: tun ? lines(`Dentro il tunnel B incapsula: datagramma esterno <b>IPv4</b> da <b>B</b> a <b>E</b> (gli estremi del tunnel)`, `il datagramma interno resta IPv6 da <b>A</b> a F, con indirizzi da <b>128</b> bit`) : lines(`Fuori dal tunnel c'è solo il datagramma <b>IPv6</b> originale, da <b>A</b> a <b>F</b>; indirizzi da <b>128</b> bit.`)
        };
      }
    },
    linkaddr: {
      title: "Indirizzi IP e MAC attraverso un router", mod: "r6", exam: true,
      gen() {
        const n1 = `128.119.${R(10, 120)}`, n2 = `128.119.${R(130, 250)}`;
        const H = { A: [n1 + "." + R(2, 60), mac()], B: [n1 + "." + R(61, 120), mac()], C: [n2 + "." + R(2, 60), mac()], D: [n2 + "." + R(61, 120), mac()] };
        const r1 = [n1 + ".1", mac()], r2 = [n2 + ".1", mac()];
        const [s, d] = pick([["A", "C"], ["B", "D"], ["C", "A"], ["D", "B"], ["A", "D"], ["C", "B"]]);
        const srcLeft = s === "A" || s === "B", first = Math.random() < 0.5;
        const ifIn = srcLeft ? r1 : r2, ifOut = srcLeft ? r2 : r1;
        const ans = first ? { sm: H[s][1], dm: ifIn[1] } : { sm: ifOut[1], dm: H[d][1] };
        const allMac = [H.A[1], H.B[1], H.C[1], H.D[1], r1[1], r2[1]], allIp = [H.A[0], H.B[0], H.C[0], H.D[0], r1[0], r2[0]];
        return {
          html: `Due sottoreti sono collegate da un router R. Indirizzi:${tbl(["Nodo", "IP", "MAC"], [["A", H.A[0], H.A[1]], ["B", H.B[0], H.B[1]], ["R (lato A, B)", r1[0], r1[1]], ["R (lato C, D)", r2[0], r2[1]], ["C", H.C[0], H.C[1]], ["D", H.D[0], H.D[1]]])}Il nodo <b>${s}</b> invia un datagramma IP al nodo <b>${d}</b>. Considera il frame ${first ? `<b>tra ${s} e il router</b>` : `<b>tra il router e ${d}</b>`}. Le tabelle ARP sono già piene.`,
          fields: [
            { label: "MAC sorgente del frame", ans: ans.sm, kind: "choice", options: allMac },
            { label: "MAC destinazione del frame", ans: ans.dm, kind: "choice", options: allMac },
            { label: "IP sorgente del datagramma", ans: H[s][0], kind: "choice", options: allIp },
            { label: "IP destinazione del datagramma", ans: H[d][0], kind: "choice", options: allIp }
          ],
          sol: lines(`Gli indirizzi IP restano quelli end-to-end: <b>${H[s][0]}</b> → <b>${H[d][0]}</b>`, `Gli indirizzi MAC cambiano a ogni hop: ${first ? `${s} manda il frame all'interfaccia del router sulla sua sottorete → <b>${ans.sm}</b> → <b>${ans.dm}</b>` : `il router inoltra dall'interfaccia verso ${d} → <b>${ans.sm}</b> → <b>${ans.dm}</b>`}`)
        };
      }
    },
    openflow: {
      title: "Tabella di flusso OpenFlow (match + action)", mod: "r4",
      gen() {
        const rules = [
          { m: { dst: "10.2.0.0/16", p: "*" }, a: "forward(2)" }, { m: { dst: "10.1.0.0/16", p: "*" }, a: "forward(1)" },
          { m: { dst: "*", p: "22" }, a: "drop" }, { m: { dst: "10.3.0.0/16", p: "80" }, a: "forward(3)" }, { m: { dst: "*", p: "*" }, a: "send to controller" }
        ];
        const tab = shuffle(rules.slice(0, 4)).concat(rules[4]);
        const match = (r, pk) => (r.m.dst === "*" || pk.dst.startsWith(r.m.dst.split(".").slice(0, 2).join(".") + ".")) && (r.m.p === "*" || r.m.p === String(pk.p));
        const pks = Array.from({ length: 3 }, () => ({ dst: `10.${R(1, 4)}.${R(0, 255)}.${R(1, 254)}`, p: pick([22, 80, 443, 53]) }));
        const res = pks.map((pk) => { const i = tab.findIndex((r) => match(r, pk)); return { i: i + 1, a: tab[i].a }; });
        const acts = ["forward(1)", "forward(2)", "forward(3)", "drop", "send to controller"];
        return {
          html: `Uno switch OpenFlow ha questa tabella; le regole sono in ordine di priorità (la prima che corrisponde vince).${tbl(["#", "IP dest", "Porta TCP dest", "Azione"], tab.map((r, i) => [i + 1, r.m.dst, r.m.p, r.a]))}Arrivano tre pacchetti TCP:<br>${pks.map((pk, i) => `${i + 1}) destinazione <b>${pk.dst}</b>, porta <b>${pk.p}</b>`).join("<br>")}`,
          fields: res.map((r, i) => ({ label: `Azione per il pacchetto ${i + 1}`, ans: r.a, kind: "choice", options: acts })),
          sol: res.map((r, i) => `pacchetto ${i + 1}: prima corrispondenza alla regola ${r.i} → <b>${r.a}</b>`).join("<br>")
        };
      }
    },

    /* ---------------- Cap. 5 ---------------- */
    routerttl: {
      title: "Cammino minimo R1→R7 e TTL", mod: "r5", exam: true,
      gen() {
        const names = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"];
        const pos = { R1: [36, 120], R2: [140, 40], R3: [140, 200], R4: [270, 40], R5: [270, 200], R6: [390, 70], R7: [390, 190] };
        const allowed = [["R1", "R2"], ["R1", "R3"], ["R2", "R3"], ["R2", "R4"], ["R3", "R5"], ["R2", "R5"], ["R4", "R5"], ["R4", "R6"], ["R5", "R7"], ["R6", "R7"], ["R4", "R7"], ["R3", "R4"]];
        let E, res;
        for (let t = 0; t < 500; t++) { E = shuffle(allowed).slice(0, R(9, 11)).map(([a, b]) => ({ a, b, c: R(1, 10) })); res = shortest(names, E, "R1"); if (res) break; }
        const path = ["R7"]; while (path[0] !== "R1") path.unshift(res.P[path[0]]);
        const ttl = R(55, 64), hops = path.length - 1;
        const svg = `<svg class="graph" viewBox="0 0 430 236" role="img" aria-label="Rete di sette router">${E.map((e) => { const [x1, y1] = pos[e.a], [x2, y2] = pos[e.b]; const diag = Math.abs(y1 - y2) > 100 && x1 !== x2, tt = diag ? 0.3 : 0.5; const mx = x1 + (x2 - x1) * tt, my = y1 + (y2 - y1) * tt; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="g-edge"/><rect x="${mx - 11}" y="${my - 10}" width="22" height="20" rx="4" class="g-lbl-bg"/><text x="${mx}" y="${my + 5}" class="g-lbl">${e.c}</text>`; }).join("")}${names.map((n) => `<circle cx="${pos[n][0]}" cy="${pos[n][1]}" r="19" class="g-node${n === "R1" ? " g-src" : ""}"/><text x="${pos[n][0]}" y="${pos[n][1] + 5}" class="g-name" style="font-size:12px">${n}</text>`).join("")}</svg>`;
        return {
          html: `Nella rete in figura i numeri sono i costi dei collegamenti.${svg}Un pacchetto arriva al router R1 con <b>TTL = ${ttl}</b> e segue il cammino a costo minimo fino a R7.`,
          fields: [{ label: "Costo del cammino minimo R1 → R7", ans: res.D.R7, abs: 0 }, { label: "TTL del pacchetto quando arriva a R7", ans: ttl - hops, abs: 0 }],
          sol: lines(`Dijkstra da R1: ${names.slice(1).map((n) => `D(${n}) = ${res.D[n]}`).join(", ")}`, `cammino: ${path.join(" → ")}, costo <b>${res.D.R7}</b>`, `ogni router che inoltra decrementa il TTL: ${hops} inoltri (${path.slice(0, -1).join(", ")}) → ${ttl} − ${hops} = <b>${ttl - hops}</b>`, `Attenzione: il TTL scende di 1 per hop, non del costo.`)
        };
      }
    },

    /* ---------------- Cap. 6 ---------------- */
    backoff: {
      title: "Backoff esponenziale di Ethernet: attesa", mod: "r6", exam: true,
      gen() {
        const Rm = pick([10, 100, 1000]), K = R(1, 30);
        const t = (K * 512 + 96) / Rm, t2 = (K * 512) / Rm;
        return {
          html: `Un nodo su Ethernet a <b>${Rm} Mbit/s</b>, dopo diverse collisioni, estrae <b>K = ${K}</b>. Dopo quanto tempo, in microsecondi, riproverà a trasmettere?`,
          fields: [{ label: "Attesa", unit: "µs", ans: t, check: (v) => { const x = Number(String(v).replace(",", ".")); return [t, t2].some((a) => Math.abs(x - a) <= Math.max(a * 0.005, 0.01)); } }],
          sol: lines(`attesa = K·512 tempi di bit (+ 96 di interframe gap)`, `un tempo di bit = 1/${Rm}·10<sup>6</sup> s = ${f(1 / Rm, 4)} µs`, `(${K}·512 + 96)/${Rm} = <b>${f(t, 2)} µs</b>; senza i 96 bit: ${f(t2, 2)} µs (all'esame valgono entrambe)`)
        };
      }
    },
    backoffprob: {
      title: "Backoff esponenziale: probabilità di K", mod: "r6", exam: true,
      gen() {
        const n = R(1, 12), m = Math.min(n, 10), max = Math.pow(2, m) - 1, k = Math.random() < 0.3 ? max + R(1, 4) : R(0, max);
        const p = k <= max ? 1 / Math.pow(2, m) : 0;
        return {
          html: `Secondo lo standard Ethernet, dopo la <b>${n}ª collisione</b> consecutiva di un frame, qual è la probabilità che il nodo scelga di attendere <b>K = ${k}</b> (tempi di trasmissione di 512 bit)?`,
          fields: [{ label: "Probabilità", ans: p, abs: 1e-6, tol: 0.001 }, { label: "Valore massimo che K può assumere", ans: max, abs: 0 }],
          sol: lines(`dopo la n-esima collisione K ∈ {0, 1, …, 2<sup>m</sup> − 1} con m = min(n, 10) = ${m}`, `K massimo = <b>${max}</b>, valori equiprobabili`, k <= max ? `P = 1/2<sup>${m}</sup> = <b>${f(p, 6)}</b>` : `${k} > ${max}: <b>P = 0</b>`)
        };
      }
    },
    csmacd: {
      title: "CSMA/CD: rilevazione della collisione nel caso peggiore", mod: "r6", exam: true,
      gen() {
        const d = R(40, 900), Rm = pick([10, 100]);
        return {
          html: `In una rete Ethernet a ${Rm} Mbit/s il ritardo di propagazione tra i nodi A e B è di <b>${d} tempi di bit</b>. Nel caso peggiore, dopo quanti tempi di bit dall'inizio della trasmissione A si accorge di aver colliso con B?`,
          fields: [{ label: "Tempo", unit: "tempi di bit", ans: 2 * d - 1, abs: 0 }],
          sol: lines(`Caso peggiore: B inizia a trasmettere un istante prima che gli arrivi il primo bit di A, cioè a t = ${d} − 1.`, `Il segnale di B impiega altri ${d} tempi di bit per tornare ad A: (${d} − 1) + ${d} = <b>${2 * d - 1}</b>`, `In pratica circa 2·d: per questo il frame minimo deve durare almeno il doppio della propagazione.`)
        };
      }
    },
    alohaprob: {
      title: "Slotted ALOHA: probabilità di successo", mod: "r6", exam: true,
      gen() {
        const N = R(2, 8), p = R(5, 60) / 100, s = p * Math.pow(1 - p, N - 1), any = N * s, pop = 1 / N;
        return {
          html: `Una rete ha <b>N = ${N} nodi</b> che usano slotted ALOHA; ogni nodo trasmette in uno slot con probabilità <b>p = ${f(p)}</b>.`,
          fields: [
            { label: "Probabilità che uno specifico nodo abbia successo in uno slot", ans: s, tol: 0.002, abs: 1e-4 },
            { label: "Probabilità che un qualsiasi nodo abbia successo in uno slot", ans: any, tol: 0.002, abs: 1e-4 },
            { label: "Valore di p che massimizza l'efficienza", ans: pop, tol: 0.002 }
          ],
          sol: lines(`specifico: p·(1 − p)<sup>N−1</sup> = ${f(p)}·${f(1 - p)}<sup>${N - 1}</sup> = <b>${f(s, 4)}</b>`, `qualsiasi: N·p·(1 − p)<sup>N−1</sup> = <b>${f(any, 4)}</b>`, `massimo per p* = 1/N = <b>${f(pop, 4)}</b>; per N → ∞ l'efficienza tende a 1/e ≈ 0,37 (ALOHA puro: 1/(2e) ≈ 0,18)`, `Il numero dello slot (es. «nello slot 5») non conta: gli slot sono indipendenti.`)
        };
      }
    },
    alohaframes: {
      title: "ALOHA: quali frame passano", mod: "r6", exam: true,
      gen() {
        const ts = Array.from({ length: 6 }, () => { let v; do v = R(1, 49); while (v % 10 === 0); return v / 10; }).sort((a, b) => a - b);
        const slotted = Math.random() < 0.65;
        const ok = [];
        ts.forEach((t, i) => {
          if (slotted) { const s = Math.ceil(t + 1e-9); if (ts.filter((u) => Math.ceil(u + 1e-9) === s).length === 1) ok.push(i + 1); }
          else if (ts.every((u, j) => j === i || Math.abs(u - t) >= 1)) ok.push(i + 1);
        });
        return {
          html: `Sei nodi wireless devono trasmettere un frame ciascuno; ogni trasmissione dura <b>1 unità di tempo</b>. I frame arrivano a t = <b>${ts.map((t) => f(t, 1)).join(", ")}</b> (frame 1…6 in quest'ordine). Con <b>${slotted ? "slotted ALOHA (slot che iniziano a t intero)" : "ALOHA puro"}</b>, quali frame vengono trasmessi con successo? Chi collide ritrasmette solo molto dopo t = 6.`,
          fields: [{ label: "Frame trasmessi con successo (es. 1, 4; «nessuno» se nessuno)", ans: ok.length ? ok.join(", ") : "nessuno", kind: "text", check: setCheck(ok) }],
          sol: slotted ? lines(`Slotted: ogni frame parte all'inizio dello slot successivo all'arrivo.`, ts.map((t, i) => `frame ${i + 1}: arriva ${f(t, 1)} → trasmette in [${Math.ceil(t + 1e-9)}, ${Math.ceil(t + 1e-9) + 1}]`).join("<br>"), `successo solo se è l'unico nello slot → <b>${ok.join(", ") || "nessuno"}</b>`)
            : lines(`ALOHA puro: si trasmette subito; c'è collisione se un altro frame inizia meno di 1 unità prima o dopo.`, ts.map((t, i) => `frame ${i + 1}: [${f(t, 1)}, ${f(t + 1, 1)}]`).join("<br>"), `senza sovrapposizioni → <b>${ok.join(", ") || "nessuno"}</b>`)
        };
      }
    },
    parity2d: {
      title: "Parità bidimensionale", mod: "r6",
      gen() {
        const r = 4, c = 6, M = Array.from({ length: r }, () => Array.from({ length: c }, () => R(0, 1)));
        const rp = M.map((row) => row.reduce((a, b) => a ^ b, 0)), cp = Array.from({ length: c }, (_, j) => M.reduce((a, row) => a ^ row[j], 0)), corner = rp.reduce((a, b) => a ^ b, 0);
        const er = R(1, r), ec = R(1, c); const X = M.map((row) => row.slice()); X[er - 1][ec - 1] ^= 1;
        const rows = X.map((row, i) => [...row, `<b>${rp[i]}</b>`]); rows.push([...cp.map((x) => `<b>${x}</b>`), `<b>${corner}</b>`]);
        return {
          html: `Il ricevitore ottiene questi bit con parità pari bidimensionale: l'ultima colonna e l'ultima riga (in grassetto) sono i bit di parità calcolati dal mittente. Un solo bit di dati si è invertito.${tbl([...Array.from({ length: c }, (_, j) => `c${j + 1}`), "par"], rows)}`,
          fields: [{ label: "Riga del bit errato", ans: er, abs: 0 }, { label: "Colonna del bit errato", ans: ec, abs: 0 }, { label: "Valore corretto di quel bit", ans: M[er - 1][ec - 1], abs: 0 }],
          sol: lines(`Ricalcola la parità di ogni riga e colonna: è sbagliata solo la riga <b>${er}</b> e solo la colonna <b>${ec}</b>.`, `L'incrocio è il bit errato: vale ${X[er - 1][ec - 1]}, il valore corretto è <b>${M[er - 1][ec - 1]}</b>. La parità 2D rileva e corregge un errore singolo.`)
        };
      }
    },
    crc: {
      title: "Calcolo del CRC", mod: "r6",
      gen() {
        const G = pick(["1001", "1011", "1101", "10011", "11001", "1011"]), r = G.length - 1;
        const D = "1" + Array.from({ length: R(5, 8) }, () => R(0, 1)).join("");
        const bits = (D + "0".repeat(r)).split("").map(Number), g = G.split("").map(Number), steps = [];
        for (let i = 0; i <= bits.length - g.length; i++) if (bits[i]) { for (let j = 0; j < g.length; j++) bits[i + j] ^= g[j]; steps.push(bits.join("")); }
        const Rr = bits.slice(-r).join("");
        return {
          html: `Il mittente vuole inviare <b>D = ${D}</b> con il generatore <b>G = ${G}</b> (r = ${r}). Calcola i bit di CRC R.`,
          fields: [{ label: `R (${r} bit)`, ans: Rr, kind: "text" }, { label: "Bit trasmessi D·2<sup>r</sup> XOR R", ans: D + Rr, kind: "text" }],
          sol: lines(`Si accodano ${r} zeri: ${D}${"0".repeat(r)}, poi divisione modulo 2 (XOR) per ${G}:`, steps.map((s) => `→ ${s}`).join("<br>"), `resto R = <b>${Rr}</b>; si invia <b>${D}${Rr}</b>, divisibile esattamente per G`)
        };
      }
    },
    switchlearn: {
      title: "Switch ad autoapprendimento", mod: "r6", exam: true,
      gen() {
        const nodes = ["A", "A'", "B", "B'", "C", "C'"];
        const pairs = shuffle([["A", "A'"], ["B", "B'"], ["A", "B"], ["C'", "A"], ["B'", "A'"]]).slice(0, 3);
        const watch = pick(nodes.filter((n) => !pairs.some((p) => p.includes(n))).concat(["C"]).slice(0, 1));
        const table = new Set(), log = []; let seen = 0, srcs = [];
        const send = (s, d) => { table.add(s); const flood = !table.has(d); const reach = flood || d === watch; if (reach && s !== watch) { seen++; srcs.push(s); } log.push(`${s} → ${d}: ${flood ? "destinazione sconosciuta → flooding" : `inoltro solo verso ${d}`}${reach && s !== watch ? ` (arriva a ${watch})` : ""}`); };
        pairs.forEach(([x, y]) => { send(x, y); send(y, x); });
        return {
          html: `Sei nodi (${nodes.join(", ")}) sono collegati a stella a uno switch Ethernet con tabella inizialmente vuota. Avvengono in ordine questi scambi (ogni frame riceve subito una risposta):<br>${pairs.map(([x, y], i) => `${i + 1}. ${x} invia un frame a ${y}, ${y} risponde a ${x}`).join("<br>")}`,
          fields: [{ label: `Quanti frame appaiono sull'interfaccia di ${watch}?`, ans: seen, abs: 0 }, { label: "Righe nella tabella dello switch alla fine", ans: table.size, abs: 0 }],
          sol: lines(`Lo switch impara la porta del mittente di ogni frame; inoltra in flooding solo se la destinazione non è in tabella.`, log.join("<br>"), `frame visti da ${watch}: <b>${seen}</b>${srcs.length ? ` (inviati da ${srcs.join(", ")})` : ""}; righe in tabella: <b>${table.size}</b>`)
        };
      }
    },

    /* ---------------- Cap. 7 ---------------- */
    cdma: {
      title: "CDMA: segnale sul canale e decodifica", mod: "r7", exam: true,
      gen() {
        const codes = shuffle([[1, 1, 1, -1, 1, -1, -1, -1], [1, -1, 1, 1, 1, -1, 1, 1], [-1, -1, 1, 1], [-1, 1, -1, 1], [1, 1, -1, -1], [1, -1, -1, 1]]);
        const short = Math.random() < 0.7, pool = short ? [[-1, -1, 1, 1], [-1, 1, -1, 1], [1, 1, -1, -1].map((x) => -x).map((x) => -x), [1, -1, -1, 1]] : null;
        let c1, c2;
        if (short) { const pr = shuffle([[[-1, -1, 1, 1], [-1, 1, -1, 1]], [[1, -1, -1, 1], [-1, -1, 1, 1]], [[-1, 1, -1, 1], [1, -1, -1, 1]]])[0]; [c1, c2] = pr; } else { c1 = [1, 1, 1, -1, 1, -1, -1, -1]; c2 = [1, -1, 1, 1, 1, -1, 1, 1]; }
        void codes; void pool;
        const b1 = [R(0, 1), R(0, 1)], b2 = [R(0, 1), R(0, 1)], M = c1.length;
        const enc = (c, b) => b.flatMap((x) => c.map((v) => (x ? v : -v)));
        const ch = enc(c1, b1).map((v, i) => v + enc(c2, b2)[i]);
        const dec = [0, 1].map((k) => ch.slice(k * M, k * M + M).reduce((a, v, i) => a + v * c1[i], 0) / M);
        return {
          html: `Il trasmettitore 1 usa il codice <b>(${c1.join(", ")})</b> e invia i bit <b>(${b1.join(", ")})</b>; il trasmettitore 2 usa <b>(${c2.join(", ")})</b> e invia <b>(${b2.join(", ")})</b>. Il bit 1 si codifica con il codice, il bit 0 con il codice cambiato di segno. I due segnali si sommano sul canale.`,
          fields: [
            { label: `Segnale totale sul canale (${2 * M} valori separati da virgole)`, ans: ch.join(", "), kind: "text", check: vecCheck(ch) },
            { label: "Valore decodificato dal ricevitore 1 per il primo bit (prodotto scalare / M)", ans: dec[0], abs: 0 }
          ],
          sol: lines(`trasmettitore 1: ${enc(c1, b1).join(" ")}`, `trasmettitore 2: ${enc(c2, b2).join(" ")}`, `somma: <b>${ch.join(" ")}</b>`, `decodifica 1° bit: Σ canale·codice₁ / ${M} = <b>${dec[0]}</b> → bit ${dec[0] > 0 ? 1 : 0}. I codici sono ortogonali, quindi il contributo dell'altro trasmettitore si annulla.`)
        };
      }
    },
    wifiaddr: {
      title: "Indirizzi nei frame 802.11", mod: "r7", exam: true,
      gen() {
        const down = Math.random() < 0.5, opts = ["H1", "AP", "R1"];
        return {
          html: `L'host wireless <b>H1</b> è associato all'access point <b>AP</b>, collegato via Ethernet al router <b>R1</b>. Indichiamo con H1, AP e R1 i rispettivi indirizzi MAC. Considera il frame 802.11 ${down ? "che porta a H1 un datagramma arrivato dal router (AP → H1)" : "con cui H1 invia un datagramma verso Internet (H1 → AP)"}.`,
          fields: down ? [
            { label: "Indirizzo 1 (ricevitore)", ans: "H1", kind: "choice", options: opts }, { label: "Indirizzo 2 (trasmettitore)", ans: "AP", kind: "choice", options: opts }, { label: "Indirizzo 3 (sorgente / router)", ans: "R1", kind: "choice", options: opts }
          ] : [
            { label: "Indirizzo 1 (ricevitore)", ans: "AP", kind: "choice", options: opts }, { label: "Indirizzo 2 (trasmettitore)", ans: "H1", kind: "choice", options: opts }, { label: "Indirizzo 3 (destinazione / router)", ans: "R1", kind: "choice", options: opts }
          ],
          sol: lines(`Address 1 = chi riceve sul canale radio, Address 2 = chi trasmette, Address 3 = l'interfaccia del router a cui o da cui va il frame.`, down ? `AP → H1: <b>H1, AP, R1</b>. Sulla tratta Ethernet R1 → AP il frame aveva sorgente R1 e destinazione H1: l'AP è trasparente per il router.` : `H1 → AP: <b>AP, H1, R1</b>. L'AP poi crea un frame Ethernet con sorgente H1 e destinazione R1.`)
        };
      }
    },

    /* ---------------- Sicurezza ---------------- */
    fwrules: {
      title: "Firewall stateless first-match", mod: "s8", exam: true,
      gen() {
        const dmz = `172.16.${R(1, 60)}`, lan = `172.16.${R(61, 120)}`, mail = `${dmz}.${R(2, 50)}`, db = `${lan}.${R(100, 200)}`;
        const rules = [
          ["deny", `${lan}.0/24`, mail, "TCP", "any", "25"],
          ["allow", "any", mail, "TCP", ">1023", "25"], ["allow", mail, "any", "TCP", "25", ">1023"],
          ["allow", mail, db, "TCP", ">1023", "5432"], ["allow", db, mail, "TCP", "5432", ">1023"],
          ["allow", `${lan}.0/24`, "any", "TCP", ">1023", "80,443"], ["allow", "any", `${lan}.0/24`, "TCP", "80,443", ">1023"],
          ["deny", "any", "any", "any", "any", "any"]
        ];
        const inNet = (ip, spec) => spec === "any" || spec === ip || (spec.endsWith("/24") && ip.startsWith(spec.slice(0, -4) + "."));
        const portOk = (p, spec) => spec === "any" || (spec === ">1023" ? p > 1023 : spec.split(",").map(Number).includes(p));
        const ext = `${R(80, 200)}.${R(0, 255)}.${R(0, 255)}.${R(1, 254)}`, cli = `${lan}.${R(2, 90)}`;
        const cands = [
          { s: ext, d: mail, p: "TCP", sp: R(1024, 60000), dp: 25 }, { s: ext, d: mail, p: "TCP", sp: R(1024, 60000), dp: 22 },
          { s: cli, d: mail, p: "TCP", sp: R(1024, 60000), dp: 25 }, { s: cli, d: ext, p: "TCP", sp: R(1024, 60000), dp: 443 },
          { s: ext, d: cli, p: "TCP", sp: 80, dp: R(1024, 60000) }, { s: mail, d: db, p: "TCP", sp: R(1024, 60000), dp: 5432 },
          { s: ext, d: db, p: "TCP", sp: R(1024, 60000), dp: 5432 }, { s: cli, d: ext, p: "UDP", sp: R(1024, 60000), dp: 53 }
        ];
        const pk = shuffle(cands).slice(0, 3);
        const res = pk.map((k) => { const i = rules.findIndex((r) => inNet(k.s, r[1]) && inNet(k.d, r[2]) && (r[3] === "any" || r[3] === k.p) && portOk(k.sp, r[4]) && portOk(k.dp, r[5])); return { i: i + 1, a: rules[i][0] }; });
        return {
          html: `Mail server in DMZ <b>${mail}</b>, database interno <b>${db}</b>, client interni <b>${lan}.0/24</b>. Il firewall è <b>stateless, first-match</b>:${tbl(["#", "Azione", "Sorgente", "Destinazione", "Proto", "Porta src", "Porta dst"], rules.map((r, i) => [i + 1, ...r]))}Per ogni pacchetto indica la regola applicata e l'esito:<br>${pk.map((k, i) => `${i + 1}) ${k.p} ${k.s}:${k.sp} → ${k.d}:${k.dp}`).join("<br>")}`,
          fields: res.flatMap((r, i) => [{ label: `Pacchetto ${i + 1}: numero della regola`, ans: r.i, abs: 0 }, { label: `Pacchetto ${i + 1}: esito`, ans: r.a, kind: "choice", options: ["allow", "deny"] }]),
          sol: lines(...res.map((r, i) => `pacchetto ${i + 1}: la prima regola che corrisponde a indirizzi, protocollo e porte è la <b>${r.i}</b> → <b>${r.a}</b>`), `La regola 1 (i client interni non possono usare il mail server) deve stare prima della allow «any → mail server porta 25»: in un first-match, se fosse dopo, i client passerebbero dalla regola 2. L'ultima regola è il default deny.`)
        };
      }
    },
    iptables: {
      title: "Valutare una catena iptables", mod: "s8", exam: true,
      gen() {
        const trusted = pick(["10.0.0.0/8", "192.168.1.0/24", "172.16.0.0/16"]), pol = pick(["DROP", "ACCEPT"]);
        const lan = trusted.split("/")[0].split(".").slice(0, trusted.endsWith("/24") ? 3 : trusted.endsWith("/16") ? 2 : 1).join(".");
        const rules = [
          { t: "-A INPUT -i lo -j ACCEPT", m: (p) => p.i === "lo", a: "ACCEPT" },
          { t: "-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT", m: (p) => p.st !== "NEW", a: "ACCEPT" },
          { t: "-A INPUT -p tcp --dport 80 -j ACCEPT", m: (p) => p.pr === "tcp" && p.dp === 80, a: "ACCEPT" },
          { t: `-A INPUT -s ${trusted} -p tcp --dport 22 -j ACCEPT`, m: (p) => p.pr === "tcp" && p.dp === 22 && p.s.startsWith(lan + "."), a: "ACCEPT" },
          { t: "-A INPUT -p tcp --dport 23 -j REJECT", m: (p) => p.pr === "tcp" && p.dp === 23, a: "REJECT" },
          { t: "-A INPUT -p icmp -j DROP", m: (p) => p.pr === "icmp", a: "DROP" }
        ];
        const ext = `${R(80, 200)}.${R(0, 255)}.${R(0, 255)}.${R(1, 254)}`, inn = `${lan}${".1".repeat(4 - lan.split(".").length).replace(/1$/, String(R(2, 250)))}`;
        const cands = [
          { d: `TCP NEW da ${ext} alla porta 22`, i: "eth0", s: ext, pr: "tcp", dp: 22, st: "NEW" }, { d: `TCP NEW da ${inn} alla porta 22`, i: "eth0", s: inn, pr: "tcp", dp: 22, st: "NEW" },
          { d: `TCP NEW da ${ext} alla porta 80`, i: "eth0", s: ext, pr: "tcp", dp: 80, st: "NEW" }, { d: `ICMP echo request (ping) da ${ext}`, i: "eth0", s: ext, pr: "icmp", dp: 0, st: "NEW" },
          { d: `TCP NEW da ${ext} alla porta 23 (telnet)`, i: "eth0", s: ext, pr: "tcp", dp: 23, st: "NEW" }, { d: `TCP NEW da ${ext} alla porta 3306`, i: "eth0", s: ext, pr: "tcp", dp: 3306, st: "NEW" },
          { d: `risposta TCP ESTABLISHED da ${ext}:443 a una connessione aperta dal server`, i: "eth0", s: ext, pr: "tcp", dp: R(30000, 60000), st: "ESTABLISHED" },
          { d: "TCP NEW da 127.0.0.1 alla porta 5432 su lo", i: "lo", s: "127.0.0.1", pr: "tcp", dp: 5432, st: "NEW" }
        ];
        const pk = shuffle(cands).slice(0, 4);
        const res = pk.map((p) => { const i = rules.findIndex((r) => r.m(p)); return i < 0 ? { n: 0, a: pol } : { n: i + 1, a: rules[i].a }; });
        return {
          html: `Questa è la catena INPUT di un server (le regole sono valutate dall'alto, la prima che corrisponde decide):${pre(`iptables -P INPUT ${pol}\n` + rules.map((r) => "iptables " + r.t).join("\n"))}Per ogni pacchetto in ingresso indica la regola che decide (0 = policy di default) e il verdetto:<br>${pk.map((p, i) => `${i + 1}) ${p.d}`).join("<br>")}`,
          fields: res.flatMap((r, i) => [{ label: `Pacchetto ${i + 1}: regola (0 = policy)`, ans: r.n, abs: 0 }, { label: `Pacchetto ${i + 1}: verdetto`, ans: r.a, kind: "choice", options: ["ACCEPT", "DROP", "REJECT"] }]),
          sol: lines(...res.map((r, i) => `pacchetto ${i + 1}: ${r.n ? `regola <b>${r.n}</b>` : "nessuna regola → <b>policy</b>"} → <b>${r.a}</b>`), `DROP scarta in silenzio; REJECT scarta e avvisa il mittente (ICMP o TCP RST). Con policy ${pol} ${pol === "ACCEPT" ? "tutto ciò che non è vietato passa: per un server conviene -P INPUT DROP (default deny)." : "vale il default deny."}`)
        };
      }
    },
    totpskew: {
      title: "TOTP con orologio sfasato", mod: "s3", exam: true,
      gen() {
        const step = pick([30, 60]), win = pick([1, 2]), skew = pick([15, 20, 40, 45, 70, 90, 120, 150]) * pick([1, -1]);
        const nowS = R(1000, 5000) * step + R(0, step - 1), diff = Math.floor((nowS + skew) / step) - Math.floor(nowS / step), ok = Math.abs(diff) <= win;
        return {
          html: `Alice usa un'app TOTP con <b>time step di ${step} s</b>. L'orologio del telefono è <b>${Math.abs(skew)} s ${skew > 0 ? "avanti" : "indietro"}</b> rispetto al server, che accetta i codici del passo corrente <b>±${win}</b>. In questo istante il tempo Unix del server è <b>${nowS}</b>.`,
          fields: [
            { label: "Contatore T del server (⌊t/step⌋)", ans: Math.floor(nowS / step), abs: 0 },
            { label: "Contatore T del telefono", ans: Math.floor((nowS + skew) / step), abs: 0 },
            { label: "Il codice di Alice viene accettato?", ans: ok ? "sì" : "no", kind: "choice", options: ["sì", "no"] }
          ],
          sol: lines(`server: ⌊${nowS}/${step}⌋ = <b>${Math.floor(nowS / step)}</b>`, `telefono: ⌊${nowS + skew}/${step}⌋ = <b>${Math.floor((nowS + skew) / step)}</b>`, `differenza ${diff} passi, finestra ±${win} → <b>${ok ? "accettato" : "rifiutato"}</b>`, `Rimedio: sincronizzare l'orologio (NTP) o far stimare al server lo sfasamento del dispositivo; allargare troppo la finestra aumenta il rischio di riuso del codice.`)
        };
      }
    }
  };

  Object.keys(NEW).forEach((k) => { const e = NEW[k]; e.id = k; EX[k] = e; });
  // Esercizi esistenti usati anche nella simulazione d'esame
  ["nat", "throughput", "seqack", "frag", "p2p", "dijkstra", "rsa", "unixperm", "subnetsplit"].forEach((k) => { if (EX[k]) EX[k].exam = true; });
})();
