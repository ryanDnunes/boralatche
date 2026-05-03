export async function includeNav(selector = "body") {

    if (document.querySelector(".bottom-nav")) return;

    const resp = await fetch("/nav.html");
    const html = await resp.text();

    document.querySelector(selector)
        .insertAdjacentHTML("beforeend", html);

    markActive();
}

function markActive(){

    const path = location.pathname;

    const map = {
        "/inicio": "home",
        "/descobrir": "discover",
        "/match": "matches",
        "/agenda.html": "agenda",
        "/perfil.html": "profile"
    };

    const key = map[path] || "home";

    document.querySelectorAll(".nav-item").forEach(el=>{
        el.classList.toggle("active", el.dataset.key === key);
    });
}

