/* Esercizi aggiuntivi (2): catena di certificati, record e handshake TLS, cipher suite,
   tabella di un firewall da completare, scelta dei comandi iptables.
   Stesso formato di esercizi.js: gen() → { html, fields, sol }. */
(function () {
  const EX = window.EXERCISES;
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lines = (...l) => l.join("<br>");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const pre = (s) => `<div class="code">${esc(s)}</div>`;
  const yesno = ["sì", "no"];
  const day = 86400000;
  const dt = (d) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  // sequenza di lettere: "B, A, C" = "bac" = "B A C"
  const seqCheck = (ans) => (v) => String(v).toUpperCase().replace(/[^A-Z]/g, "") === ans.replace(/[^A-Z]/g, "");

  const NEW = {
    /* ---------------- Lezione 05 · PKI ---------------- */
    certchain: {
      title: "Verificare una catena di certificati", mod: "s5",
      gen() {
        const now = Date.now();
        const sites = [["shop", "example.it"], ["mail", "ateneo-demo.it"], ["api", "pagamenti.test"], ["www", "biblioteca.example"], ["portale", "comune-demo.it"]];
        const [sub, dom] = pick(sites), host = `${sub}.${dom}`;
        const fam = pick(["Alfa", "Borea", "Cirro", "Delta"]);
        const rootCN = `${fam} Root CA R${R(1, 4)}`, intCN = `${fam} TLS Issuing CA ${R(1, 9)}`;
        const store = shuffle([`${pick(["Ombra", "Nimbo", "Zefiro"])} Global Root`, `Orione Trust Root G${R(2, 5)}`, `${pick(["Vega", "Lyra"])} Public Root`]);
        const defects = ["ok", "ok", "scaduto", "nome", "noca", "issuer", "radice"];
        const dft = pick(defects);
        if (dft !== "radice") store.splice(R(0, 3), 0, rootCN);
        const leaf = {
          s: `CN=${host}`, i: `CN=${dft === "issuer" ? `${fam} TLS Issuing CA ${R(10, 19)}` : intCN}`,
          san: dft === "nome" ? pick([`*.${sub}.${dom}`, `${pick(["www", "static", "cdn"].filter((x) => x !== sub))}.${dom}`, `${sub}.${dom.split(".")[0]}.com`]) : pick([`${host}`, `*.${dom}`, `${host}, ${dom}`]),
          nb: dft === "scaduto" ? now - R(120, 200) * day : now - R(5, 60) * day, na: dft === "scaduto" ? now - R(2, 40) * day : now + R(10, 80) * day, bc: "CA:FALSE"
        };
        const inter = { s: `CN=${intCN}`, i: `CN=${rootCN}`, san: "—", nb: now - R(400, 900) * day, na: now + R(300, 1500) * day, bc: dft === "noca" ? "CA:FALSE" : "CA:TRUE, pathlen:0" };
        const root = { s: `CN=${rootCN}`, i: `CN=${rootCN}`, san: "—", nb: now - R(2000, 5000) * day, na: now + R(3000, 6000) * day, bc: "CA:TRUE" };
        const certs = [leaf, inter, root], order = shuffle([0, 1, 2]), L = ["A", "B", "C"];
        const letterOf = (k) => L[order.indexOf(k)];
        const PROB = {
          ok: "nessuno: la catena è valida", scaduto: "certificato scaduto", nome: "nome host non corrispondente",
          noca: "l'intermedio non può fare da CA", issuer: "catena interrotta (Issuer ≠ Subject)", radice: "radice non fidata"
        };
        const why = {
          ok: "Tutte le verifiche passano: il browser accetta.",
          scaduto: `Il certificato del server è scaduto il ${dt(leaf.na)}: oggi è ${dt(now)}.`,
          nome: `Il SAN (${leaf.san}) non copre ${host}. Un wildcard * vale per una sola etichetta: *.${dom} copre ${host}, ma *.${sub}.${dom} no.`,
          noca: "L'intermedio ha Basic Constraints CA:FALSE: non può firmare altri certificati, quindi la sua firma sul certificato del server non vale.",
          issuer: `L'Issuer del certificato del server (${leaf.i.slice(3)}) non coincide con il Subject dell'intermedio (${intCN}): la catena non si costruisce.`,
          radice: `La radice ${rootCN} è self-signed ma non è nell'archivio fidato: nessun punto di fiducia.`
        };
        return {
          html: `Ti colleghi a <b>https://${host}</b> il <b>${dt(now)}</b>. Il server invia questi tre certificati, in ordine sparso (le firme sono crittograficamente corrette):${tbl(["", "Subject", "Issuer", "SAN", "Valido dal", "Valido fino al", "Basic Constraints"], order.map((k, j) => { const c = certs[k]; return [`<b>${L[j]}</b>`, c.s, c.i, c.san, dt(c.nb), dt(c.na), c.bc]; }))}Archivio fidato del browser: <b>${store.join("</b>, <b>")}</b>.`,
          fields: [
            { label: "Ordine della catena, dal certificato del server alla radice (es. B, A, C)", ans: `${letterOf(0)}, ${letterOf(1)}, ${letterOf(2)}`, kind: "text", check: seqCheck(`${letterOf(0)}${letterOf(1)}${letterOf(2)}`) },
            { label: "Quale certificato è self-signed?", ans: letterOf(2), kind: "choice", options: L },
            { label: "Il browser accetta la connessione?", ans: dft === "ok" ? "sì" : "no", kind: "choice", options: yesno },
            { label: "Problema", ans: PROB[dft], kind: "choice", options: Object.values(PROB) }
          ],
          sol: lines(
            `Catena: <b>${letterOf(0)}</b> (server, Subject = ${host}) → <b>${letterOf(1)}</b> (intermedio) → <b>${letterOf(2)}</b> (radice: Subject = Issuer, quindi self-signed).`,
            "Verifiche, in ordine: ogni Issuer coincide con il Subject del successivo e la firma si verifica con la sua chiave pubblica; la radice è nell'archivio fidato; ogni certificato è nel periodo di validità; gli intermedi hanno CA:TRUE; il nome host è nel SAN del certificato foglia; poi revoca e Certificate Transparency.",
            `<b>${why[dft]}</b>`
          )
        };
      }
    },

    /* ---------------- Lezione 06 · TLS ---------------- */
    tlsrecord: {
      title: "Record e handshake TLS", mod: "s6",
      gen() {
        const types = [["14", "change_cipher_spec"], ["15", "alert"], ["16", "handshake"], ["17", "application_data"]];
        const [th, tn] = pick(types), len = R(40, 16640), lh = len.toString(16).toUpperCase().padStart(4, "0");
        const N = R(20000, 95000), nrec = Math.ceil(N / 16384);
        const rtt = R(8, 90), modes = [["TLS 1.2, handshake completo", 4, "TCP 1 + TLS 2 + HTTP 1"], ["TLS 1.3, handshake completo", 3, "TCP 1 + TLS 1 + HTTP 1 (la richiesta parte insieme al Finished del client)"], ["TLS 1.3, ripresa con dati 0-RTT", 2, "TCP 1 + 1 (la richiesta viaggia insieme al ClientHello)"]];
        const [mn, k, mexp] = pick(modes);
        const hsq = pick([
          ["In TLS 1.2 con ECDHE, quale messaggio porta il valore DH del server, firmato con la chiave del certificato?", "ServerKeyExchange"],
          ["In TLS 1.3, quale messaggio dimostra che il server possiede la chiave privata del certificato?", "CertificateVerify"],
          ["Quale messaggio contiene un MAC su tutta la trascrizione dell'handshake e rileva le manomissioni?", "Finished"],
          ["In TLS 1.3, qual è il primo messaggio del server cifrato con le chiavi di handshake?", "EncryptedExtensions"],
          ["In TLS 1.3, in quale messaggio il client invia già la sua parte (EC)DHE (key_share)?", "ClientHello"]
        ]);
        return {
          html: lines(
            `<b>a)</b> I primi 5 byte di un record TLS catturato sono <span class="mono">${th} 03 03 ${lh.slice(0, 2)} ${lh.slice(2)}</span>.`,
            `<b>b)</b> Un'applicazione deve inviare <b>${N.toLocaleString("it-IT")} byte</b> su una connessione TLS (testo in chiaro massimo per record 2<sup>14</sup> = 16 384 byte).`,
            `<b>c)</b> RTT tra client e server = <b>${rtt} ms</b>. Connessione nuova (handshake TCP compreso), <b>${mn}</b>. Ignora tempi di trasmissione e di elaborazione.`,
            `<b>d)</b> ${hsq[0]}`
          ),
          fields: [
            { label: "a) Tipo di record", ans: tn, kind: "choice", options: types.map((t) => t[1]) },
            { label: "a) Lunghezza del contenuto (byte)", ans: len, abs: 0 },
            { label: "b) Numero minimo di record", ans: nrec, abs: 0 },
            { label: "c) Dopo quanto il client riceve l'inizio della risposta HTTP?", ans: k * rtt, abs: 0.5, unit: "ms" },
            { label: "d) Messaggio", ans: hsq[1], kind: "choice", options: ["ClientHello", "ServerHello", "ServerKeyExchange", "EncryptedExtensions", "Certificate", "CertificateVerify", "Finished"] }
          ],
          sol: lines(
            `a) Primo byte = tipo: 0x14 change_cipher_spec, 0x15 alert, 0x16 handshake, 0x17 application_data → <b>${tn}</b>. Poi la versione (03 03 = TLS 1.2, usata anche come valore di facciata in TLS 1.3) e la lunghezza su 2 byte: 0x${lh} = <b>${len}</b> byte.`,
            `b) ⌈${N} / 16 384⌉ = <b>${nrec}</b> record. Ognuno è cifrato e autenticato separatamente (AEAD) con il suo numero di sequenza implicito.`,
            `c) ${mexp} = ${k} RTT = <b>${k * rtt} ms</b>. TLS 1.2: 4 RTT; TLS 1.3: 3 RTT; TLS 1.3 con 0-RTT: 2 RTT (ma i dati 0-RTT si possono ripetere, quindi solo per richieste idempotenti).`,
            `d) <b>${hsq[1]}</b>.`
          )
        };
      }
    },

    ciphersuite: {
      title: "Scomporre una cipher suite", mod: "s6",
      gen() {
        const sep = "negoziato a parte (key_share)", sepA = "separata (firma con il certificato)";
        const S = [
          { n: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256", kx: "ECDHE", au: "RSA", c: "AES-128", m: "GCM (AEAD)", h: "SHA-256" },
          { n: "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384", kx: "ECDHE", au: "ECDSA", c: "AES-256", m: "GCM (AEAD)", h: "SHA-384" },
          { n: "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256", kx: "ECDHE", au: "ECDSA", c: "ChaCha20", m: "Poly1305 (AEAD)", h: "SHA-256" },
          { n: "TLS_DHE_RSA_WITH_AES_256_GCM_SHA384", kx: "DHE", au: "RSA", c: "AES-256", m: "GCM (AEAD)", h: "SHA-384" },
          { n: "TLS_DHE_RSA_WITH_AES_128_CBC_SHA", kx: "DHE", au: "RSA", c: "AES-128", m: "CBC + HMAC", h: "SHA-1" },
          { n: "TLS_RSA_WITH_AES_128_CBC_SHA256", kx: "RSA", au: "RSA", c: "AES-128", m: "CBC + HMAC", h: "SHA-256" },
          { n: "TLS_RSA_WITH_AES_256_GCM_SHA384", kx: "RSA", au: "RSA", c: "AES-256", m: "GCM (AEAD)", h: "SHA-384" },
          { n: "TLS_RSA_WITH_3DES_EDE_CBC_SHA", kx: "RSA", au: "RSA", c: "3DES", m: "CBC + HMAC", h: "SHA-1" },
          { n: "TLS_AES_128_GCM_SHA256", kx: sep, au: sepA, c: "AES-128", m: "GCM (AEAD)", h: "SHA-256", v13: 1 },
          { n: "TLS_AES_256_GCM_SHA384", kx: sep, au: sepA, c: "AES-256", m: "GCM (AEAD)", h: "SHA-384", v13: 1 },
          { n: "TLS_CHACHA20_POLY1305_SHA256", kx: sep, au: sepA, c: "ChaCha20", m: "Poly1305 (AEAD)", h: "SHA-256", v13: 1 }
        ];
        const s = Math.random() < 0.3 ? pick(S.filter((x) => x.v13)) : pick(S.filter((x) => !x.v13));
        const fs = s.kx === "RSA" ? "no" : "sì";
        return {
          html: `Il server sceglie la cipher suite <b class="mono">${s.n}</b>. Indica il ruolo di ogni componente.`,
          fields: [
            { label: "Scambio di chiavi", ans: s.kx, kind: "choice", options: ["ECDHE", "DHE", "RSA", sep] },
            { label: "Autenticazione del server", ans: s.au, kind: "choice", options: ["RSA", "ECDSA", sepA] },
            { label: "Cifrario simmetrico", ans: s.c, kind: "choice", options: ["AES-128", "AES-256", "ChaCha20", "3DES"] },
            { label: "Modalità e integrità dei record", ans: s.m, kind: "choice", options: ["GCM (AEAD)", "Poly1305 (AEAD)", "CBC + HMAC"] },
            { label: "Funzione hash", ans: s.h, kind: "choice", options: ["SHA-1", "SHA-256", "SHA-384"] },
            { label: "Offre forward secrecy?", ans: fs, kind: "choice", options: yesno },
            { label: "Si può usare in TLS 1.3?", ans: s.v13 ? "sì" : "no", kind: "choice", options: yesno }
          ],
          sol: s.v13 ? lines(
            `<b>${s.n}</b> è una suite di TLS 1.3: indica solo il cifrario AEAD (<b>${s.c}</b>, <b>${s.m}</b>) e l'hash usato da HKDF per derivare le chiavi (<b>${s.h}</b>).`,
            "Scambio di chiavi e firma si negoziano a parte, con le estensioni supported_groups/key_share e signature_algorithms. In TLS 1.3 lo scambio è sempre (EC)DHE effimero, quindi c'è sempre forward secrecy. Le suite TLS 1.2 non valgono in TLS 1.3."
          ) : lines(
            `Formato TLS 1.2: TLS_<i>scambio</i>_<i>autenticazione</i>_WITH_<i>cifrario</i>_<i>modalità</i>_<i>hash</i>.`,
            `Scambio di chiavi <b>${s.kx}</b>, autenticazione del server <b>${s.au}</b>${s.kx === "RSA" ? " (con TLS_RSA_ la stessa chiave RSA cifra il segreto premaster e autentica il server)" : ""}, cifrario <b>${s.c}</b> in modalità <b>${s.m}</b>, hash <b>${s.h}</b> ${s.m.startsWith("CBC") ? "(usato nell'HMAC dei record)" : "(usato dalla PRF per derivare le chiavi)"}.`,
            fs === "sì" ? `Forward secrecy <b>sì</b>: ${s.kx} genera chiavi effimere, quindi rubare in futuro la chiave privata del server non permette di decifrare le sessioni registrate.` : `Forward secrecy <b>no</b>: il segreto premaster viaggia cifrato con la chiave RSA statica del server; chi la ottiene in futuro decifra tutte le sessioni registrate.`,
            `In TLS 1.3 <b>non</b> si può usare: le suite 1.3 hanno un formato diverso e ammettono solo cifrari AEAD.${s.c === "3DES" || s.m.startsWith("CBC") ? " CBC + HMAC e 3DES sono considerati deboli (attacchi padding oracle, Sweet32)." : ""}`
          )
        };
      }
    },

    /* ---------------- Lezione 09 · Firewall ---------------- */
    fwtable: {
      title: "Completare la tabella di un firewall", mod: "s8", exam: true,
      gen() {
        const S = `203.0.113.${R(10, 250)}`, adm = `10.${R(1, 50)}.${R(0, 255)}.0/24`;
        const pool = [
          { n: "HTTP", p: "TCP", port: "80", from: "any", who: "chiunque" }, { n: "HTTPS", p: "TCP", port: "443", from: "any", who: "chiunque" },
          { n: "SMTP", p: "TCP", port: "25", from: "any", who: "chiunque" }, { n: "DNS", p: "UDP", port: "53", from: "any", who: "chiunque" },
          { n: "SSH", p: "TCP", port: "22", from: adm, who: `solo la rete di gestione ${adm}` }
        ];
        const sv = shuffle(pool).slice(0, 3);
        const rules = [];
        sv.forEach((s) => { rules.push(["allow", s.from, S, s.p, ">1023", s.port]); rules.push(["allow", S, s.from, s.p, s.port, ">1023"]); });
        rules.push(["deny", "any", "any", "any", "any", "any"]);
        const cols = ["Azione", "Sorgente", "Destinazione", "Proto", "Porta src", "Porta dst"];
        const cells = []; for (let r = 0; r < rules.length - 1; r++) for (let c = 1; c <= 5; c++) cells.push([r, c]);
        const blanks = shuffle(cells).slice(0, 4).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const isBlank = (r, c) => blanks.findIndex(([x, y]) => x === r && y === c);
        const optFor = (c) => (c === 1 || c === 2 ? [S, adm, "any"] : c === 3 ? ["TCP", "UDP"] : ["any", ">1023", "22", "25", "53", "80", "443"]);
        return {
          html: `Il server <b>${S}</b> deve offrire: ${sv.map((s) => `<b>${s.n}</b> (${s.p} ${s.port}) a ${s.who}`).join("; ")}. Nient'altro. Il firewall è <b>stateless, first-match</b>, e i client usano porte sorgente &gt; 1023. Completa le celle segnate con <b>?n</b>:${tbl(["#", ...cols], rules.map((r, i) => [i + 1, ...r.map((v, c) => { const b = isBlank(i, c); return b >= 0 ? `<b>?${b + 1}</b>` : v; })]))}`,
          fields: [
            ...blanks.map(([r, c], i) => ({ label: `?${i + 1} · regola ${r + 1}, ${cols[c].toLowerCase()}`, ans: rules[r][c], kind: "choice", options: optFor(c) })),
            { label: "Con un firewall stateful, quali regole diventerebbero superflue?", ans: "le regole di ritorno (2, 4, 6)", kind: "choice", options: ["le regole di ritorno (2, 4, 6)", "le regole di richiesta (1, 3, 5)", "il deny finale", "nessuna"] }
          ],
          sol: lines(
            "Per ogni servizio servono due regole: la richiesta (client, porta &gt; 1023 → server, porta del servizio) e il ritorno (server, porta del servizio → client, porta &gt; 1023). Un firewall stateless non ricorda le connessioni, quindi il ritorno va permesso esplicitamente.",
            ...blanks.map(([r, c], i) => `?${i + 1} = <b>${rules[r][c]}</b> (regola ${r + 1}, ${r % 2 ? "ritorno" : "richiesta"} di ${sv[Math.floor(r / 2)].n})`),
            `${sv.some((s) => s.n === "SSH") ? `Per SSH la sorgente è solo ${adm}: nella regola di ritorno diventa la destinazione. ` : ""}${sv.some((s) => s.n === "DNS") ? "DNS usa UDP: anche il ritorno è UDP. " : ""}L'ultima regola è il default deny. Con un firewall stateful basterebbero le richieste più una regola ESTABLISHED.`
          )
        };
      }
    },

    iptcmd: {
      title: "Scegliere i comandi iptables", mod: "s8", exam: true,
      gen() {
        const net = pick(["10.0.0.0/8", "192.168.1.0/24", "172.16.0.0/16", "192.168.50.0/24"]);
        const bad = `${R(80, 200)}.${R(0, 255)}.${R(0, 255)}.${R(1, 254)}`;
        const P = [
          { r: "Accettare tutto il traffico sull'interfaccia di loopback", ok: "-A INPUT -i lo -j ACCEPT", no: ["-A OUTPUT -i lo -j DROP", "-A INPUT -i eth0 -j ACCEPT", "-A INPUT -s 127.0.0.0/8 -j DROP"], w: "lo è l'interfaccia di loopback: molti servizi locali parlano tra loro tramite 127.0.0.1." },
          { r: "Accettare i pacchetti delle connessioni già stabilite o correlate", ok: "-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT", no: ["-A INPUT -m state --state NEW -j ACCEPT", "-A INPUT -p tcp --syn -j ACCEPT", "-A INPUT -m state --state INVALID -j ACCEPT"], w: "È la regola stateful che evita di scrivere le regole di ritorno." },
          { r: `Accettare SSH solo dalla rete ${net}`, ok: `-A INPUT -s ${net} -p tcp --dport 22 -j ACCEPT`, no: [`-A INPUT -d ${net} -p tcp --dport 22 -j ACCEPT`, `-A INPUT -s ${net} -p tcp --sport 22 -j ACCEPT`, `-A INPUT -s ${net} -p udp --dport 22 -j ACCEPT`], w: "-s è la sorgente, --dport la porta di destinazione; SSH usa TCP 22." },
          { r: "Accettare HTTPS da chiunque", ok: "-A INPUT -p tcp --dport 443 -j ACCEPT", no: ["-A INPUT -p tcp --sport 443 -j ACCEPT", "-A INPUT -p tcp --dport 80 -j ACCEPT", "-A OUTPUT -p tcp --dport 443 -j ACCEPT"], w: "Le richieste in ingresso hanno porta di destinazione 443; --sport 443 corrisponderebbe alle risposte di server esterni." },
          { r: "Scartare per default tutto ciò che non è permesso in ingresso", ok: "-P INPUT DROP", no: ["-P INPUT ACCEPT", "-I INPUT -j DROP", "-P OUTPUT DROP"], w: "-P imposta la policy della catena; -I INPUT -j DROP metterebbe un DROP in cima, prima di tutte le regole ACCEPT." },
          { r: "Rifiutare telnet avvisando il mittente", ok: "-A INPUT -p tcp --dport 23 -j REJECT", no: ["-A INPUT -p tcp --dport 23 -j DROP", "-A INPUT -p tcp --dport 22 -j REJECT", "-A INPUT -p udp --dport 23 -j REJECT"], w: "REJECT risponde con un ICMP o un TCP RST; DROP scarta in silenzio." },
          { r: "Scartare in silenzio le richieste di ping che arrivano su eth0", ok: "-A INPUT -i eth0 -p icmp --icmp-type echo-request -j DROP", no: ["-A INPUT -o eth0 -p icmp --icmp-type echo-request -j DROP", "-A INPUT -i eth0 -p icmp --icmp-type echo-reply -j DROP", "-A INPUT -i eth0 -p icmp -j REJECT"], w: "-i è l'interfaccia d'ingresso (-o vale per l'uscita); il ping è un echo-request. Bloccare tutto l'ICMP rompe la Path MTU Discovery." },
          { r: `Bloccare subito l'host ${bad}, anche se più in basso ci sono regole ACCEPT`, ok: `-I INPUT -s ${bad} -j DROP`, no: [`-A INPUT -s ${bad} -j DROP`, `-I INPUT -d ${bad} -j DROP`, `-D INPUT -s ${bad} -j DROP`], w: "-I inserisce in cima alla catena; con -A la regola finirebbe dopo le ACCEPT e non verrebbe mai raggiunta. -D cancella una regola." },
          { r: "Accettare le query DNS su UDP verso questo server", ok: "-A INPUT -p udp --dport 53 -j ACCEPT", no: ["-A INPUT -p udp --sport 53 -j ACCEPT", "-A INPUT -p tcp --dport 35 -j ACCEPT", "-A INPUT -p udp --dport 5353 -j DROP"], w: "Le query arrivano alla porta di destinazione 53." },
          { r: "Su un router Linux, inoltrare il traffico dalla LAN (eth1) verso Internet (eth0)", ok: "-A FORWARD -i eth1 -o eth0 -j ACCEPT", no: ["-A INPUT -i eth1 -o eth0 -j ACCEPT", "-A FORWARD -i eth0 -o eth1 -j ACCEPT", "-A OUTPUT -o eth1 -j ACCEPT"], w: "Il traffico che attraversa il router passa dalla catena FORWARD, non da INPUT (destinato al router stesso)." }
        ];
        const sel = shuffle(P).slice(0, 4);
        const fields = sel.map((x, i) => ({ label: `${i + 1}) ${x.r}`, ans: "iptables " + x.ok, kind: "choice", options: shuffle([x.ok, ...x.no]).map((o) => "iptables " + o) }));
        return {
          html: `Per ogni requisito scegli il comando iptables corretto. Le regole sono valutate dall'alto verso il basso e la prima che corrisponde decide.<br>${sel.map((x, i) => `${i + 1}) ${esc(x.r)}`).join("<br>")}`,
          fields,
          sol: lines(...sel.map((x, i) => `${i + 1}) <span class="mono">iptables ${esc(x.ok)}</span> — ${x.w}`), "Ordine tipico di una catena INPUT: loopback, ESTABLISHED/RELATED, servizi permessi, poi policy DROP.")
        };
      }
    }
  };

  Object.keys(NEW).forEach((k) => { const e = NEW[k]; e.id = k; EX[k] = e; });
  // collega gli esercizi ai moduli
  const mods = [...window.STUDY.areas.reti.modules, ...window.STUDY.areas.sicurezza.modules];
  Object.values(NEW).forEach((e) => { const m = mods.find((x) => x.id === e.mod); if (m && !m.esercizi.includes(e.id)) m.esercizi.push(e.id); });
})();
