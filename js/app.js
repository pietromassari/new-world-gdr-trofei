(() => {
    "use strict";
    const $ = (s, r = document) => r.querySelector(s),
        KEY = "nwgdr-v21";
    let S = JSON.parse(localStorage.getItem(KEY) || "{}"),
        C = [];
    S.profile ??= {
        name: "Hobbes Crowe",
        race: "Uomo-Pesce Tartaruga",
        className: "Cecchino",
        level: 0,
        exp: 0,
        berry: 0,
        bounty: 0,
        haki: 0,
        actions: 0,
        currentIsland: "Drum",
        registrationDate: "2026-08-17",
    };
    S.activities ??= [];
    S.trophies ??= {};
    const save = () => {
            localStorage.setItem(KEY, JSON.stringify(S));
            $("#save-status").textContent = `Salvato localmente · ${new Date().toLocaleString("it-IT")}`;
        },
        E = (id) =>
            S.trophies[id] ??
            (S.trophies[id] = { status: "Non iniziato", value: 0, validated: false, started: "", proof: "", note: "" });
    function value(t) {
        let x = E(t.id);
        if (t.source === "actions") return +S.profile.actions || 0;
        if (t.source === "bounty") return +S.profile.bounty || 0;
        if (t.source === "level") return +S.profile.level || 0;
        if (t.source === "plays_same_island") {
            let n = {};
            S.activities.forEach((a) => (n[a.island] = (n[a.island] || 0) + 1));
            return Math.max(0, ...Object.values(n));
        }
        if (t.source === "unique_players_week" && x.started) {
            let a = new Date(x.started),
                b = new Date(a);
            b.setDate(b.getDate() + 7), (u = new Set());
            S.activities.forEach((z) => {
                let d = new Date(z.date);
                if (d >= a && d <= b) z.players.forEach((p) => u.add(p.toLowerCase()));
            });
            return u.size;
        }
        return +x.value || 0;
    }
    function expired(t) {
        let x = E(t.id);
        if (!t.windowDays || !x.started) return false;
        let d = new Date(x.started);
        d.setDate(d.getDate() + t.windowDays);
        return new Date() > d && value(t) < t.target;
    }
    function stat(t) {
        let x = E(t.id);
        if (x.validated) return "Convalidato";
        if (x.status === "Non applicabile") return x.status;
        if (expired(t)) return "Scaduto";
        if (value(t) >= t.target) return "Completato";
        return x.status;
    }
    function deadline(t) {
        let x = E(t.id);
        if (!t.windowDays || !x.started) return "";
        let d = new Date(x.started);
        d.setDate(d.getDate() + t.windowDays);
        return `Scadenza: ${d.toLocaleDateString("it-IT")}`;
    }
    function render() {
        let good = C.filter((t) => E(t.id).validated),
            pending = C.filter((t) => stat(t) === "Completato"),
            active = C.filter((t) => stat(t) === "In progress"),
            na = C.filter((t) => stat(t) === "Non applicabile"),
            px = (a) => a.reduce((n, t) => n + (+t.px || 0), 0),
            pct = C.length ? Math.round((good.length / C.length) * 100) : 0;
        $("#validated-count").textContent = `${good.length} / ${C.length}`;
        $("#confirmed-px").textContent = px(good);
        $("#pending-px").textContent = px(pending);
        $("#potential-px").textContent = px(good) + px(pending);
        $("#progress-count").textContent = active.length;
        $("#pending-count").textContent = pending.length;
        $("#na-count").textContent = na.length;
        $("#percentage").textContent = pct + "%";
        $("#bar-fill").style.width = pct + "%";
        let usable = C.length - na.length,
            ap = usable ? Math.round((good.filter((t) => stat(t) !== "Non applicabile").length / usable) * 100) : 0;
        $("#applicable-percentage").textContent =
            `Completamento trofei applicabili: ${good.length} / ${usable} (${ap}%).`;
        let timers = C.filter((t) => t.windowDays && E(t.id).started);
        $("#deadline-count").textContent = timers.filter((t) => {
            let d = new Date(E(t.id).started);
            d.setDate(d.getDate() + t.windowDays);
            return d - new Date() <= 6048e5 && d >= new Date();
        }).length;
        $("#deadline-list").innerHTML =
            timers.map((t) => `<div><b>${t.name}</b> — ${deadline(t)}</div>`).join("") ||
            "<div>Nessuna scadenza attiva.</div>";
        $("#near-list").innerHTML =
            C.filter((t) => !E(t.id).validated && stat(t) !== "Non applicabile" && value(t) > 0 && value(t) < t.target)
                .sort((a, b) => value(b) / b.target - value(a) / a.target)
                .slice(0, 6)
                .map((t) => `<div><b>${t.name}</b> — ${value(t)} / ${t.target} ${t.unit}</div>`)
                .join("") || "<div>Nessun trofeo in progress.</div>";
        let p = S.profile;
        $("#bounty-display").textContent = p.bounty
            ? `฿ ${Number(p.bounty).toLocaleString("it-IT")}`
            : "NESSUNA TAGLIA";
        let next = C.filter((t) => t.source === "bounty" && value(t) < t.target).sort((a, b) => a.target - b.target)[0];
        $("#bounty-next").textContent = next
            ? `Prossima soglia: ${next.name} · mancano ฿ ${(next.target - value(next)).toLocaleString("it-IT")}`
            : "Tutte le soglie taglia completate";
        $("#character-summary").innerHTML = [
            ["PG", p.name],
            ["Livello", p.level || "—"],
            ["Exp", p.exp || 0],
            ["Berry", "฿ " + Number(p.berry || 0).toLocaleString("it-IT")],
            ["Azioni", p.actions || 0],
            ["Giocate", S.activities.length],
        ]
            .map((x) => `<div><span>${x[0]}</span><b>${x[1]}</b></div>`)
            .join("");
        activities();
        trophies();
    }
    function activities() {
        let l = $("#activity-list");
        l.innerHTML =
            S.activities
                .slice()
                .reverse()
                .map(
                    (a) =>
                        `<article class="activity"><div><b>${a.date} · ${a.type}</b><br>${a.island || "Isola non indicata"} · ${a.actions || 0} azioni · ${a.players.join(", ") || "nessun PG"}<br><small>${a.proof || ""}</small></div><button class="button delete" data-id="${a.id}">Elimina</button></article>`
                )
                .join("") || "<p>Nessuna attività registrata.</p>";
        l.querySelectorAll("[data-id]").forEach(
            (b) =>
                (b.onclick = () => {
                    S.activities = S.activities.filter((a) => a.id !== b.dataset.id);
                    save();
                    render();
                })
        );
    }
    function trophies() {
        let l = $("#trophy-list"),
            q = $("#search").value.toLowerCase(),
            c = $("#category-filter").value,
            f = $("#status-filter").value;
        l.innerHTML = "";
        C.filter(
            (t) =>
                (c === "all" || t.category === c) &&
                (f === "all" || stat(t) === f) &&
                `${t.name} ${t.description}`.toLowerCase().includes(q)
        ).forEach((t) => {
            let z = $("#trophy-template").content.cloneNode(true),
                k = $(".trophy-card", z),
                x = E(t.id),
                form = $(".detail-form", k);
            $(".trophy-category", k).textContent = t.category;
            $(".trophy-name", k).textContent = t.name;
            $(".trophy-description", k).textContent = t.description;
            $(".trophy-derived", k).textContent =
                `${value(t)} / ${t.target} ${t.unit || ""}${deadline(t) ? " · " + deadline(t) : ""}`;
            $(".meta", k).textContent = `Premio: ${t.px} PX · Stato: ${stat(t)}`;
            $(".detail-button", k).onclick = () => (form.hidden = !form.hidden);
            let s = $(".status-input", k);
            s.value = x.status;
            s.onchange = () => {
                x.status = s.value;
                if (s.value !== "Completato") x.validated = false;
                save();
                render();
            };
            let v = $(".value-input", k);
            v.value = x.value;
            v.onchange = () => {
                x.value = Math.max(0, +v.value || 0);
                save();
                render();
            };
            let d = $(".started-input", k);
            d.value = x.started;
            d.parentElement.hidden = !t.windowDays;
            d.onchange = () => {
                x.started = d.value;
                save();
                render();
            };
            let ok = $(".validated-input", k);
            ok.checked = x.validated;
            ok.onchange = () => {
                x.validated = ok.checked;
                save();
                render();
            };
            [
                [".proof-input", "proof"],
                [".note-input", "note"],
            ].forEach(([a, b]) => {
                let i = $(a, k);
                i.value = x[b];
                i.onchange = () => {
                    x[b] = i.value;
                    save();
                };
            });
            l.append(z);
        });
    }
    function init() {
        document.querySelectorAll(".tab").forEach(
            (b) =>
                (b.onclick = () => {
                    document.querySelectorAll(".tab,.tab-panel").forEach((x) => x.classList.remove("active"));
                    b.classList.add("active");
                    $("#" + b.dataset.tab).classList.add("active");
                })
        );
        let F = $("#profile-form");
        Object.entries(S.profile).forEach(([k, v]) => F.elements[k] && (F.elements[k].value = v));
        $("#save-profile").onclick = () => {
            Object.keys(S.profile).forEach((k) => F.elements[k] && (S.profile[k] = F.elements[k].value));
            save();
            render();
        };
        $("#activity-form").onsubmit = (e) => {
            e.preventDefault();
            let d = new FormData(e.target);
            S.activities.push({
                id: crypto.randomUUID(),
                date: d.get("date"),
                type: d.get("type"),
                island: d.get("island"),
                actions: +d.get("actions") || 0,
                players: d
                    .get("players")
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                proof: d.get("proof"),
            });
            save();
            e.target.reset();
            render();
        };
        ["search", "category-filter", "status-filter"].forEach((x) => ($("#" + x).oninput = trophies));
        $("#reset-button").onclick = () => {
            if (confirm("Azzerare definitivamente profilo, diario e progressi in questo browser?")) {
                localStorage.removeItem(KEY);
                location.reload();
            }
        };
        $("#export-button").onclick = () => {
            let a = document.createElement("a");
            a.href = URL.createObjectURL(
                new Blob([JSON.stringify({ version: "2.1", exportedAt: new Date().toISOString(), data: S }, null, 2)], {
                    type: "application/json",
                })
            );
            a.download = "backup-nwgdr-v21.json";
            a.click();
        };
        $("#import-button").onclick = () => $("#import-file").click();
        $("#import-file").onchange = (e) => {
            let r = new FileReader();
            r.onload = () => {
                let b = JSON.parse(r.result);
                S = b.data || b;
                save();
                location.reload();
            };
            r.readAsText(e.target.files[0]);
        };
        render();
    }
    fetch("data/trofei.json")
        .then((r) => r.json())
        .then((x) => {
            C = x;
            init();
        })
        .catch(() => ($("#trophy-list").textContent = "Impossibile caricare data/trofei.json"));
})();
