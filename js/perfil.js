import { supabase } from "./supabase.js";
const urlParams = new URLSearchParams(window.location.search);

const fotoPerfil = document.getElementById("fotoPerfil");
const nomeUsuario = document.getElementById("nomeUsuario");
const tipoUsuario = document.getElementById("tipoUsuario");
const enderecoUsuario = document.getElementById("enderecoUsuario");
const servicosLinha = document.getElementById("servicosLinha");
const gridProdutos = document.getElementById("gridProdutos");

const filtroCategoria = document.getElementById("filtroCategoria");
const filtroTipo = document.getElementById("filtroTipo");

let todosServicos = [];

(async () => {

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("user_id", user.id)
    .single();
  await carregarAgendaPrestador(user.id);
  
  nomeUsuario.textContent = usuario.nome;
  tipoUsuario.textContent = usuario.tipo_usuario;

  enderecoUsuario.textContent =
    "📍 " + (usuario.endereco?.cidade || "") + " - " + (usuario.endereco?.estado || "");

const avatarPath = `${user.id}/foto_perfil.png`;

const { data } = supabase.storage
  .from("avatars")
  .getPublicUrl(avatarPath);

// força atualização da imagem (mata cache)
fotoPerfil.src = `${data.publicUrl}?t=${Date.now()}`;
const { data: servicos } = await supabase
  .from("servicos_prestador_v2")
  .select(`
    id,
    preco,
    duracao,
    imagem1,
    imagem2,
    imagem3,
    ativo,
    servicos_catalogo!fk_servico(produto,categoria,tipo_servico)
  `)
  .eq("prestador_id", user.id)
  .eq("ativo", true);

  todosServicos = servicos || [];

  gerarTags();
  gerarFiltros();
  renderizarProdutos();

})();

function gerarTags() {
  servicosLinha.innerHTML = "";
  const seen = new Set();

  todosServicos.forEach(s => {
    const categoria = s.servicos_catalogo?.categoria?.trim();
    if (!categoria) return;
    if (seen.has(categoria)) return;

    seen.add(categoria);
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = categoria;
    servicosLinha.appendChild(tag);
  });
}

function gerarFiltros(){

  const categorias = [...new Set(
    todosServicos.map(s => s.servicos_catalogo?.categoria)
  )];

  categorias.forEach(cat=>{
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    filtroCategoria.appendChild(opt);
  });
}

filtroCategoria.addEventListener("change", ()=>{
  atualizarTipo();
  renderizarProdutos();
});

filtroTipo.addEventListener("change", ()=>{
  renderizarProdutos();
});

function atualizarTipo(){
  filtroTipo.innerHTML = `<option value="">Todos Tipos</option>`;

  const categoria = filtroCategoria.value;
  if(!categoria) return;

  const tipos = [...new Set(
    todosServicos
    .filter(s=>s.servicos_catalogo?.categoria === categoria)
    .map(s=>s.servicos_catalogo?.tipo_servico)
  )];

  tipos.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    filtroTipo.appendChild(opt);
  });
}

function renderizarProdutos(){

  gridProdutos.innerHTML = "";

  const categoria = filtroCategoria.value;
  const tipo = filtroTipo.value;

  let filtrados = todosServicos;

  if(categoria){
    filtrados = filtrados.filter(s =>
      s.servicos_catalogo?.categoria === categoria
    );
  }

  if(tipo){
    filtrados = filtrados.filter(s =>
      s.servicos_catalogo?.tipo_servico === tipo
    );
  }

  filtrados.forEach(s => {

    const imagens = [
      s.imagem1,
      s.imagem2,
      s.imagem3
    ].filter(Boolean);

    const imagensHTML = imagens.length
      ? imagens.map(img => `<img src="${img}" class="slide-img">`).join("")
      : `<img src="https://via.placeholder.com/400" class="slide-img">`;

    const indicadores = imagens.length > 1
      ? `<div class="indicadores">
          ${imagens.map((_,i)=>`<span class="dot ${i===0?'ativo':''}"></span>`).join("")}
         </div>`
      : "";

    const card = document.createElement("div");
    card.classList.add("produto-card");

    card.innerHTML = `
      <div class="slider">
        <div class="slides">
          ${imagensHTML}
        </div>
        ${indicadores}
      </div>

      <div class="produto-info">
        <h4>${s.servicos_catalogo?.produto}</h4>
        <p>R$ ${s.preco} • ${s.duracao || 0}min</p>
      </div>
    `;

    gridProdutos.appendChild(card);

    ativarSlider(card);
  });
}

function ativarSlider(card){

  const slides = card.querySelector(".slides");
  const dots = card.querySelectorAll(".dot");

  if(!slides) return;

  let index = 0;
  let startX = 0;

  const total = slides.children.length;

  function atualizar(){
    slides.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d,i)=> d.classList.toggle("ativo", i===index));
  }

  slides.addEventListener("touchstart", e=>{
    startX = e.touches[0].clientX;
  });

  slides.addEventListener("touchend", e=>{
    let endX = e.changedTouches[0].clientX;

    if(startX - endX > 50 && index < total-1){
      index++;
    }

    if(endX - startX > 50 && index > 0){
      index--;
    }

    atualizar();
  });

  // clique desktop
  slides.addEventListener("click", ()=>{
    index = (index + 1) % total;
    atualizar();
  });

}

  // Função para controlar áreas
  function controlarAreasUsuario(tipo) {
    const areas = ["catalogoServicos", "areaCliente", "areaLocador", "areaPrestador"];
    areas.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    
    if (tipo === "prestador") {
      document.getElementById("areaPrestador").style.display = "block";
      carregarFiltros();
      carregarProdutos();
    }

    if (tipo === "cliente") {
      document.getElementById("areaCliente").style.display = "block";
    }

    if (tipo === "locador") {
      document.getElementById("areaLocador").style.display = "block";
    }
  }

  // Carregar dados do usuário
  async function carregarDados() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Erro ao carregar dados:", error.message);
      return;
    }
    
    controlarAreasUsuario(data.tipo_usuario?.trim().toLowerCase());
  }

  // Carregar filtros dinamicamente
  async function carregarFiltros() {
    const { data: categorias } = await supabase.from("categorias").select("*");
    const { data: tipos } = await supabase.from("tipos").select("*");

    const filtroCategoria = document.getElementById("filtroCategoria");
    const filtroTipo = document.getElementById("filtroTipo");

    categorias?.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.nome;
      filtroCategoria.appendChild(opt);
    });

    tipos?.forEach(tipo => {
      const opt = document.createElement("option");
      opt.value = tipo.id;
      opt.textContent = tipo.nome;
      filtroTipo.appendChild(opt);
    });
  }

  // Inicializar
  carregarDados();

async function carregarAgendaPrestador(userId) {

  const container = document.getElementById("agendaResumo");
  if (!container) return;

  const { data, error } = await supabase
    .from("horarios_cliente")
    .select("*")
    .eq("usuario_id", userId)
    .eq("tipo_usuario", "prestador");

  if (error) {
    console.error(error);
    return;
  }

  if (!data || !data.length) {
    container.innerHTML = "<p>Horários não informados</p>";
    return;
  }

  const diasSemana = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const hojeIndex = new Date().getDay();
  const hojeNome = diasSemana[hojeIndex];

  const mapa = {};
  data.forEach(h => {
    mapa[h.dia_semana] = h;
  });

  const hoje = mapa[hojeNome];

  let html = `
    <div class="agenda-header">
      <h3>📅 Hoje (${hojeNome})</h3>
      <span class="ver-mais" id="toggleAgenda">Ver semana</span>
    </div>
  `;

  if (!hoje) {
    html += `<div class="hoje-box">
      <span class="fechado">❌ Fechado hoje</span>
    </div>`;
  } else {
    html += `
      <div class="hoje-box">
        <span class="horario">
          🟢 ${hoje.horario_inicio} → ${hoje.horario_fim}
        </span>
      </div>
      ${
        hoje.intervalo_inicio
        ? `<div class="intervalo">☕ ${hoje.intervalo_inicio} → ${hoje.intervalo_fim}</div>`
        : ""
      }
    `;
  }

  // lista completa escondida
  html += `<div class="lista-completa" id="listaCompleta">`;

  diasSemana.forEach(dia => {
    const h = mapa[dia];

    html += `
      <div class="linha-dia">
        <span>${dia}</span>
        ${
          h
          ? `🟢 ${h.horario_inicio}–${h.horario_fim}`
          : `<span class="fechado">Fechado</span>`
        }
      </div>
    `;
  });

  html += `</div>`;

  container.innerHTML = html;

  // toggle
  const btn = document.getElementById("toggleAgenda");
  const lista = document.getElementById("listaCompleta");

  let aberto = false;

  btn.addEventListener("click", () => {
    aberto = !aberto;
    lista.style.display = aberto ? "block" : "none";
    btn.textContent = aberto ? "Ocultar" : "Ver semana";
  });
}