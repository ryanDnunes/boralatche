import { supabase } from "./supabase.js";

const grid = document.getElementById("gridDias");
const mesAno = document.getElementById("mesAno");
const listaHorarios = document.getElementById("listaHorarios");
const dataSelecionada = document.getElementById("dataSelecionada");

const modal = document.getElementById("modalAgendamento");
const modalBody = document.getElementById("modalBody");
const fecharModal = document.getElementById("fecharModal");

fecharModal.onclick = () => modal.classList.add("hidden");

let dataAtual = new Date();
let horariosUsuario = [];
let agendamentosUsuario = [];
let matchesUsuario = [];
let usuarioLogado = null;

/* ================= DIAS ================= */

const DIAS = {
  0: "domingo",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado"
};

function getDiaSeguro(data) {
  const local = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  return DIAS[local.getDay()];
}

function normalizarDiaSemana(dia) {
  return (dia || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("-feira", "")
    .trim();
}

/* ================= HELPERS ================= */

function formatarISO(data) {
  const local = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  return local.toISOString().split("T")[0];
}

function toMin(hora) {
  if (!hora) return 0;
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function toHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ================= CARREGAR DADOS ================= */

async function carregarTudo() {

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  const { data: usuarioDB } = await supabase
    .from("usuarios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  usuarioLogado = usuarioDB;

  const isCliente = usuarioDB.tipo_usuario === "cliente";

  const tabelaLikes = isCliente
    ? "prestador_clientes_like"
    : "cliente_prestadores_like";

  const eqCampo = isCliente ? "cliente_id" : "prestador_id";

  const [horarios, agendamentos, matches] = await Promise.all([
    supabase.from("horarios_cliente").select("*").eq("usuario_id", user.id),

    supabase
      .from("agendamentos")
      .select("*")
      .or(`prestador_id.eq.${user.id},cliente_id.eq.${user.id}`),

    supabase.from(tabelaLikes).select("*").eq(eqCampo, user.id)
  ]);

  horariosUsuario = horarios.data || [];
  agendamentosUsuario = agendamentos.data || [];
  const matchesRaw = matches.data || [];

  /* ================= USUÁRIOS ================= */

  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("user_id, nome, telefone");

  const mapUsuarios = {};
  usuarios?.forEach(u => {
    mapUsuarios[u.user_id] = u;
  });

  /* ================= ENRIQUECER MATCH ================= */

  matchesUsuario = matchesRaw.map(m => ({
    ...m,
    cliente_nome: mapUsuarios[m.cliente_id]?.nome || "N/A",
    cliente_tel: mapUsuarios[m.cliente_id]?.telefone || "",
    prestador_nome: mapUsuarios[m.prestador_id]?.nome || "N/A",
    prestador_tel: mapUsuarios[m.prestador_id]?.telefone || ""
  }));

  console.log("HORARIOS:", horariosUsuario);
  console.log("AGENDAMENTOS:", agendamentosUsuario);
  console.log("MATCHES:", matchesUsuario);
}

/* ================= OCUPAÇÃO ================= */

function existeOcupacao(data) {
  return agendamentosUsuario.some(a => a.data_agendamento === data);
}

function getMatch(agendamento) {
  return matchesUsuario.find(
    m =>
      m.cliente_id === agendamento.cliente_id &&
      m.prestador_id === agendamento.prestador_id
  );
}

function getOcupacao(min, data) {
  for (const ag of agendamentosUsuario) {
    if (ag.data_agendamento !== data) continue;

    const match = getMatch(ag);
    const duracao = Number(match?.duracao || 30);

    const inicio = toMin(ag.hora_agendamento);
    const fim = inicio + duracao;

    if (min >= inicio && min < fim) {
      return { ag, match, inicio, fim };
    }
  }
  return null;
}

/* ================= CALENDÁRIO ================= */

function gerarCalendario() {

  grid.innerHTML = "";

  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);

  const meses = [
    "Janeiro","Fevereiro","Março","Abril",
    "Maio","Junho","Julho","Agosto",
    "Setembro","Outubro","Novembro","Dezembro"
  ];

  mesAno.textContent = `${meses[mes]} ${ano}`;

  let start = primeiro.getDay();
  if (start === 0) start = 7;

  for (let i = 1; i < start; i++) {
    grid.innerHTML += "<div></div>";
  }

  for (let d = 1; d <= ultimo.getDate(); d++) {

    const data = new Date(ano, mes, d);
    const iso = formatarISO(data);
    const nomeDia = getDiaSeguro(data);

    const div = document.createElement("div");
    div.textContent = d;

    const trabalha = horariosUsuario.some(
      h => normalizarDiaSemana(h.dia_semana) === nomeDia
    );

    const ocupado = existeOcupacao(iso);

    if (trabalha) div.classList.add("dia-disponivel");
    if (ocupado) div.classList.add("dia-ocupado");

    div.onclick = () => {
      document.querySelectorAll(".grid-dias div")
        .forEach(el => el.classList.remove("dia-ativo"));

      div.classList.add("dia-ativo");
      gerarHorarios(data);
    };

    grid.appendChild(div);
  }
}

/* ================= HORÁRIOS ================= */

function gerarHorarios(data) {

  listaHorarios.innerHTML = "";

  const iso = formatarISO(data);
  dataSelecionada.textContent = data.toLocaleDateString("pt-BR");

  const nomeDia = getDiaSeguro(data);

  const config = horariosUsuario.find(
    h => normalizarDiaSemana(h.dia_semana) === nomeDia
  );

  if (!config) {
    listaHorarios.innerHTML = "<p>Sem horários</p>";
    return;
  }

  const inicio = toMin(config.horario_inicio);
  const fim = toMin(config.horario_fim);

  for (let t = inicio; t <= fim; t += 20) {
    criarSlot(t, iso);
  }
}

/* ================= SLOT ================= */

function criarSlot(min, data) {

  const hora = toHora(min);

  const slot = document.createElement("div");
  slot.className = "horario-item";
  slot.textContent = hora;

  const ocupacao = getOcupacao(min, data);

  if (ocupacao) {
    slot.classList.add("indisponivel");
    slot.onclick = () => abrirModal(ocupacao);
  }

  listaHorarios.appendChild(slot);
}

/* ================= MODAL (CORRIGIDO) ================= */

function abrirModal(oc) {

  const { ag, match, fim } = oc;

  const isCliente = usuarioLogado.tipo_usuario === "cliente";

  const nome = isCliente ? match?.prestador_nome : match?.cliente_nome;
  const telefone = isCliente ? match?.prestador_tel : match?.cliente_tel;

  modalBody.innerHTML = `
    <h2>${match?.servico || "Serviço"}</h2>

    <p><strong>${isCliente ? "Prestador" : "Cliente"}:</strong> ${nome}</p>

    <p><strong>Telefone:</strong> ${telefone}</p>

    <p>
      <a href="https://wa.me/55${telefone}" target="_blank">
        WhatsApp
      </a>
    </p>

    <hr>

    <p><strong>Início:</strong> ${ag.hora_agendamento}</p>
    <p><strong>Fim:</strong> ${toHora(fim)}</p>
    <p><strong>Duração:</strong> ${match?.duracao || 30} min</p>
    <p><strong>Status:</strong> ${ag.status}</p>
  `;

  modal.classList.remove("hidden");
}

/* ================= NAV ================= */

document.getElementById("prevMes").onclick = () => {
  dataAtual.setMonth(dataAtual.getMonth() - 1);
  gerarCalendario();
};

document.getElementById("nextMes").onclick = () => {
  dataAtual.setMonth(dataAtual.getMonth() + 1);
  gerarCalendario();
};

/* ================= INIT ================= */

async function init() {
  await carregarTudo();
  gerarCalendario();
}

init();