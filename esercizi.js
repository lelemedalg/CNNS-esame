/* Generatori di esercizi numerici con valori casuali.
   Ogni generatore restituisce { html, fields, sol }.
   field: { label, ans, kind: "num" | "text" | "choice", unit?, tol?, abs?, options?, check? } */
(function () {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Numero leggibile in italiano: virgola decimale, potenze di 10 per valori estremi.
  function f(n, d = 3) {
    if (typeof n !== "number" || !isFinite(n)) return String(n);
    const a = Math.abs(n);
    if (n !== 0 && (a >= 1e7 || a < 1e-3)) {
      const e = Math.floor(Math.log10(a));
      let m = n / Math.pow(10, e);
      m = Number(m.toFixed(2));
      return `${String(m).replace(".", ",")}·10<sup>${e}</sup>`;
    }
    return Number(n.toFixed(d)).toLocaleString("it-IT", { useGrouping: false, maximumFractionDigits: d });
  }
  const lines = (...l) => l.join("<br>");

  // IPv4
  const ip2s = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
  const oct = (a, b, c, d) => (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;
  const maskOf = (x) => (x === 0 ? 0 : (0xffffffff << (32 - x)) >>> 0);
  const inPfx = (addr, net, x) => ((addr & maskOf(x)) >>> 0) === ((net & maskOf(x)) >>> 0);
  const ipCheck = (ans) => (v) => v.replace(/\s/g, "") === ans;

  const yesno = ["sì", "no"];

  const EX = {
    /* ------------------------------ CAPITOLO 1 ------------------------------ */
    onehop: {
      title: "Ritardo su un singolo link", mod: "r1",
      gen() {
        const L = pick([500, 1000, 1200, 1500, 2000, 4000]), Rm = pick([1, 2, 5, 10, 20, 100]);
        const dkm = pick([100, 500, 1000, 2500, 5000, 10000]), s = pick([2e8, 2.5e8, 3e8]);
        const dt = (L * 8) / (Rm * 1e6) * 1000, dp = (dkm * 1000) / s * 1000;
        return {
          html: `Un pacchetto di <b>${L} byte</b> viene trasmesso su un link a <b>${Rm} Mbps</b> lungo <b>${dkm} km</b>. La velocità di propagazione è <b>${f(s)} m/s</b>. Ignora elaborazione e coda.`,
          fields: [
            { label: "Ritardo di trasmissione", unit: "ms", ans: dt },
            { label: "Ritardo di propagazione", unit: "ms", ans: dp },
            { label: "Tempo dall'invio del primo bit alla ricezione dell'ultimo", unit: "ms", ans: dt + dp }
          ],
          sol: lines(
            `d<sub>trans</sub> = L/R = ${L * 8} bit / ${Rm}·10<sup>6</sup> bps = <b>${f(dt)} ms</b>`,
            `d<sub>prop</sub> = d/s = ${dkm * 1000} m / ${f(s)} m/s = <b>${f(dp)} ms</b>`,
            `totale = ${f(dt)} + ${f(dp)} = <b>${f(dt + dp)} ms</b>`)
        };
      }
    },
    e2e: {
      title: "Ritardo end-to-end store-and-forward", mod: "r1",
      gen() {
        const N = R(2, 4), L = pick([1000, 1500, 2000]), Rm = pick([1, 2, 5, 10]), s = 2e8;
        const ds = Array.from({ length: N }, () => pick([50, 100, 200, 500, 1000, 2000]));
        const dt = (L * 8) / (Rm * 1e6) * 1000, dp = ds.map((d) => (d * 1000) / s * 1000);
        const tot = N * dt + dp.reduce((a, b) => a + b, 0);
        return {
          html: `Un host invia un pacchetto di <b>${L} byte</b> a un altro host attraverso <b>${N} link</b> (${N - 1} router store-and-forward). Tutti i link vanno a <b>${Rm} Mbps</b>; le lunghezze sono <b>${ds.join(" km, ")} km</b> e la propagazione è 2·10<sup>8</sup> m/s. Ignora coda ed elaborazione.`,
          fields: [
            { label: "Ritardo di trasmissione su un link", unit: "ms", ans: dt },
            { label: "Ritardo end-to-end totale", unit: "ms", ans: tot }
          ],
          sol: lines(
            `Ogni router deve ricevere tutto il pacchetto prima di ritrasmetterlo, quindi la trasmissione si paga su ogni link.`,
            `L/R = ${L * 8} / ${Rm}·10<sup>6</sup> = ${f(dt)} ms; per ${N} link: ${f(N * dt)} ms`,
            `propagazione: ${dp.map((x) => f(x)).join(" + ")} = ${f(tot - N * dt)} ms`,
            `totale = <b>${f(tot)} ms</b>`)
        };
      }
    },
    qdelay: {
      title: "Ritardo di accodamento", mod: "r1",
      gen() {
        const T = pick([2, 4, 5, 8, 10]), Rm = pick([1, 2, 10]), Lbit = T * 1000 * Rm;
        const K = R(4, 6); const a = [0];
        for (let i = 1; i < K; i++) a.push(a[i - 1] + R(0, T + 1));
        const start = [], fin = [];
        for (let i = 0; i < K; i++) { start[i] = Math.max(a[i], i ? fin[i - 1] : 0); fin[i] = start[i] + T; }
        const q = a.map((x, i) => start[i] - x);
        const j = R(2, K - 1);
        return {
          html: `Su un link a <b>${Rm} Mbps</b> arrivano pacchetti di <b>${Lbit} bit</b> (trasmissione FIFO, coda inizialmente vuota). Gli istanti di arrivo, in ms, sono: <b>${a.map((x, i) => `P${i + 1}=${x}`).join(", ")}</b>. Un pacchetto arrivato all'istante t può iniziare la trasmissione da t.`,
          fields: [
            { label: "Tempo di trasmissione di un pacchetto", unit: "ms", ans: T },
            { label: `Ritardo di accodamento di P${j}`, unit: "ms", ans: q[j - 1], abs: 0.01 },
            { label: `Ritardo di accodamento di P${K}`, unit: "ms", ans: q[K - 1], abs: 0.01 },
            { label: `Istante in cui P${K} termina la trasmissione`, unit: "ms", ans: fin[K - 1], abs: 0.01 }
          ],
          sol: lines(`L/R = ${Lbit} / ${Rm}·10<sup>6</sup> = ${T} ms`,
            ...a.map((x, i) => `P${i + 1}: arriva ${x}, inizia ${start[i]}, finisce ${fin[i]} → coda <b>${q[i]} ms</b>`))
        };
      }
    },
    caravan: {
      title: "Analogia della carovana", mod: "r1",
      gen() {
        const n = R(5, 12), t = pick([6, 10, 12, 15, 20]), D = pick([50, 75, 100, 150]), v = pick([60, 80, 100, 120]), k = R(1, 3);
        const seg = n * t + (D / v) * 3600, tot = k * seg;
        return {
          html: `Una carovana di <b>${n} auto</b> è ferma davanti al casello 1. I caselli distano <b>${D} km</b> l'uno dall'altro, ogni casello serve un'auto ogni <b>${t} s</b> e le auto viaggiano a <b>${v} km/h</b>. Una carovana riparte da un casello solo quando tutte le auto sono passate (come store-and-forward). Quanto tempo serve perché l'intera carovana sia ferma davanti al casello ${k + 1}?`,
          fields: [
            { label: "Tempo per far passare la carovana da un casello", unit: "s", ans: n * t },
            { label: "Tempo totale", unit: "minuti", ans: tot / 60 }
          ],
          sol: lines(`servizio: ${n}·${t} = ${n * t} s (≈ trasmissione)`,
            `viaggio: ${D}/${v} h = ${f((D / v) * 3600)} s (≈ propagazione)`,
            `per ogni tratto: ${f(seg)} s; per ${k} tratti: ${f(tot)} s = <b>${f(tot / 60)} min</b>`)
        };
      }
    },
    circuit: {
      title: "Commutazione di circuito (FDM/TDM)", mod: "r1",
      gen() {
        const C = pick([10, 20, 50, 100]), c = pick([0.5, 1, 2, 5]);
        const Rm = pick([2, 4, 8, 16]), S = pick([4, 8, 16, 24]), F = pick([0.5, 1, 2, 4]), ts = pick([100, 250, 500]);
        const per = Rm / S, time = ts / 1000 + F / per;
        return {
          html: `(a) Un link da <b>${C} Mbps</b> usa commutazione di circuito e ogni chiamata richiede <b>${c} Mbps</b>.<br>(b) Un link TDM da <b>${Rm} Mbps</b> ha <b>${S} slot</b> per frame. Un host invia un file di <b>${F} Mbit</b> su un circuito; stabilire il circuito richiede <b>${ts} ms</b>.`,
          fields: [
            { label: "(a) Numero massimo di chiamate contemporanee", ans: Math.floor(C / c), abs: 0 },
            { label: "(b) Velocità del singolo circuito", unit: "Mbps", ans: per },
            { label: "(b) Tempo per inviare il file, compresa l'apertura", unit: "s", ans: time }
          ],
          sol: lines(`(a) ⌊${C}/${c}⌋ = <b>${Math.floor(C / c)}</b>`,
            `(b) ogni circuito usa uno slot su ${S}: ${Rm}/${S} = <b>${f(per)} Mbps</b>`,
            `tempo = ${ts} ms + ${F} Mbit / ${f(per)} Mbps = <b>${f(time)} s</b>`)
        };
      }
    },
    psvscs: {
      title: "Pacchetto vs circuito: probabilità", mod: "r1",
      gen() {
        const r = pick([100, 200, 250, 500]), M = R(4, 10), C = (M * r) / 1000, p = pick([0.05, 0.1, 0.15, 0.2]), N = R(M + 6, M * 4 + 6);
        const lnC = (n, k) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; };
        let cum = 0; for (let k = 0; k <= M; k++) cum += Math.exp(lnC(N, k) + k * Math.log(p) + (N - k) * Math.log(1 - p));
        const P = Math.max(0, 1 - cum);
        return {
          html: `Un link da <b>${f(C)} Mbps</b> è condiviso da utenti che, quando attivi, trasmettono a <b>${r} kbps</b>. Ogni utente è attivo con probabilità <b>p = ${f(p)}</b>, in modo indipendente. Con commutazione di pacchetto ci sono <b>N = ${N}</b> utenti.`,
          fields: [
            { label: "Utenti supportati con commutazione di circuito", ans: M, abs: 0 },
            { label: `Probabilità che più di ${M} utenti siano attivi insieme`, ans: P, abs: 0.0005, tol: 0.02 }
          ],
          sol: lines(`circuito: ${f(C)} Mbps / ${r} kbps = <b>${M}</b> utenti`,
            `P(X > ${M}) = 1 − Σ<sub>k=0..${M}</sub> C(${N},k) p<sup>k</sup>(1−p)<sup>${N}−k</sup> = <b>${P.toFixed(5).replace(".", ",")}</b>`,
            `Con probabilità ${f(1 - P, 4)} il link basta per tutti: ecco il guadagno della condivisione statistica.`)
        };
      }
    },
    throughput: {
      title: "Throughput end-to-end", mod: "r1",
      gen() {
        const Rs = pick([1, 2, 5, 10, 20]), Rc = pick([1, 2, 4, 5, 10, 25]), Rl = pick([10, 20, 50, 100]), N = R(2, 10);
        const t = Math.min(Rs, Rc, Rl / N);
        return {
          html: `<b>${N}</b> server inviano ciascuno a un proprio client. Ogni server ha un link d'accesso da <b>R<sub>s</sub> = ${Rs} Mbps</b>, ogni client da <b>R<sub>c</sub> = ${Rc} Mbps</b>, e tutti i flussi condividono un link centrale da <b>R = ${Rl} Mbps</b>, diviso in parti uguali.`,
          fields: [
            { label: "Quota del link centrale per flusso", unit: "Mbps", ans: Rl / N },
            { label: "Throughput di ciascun flusso", unit: "Mbps", ans: t }
          ],
          sol: lines(`R/N = ${Rl}/${N} = ${f(Rl / N)} Mbps`, `throughput = min(${Rs}, ${Rc}, ${f(Rl / N)}) = <b>${f(t)} Mbps</b> (collo di bottiglia)`)
        };
      }
    },
    layers: {
      title: "Pila protocollare", mod: "r1",
      gen() {
        const items = [["HTTP", "Applicazione"], ["DNS", "Applicazione"], ["SMTP", "Applicazione"], ["Messaggio", "Applicazione"], ["TCP", "Trasporto"], ["UDP", "Trasporto"], ["Numero di porta", "Trasporto"], ["Segmento", "Trasporto"], ["Controllo di congestione", "Trasporto"], ["IP", "Rete"], ["Indirizzo IP", "Rete"], ["Datagramma", "Rete"], ["Router (inoltro)", "Rete"], ["Ethernet", "Collegamento"], ["Indirizzo MAC", "Collegamento"], ["Frame", "Collegamento"], ["Switch", "Collegamento"], ["Accesso al mezzo Wi-Fi", "Collegamento"], ["Codifica dei bit sul cavo", "Fisico"]];
        const opts = ["Applicazione", "Trasporto", "Rete", "Collegamento", "Fisico"];
        const sel = shuffle(items).slice(0, 5);
        return {
          html: `A quale livello della pila Internet appartiene ciascun elemento?`,
          fields: sel.map(([n, l]) => ({ label: n, ans: l, kind: "choice", options: opts })),
          sol: sel.map(([n, l]) => `${n} → <b>${l}</b>`).join("<br>")
        };
      }
    },

    /* ------------------------------ CAPITOLO 2 ------------------------------ */
    dnshttp: {
      title: "Ritardi DNS e HTTP", mod: "r2",
      gen() {
        const n = R(1, 3), dns = Array.from({ length: n }, () => R(3, 60)), r0 = R(10, 80), m = R(3, 8), P = R(2, 5);
        const S = dns.reduce((a, b) => a + b, 0), base = S + 2 * r0;
        const a1 = base + m * 2 * r0, a2 = base + Math.ceil(m / P) * 2 * r0, a3 = base + m * r0, a4 = base + r0;
        return {
          html: `Un browser deve risolvere il nome del server: la risoluzione visita <b>${n}</b> server DNS con RTT <b>${dns.join(", ")} ms</b> (nessuna cache). L'RTT tra client e web server è <b>RTT<sub>0</sub> = ${r0} ms</b>. La pagina HTML referenzia <b>${m}</b> piccoli oggetti sullo stesso server. Trascura i tempi di trasmissione.`,
          fields: [
            { label: "Tempo per ricevere il file HTML base", unit: "ms", ans: base },
            { label: "Pagina completa, HTTP non persistente, connessioni seriali", unit: "ms", ans: a1 },
            { label: `Pagina completa, non persistente, ${P} connessioni parallele`, unit: "ms", ans: a2 },
            { label: "Pagina completa, persistente senza pipelining", unit: "ms", ans: a3 },
            { label: "Pagina completa, persistente con pipelining", unit: "ms", ans: a4 }
          ],
          sol: lines(`DNS: ${dns.join(" + ")} = ${S} ms; HTML: 2·RTT<sub>0</sub> (TCP + richiesta) → <b>${base} ms</b>`,
            `seriale: + ${m}·2·${r0} = <b>${a1} ms</b>`,
            `parallelo: ⌈${m}/${P}⌉ = ${Math.ceil(m / P)} gruppi da 2·RTT<sub>0</sub> → <b>${a2} ms</b>`,
            `persistente: + ${m}·RTT<sub>0</sub> → <b>${a3} ms</b>`,
            `pipelining: + 1·RTT<sub>0</sub> → <b>${a4} ms</b>`)
        };
      }
    },
    p2p: {
      title: "Distribuzione di file: client-server vs P2P", mod: "r2",
      gen() {
        const F = pick([5, 10, 15, 20]) * 1000, us = pick([20, 30, 50]), d = pick([2, 5, 10, 20]), u = pick([0.3, 0.5, 0.7, 1, 2]), N = pick([10, 100, 1000]);
        const cs = Math.max((N * F) / us, F / d), p2 = Math.max(F / us, F / d, (N * F) / (us + N * u));
        return {
          html: `Un file di <b>F = ${F / 1000} Gbit</b> va distribuito a <b>N = ${N}</b> peer. Il server ha upload <b>u<sub>s</sub> = ${us} Mbps</b>; ogni peer ha download <b>d = ${d} Mbps</b> e upload <b>u = ${f(u)} Mbps</b>.`,
          fields: [
            { label: "Tempo minimo client-server D<sub>cs</sub>", unit: "s", ans: cs },
            { label: "Tempo minimo P2P D<sub>P2P</sub>", unit: "s", ans: p2 }
          ],
          sol: lines(`D<sub>cs</sub> = max(N·F/u<sub>s</sub>, F/d<sub>min</sub>) = max(${f((N * F) / us)}, ${f(F / d)}) = <b>${f(cs)} s</b>`,
            `D<sub>P2P</sub> = max(F/u<sub>s</sub>, F/d<sub>min</sub>, N·F/(u<sub>s</sub>+N·u)) = max(${f(F / us)}, ${f(F / d)}, ${f((N * F) / (us + N * u))}) = <b>${f(p2)} s</b>`)
        };
      }
    },
    caching: {
      title: "Web cache e link d'accesso", mod: "r2",
      gen() {
        const a = pick([10, 15, 20, 25]), L = pick([100, 200, 500]), Rm = pick([1.54, 2, 5, 10, 15.4]), h = pick([0.3, 0.4, 0.5, 0.6]);
        const need = (a * L) / 1000, u0 = need / Rm, u1 = ((1 - h) * need) / Rm;
        return {
          html: `Una rete istituzionale genera <b>${a} richieste/s</b> di oggetti da <b>${L} kbit</b> verso server esterni. Il link d'accesso a Internet è da <b>${f(Rm)} Mbps</b>. Si installa una web cache con hit rate <b>${f(h)}</b>.`,
          fields: [
            { label: "Traffico richiesto verso Internet senza cache", unit: "Mbps", ans: need },
            { label: "Utilizzo del link d'accesso senza cache", ans: u0, tol: 0.01 },
            { label: "Utilizzo del link d'accesso con cache", ans: u1, tol: 0.01 }
          ],
          sol: lines(`${a}·${L} kbit/s = ${f(need)} Mbps`, `utilizzo = ${f(need)}/${f(Rm)} = <b>${f(u0)}</b>${u0 >= 0.9 ? " (vicino o sopra 1: ritardi enormi)" : ""}`,
            `con cache passa solo (1−${f(h)}) del traffico: <b>${f(u1)}</b>`)
        };
      }
    },
    httpget: {
      title: "Lettura di una richiesta HTTP", mod: "r2",
      gen() {
        const host = pick(["www.unito.it", "gaia.cs.umass.edu", "www.example.org", "di.unito.it", "www.reti.edu"]);
        const path = pick(["/index.html", "/corsi/reti.html", "/img/logo.png", "/esercizi/index.php", "/docs/slides.pdf"]);
        const ver = pick(["1.0", "1.1"]), conn = pick(["keep-alive", "close"]), cond = Math.random() < 0.5;
        const persistent = conn === "keep-alive" ? "sì" : "no";
        const req = [`GET ${path} HTTP/${ver}`, `Host: ${host}`, `User-Agent: Mozilla/5.0 (X11; Linux x86_64) Firefox/131.0`, `Accept: text/html,*/*;q=0.8`, `Accept-Language: it-IT,it;q=0.9`, ...(cond ? [`If-Modified-Since: Tue, 03 Nov 2026 10:21:07 GMT`] : []), `Connection: ${conn}`];
        return {
          html: `Un browser invia questa richiesta:<pre class="code">${req.join("\n")}</pre>`,
          fields: [
            { label: "Nome del server (host)", ans: host, kind: "text" },
            { label: "Percorso dell'oggetto richiesto", ans: path, kind: "text" },
            { label: "Versione HTTP", ans: ver, kind: "choice", options: ["1.0", "1.1", "2"] },
            { label: "Il browser chiede una connessione persistente?", ans: persistent, kind: "choice", options: yesno },
            { label: "È un GET condizionale?", ans: cond ? "sì" : "no", kind: "choice", options: yesno }
          ],
          sol: lines(`Host: <b>${host}</b>; oggetto <b>${path}</b>; versione <b>HTTP/${ver}</b>`,
            `Connection: ${conn} → persistente: <b>${persistent}</b>`,
            cond ? `If-Modified-Since presente: GET <b>condizionale</b>; se l'oggetto non è cambiato il server risponde 304 Not Modified.` : `Nessun If-Modified-Since: GET <b>non</b> condizionale.`)
        };
      }
    },

    /* ------------------------------ CAPITOLO 3 ------------------------------ */
    checksum: {
      title: "Checksum Internet", mod: "r3",
      gen() {
        const w = [R(0, 65535), R(0, 65535), R(0, 65535)];
        const b16 = (n) => n.toString(2).padStart(16, "0").replace(/(\d{4})(?=\d)/g, "$1 ");
        const steps = []; let s = 0;
        w.forEach((x, i) => {
          const raw = s + x; let t = raw;
          if (t > 0xffff) t = (t & 0xffff) + 1;
          if (i) steps.push(`${b16(s)} + ${b16(x)} = ${raw > 0xffff ? "1 " + b16(raw & 0xffff) + " → riporto rientrante → " : ""}${b16(t)}`);
          s = t;
        });
        const cs = ~s & 0xffff;
        const check = (v) => { const t = v.replace(/[\s_]/g, "").toLowerCase(); if (/^[01]{16}$/.test(t)) return parseInt(t, 2) === cs; const h = t.replace(/^0x/, ""); return /^[0-9a-f]{1,4}$/.test(h) && parseInt(h, 16) === cs; };
        return {
          html: `Calcola la checksum Internet (UDP/TCP) di queste tre parole da 16 bit:<pre class="code">${w.map(b16).join("\n")}</pre>`,
          fields: [{ label: "Checksum (16 bit in binario, oppure esadecimale 0x…)", ans: b16(cs), kind: "text", check }],
          sol: lines(...steps, `somma = ${b16(s)}`, `complemento a uno → <b>${b16(cs)}</b> (0x${cs.toString(16).padStart(4, "0")})`,
            `Il ricevitore somma tutte le parole e la checksum: se ottiene 1111 1111 1111 1111 non rileva errori.`)
        };
      }
    },
    rtt: { title: "Stima di RTT e timeout TCP", mod: "r3" },
    cwnd: {
      title: "Evoluzione della finestra di congestione", mod: "r3",
      gen() {
        const S0 = pick([8, 16, 32]); const ssRounds = Math.log2(S0) + 1;
        const t1 = ssRounds + R(2, 4), t2 = t1 + R(3, 6), T = t2 + R(5, 7);
        let cw = 1, ss = S0; const rows = [];
        for (let t = 1; t <= T; t++) {
          rows.push({ t, cw, ss, ev: t === t1 ? "3 ACK dup" : t === t2 ? "timeout" : "" });
          if (t === t1) { ss = Math.max(Math.floor(cw / 2), 1); cw = ss + 3; }
          else if (t === t2) { ss = Math.max(Math.floor(cw / 2), 1); cw = 1; }
          else if (cw < ss) cw = Math.min(cw * 2, ss);
          else cw += 1;
        }
        const at = (t) => rows[t - 1].cw;
        const q1 = R(2, ssRounds), q2 = t1 + R(1, t2 - t1 - 1 > 0 ? t2 - t1 - 1 : 1), q3 = t2 + R(2, T - t2);
        const ssAfter1 = rows[t1].ss, ssAfter2 = rows[t2].ss;
        const tbl = `<div class="tbl-wrap"><table class="tbl"><tr><th>Round</th>${rows.map((r) => `<td>${r.t}</td>`).join("")}</tr><tr><th>cwnd</th>${rows.map((r) => `<td>${r.cw}</td>`).join("")}</tr><tr><th>ssthresh</th>${rows.map((r) => `<td>${r.ss}</td>`).join("")}</tr><tr><th>Evento</th>${rows.map((r) => `<td>${r.ev ? "⚑" : ""}</td>`).join("")}</tr></table></div>`;
        return {
          html: `TCP Reno parte con <b>cwnd = 1 MSS</b> e <b>ssthresh = ${S0} MSS</b>. Al termine del round <b>${t1}</b> riceve <b>tre ACK duplicati</b>; al termine del round <b>${t2}</b> scade un <b>timeout</b>. Convenzioni: in slow start cwnd raddoppia per round senza superare ssthresh; poi cresce di 1 per round. Dopo 3 ACK duplicati ssthresh = ⌊cwnd/2⌋ e cwnd = ssthresh + 3; dopo un timeout ssthresh = ⌊cwnd/2⌋ e cwnd = 1.`,
          fields: [
            { label: `cwnd nel round ${q1}`, unit: "MSS", ans: at(q1), abs: 0 },
            { label: `ssthresh dopo i 3 ACK duplicati`, unit: "MSS", ans: ssAfter1, abs: 0 },
            { label: `cwnd nel round ${q2}`, unit: "MSS", ans: at(q2), abs: 0 },
            { label: `ssthresh dopo il timeout`, unit: "MSS", ans: ssAfter2, abs: 0 },
            { label: `cwnd nel round ${q3}`, unit: "MSS", ans: at(q3), abs: 0 }
          ],
          sol: `Slow start nei round 1–${ssRounds}, congestion avoidance fino al round ${t1}.${tbl}`
        };
      }
    },
    seqack: {
      title: "Numeri di sequenza e ACK con perdita", mod: "r3",
      gen() {
        const x = R(100, 9000), s = [R(2, 20) * 50, R(2, 20) * 50, R(2, 20) * 50, R(2, 20) * 50];
        const seq = [x, x + s[0], x + s[0] + s[1], x + s[0] + s[1] + s[2]], end = seq[3] + s[3];
        return {
          html: `Un mittente TCP invia di fila 4 segmenti con <b>${s.join(", ")} byte</b> di dati; il primo ha numero di sequenza <b>${x}</b>. Il secondo segmento va perso, gli altri arrivano in ordine. Il ricevitore invia un ACK per ogni segmento ricevuto e conserva i segmenti fuori ordine. Poi il mittente ritrasmette il secondo segmento, che arriva.`,
          fields: [
            { label: "Numero di sequenza del terzo segmento", ans: seq[2], abs: 0 },
            { label: "ACK inviato dopo il primo segmento", ans: seq[1], abs: 0 },
            { label: "ACK inviato dopo il terzo segmento", ans: seq[1], abs: 0 },
            { label: "ACK inviato dopo il secondo segmento ritrasmesso", ans: end, abs: 0 }
          ],
          sol: lines(`seq: ${seq.join(", ")}`, `ACK = prossimo byte atteso: dopo il primo <b>${seq[1]}</b>`,
            `terzo e quarto arrivano fuori ordine: ACK duplicati <b>${seq[1]}</b>`,
            `arriva il secondo: il buffer è completo fino a ${end - 1}, quindi ACK cumulativo <b>${end}</b>`)
        };
      }
    },
    demux: {
      title: "Multiplexing e demultiplexing", mod: "r3",
      gen() {
        const pa = R(1024, 65000), pb1 = R(1024, 65000), pb2 = R(1024, 65000), sp = pick([80, 443, 25]);
        const A = `${R(11, 200)}.${R(0, 255)}.${R(0, 255)}.${R(1, 254)}`, B = `${R(11, 200)}.${R(0, 255)}.${R(0, 255)}.${R(1, 254)}`;
        return {
          html: `Un server TCP è in ascolto sulla porta <b>${sp}</b>. L'host A (${A}) apre una connessione dalla porta <b>${pa}</b>; l'host B (${B}) apre due connessioni dalle porte <b>${pb1}</b> e <b>${pb2}</b>.`,
          fields: [
            { label: "Porta sorgente dei segmenti dal server verso B (seconda connessione)", ans: sp, abs: 0 },
            { label: "Porta destinazione degli stessi segmenti", ans: pb2, abs: 0 },
            { label: "Socket di connessione sul server (escluso quello di benvenuto)", ans: 3, abs: 0 },
            { label: "Se fosse un server UDP sulla stessa porta: quanti socket?", ans: 1, abs: 0 }
          ],
          sol: lines(`Risposta: porte invertite → sorgente <b>${sp}</b>, destinazione <b>${pb2}</b>.`,
            `TCP: ogni connessione ha la sua quadrupla (IP src, porta src, IP dst, porta dst) → <b>3</b> socket.`,
            `UDP: il socket è identificato da (IP dst, porta dst) → <b>1</b> socket per tutti.`)
        };
      }
    },
    utilization: {
      title: "Stop-and-wait e pipelining", mod: "r3",
      gen() {
        const L = pick([1000, 1500, 8000]), Rm = pick([1, 10, 100, 1000]), rtt = pick([10, 30, 50, 100]), N = pick([3, 10, 50, 100]);
        const tt = (L * 8) / (Rm * 1e6) * 1000, U = tt / (rtt + tt), UN = Math.min(1, (N * tt) / (rtt + tt)), thr = (L * 8) / ((rtt + tt) / 1000) / 1e6;
        return {
          html: `Pacchetti di <b>${L} byte</b> su un link da <b>${Rm} Mbps</b> con <b>RTT = ${rtt} ms</b> (escluso il tempo di trasmissione). ACK di dimensione trascurabile.`,
          fields: [
            { label: "Utilizzo del mittente con stop-and-wait", ans: U, tol: 0.01 },
            { label: "Throughput effettivo con stop-and-wait", unit: "Mbps", ans: thr },
            { label: `Utilizzo con pipelining di ${N} pacchetti`, ans: UN, tol: 0.01 }
          ],
          sol: lines(`L/R = ${f(tt, 4)} ms`, `U = (L/R)/(RTT + L/R) = ${f(tt, 4)}/${f(rtt + tt, 4)} = <b>${f(U, 5)}</b>`,
            `throughput = L/(RTT + L/R) = <b>${f(thr, 4)} Mbps</b>`, `pipelining: min(1, ${N}·U) = <b>${f(UN, 5)}</b>`)
        };
      }
    },
    gbn: {
      title: "Go-Back-N e Selective Repeat", mod: "r3",
      gen() {
        const N = R(4, 8), k = R(1, N - 2);
        return {
          html: `Il mittente ha una finestra di <b>N = ${N}</b> e invia i pacchetti 0…${N - 1}. Il pacchetto <b>${k}</b> va perso; tutti gli altri pacchetti e ACK arrivano. Poi scade il timer.`,
          fields: [
            { label: "GBN: pacchetti ritrasmessi", ans: N - k, abs: 0 },
            { label: "GBN: ACK duplicati ricevuti dal mittente", ans: N - 1 - k, abs: 0 },
            { label: "SR: pacchetti ritrasmessi", ans: 1, abs: 0 },
            { label: "SR: pacchetti conservati nel buffer del ricevitore", ans: N - 1 - k, abs: 0 }
          ],
          sol: lines(`GBN: il ricevitore scarta ${k + 1}…${N - 1} e riscontra ogni volta ACK ${k - 1} → <b>${N - 1 - k}</b> duplicati; al timeout il mittente rimanda ${k}…${N - 1} → <b>${N - k}</b> pacchetti.`,
            `SR: ACK individuali; ${k + 1}…${N - 1} vanno nel buffer (<b>${N - 1 - k}</b>); scade solo il timer di ${k} → <b>1</b> ritrasmissione.`)
        };
      }
    },

    /* ------------------------------ CAPITOLO 4 ------------------------------ */
    lpm: {
      title: "Longest prefix matching", mod: "r4",
      gen() {
        const A = pick([128, 135, 192, 200, 203, 212]), B = R(0, 255), b = R(0, 15) * 16;
        const t2 = b + 2 * R(0, 7), t3 = t2 + R(0, 1), f3 = pick([0, 128]);
        const P = [[oct(A, B, b, 0), 20], [oct(A, B, t2, 0), 23], [oct(A, B, t3, f3), 25]];
        const ifs = shuffle([0, 1, 2, 3]);
        const lpm = (a) => { let best = -1, len = -1; P.forEach(([n, x], i) => { if (inPfx(a, n, x) && x > len) { best = i; len = x; } }); return best < 0 ? ifs[3] : ifs[best]; };
        const addrs = [oct(A, B, t3, f3 + R(1, 126))];
        let a2; do { a2 = oct(A, B, t2 + R(0, 1), R(1, 254)); } while (inPfx(a2, P[2][0], 25)); addrs.push(a2);
        let a3; do { a3 = oct(A, B, b + R(0, 15), R(1, 254)); } while (inPfx(a3, P[1][0], 23)); addrs.push(a3);
        let a4; do { a4 = oct(A, B, R(0, 255), R(1, 254)); } while (inPfx(a4, P[0][0], 20)); addrs.push(a4);
        const qs = shuffle(addrs);
        const tbl = `<div class="tbl-wrap"><table class="tbl"><tr><th>Prefisso</th><th>Interfaccia</th></tr>${P.map(([n, x], i) => `<tr><td>${ip2s(n)}/${x}</td><td>${ifs[i]}</td></tr>`).join("")}<tr><td>altrimenti</td><td>${ifs[3]}</td></tr></table></div>`;
        return {
          html: `Un router ha questa tabella di inoltro:${tbl}Su quale interfaccia inoltra ciascun indirizzo?`,
          fields: qs.map((a) => ({ label: ip2s(a), ans: lpm(a), abs: 0 })),
          sol: qs.map((a) => { const m = P.map(([n, x]) => (inPfx(a, n, x) ? `/${x}` : null)).filter(Boolean); return `${ip2s(a)} → corrisponde a ${m.length ? m.join(", ") : "nessun prefisso"} → interfaccia <b>${lpm(a)}</b>`; }).join("<br>")
        };
      }
    },
    subnet: {
      title: "Indirizzo, maschera e broadcast", mod: "r4",
      gen() {
        const x = R(18, 30), a = oct(pick([10, 130, 172, 192, 200, 212]), R(0, 255), R(0, 255), R(1, 254));
        const m = maskOf(x), net = (a & m) >>> 0, bc = (net | (~m >>> 0)) >>> 0, hosts = Math.pow(2, 32 - x) - 2;
        return {
          html: `Un'interfaccia ha indirizzo <b>${ip2s(a)}/${x}</b>.`,
          fields: [
            { label: "Maschera di sottorete (notazione puntata)", ans: ip2s(m), kind: "text", check: ipCheck(ip2s(m)) },
            { label: "Indirizzo di rete", ans: ip2s(net), kind: "text", check: ipCheck(ip2s(net)) },
            { label: "Indirizzo di broadcast", ans: ip2s(bc), kind: "text", check: ipCheck(ip2s(bc)) },
            { label: "Primo indirizzo assegnabile", ans: ip2s(net + 1), kind: "text", check: ipCheck(ip2s(net + 1)) },
            { label: "Numero di host assegnabili", ans: hosts, abs: 0 }
          ],
          sol: lines(`/${x}: ${x} bit di rete, ${32 - x} bit di host → maschera <b>${ip2s(m)}</b>`,
            `rete = indirizzo AND maschera = <b>${ip2s(net)}</b>`, `broadcast = rete con tutti i bit di host a 1 = <b>${ip2s(bc)}</b>`,
            `host = 2<sup>${32 - x}</sup> − 2 = <b>${hosts}</b> (da ${ip2s(net + 1)} a ${ip2s(bc - 1)})`)
        };
      }
    },
    subnetsplit: {
      title: "Suddivisione in sottoreti", mod: "r4",
      gen() {
        const a = pick([192, 200, 223, 130]), b = R(0, 255), c = R(0, 255), k = pick([2, 4, 8, 16]), j = R(1, k), H = R(5, 120);
        const bits = Math.log2(k), x = 24 + bits, size = 256 / k, start = (j - 1) * size;
        const need = 32 - Math.ceil(Math.log2(H + 2));
        const n = `${a}.${b}.${c}.${start}`, bc = `${a}.${b}.${c}.${start + size - 1}`;
        return {
          html: `(a) La rete <b>${a}.${b}.${c}.0/24</b> va divisa in <b>${k}</b> sottoreti della stessa dimensione.<br>(b) Una sottorete deve ospitare almeno <b>${H}</b> interfacce.`,
          fields: [
            { label: "(a) Lunghezza del prefisso di ogni sottorete", ans: x, abs: 0 },
            { label: `(a) Indirizzo della sottorete n. ${j}`, ans: n, kind: "text", check: ipCheck(n) },
            { label: `(a) Broadcast della sottorete n. ${j}`, ans: bc, kind: "text", check: ipCheck(bc) },
            { label: "(b) Prefisso più lungo possibile", ans: need, abs: 0 }
          ],
          sol: lines(`(a) ${k} = 2<sup>${bits}</sup> → servono ${bits} bit in più: <b>/${x}</b>, ${size} indirizzi ciascuna`,
            `sottorete ${j}: parte da ${(j - 1)}·${size} = ${start} → <b>${n}/${x}</b>, broadcast <b>${bc}</b>`,
            `(b) servono ${H} + 2 indirizzi (rete e broadcast) → 2<sup>${Math.ceil(Math.log2(H + 2))}</sup> = ${Math.pow(2, Math.ceil(Math.log2(H + 2)))} → <b>/${need}</b>`)
        };
      }
    },
    nat: {
      title: "Traduzione degli indirizzi (NAT)", mod: "r4",
      gen() {
        const P = `${R(128, 200)}.${R(0, 255)}.${R(0, 255)}.${R(1, 254)}`, S = `${R(11, 120)}.${R(0, 255)}.${R(0, 255)}.${R(1, 254)}`;
        const rows = shuffle([2, 3, 4, 5, 6, 7]).slice(0, 3).map((h) => ({ h: `10.0.0.${h}`, p: R(1024, 9000), np: R(5000, 6000) }));
        const r1 = rows[1], r2 = rows[2];
        const tbl = `<div class="tbl-wrap"><table class="tbl"><tr><th>Lato WAN</th><th>Lato LAN</th></tr>${rows.map((r) => `<tr><td>${P}, ${r.np}</td><td>${r.h}, ${r.p}</td></tr>`).join("")}</table></div>`;
        return {
          html: `Un router NAT ha indirizzo pubblico <b>${P}</b> e questa tabella di traduzione:${tbl}(1) L'host <b>${r1.h}</b> invia un segmento dalla porta <b>${r1.p}</b> al server <b>${S}:80</b>.<br>(2) Il server ${S} risponde con un segmento dalla porta 80 a <b>${P}:${r2.np}</b>.`,
          fields: [
            { label: "(1) IP sorgente dopo il NAT", ans: P, kind: "text", check: ipCheck(P) },
            { label: "(1) Porta sorgente dopo il NAT", ans: r1.np, abs: 0 },
            { label: "(1) IP destinazione dopo il NAT", ans: S, kind: "text", check: ipCheck(S) },
            { label: "(2) IP destinazione dopo il NAT", ans: r2.h, kind: "text", check: ipCheck(r2.h) },
            { label: "(2) Porta destinazione dopo il NAT", ans: r2.p, abs: 0 }
          ],
          sol: lines(`(1) In uscita il NAT sostituisce (${r1.h}, ${r1.p}) con (<b>${P}</b>, <b>${r1.np}</b>); la destinazione resta <b>${S}</b>:80.`,
            `(2) In entrata cerca (${P}, ${r2.np}) nella tabella e lo sostituisce con (<b>${r2.h}</b>, <b>${r2.p}</b>).`)
        };
      }
    },
    sched: {
      title: "Scheduling dei pacchetti", mod: "r4",
      gen() {
        const disc = pick(["priorità", "round robin"]), K = 8;
        const arr = []; let t = 0;
        for (let i = 1; i <= K; i++) { arr.push({ id: i, a: t, c: disc === "priorità" ? pick(["alta", "bassa"]) : pick([1, 2]) }); t += pick([0, 0, 1, 1, 2]); }
        const done = [], q = arr.slice(); let now = 0, rr = 1;
        while (q.length) {
          const avail = q.filter((p) => p.a <= now);
          if (!avail.length) { now = Math.min(...q.map((p) => p.a)); continue; }
          let p;
          if (disc === "priorità") p = avail.find((x) => x.c === "alta") || avail[0];
          else { p = avail.find((x) => x.c === rr) || avail[0]; rr = p.c === 1 ? 2 : 1; }
          done.push({ id: p.id, s: now }); q.splice(q.indexOf(p), 1); now += 1;
        }
        const order = done.map((d) => d.id).join(",");
        const tbl = `<div class="tbl-wrap"><table class="tbl"><tr><th>Pacchetto</th>${arr.map((p) => `<td>${p.id}</td>`).join("")}</tr><tr><th>Arrivo</th>${arr.map((p) => `<td>${p.a}</td>`).join("")}</tr><tr><th>Classe</th>${arr.map((p) => `<td>${p.c}</td>`).join("")}</tr></table></div>`;
        const check = (v) => v.replace(/[^\d,\s]/g, "").trim().split(/[\s,]+/).join(",") === order;
        return {
          html: `Un link usa scheduling <b>${disc}</b>${disc === "round robin" ? " tra le classi 1 e 2 (si comincia dalla classe 1; se la classe di turno è vuota si serve l'altra)" : " (classe alta prima; FIFO dentro ogni classe)"}. Ogni pacchetto richiede 1 unità di tempo, la trasmissione non viene interrotta e un pacchetto arrivato all'istante t può partire da t.${tbl}`,
          fields: [{ label: "Ordine di trasmissione (es. 1,3,2,…)", ans: order, kind: "text", check }],
          sol: done.map((d) => `t=${d.s}: trasmette ${d.id}`).join("<br>") + `<br>ordine: <b>${order}</b>`
        };
      }
    },
    frag: {
      title: "Frammentazione IPv4", mod: "r4",
      gen() {
        const MTU = pick([576, 1000, 1500]), per = Math.floor((MTU - 20) / 8) * 8;
        const T = 20 + per + R(per / 4, per * 2.5) | 0, data = T - 20, n = Math.ceil(data / per), last = data - (n - 1) * per;
        return {
          html: `Un datagramma IPv4 lungo <b>${T} byte</b> (header di 20 byte, nessuna opzione) deve attraversare un link con <b>MTU = ${MTU} byte</b>.`,
          fields: [
            { label: "Numero di frammenti", ans: n, abs: 0 },
            { label: "Byte di dati nel primo frammento", ans: per, abs: 0 },
            { label: "Offset del secondo frammento", ans: per / 8, abs: 0 },
            { label: "Lunghezza totale dell'ultimo frammento", unit: "byte", ans: last + 20, abs: 0 },
            { label: "Offset dell'ultimo frammento", ans: ((n - 1) * per) / 8, abs: 0 }
          ],
          sol: lines(`dati = ${T} − 20 = ${data} byte; per frammento ⌊(${MTU} − 20)/8⌋·8 = ${per} byte (multiplo di 8)`,
            `frammenti = ⌈${data}/${per}⌉ = <b>${n}</b>; offset in unità di 8 byte: 0, ${per / 8}, …`,
            `ultimo: ${last} byte di dati + 20 = <b>${last + 20}</b>, offset <b>${((n - 1) * per) / 8}</b>, flag MF = 0`)
        };
      }
    },

    /* ------------------------------ CAPITOLO 5 ------------------------------ */
    dijkstra: {
      title: "Algoritmo di Dijkstra", mod: "r5",
      gen() {
        const names = ["u", "v", "w", "x", "y", "z"];
        const pos = { u: [40, 110], v: [150, 30], x: [150, 190], w: [270, 30], y: [270, 190], z: [380, 110] };
        const allowed = [["u", "v"], ["u", "x"], ["v", "x"], ["v", "w"], ["x", "y"], ["w", "y"], ["v", "y"], ["x", "w"], ["w", "z"], ["y", "z"]];
        let E, res;
        for (let tries = 0; tries < 400; tries++) {
          E = shuffle(allowed).slice(0, R(7, 9)).map(([a, b]) => ({ a, b, c: R(1, 10) }));
          res = run(E); if (res) break;
        }
        function run(E) {
          const adj = {}; names.forEach((n) => (adj[n] = []));
          E.forEach((e) => { adj[e.a].push([e.b, e.c]); adj[e.b].push([e.a, e.c]); });
          const D = { u: 0 }, P = {}, cnt = { u: 1 }, Np = ["u"], steps = [];
          names.forEach((n) => { if (n !== "u") { D[n] = Infinity; cnt[n] = 0; } });
          adj.u.forEach(([n, c]) => { D[n] = c; P[n] = "u"; cnt[n] = 1; });
          steps.push({ N: Np.slice(), D: { ...D }, P: { ...P } });
          while (Np.length < 6) {
            const cand = names.filter((n) => !Np.includes(n));
            const w = cand.reduce((m, n) => (D[n] < D[m] ? n : m), cand[0]);
            if (!isFinite(D[w])) return null;
            if (cand.some((n) => n !== w && D[n] === D[w])) return null;
            Np.push(w);
            adj[w].forEach(([n, c]) => {
              if (Np.includes(n)) return;
              if (D[w] + c < D[n]) { D[n] = D[w] + c; P[n] = w; cnt[n] = cnt[w]; }
              else if (D[w] + c === D[n]) return null;
            });
            steps.push({ N: Np.slice(), D: { ...D }, P: { ...P } });
          }
          // unicità dei cammini minimi
          for (const e of E) for (const [s, t] of [[e.a, e.b], [e.b, e.a]]) if (t !== "u" && P[t] !== s && D[s] + e.c === D[t]) return null;
          return { D, P, steps, order: Np };
        }
        const hop = (n) => { let c = n; while (res.P[c] !== "u") c = res.P[c]; return c; };
        const svg = `<svg class="graph" viewBox="0 0 420 220" role="img" aria-label="Grafo con sei nodi">${E.map((e) => { const [x1, y1] = pos[e.a], [x2, y2] = pos[e.b]; const diag = x1 !== x2 && Math.abs(y1 - y2) > 100, tt = diag ? 0.28 : 0.5; const mx = x1 + (x2 - x1) * tt, my = y1 + (y2 - y1) * tt; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="g-edge"/><rect x="${mx - 11}" y="${my - 10}" width="22" height="20" rx="4" class="g-lbl-bg"/><text x="${mx}" y="${my + 5}" class="g-lbl">${e.c}</text>`; }).join("")}${names.map((n) => `<circle cx="${pos[n][0]}" cy="${pos[n][1]}" r="17" class="g-node${n === "u" ? " g-src" : ""}"/><text x="${pos[n][0]}" y="${pos[n][1] + 5}" class="g-name">${n}</text>`).join("")}</svg>`;
        const others = names.slice(1);
        const head = `<tr><th>Passo</th><th>N'</th>${others.map((n) => `<th>D(${n}),p(${n})</th>`).join("")}</tr>`;
        const body = res.steps.map((s, i) => `<tr><td>${i}</td><td>${s.N.join("")}</td>${others.map((n) => (s.N.includes(n) && s.N.indexOf(n) < i ? "<td></td>" : `<td>${isFinite(s.D[n]) ? `${s.D[n]},${s.P[n]}` : "∞"}</td>`)).join("")}</tr>`).join("");
        const target = pick(["w", "y", "z"]);
        return {
          html: `Applica l'algoritmo di Dijkstra dal nodo <b>u</b>.${svg}`,
          fields: [
            ...others.map((n) => ({ label: `D(${n})`, ans: res.D[n], abs: 0 })),
            { label: "Ordine di inserimento in N' (es. u,x,v,…)", ans: res.order.join(","), kind: "text", check: (v) => v.toLowerCase().replace(/[^a-z]/g, "") === res.order.join("") },
            { label: `Primo hop da u verso ${target}`, ans: hop(target), kind: "choice", options: ["v", "w", "x", "y", "z"] }
          ],
          sol: `<div class="tbl-wrap"><table class="tbl">${head}${body}</table></div>Ordine: <b>${res.order.join(", ")}</b>. Verso ${target}: ${(() => { const p = [target]; let c = target; while (c !== "u") { c = res.P[c]; p.unshift(c); } return p.join(" → "); })()} → primo hop <b>${hop(target)}</b>.`
        };
      }
    },
    dv: {
      title: "Distance vector (Bellman-Ford)", mod: "r5",
      gen() {
        const dests = ["u", "v", "w", "y", "z"]; let nb, c, V, D, H;
        for (let t = 0; t < 200; t++) {
          nb = shuffle(["v", "w", "y"]).slice(0, R(2, 3)).sort();
          c = {}; nb.forEach((n) => (c[n] = R(1, 8)));
          V = {}; nb.forEach((n) => { V[n] = {}; dests.forEach((d) => (V[n][d] = d === n ? 0 : R(1, 12))); });
          D = {}; H = {}; let ok = true;
          dests.forEach((d) => { const vals = nb.map((n) => c[n] + V[n][d]); const m = Math.min(...vals); if (vals.filter((v) => v === m).length > 1) ok = false; D[d] = m; H[d] = nb[vals.indexOf(m)]; });
          if (ok) break;
        }
        const tbl = `<div class="tbl-wrap"><table class="tbl"><tr><th>Vettore di</th>${dests.map((d) => `<th>${d}</th>`).join("")}</tr>${nb.map((n) => `<tr><td>D<sub>${n}</sub></td>${dests.map((d) => `<td>${V[n][d]}</td>`).join("")}</tr>`).join("")}</table></div>`;
        const q = shuffle(dests).slice(0, 2);
        return {
          html: `Il nodo <b>x</b> ha vicini ${nb.map((n) => `<b>${n}</b> (c(x,${n}) = ${c[n]})`).join(", ")}. Ha appena ricevuto questi vettori delle distanze:${tbl}Calcola il nuovo vettore di x con Bellman-Ford.`,
          fields: [...dests.map((d) => ({ label: `D<sub>x</sub>(${d})`, ans: D[d], abs: 0 })), ...q.map((d) => ({ label: `Prossimo hop verso ${d}`, ans: H[d], kind: "choice", options: nb }))],
          sol: dests.map((d) => `D<sub>x</sub>(${d}) = min(${nb.map((n) => `${c[n]}+${V[n][d]}`).join(", ")}) = <b>${D[d]}</b> via ${H[d]}`).join("<br>")
        };
      }
    },

    /* ------------------------------ SICUREZZA ------------------------------ */
    caesar: {
      title: "Cifrario di Cesare", mod: "s2",
      gen() {
        const words = ["voto", "esame", "rete", "chiave", "segreto", "router", "pacchetto", "firewall", "hash", "token", "unito"];
        const w = pick(words), k = R(1, 25), enc = (s, k) => s.replace(/[a-z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 97 + k) % 26) + 65));
        const w2 = pick(words.filter((x) => x !== w)), k2 = R(1, 25), c2 = enc(w2, k2);
        return {
          html: `(a) Cifra <b>${w}</b> con chiave <b>${k}</b>.<br>(b) Il testo <b>${c2}</b> è stato cifrato con chiave <b>${k2}</b>: decifralo.`,
          fields: [
            { label: "(a) Testo cifrato", ans: enc(w, k), kind: "text" },
            { label: "(b) Testo in chiaro", ans: w2, kind: "text" },
            { label: "Chiavi da provare per la forza bruta", ans: 25, abs: 0 }
          ],
          sol: lines(`(a) ogni lettera avanza di ${k}: <b>${enc(w, k)}</b>`, `(b) ogni lettera indietro di ${k2}: <b>${w2}</b>`, `Le chiavi utili sono solo <b>25</b>: si provano tutte e si tiene quella leggibile.`)
        };
      }
    },
    dh: {
      title: "Diffie-Hellman con numeri piccoli", mod: "s2",
      gen() {
        const p = pick([23, 29, 31, 37, 41, 43, 47, 53]), g = pick([2, 3, 5]), a = R(2, p - 2), b = R(2, p - 2);
        const pw = (x, e, m) => { let r = 1; x %= m; for (let i = 0; i < e; i++) r = (r * x) % m; return r; };
        const A = pw(g, a, p), B = pw(g, b, p), s = pw(B, a, p);
        return {
          html: `Valori pubblici <b>p = ${p}</b>, <b>g = ${g}</b>. Il client sceglie il segreto <b>a = ${a}</b>, il server <b>b = ${b}</b>.`,
          fields: [{ label: "A = g<sup>a</sup> mod p", ans: A, abs: 0 }, { label: "B = g<sup>b</sup> mod p", ans: B, abs: 0 }, { label: "Chiave condivisa s", ans: s, abs: 0 }],
          sol: lines(`A = ${g}<sup>${a}</sup> mod ${p} = <b>${A}</b>`, `B = ${g}<sup>${b}</sup> mod ${p} = <b>${B}</b>`,
            `client: B<sup>a</sup> mod p = ${B}<sup>${a}</sup> mod ${p} = <b>${s}</b>; server: A<sup>b</sup> = ${A}<sup>${b}</sup> mod ${p} = ${pw(A, b, p)}`,
            `Suggerimento: riduci mod p a ogni moltiplicazione. L'attaccante vede p, g, A, B ma dovrebbe risolvere un logaritmo discreto.`)
        };
      }
    },
    rsa: {
      title: "RSA con numeri piccoli", mod: "s2",
      gen() {
        const primes = [3, 5, 7, 11, 13, 17, 19];
        let p, q, e, phi, d;
        const gcd = (a, b) => (b ? gcd(b, a % b) : a);
        for (;;) {
          p = pick(primes); q = pick(primes); if (p === q) continue; phi = (p - 1) * (q - 1);
          const es = [3, 5, 7, 11, 13, 17].filter((x) => x < phi && gcd(x, phi) === 1); if (!es.length) continue;
          e = pick(es); for (d = 2; d < phi; d++) if ((d * e) % phi === 1) break; if (d !== e) break;
        }
        const n = p * q, m = R(2, n - 2), pw = (x, k, mod) => { let r = 1; for (let i = 0; i < k; i++) r = (r * x) % mod; return r; };
        const cph = pw(m, e, n);
        return {
          html: `Il server sceglie i primi <b>p = ${p}</b> e <b>q = ${q}</b>, pubblica <b>e = ${e}</b> e tiene segreto <b>d = ${d}</b>. Il client cifra il messaggio <b>m = ${m}</b>.`,
          fields: [{ label: "n", ans: n, abs: 0 }, { label: "c = m<sup>e</sup> mod n", ans: cph, abs: 0 }, { label: "c<sup>d</sup> mod n (decifratura)", ans: m, abs: 0 }],
          sol: lines(`n = ${p}·${q} = <b>${n}</b> (pubblico; fattorizzarlo è difficile per n grandi)`,
            `c = ${m}<sup>${e}</sup> mod ${n} = <b>${cph}</b>`, `m = ${cph}<sup>${d}</sup> mod ${n} = <b>${m}</b>`,
            `Per completezza: φ(n) = (p−1)(q−1) = ${phi} e d·e = ${d * e} ≡ 1 mod ${phi}.`)
        };
      }
    },
    bruteforce: {
      title: "Tempo di forza bruta", mod: "s2",
      gen() {
        const k = pick([40, 48, 56, 64]), rate = pick([1e9, 2.9e10, 1.8e11, 7.7e11]);
        const half = Math.pow(2, k - 1), sec = half / rate;
        return {
          html: `Un attaccante prova <b>${f(rate)}</b> chiavi al secondo contro un cifrario con chiave di <b>${k} bit</b>.`,
          fields: [{ label: "Chiavi provate in media (esponente di 2)", ans: k - 1, abs: 0, unit: "2^…" }, { label: "Tempo medio", unit: "ore", ans: sec / 3600, tol: 0.02 }],
          sol: lines(`In media si prova metà dello spazio: 2<sup>${k}</sup>/2 = 2<sup>${k - 1}</sup> = ${f(half)}`, `tempo = ${f(half)} / ${f(rate)} = ${f(sec)} s = <b>${f(sec / 3600)} ore</b>`, `Ogni bit in più raddoppia il tempo; per AES-128 servirebbero ~10<sup>20</sup> anni.`)
        };
      }
    },
    hashcost: {
      title: "Costo degli attacchi a un hash", mod: "s2",
      gen() {
        const n = pick([32, 40, 48, 64, 80, 128, 256]), rate = pick([1e6, 1e9, 1e10]);
        return {
          html: `Una funzione hash produce output di <b>${n} bit</b>. L'attaccante calcola <b>${f(rate)}</b> hash al secondo.`,
          fields: [{ label: "Esponente di 2 per una preimmagine", ans: n, abs: 0 }, { label: "Esponente di 2 per una collisione", ans: n / 2, abs: 0 }, { label: "Tempo per una collisione", unit: "s", ans: Math.pow(2, n / 2) / rate, tol: 0.02 }],
          sol: lines(`preimmagine e seconda preimmagine: 2<sup>${n}</sup>`, `collisione (paradosso del compleanno): 2<sup>${n / 2}</sup>`, `tempo = 2<sup>${n / 2}</sup>/${f(rate)} = <b>${f(Math.pow(2, n / 2) / rate)} s</b>`)
        };
      }
    },
    pwspace: {
      title: "Spazio delle password", mod: "s3",
      gen() {
        const al = pick([[26, "lettere minuscole"], [36, "minuscole e cifre"], [62, "lettere maiuscole, minuscole e cifre"], [95, "caratteri ASCII stampabili"]]);
        const L = R(6, 12), h = pick([["MD5", 2.2e11], ["bcrypt (costo 5)", 3e5], ["SHA-256", 2.8e10]]);
        const N = Math.pow(al[0], L), sec = N / h[1];
        return {
          html: `Password di <b>${L} caratteri</b> scelti tra <b>${al[0]} ${al[1]}</b>, salvate con <b>${h[0]}</b>. Una GPU prova <b>${f(h[1])}</b> candidati al secondo.`,
          fields: [{ label: "Numero di candidati", ans: N, tol: 0.01 }, { label: "Tempo per provarli tutti", unit: "ore", ans: sec / 3600, tol: 0.02 }],
          sol: lines(`candidati = ${al[0]}<sup>${L}</sup> = <b>${f(N)}</b>`, `tempo = ${f(N)} / ${f(h[1])} = ${f(sec)} s = <b>${f(sec / 3600)} ore</b>`, `Allungare la password conta più che allargare l'alfabeto; le funzioni lente moltiplicano il tempo.`)
        };
      }
    },
    totp: {
      title: "Contatore TOTP", mod: "s3",
      gen() {
        const T = R(1.7e9, 1.8e9), C = Math.floor(T / 30), dt = pick([5, 20, 35, 50, 70, 95]), T2 = T + dt, C2 = Math.floor(T2 / 30);
        const ok = C2 - C <= 1 ? "sì" : "no";
        return {
          html: `Il telefono mostra un codice TOTP (passo di 30 s) all'istante <b>T = ${T}</b> s. L'utente lo digita e il server lo riceve a <b>T = ${T2}</b> s. Il server accetta il passo corrente e quello precedente.`,
          fields: [{ label: "Contatore C del telefono", ans: C, abs: 0 }, { label: "Contatore del server alla ricezione", ans: C2, abs: 0 }, { label: "Il codice viene accettato?", ans: ok, kind: "choice", options: yesno }],
          sol: lines(`C = ⌊${T}/30⌋ = <b>${C}</b>`, `server: ⌊${T2}/30⌋ = <b>${C2}</b>`, `differenza ${C2 - C}: ${ok === "sì" ? "entro un passo, <b>accettato</b> (una sola volta)" : "più di un passo, <b>rifiutato</b>"}`)
        };
      }
    },
    unixperm: {
      title: "Permessi UNIX", mod: "s4",
      gen() {
        const O = pick(["rw-", "rwx", "r--", "---", "rw-"]), G = pick(["r--", "rw-", "---", "r-x", "rwx"]), Ot = pick(["---", "r--", "r--", "rw-"]);
        const who = pick([["user1", "owner", "proprietario"], ["user2", "group", "membro del gruppo team"], ["user3", "other", "né proprietario né nel gruppo"]]);
        const cls = { owner: O, group: G, other: Ot }[who[1]];
        const toN = (s) => (s[0] === "r" ? 4 : 0) + (s[1] === "w" ? 2 : 0) + (s[2] === "x" ? 1 : 0);
        return {
          html: `<pre class="code">$ ls -l report.txt\n-${O}${G}${Ot} 1 user1 team 25 Nov  1 14:45 report.txt</pre><b>${who[0]}</b> è ${who[2]}.`,
          fields: [
            { label: "Valore ottale dei permessi", ans: String(toN(O)) + toN(G) + toN(Ot), kind: "text" },
            { label: `${who[0]} può leggere il file?`, ans: cls[0] === "r" ? "sì" : "no", kind: "choice", options: yesno },
            { label: `${who[0]} può scrivere il file?`, ans: cls[1] === "w" ? "sì" : "no", kind: "choice", options: yesno }
          ],
          sol: lines(`${O} ${G} ${Ot} → ${toN(O)}${toN(G)}${toN(Ot)}`, `${who[0]} ricade nella classe <b>${who[1]}</b> (${cls}): si applica solo la prima classe che corrisponde.`)
        };
      }
    },
    octal: {
      title: "chmod: ottale e simbolico", mod: "s4",
      gen() {
        const tri = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
        const a = [pick([6, 7, 4, 5]), pick([0, 4, 5, 6, 7]), pick([0, 4, 5, 0])], s = a.map((x) => tri[x]).join("");
        const b = [pick([6, 7, 5]), pick([0, 4, 5, 6]), pick([0, 4, 1])], bo = b.join("");
        return {
          html: `(a) Converti <b>${s}</b> in ottale.<br>(b) Dopo <code>chmod ${bo} file</code>, come appaiono i 9 bit in <code>ls -l</code>?`,
          fields: [{ label: "(a) Ottale", ans: a.join(""), kind: "text" }, { label: "(b) Simbolico (9 caratteri)", ans: b.map((x) => tri[x]).join(""), kind: "text" }],
          sol: lines(`(a) r=4, w=2, x=1 per classe → <b>${a.join("")}</b>`, `(b) ${b.join(" ")} → <b>${b.map((x) => tri[x]).join("")}</b>`)
        };
      }
    }
  };

  // Generatore RTT
  EX.rtt.gen = function () {
    const e0 = R(80, 120), d0 = R(5, 20), S = [R(60, 200), R(60, 200), R(60, 200)];
    let E = e0, D = d0, E1 = 0; const out = [`α = 0,125, β = 0,25. Nell'ordine: prima EstimatedRTT, poi DevRTT con il nuovo EstimatedRTT.`];
    S.forEach((x, i) => {
      const En = 0.875 * E + 0.125 * x, Dn = 0.75 * D + 0.25 * Math.abs(x - En);
      out.push(`SampleRTT<sub>${i + 1}</sub> = ${x}: Est = 0,875·${f(E)} + 0,125·${x} = ${f(En)}; Dev = 0,75·${f(D)} + 0,25·|${x} − ${f(En)}| = ${f(Dn)}`);
      E = En; D = Dn; if (i === 0) E1 = En;
    });
    const TO = E + 4 * D; out.push(`TimeoutInterval = ${f(E)} + 4·${f(D)} = <b>${f(TO)} ms</b>`);
    return {
      html: `Una connessione TCP ha <b>EstimatedRTT = ${e0} ms</b> e <b>DevRTT = ${d0} ms</b>. Arrivano tre campioni: <b>SampleRTT = ${S.join(", ")} ms</b>.`,
      fields: [
        { label: "EstimatedRTT dopo il primo campione", unit: "ms", ans: E1, tol: 0.005, abs: 0.05 },
        { label: "EstimatedRTT dopo il terzo campione", unit: "ms", ans: E, tol: 0.005, abs: 0.05 },
        { label: "DevRTT dopo il terzo campione", unit: "ms", ans: D, tol: 0.01, abs: 0.05 },
        { label: "TimeoutInterval finale", unit: "ms", ans: TO, tol: 0.01, abs: 0.1 }
      ],
      sol: out.join("<br>")
    };
  };

  Object.keys(EX).forEach((k) => { EX[k].id = k; });
  window.EXERCISES = EX;
  window.fmtNum = f;
})();
