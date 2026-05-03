import { supabase } from "./supabase.js";

/* ===================================
   PEGAR ID DA URL (?id=xxxx)
=================================== */

let meuId = null;
console.log()
const urlParams = new URLSearchParams(window.location.search);
const userIdPublico = urlParams.get("id");

/* ELEMENTOS */

const fotoPerfil = document.getElementById("fotoPerfil");
const nomeUsuario = document.getElementById("nomeUsuario");
const tipoUsuario = document.getElementById("tipoUsuario");
const enderecoUsuario = document.getElementById("enderecoUsuario");
const servicosLinha = document.getElementById("servicosLinha");
const gridProdutos = document.getElementById("gridProdutos");

const filtroCategoria = document.getElementById("filtroCategoria");
const filtroTipo = document.getElementById("filtroTipo");
const areaPrestador = document.getElementById("areaPrestador");

let todosServicos = [];

/* ===================================
   INICIAR
=================================== */

(async () => {

  if (!userIdPublico) {
    console.error("ID não informado na URL");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("Usuário não logado");
    return;
  }

  meuId = user.id;

  /* ================================
     CARREGAR USUÁRIO
  ================================= */

  const { data: usuario, error } =
    await supabase
      .from("usuarios")
      .select("*")
      .eq("user_id", userIdPublico)
      .single();

  if (error || !usuario) {
    console.error("Usuário não encontrado");
    return;
  }

  nomeUsuario.textContent = usuario.nome;
  tipoUsuario.textContent = usuario.tipo_usuario;

  enderecoUsuario.textContent =
    "📍 " +
    (usuario.endereco?.cidade || "") +
    " - " +
    (usuario.endereco?.estado || "");

  /* FOTO */

  const avatarPath = `${userIdPublico}/foto_perfil.png`;

  const { data: avatarData } =
    supabase.storage.from("avatars").getPublicUrl(avatarPath);

  fotoPerfil.src = avatarData.publicUrl;

  /* ================================
     SERVIÇOS
  ================================= */

  const { data: servicos, error: erroServicos } =
    await supabase
      .from("servicos_prestador_v2")
      .select(`
        id,
        servico_id,
        preco,
        duracao,
        imagem1,
        imagem2,
        imagem3,
        ativo,
        servicos_catalogo!fk_servico(
          produto,
          categoria,
          tipo_servico
        )
      `)
      .eq("prestador_id", userIdPublico)
      .eq("ativo", true);

  if (erroServicos) {
    console.error("Erro ao carregar serviços:", erroServicos);
    return;
  }

  todosServicos = servicos || [];

  areaPrestador.style.display = "block";

  gerarTags();
  gerarFiltros();
  renderizarProdutos();

})();

/* ===================================
   UUID SEGURO
=================================== */

function gerarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ===================================
   MATCH (CORRIGIDO E LIMPO)
=================================== */

async function insercaoMatch(cliente_id, prestador_id, servico_id, btnElement) {

  if (!cliente_id || !prestador_id || !servico_id) {
    console.error("Dados inválidos:", { cliente_id, prestador_id, servico_id });
    return;
  }

  // ✅ GERA UMA VEZ SÓ
  const match_instance_id = crypto.randomUUID
    ? crypto.randomUUID()
    : gerarUUID();

  const match_key = `${cliente_id}-${prestador_id}-${servico_id}-${match_instance_id}`;

  const { error } = await supabase
    .from("cliente_match")
    .insert([{
      id: crypto.randomUUID ? crypto.randomUUID() : gerarUUID(),
      cliente_id,
      prestador_id,
      servico_id,
      liked: true,
      match_key,
      match_instance_id
    }]);

  if (error) {
    console.error("Erro ao salvar match:", error);
    return;
  }

  console.log("Match criado com sucesso:", match_instance_id);

  if (btnElement) {
    btnElement.textContent = "✔ Serviço solicitado";
    btnElement.classList.add("btn-solicitado");
    btnElement.disabled = true;
  }
}

window.insercaoMatch = insercaoMatch;

/* ===================================
   RENDER PRODUTOS
=================================== */

function renderizarProdutos() {

  gridProdutos.innerHTML = "";

  todosServicos.forEach((s) => {

    const imagens = [s.imagem1, s.imagem2, s.imagem3].filter(Boolean);

    const imagensHTML =
      imagens.length
        ? imagens.map(img => `<img src="${img}" class="slide-img">`).join("")
        : `<img src="https://via.placeholder.com/400" class="slide-img">`;

    const indicadores =
      imagens.length > 1
        ? `<div class="indicadores">
            ${imagens.map((_, i) =>
              `<span class="dot ${i === 0 ? "ativo" : ""}" data-index="${i}"></span>`
            ).join("")}
          </div>`
        : "";

    const produto = s.servicos_catalogo?.produto || "";
    const categoria = s.servicos_catalogo?.categoria || "";
    const duracao = s.duracao || 0;

    const preco = s.preco
      ? Number(s.preco).toFixed(2).replace(".", ",")
      : "0,00";

    const servicoId = s.servico_id || s.id;

    const card = document.createElement("div");

    card.innerHTML = `

    <div class="card_background">
      <div class="slider">
        <div class="slides">
          ${imagensHTML}
        </div>
        ${indicadores}
      </div>

      <div class="card-content">

        <h3>${produto}</h3>
        <p>${categoria}</p>
        <p>⏱ ${duracao} min</p>
        <p>💰 R$ ${preco}</p>

        <button class="btn-agendar"
          onclick="insercaoMatch('${meuId}', '${userIdPublico}', '${servicoId}', this)">
          ❤ Solicitar Serviço
        </button>

      </div>

      </div>
    `;

    gridProdutos.appendChild(card);

    ativarSlider(card);

  });
}
function ativarSlider(card) {

  const slides = card.querySelector(".slides");
  const dots = card.querySelectorAll(".dot");
  const imgs = card.querySelectorAll(".slide-img");

  if (!slides || !imgs.length) return;

  let index = 0;
  let startX = 0;

  const total = imgs.length;

  function atualizar() {
    slides.style.transform = `translateX(-${index * 100}%)`;

    dots.forEach((d, i) => {
      d.classList.toggle("ativo", i === index);
    });
  }

  // 🔥 CLICK NOS DOTS (pular imagem)
  dots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      index = Number(e.target.dataset.index);
      atualizar();
    });
  });

  // 👉 SWIPE MOBILE
  slides.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });

  slides.addEventListener("touchend", (e) => {

    const endX = e.changedTouches[0].clientX;

    if (startX - endX > 50 && index < total - 1) {
      index++;
    }

    if (endX - startX > 50 && index > 0) {
      index--;
    }

    atualizar();

  });

  // 👉 CLICK PRA AVANÇAR (igual instagram)
  slides.addEventListener("click", () => {
    index = (index + 1) % total;
    atualizar();
  });

  atualizar();
}
/* ===================================
   TAGS
=================================== */

function gerarTags() {

  servicosLinha.innerHTML = "";

  const seen = new Set();

  todosServicos.forEach(s => {

    const cat = s.servicos_catalogo?.categoria;

    if (!cat || seen.has(cat)) return;

    seen.add(cat);

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = cat;

    servicosLinha.appendChild(tag);

  });

}

/* ===================================
   FILTROS
=================================== */

function gerarFiltros() {

  filtroCategoria.innerHTML =
    `<option value="">Todas Categorias</option>`;

  const categorias =
    [...new Set(
      todosServicos.map(s => s.servicos_catalogo?.categoria)
    )];

  categorias.forEach(cat => {

    if (!cat) return;

    const opt = document.createElement("option");

    opt.value = cat;
    opt.textContent = cat;

    filtroCategoria.appendChild(opt);

  });

}