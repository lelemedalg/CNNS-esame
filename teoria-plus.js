/* Integrazioni alla teoria dagli appunti del corso 2025/26 (Botta, Drago):
   sicurezza wireless e 4G, SSH, firewall/IDS e malware.
   Si carica dopo teoria.js e aggiunge sezioni in fondo ai documenti esistenti. */
(function () {
  const N = window.NOTES; if (!N || !N.docs) return;
  const SRC = `<div class="call sum"><div class="cl">DAGLI APPUNTI DEL CORSO 2025/26</div><p>Le sezioni che seguono vengono dagli appunti delle lezioni dell'anno scorso e coprono parti che le slide di quest'anno potrebbero riprendere. Studiale insieme a quelle sopra.</p></div>`;
  function extend(id, sections, title) {
    const d = N.docs[id]; if (!d) return;
    if (title) d.title = title;
    const n0 = d.toc.length;
    let html = "\n" + SRC + "\n";
    sections.forEach(([t, body], i) => {
      const sid = `sec${n0 + i + 1}`;
      d.toc.push([sid, `${n0 + i + 1}. ${t}`]);
      html += `<h2 id="${sid}">${n0 + i + 1}. ${t}</h2>\n${body}\n`;
    });
    d.html += html;
    const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    d.min = (d.min || 0) + Math.max(1, Math.round(words / 180));
    d.plus = true;
  }
  const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl t-notes"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const call = (k, label, body) => `<div class="call ${k}"><div class="cl">${label}</div>${body}</div>`;

  /* ---------------- Sicurezza wireless e reti mobili ---------------- */
  extend("sw", [
    ["802.11: le quattro fasi della sicurezza", `
<p>Quando un dispositivo arriva in una rete Wi-Fi protetta deve <b>associarsi</b> all'access point, <b>autenticarsi</b> e ottenere le <b>chiavi</b> per cifrare. Gli attori sono tre: il dispositivo (<b>STA</b> o mobile), l'<b>access point (AP)</b> e il <b>server di autenticazione (AS)</b>. In una rete domestica AP e AS sono lo stesso apparecchio; in una rete estesa, come quella dell'università, l'AS è un server separato raggiunto via cavo.</p>
${tbl(["Fase", "Cosa succede"], [
  ["1. Scoperta delle capacità di sicurezza", "L'AP annuncia la sua presenza, i metodi di autenticazione e i cifrari supportati (beacon, oppure probe response alla probe request del client). Client e AP negoziano i meccanismi: il collegamento c'è, ma non è ancora né autenticato né cifrato."],
  ["2. Mutua autenticazione e derivazione della chiave", "Mobile e AS condividono già un segreto (es. la password del Wi-Fi). Con il segreto, due nonce e funzioni crittografiche si autenticano a vicenda e derivano una chiave simmetrica di sessione."],
  ["3. Distribuzione della chiave all'AP", "L'AS comunica all'AP la chiave di sessione di quel client: è l'AP che riceverà e decifrerà i frame."],
  ["4. Comunicazione cifrata", "Mobile e AP cifrano i frame con AES usando la chiave di sessione."]
])}
<h3>Lo scambio con i nonce (handshake WPA3 nel modello del corso)</h3>
<pre class="code">AS     → mobile : Nonce_AS
mobile           : genera Nonce_M e calcola K_M-AP = f(segreto, Nonce_AS, Nonce_M)
mobile → AS      : Nonce_M + un valore autenticato con HMAC
AS               : calcola la stessa K_M-AP e verifica l'HMAC</pre>
${call("def", "DA RICORDARE", `<p>Il segreto iniziale <b>non</b> serve a cifrare: serve ad autenticarsi e a <b>derivare</b> una chiave di sessione nuova. La chiave non viaggia mai sul canale radio; i nonce freschi impediscono il replay.</p>`)}`],
    ["EAP, EAPoL e RADIUS", `
<p><b>EAP</b> (Extensible Authentication Protocol) definisce il dialogo richiesta/risposta <b>end-to-end tra mobile e AS</b>. Non è un algoritmo di autenticazione ma un <b>framework</b> dentro cui si usano metodi specifici (EAP-TLS, PEAP, EAP-TTLS…).</p>
${tbl(["Tratta", "Protocollo che trasporta EAP"], [["mobile ↔ AP (radio)", "<b>EAPoL</b> (EAP over LAN)"], ["AP ↔ AS (cavo)", "<b>RADIUS</b> (su UDP)"]])}
<p>L'AP fa da tramite: inoltra i messaggi EAP senza interpretarli e lascia passare altro traffico solo dopo che l'AS ha autenticato il client.</p>`],
    ["Autenticazione in 4G LTE", `
<p>In una rete cellulare il dispositivo si associa a una <b>stazione base (BS)</b> e fa <b>autenticazione reciproca</b>: il mobile si autentica alla rete e la rete al mobile. La differenza con il Wi-Fi è la <b>SIM</b>, che contiene l'identità dell'abbonato (<b>IMSI</b>) e una chiave segreta condivisa con l'operatore di casa.</p>
${tbl(["Elemento", "Ruolo"], [
  ["Rete di casa (home)", "l'operatore con cui hai il contratto (es. TIM)"],
  ["Rete visitata", "la rete a cui sei collegato (es. Orange all'estero): può coincidere con quella di casa"],
  ["MME (rete visitata)", "coordinatore locale dell'autenticazione tra BS e rete di casa"],
  ["HSS (rete di casa)", "conosce l'abbonato e possiede il segreto condiviso K<sub>HSS-M</sub>"]
])}
<pre class="code">mobile → BS → MME (visitata) → HSS (casa)
1. mobile e HSS condividono da prima K_HSS-M (nella SIM)
2. il mobile invia un attach; la BS lo inoltra all'MME, che manda all'HSS AUTH_REQ(IMSI, info rete visitata)
3. l'HSS usa K_HSS-M per generare auth_token, xres_HSS e il materiale per le chiavi
4. HSS → MME: AUTH_RESP(auth_token, xres_HSS, chiavi)
5. il mobile verifica auth_token con K_HSS-M  → la rete conosce il suo segreto (rete autenticata)
6. il mobile calcola res_M con K_HSS-M e lo invia all'MME
7. l'MME confronta res_M con xres_HSS: se coincidono il mobile è autenticato
8. mobile e BS derivano la chiave di sessione K_BS-M che cifra il canale radio</pre>
${call("warn", "ATTENZIONE", `<p>L'autenticazione è <b>reciproca</b>: il passo 5 autentica la rete al mobile (protegge da false stazioni base), il passo 7 autentica il mobile alla rete. Il segreto K<sub>HSS-M</sub> non lascia mai SIM e HSS.</p>`)}`],
    ["Da 4G a 5G", `
${tbl(["", "4G", "5G"], [
  ["Chi decide l'autenticazione", "l'MME della rete <b>visitata</b> (confronta res e xres)", "la rete di <b>casa</b> ha un ruolo diretto nella decisione"],
  ["Identità dell'abbonato", "l'IMSI può viaggiare <b>in chiaro</b> (tracciabilità dell'utente)", "l'identità è <b>cifrata con la chiave pubblica</b> della rete di casa"]
])}`]
  ], "Sicurezza wireless e reti mobili");

  /* ---------------- SSH ---------------- */
  extend("s7", [
    ["SSH, TLS e IPsec nella pila", `
${tbl(["Protocollo", "Livello", "Cosa protegge"], [["IPsec", "rete (IP)", "tutto il traffico IP tra due nodi o reti (VPN)"], ["TLS", "trasporto (sopra TCP)", "una connessione applicativa (HTTPS, IMAP…)"], ["SSH", "applicazione (sopra TCP, porta 22)", "login remoto, esecuzione di comandi, trasferimento file, tunnel"]])}
<p>Lo stack SSH ha tre livelli: <b>Transport</b> (negozia gli algoritmi, autentica il server, fa Diffie-Hellman e genera le chiavi di sessione), <b>User Authentication</b> (autentica l'utente) e <b>Connection</b> (multiplexa più canali logici nella stessa connessione).</p>
<p>La chiave del server si può verificare in due modi: una tabella locale nome → chiave pubblica (<code>known_hosts</code>, con trust on first use) oppure un certificato firmato da una CA. A differenza di TLS, con TOFU è l'utente a decidere se fidarsi al primo collegamento.</p>`],
    ["Il pacchetto del Transport layer", `
<pre class="code">pacchetto = cifra( lunghezza | lunghezza padding | payload | padding casuale )  +  MAC</pre>
<ul><li><b>Numero di sequenza implicito</b>: non viene trasmesso ma entra nel calcolo del MAC, così un pacchetto ripetuto o riordinato viene rilevato (contro il replay).</li><li><b>Padding casuale</b>: porta la lunghezza del testo cifrato a un multiplo della dimensione del blocco e nasconde la lunghezza esatta del payload.</li><li>Il MAC autentica il contenuto: una modifica in transito fa fallire la verifica.</li></ul>
${call("def", "STESSA IDEA DI TLS", `<p>Come nel record TLS, il numero di sequenza non viaggia ma protegge da rimozioni, ripetizioni e riordini.</p>`)}`],
    ["Metodi di autenticazione dell'utente", `
${tbl(["Metodo", "Stato", "Come funziona"], [
  ["Chiave pubblica", "<b>obbligatorio</b> da supportare", "il client firma una challenge legata alla sessione con la chiave privata; il server verifica con la pubblica in authorized_keys"],
  ["Password", "facoltativo", "nome utente e password in chiaro dentro il canale cifrato del Transport layer"],
  ["Host-based", "facoltativo", "autentica la macchina di provenienza, non il singolo utente"]
])}
<p>Il server sceglie quali metodi abilitare.</p>`],
    ["Connection layer, SFTP e SCP", `
<p>Il Connection layer divide l'unico tunnel cifrato in <b>canali logici indipendenti</b>: una shell, un trasferimento di file, un port forwarding. Tutti condividono la stessa connessione del Transport layer.</p>
<p><b>SFTP</b> e <b>SCP</b> trasferiscono file sopra SSH: cifratura, autenticazione con password o chiave pubblica, stessa porta 22.</p>
<p>Il <b>port forwarding</b> trasforma una connessione TCP non sicura in una che attraversa il tunnel: client SSH locale → tunnel cifrato → server SSH remoto → destinazione. Le applicazioni non vanno modificate: la protezione sta nel canale.</p>`]
  ]);

  /* ---------------- Firewall, IDS ---------------- */
  extend("s8", [
    ["Perché un firewall e dove metterlo", `
<p>Il firewall sta tra la rete amministrata e una rete non fidata e decide quale traffico può attraversare il confine. Serve a <b>limitare attacchi come i DoS</b> (es. SYN flooding), a <b>impedire accessi e modifiche non autorizzati</b> ai sistemi interni e a <b>far passare solo il traffico autorizzato</b>.</p>
<pre class="code">Internet → firewall esterno → DMZ (web, DNS, mail) → firewall interno → rete interna</pre>
<p>Esempio di implementazione: <b>Netfilter</b>, il framework di filtraggio del kernel Linux configurato con iptables.</p>`],
    ["Il filtro sul flag ACK", `
<p>Un packet filter può guardare anche i <b>flag TCP</b>. Regola classica: <b>bloccare i segmenti in ingresso con ACK = 0</b>.</p>
${tbl(["Segmento", "SYN", "ACK", "Esito"], [["apertura di una connessione da fuori (primo segmento)", "1", "0", "bloccato"], ["risposte a connessioni aperte dall'interno", "0", "1", "passa"]])}
<p>In teoria impedisce a chi sta fuori di aprire connessioni verso l'interno, lasciando passare le risposte.</p>
${call("warn", "IL LIMITE", `<p>Il filtro è stateless: non sa se la connessione esiste davvero. Un attaccante può fabbricare un segmento con <b>ACK = 1</b> che passa il filtro (ad esempio per una scansione ACK). Un firewall <b>stateful</b> lo scarta perché non appartiene a nessuna connessione della tabella.</p>`)}
<p>Il firewall stateful tiene traccia di apertura (SYN), stato, chiusura (FIN) e timeout delle connessioni inattive. Alla ACL aggiunge un controllo «il pacchetto appartiene a una connessione che ho visto nascere?».</p>`],
    ["Application gateway in dettaglio", `
<p>Invece di <code>client → server</code> si hanno due connessioni distinte: <code>client → gateway</code> e <code>gateway → server</code>. Il gateway ragiona sui dati del protocollo applicativo: può <b>autenticare l'utente</b>, controllare i comandi e decidere se concedere il servizio.</p>
<p>Sul server basta una regola semplice: <b>accetta connessioni solo se provengono dal gateway</b>. Così il gateway inoltra solo le richieste autenticate e valide.</p>`],
    ["NIDS, HIDS ed EDR", `
<p>Un <b>IDS</b> lavora di solito <b>fuori linea</b>: riceve una copia del traffico e genera un allarme. Un <b>IPS</b> è <b>in linea</b>: il traffico lo attraversa e lui può bloccarlo.</p>
${tbl(["Tipo", "Dove sta", "Pro", "Contro"], [
  ["NIDS (network)", "osserva il traffico di rete", "centralizzato, economico, niente software sugli host", "subisce tecniche di evasione; non vede dentro il traffico cifrato"],
  ["HIDS (host)", "installato sull'host", "vede processi, file e log, e i dati già decifrati dall'applicazione", "va distribuito e gestito su molti endpoint"],
  ["EDR", "sull'host", "HIDS + risposta automatica (es. isola l'host compromesso)", "come l'HIDS"]
])}
<p>Esempi: OSSEC, Tripwire, Wazuh (HIDS); CrowdStrike, Carbon Black, Microsoft Defender (EDR).</p>
<p>A differenza del packet filter, che guarda gli header TCP/IP, un IDS fa <b>Deep Packet Inspection</b> (cerca nel payload le stringhe di un exploit noto) e <b>correla più pacchetti</b>: riconosce port scanning, mappatura della rete, DoS, sequenze sospette.</p>`],
    ["Metodi di rilevamento", `
${tbl(["Metodo", "Idea", "Pro e contro"], [
  ["A firme (signature)", "segnala ciò che corrisponde ad attacchi noti (blacklist)", "ottimo sugli attacchi noti, cieco su quelli nuovi"],
  ["A specifiche (specification)", "descrive i comportamenti permessi e segnala tutto il resto (whitelist)", "blocca anche attacchi nuovi, ma le specifiche vanno scritte a mano"],
  ["Ad anomalie (anomaly)", "costruisce un modello del comportamento normale e segnala le deviazioni", "trova attacchi sconosciuti, più falsi positivi"],
  ["Comportamentale (behavioral)", "cerca le prove di una compromissione avvenuta", "pochi falsi positivi, ma rileva solo dopo l'attacco"]
])}`],
    ["Regole Snort", `
<pre class="code">azione protocollo ip_src porta_src -> ip_dst porta_dst (opzioni)
alert tcp any any -> any 22 (flags:S; msg:"SYN verso SSH"; sid:1000001;)</pre>
<p>La regola genera un allarme per ogni SYN diretto alla porta 22.</p>
${tbl(["Componente", "Significato"], [["azione", "alert, log, pass, drop"], ["content", "stringa da cercare nel payload"], ["flags", "flag TCP (S = SYN, A = ACK…)"], ["sid", "identificativo unico della firma"]])}
<p><b>Suricata</b> segue lo stesso principio: IDS/IPS moderno e multithread, capisce HTTP, TLS, DNS e SMB ed è compatibile con molte regole Snort.</p>`],
    ["Limiti degli IDS ed evasione", `
${tbl(["Limite", "Perché"], [["cifratura", "non può ispezionare HTTPS o VPN"], ["prestazioni", "i collegamenti molto veloci possono sopraffarlo"], ["falsi positivi e negativi", "compromesso tra sensibilità e precisione"], ["aggiornamento delle firme", "gli zero-day sfuggono al rilevamento a firme"]])}
${tbl(["Tecnica di evasione", "Come funziona"], [["frammentazione", "il payload malevolo è diviso su più pacchetti"], ["codifica e offuscamento", "Base64 o Unicode cambiano i byte e la firma non corrisponde"], ["attacchi lenti", "il traffico è diluito nel tempo per non superare le soglie"], ["manipolazione del protocollo e cifratura", "l'IDS interpreta i pacchetti diversamente dalla vittima, o non li vede"]])}`],
    ["Logging, SIEM e altre pratiche", `
<p>I log registrano gli eventi rilevanti per analizzarli dopo un attacco: <b>autenticazione</b> (login, tentativi falliti, escalation di privilegi), <b>rete</b> (connessioni, blocchi del firewall, query DNS), <b>sistema</b> (processi, modifiche a file e configurazione), <b>applicazioni</b> (errori, transazioni, accessi ai dati).</p>
<p>Le difficoltà sono la quantità di dati, la correlazione tra sistemi diversi e la protezione dei log da chi li vuole alterare (un superuser può modificarli). Un <b>SIEM</b> (Splunk, ELK, Wazuh) centralizza i log, li correla in tempo reale e genera allarmi.</p>
<p>Altre pratiche: scanner di vulnerabilità (Nessus, OpenVAS, script Nmap NSE), <b>honeypot</b> (sistemi esca senza uso reale, per vedere quali attacchi arrivano), analisi forense.</p>`]
  ]);

  /* ---------------- Malware ---------------- */
  extend("s9", [
    ["Storia in breve", `
${tbl(["Anno", "Esempio", "Novità"], [["1971", "Creeper", "primo programma che si sposta tra macchine"], ["1986", "Brain", "virus del boot sector"], ["1988", "Morris worm", "primo worm su Internet"], ["anni '90", "Melissa", "virus macro e worm via email"], ["anni 2000", "Code Red, Slammer", "worm di rete (buffer overflow)"], ["2010", "Stuxnet", "malware di Stato: danneggia le centrifughe per l'uranio"], ["anni 2010", "Mirai", "botnet IoT per DDoS"], ["2017", "WannaCry", "ransomware che si propaga come un worm"], ["anni 2020", "SolarWinds, XZ", "attacchi alla supply chain"]])}
<p>Software <i>dannoso</i> per errore ha un bug; nel <b>malware</b> il danno è la funzione voluta.</p>`],
    ["Classificazione: ospite e replicazione", `
${tbl(["", "Si replica da solo", "Non si replica"], [["Ha bisogno di un ospite", "<b>virus</b>", "bomba logica, backdoor nel codice"], ["Autonomo", "<b>worm</b>", "<b>trojan</b>, RAT"]])}
<p>Le due domande sono: <b>serve un programma ospite</b> a cui attaccarsi? <b>Si propaga da solo</b> o serve un'azione manuale?</p>`],
    ["Virus: infezione e tecniche anti-rilevamento", `
<p>Il virus inserisce copie di sé in file eseguibili o nel boot sector; di solito serve un'azione dell'utente (eseguire il programma, aprire un documento con macro). Una volta avviato esegue il payload e cerca di infettare altri file.</p>
${tbl(["Strategia di infezione", "Effetto"], [["aggiungersi in testa o in coda al file", "il programma continua a funzionare, ma il virus è più facile da rilevare"], ["sovrascrivere funzioni del programma", "più difficile da rilevare, più complesso da realizzare"]])}
${tbl(["Tecnica anti-rilevamento", "Idea"], [["corpo cifrato", "solo un piccolo decifratore resta in chiaro"], ["polimorfico", "il decifratore e la chiave cambiano a ogni copia: nessuna firma fissa sui byte"], ["metamorfico", "il virus riscrive il proprio codice a ogni copia (stesso comportamento, istruzioni diverse)"]])}`],
    ["Il ciclo di vita di Mirai", `
<pre class="code">1. scansione : il bot sonda lo spazio IPv4 cercando dispositivi con telnet o SSH aperti
2. report    : il bot invia al server C&amp;C l'IP della vittima e le credenziali che funzionano
3. infezione : il C&amp;C attiva un loader che entra con le password di fabbrica e installa il bot
4. arruolamento: il nuovo dispositivo diventa un bot e ricomincia il ciclo</pre>`],
    ["Trojan, RAT, backdoor e rootkit", `
<ul><li><b>Trojan</b>: si presenta come programma legittimo; non si replica, si diffonde con l'ingegneria sociale.</li><li><b>Backdoor</b>: accesso che aggira l'autenticazione normale e permette il controllo remoto.</li><li><b>RAT</b> (Remote Access Trojan): trojan + backdoor, per un accesso remoto persistente.</li><li><b>Rootkit</b>: nasconde la propria presenza e mantiene accesso privilegiato sovvertendo il sistema operativo, a livello kernel o più in basso, intercettando le chiamate di sistema.</li></ul>
${tbl(["Tecnica del rootkit", "Come funziona"], [["hook di una singola system call", "il codice sostitutivo pre-elabora, chiama la system call originale, poi post-elabora il risultato (es. toglie i propri file dall'elenco)"], ["sovrascrittura di una system call", "la funzione originale viene rimpiazzata"], ["sostituzione della tabella delle system call", "tutta la tabella punta a funzioni dell'attaccante"], ["inline hooking", "il codice della funzione viene modificato per saltare al codice malevolo e poi tornare: molto difficile da rilevare"]])}`],
    ["Ransomware, APT e altri payload", `
<p>Il <b>ransomware</b> cifra i file e chiede un riscatto, senza garanzia di restituzione. Usa la cifratura ibrida: <b>AES</b> per cifrare velocemente i file, <b>RSA</b> per gestire le chiavi (la chiave AES è cifrata con la chiave pubblica dell'attaccante). Senza la chiave privata dell'attaccante la vittima non può decifrare.</p>
<p>Altri payload: <b>spyware</b> (monitora e ruba dati), <b>keylogger</b> (registra i tasti), <b>adware</b>, <b>bot</b> di una botnet, <b>cryptominer</b> (usa CPU/GPU senza consenso), <b>bomba logica</b> (si attiva al verificarsi di un evento o di una data).</p>
<p>Le <b>APT</b> (Advanced Persistent Threats) sono campagne lunghe e furtive, spesso sostenute da Stati, per spionaggio, sabotaggio o furto di dati. Entrano con phishing mirato, zero-day, escalation di privilegi e ingegneria sociale.</p>`],
    ["Rilevamento e strategie di difesa", `
${tbl(["Approccio", "Idea"], [["a firme", "riconosce codice noto; si aggira con polimorfismo e offuscamento"], ["a regole", "segnala anomalie e attività sospette"], ["comportamentale / EDR", "osserva il comportamento dei programmi: system call, meccanismi di persistenza"], ["sandbox", "esegue il file sospetto in una macchina virtuale e osserva"], ["monitoraggio di rete", "traffico inatteso, contatti con un C&amp;C"]])}
<p>Difese: patch e aggiornamenti frequenti, <b>zero trust</b> (ogni richiesta viene verificata), minimo privilegio, autenticazione a più fattori, segmentazione della rete, backup, sicurezza della supply chain, monitoraggio e un piano di risposta agli incidenti.</p>`]
  ]);
})();
