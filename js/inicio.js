import { supabase } from "./supabase.js";

const container = document.getElementById("meus_matches_like");
const dados = document.getElementById("dados");

/* ================================
   UTIL
================================ */
async function getAgendaPrestador(prestador_id) {

  const { data, error } = await supabase
    .from("view_agenda_prestador")
    .select("*")
    .eq("prestador_id", prestador_id);

  if (error) {
    console.error(error);
    return [];
  }

  console.log("AGENDA PRESTADOR:", data);

  return data;
}

function gerarUUID() {

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function(c) {

      const r = Math.random() * 16 | 0;
      const v = c === 'x'
        ? r
        : (r & 0x3 | 0x8);

      return v.toString(16);

    });

}

function getImagemServico(s) {
  return s.imagem1 || s.imagem2 || s.imagem3 || s.imagem_url || "";
}


async function getHorariosPrestador(prestador_id) {

  const { data, error } = await supabase
    .from("horarios_cliente")
    .select("*")
    .eq("usuario_id", prestador_id)
    .eq("tipo_usuario", "prestador");

  if (error) {
    console.error(error);
    return [];
  }
 console.log(prestador_id)
 console.log(data)
  return data;
}

async function abrirSeletorAgendamento(
  prestador_id,
  horarios,
  callback
) {

  const agendaPrestador =
    await getAgendaPrestador(prestador_id);

  const modal = document.createElement("div");
  modal.className = "modal-agendamento";

  const box = document.createElement("div");
  box.className = "modal-box";

  const datas =
    gerarDatasDisponiveis(horarios);

  if (!datas.length) {
    alert("Nenhum dia disponível");
    return;
  }

  box.innerHTML = `
    <h3>Escolha uma data</h3>
    <div id="lista-datas"></div>
    <div id="lista-horas"></div>
    <button id="fechar-modal">Fechar</button>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  const listaDatas =
    box.querySelector("#lista-datas");

  const listaHoras =
    box.querySelector("#lista-horas");

  datas.forEach(d => {

    const btn =
      document.createElement("button");

    btn.innerText =
      formatarDataBR(d.data);

    btn.onclick = () => {

      listaHoras.innerHTML = "";

      const agendaDia =
        agendaPrestador.filter(a =>
          a.data === d.data
        );

      const slots =
        gerarSlots(
          d.config.horario_inicio,
          d.config.horario_fim,
          agendaDia
        );

      if (!slots.length) {

        listaHoras.innerHTML =
          "<p>Sem horários disponíveis</p>";

        return;
      }

      slots.forEach(hora => {

        const btnHora =
          document.createElement("button");

        btnHora.innerText = hora;

        btnHora.onclick = () => {

          callback(d.data, hora);
          modal.remove();

        };

        listaHoras.appendChild(btnHora);

      });

    };

    listaDatas.appendChild(btn);

  });

  box
    .querySelector("#fechar-modal")
    .onclick = () => modal.remove();

}
/* mapa correto PT-BR */
const diasMap = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado"
};



function gerarDatasDisponiveis(horarios) {

  const hoje = new Date();
  const dias = [];

  for (let i = 0; i < 14; i++) {

    const d = new Date();
    d.setDate(hoje.getDate() + i);

    const nomeDia = diasMap[d.getDay()];

    const config = horarios.find(h => h.dia_semana === nomeDia);

    if (config) {
      dias.push({
        data: d.toISOString().split("T")[0],
        config
      });
    }
  }

  return dias;
}

function formatarDataBR(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function gerarSlots(horaInicio, horaFim, agendaDia) {

  const slots = [];

  let [h] = horaInicio.split(":").map(Number);
  const [hf] = horaFim.split(":").map(Number);

  while (h < hf) {

    const hora = `${String(h).padStart(2, "0")}:00`;

    const ocupado = agendaDia.some(a => {

      const ini = parseInt(a.hora_inicio.split(":")[0]);
      const fim = parseInt(a.hora_fim.split(":")[0]);

      return h >= ini && h < fim;

    });

    if (!ocupado) {
      slots.push(hora);
    }

    h++;

  }

  return slots;
}

function criarTitulo(texto) {
  const el = document.createElement("h2");
  el.className = "section-title";
  el.innerText = texto;
  return el;
}

function criarLinkWhatsApp(numero, mensagem) {

  if (!numero) return null;

  let numeroFormatado = numero.replace(/\D/g, '');

  if (!numeroFormatado.startsWith("55"))
    numeroFormatado = "55" + numeroFormatado;

  if (numeroFormatado.length < 12)
    return null;

  return `https://wa.me/${numeroFormatado}?text=${encodeURIComponent(mensagem)}`;

}

/* ================================
   STATUS VISUAL
================================ */

function statusVisual(p, tipo) {

  if (!p.agendamento_id)
    return "⚪ Sem agendamento";

  if (!p.inicio_cliente && !p.inicio_prestador)
    return "⏳ Aguardando início";

  if (!p.inicio_cliente)
    return tipo === "cliente"
      ? "⏳ Confirme início"
      : "⏳ Cliente não iniciou";

  if (!p.inicio_prestador)
    return tipo === "prestador"
      ? "⏳ Confirme início"
      : "⏳ Prestador não iniciou";

  if (!p.fim_cliente && !p.fim_prestador)
    return "🔵 Em andamento";

  if (!p.fim_cliente)
    return tipo === "cliente"
      ? "⏳ Finalize"
      : "⏳ Cliente não finalizou";

  if (!p.fim_prestador)
    return tipo === "prestador"
      ? "⏳ Finalize"
      : "⏳ Prestador não finalizou";

  return "🟢 Concluído";
}

/* ================================
   ATUALIZAR STATUS
================================ */

async function atualizarAgendamento(id, campo) {

  const { error } = await supabase
    .from("agendamentos")
    .update({ [campo]: true })
    .eq("id", id);

  if (error) {

    console.error(error);
    alert("Erro ao atualizar");

  } else {

    location.reload();

  }

}

// CLIENTE
window.confirmarInicioCliente =
(id) => atualizarAgendamento(id, "inicio_cliente");

window.confirmarFimCliente =
(id) => atualizarAgendamento(id, "fim_cliente");

// PRESTADOR
window.confirmarInicioPrestador =
(id) => atualizarAgendamento(id, "inicio_prestador");

window.confirmarFimPrestador =
(id) => atualizarAgendamento(id, "fim_prestador");

/* ================================
   CRIAR AGENDAMENTO (RPC SEGURA)
================================ */
window.criarAgendamento = async (prestador_id, nome_servico, match_key) => {

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    alert("Usuário não autenticado");
    return;
  }

  const { data: servico } = await supabase
    .from("servicos_prestador_v2")
    .select("servico_id, duracao")
    .eq("prestador_id", prestador_id)
    .eq("descricao", nome_servico)
    .single();

  if (!servico) {
    alert("Serviço não encontrado");
    return;
  }

  const servico_id = servico.servico_id;

  const horarios = await getHorariosPrestador(prestador_id);

  if (!horarios.length) {
    alert("Prestador não configurou horários");
    return;
  }

 abrirSeletorAgendamento(
  prestador_id,
  horarios,
  async (data, hora) => {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      alert("Usuário não autenticado");
      return;
    }

    const { data: usuarioInfo } = await supabase
      .from("usuarios")
      .select("tipo_usuario")
      .eq("user_id", user.id)
      .single();

    const tipoUsuario = usuarioInfo?.tipo_usuario;

if (tipoUsuario === "cliente") {

  const duracao = servico.duracao || 0;

  // calcula horário fim
  const horarioFim = somarMinutos(hora, duracao);

  // cria objeto de data
 const partes = data.split("-");
const dataObj = new Date(
  partes[0],
  partes[1] - 1,
  partes[2]
);

  // pega dia no padrão correto do banco
  const diaSemana = diasMap[dataObj.getDay()];

  const { error: insertError } = await supabase
    .from("horarios_cliente")
    .insert([{
     id: self.crypto?.randomUUID?.() || gerarUUID(),
      usuario_id: user.id,

      // ✅ agora fica igual ao SQL
      // 'Domingo', 'Sexta', etc
      dia_semana: diaSemana,

      horario_inicio: hora,
      horario_fim: horarioFim,

      intervalo_inicio: null,
      intervalo_fim: null,

      created_at: new Date().toISOString(),

      tipo_usuario: "cliente"
    }]);

  if (insertError) {
    console.error(insertError);
    alert("Erro ao salvar horário do cliente");
    return;
  }

}

const match_instance_id = crypto.randomUUID
  ? crypto.randomUUID()
  : gerarUUID();
const { data: rpcData, error } = await supabase.rpc("criar_agendamento_seguro", {
  p_cliente: user.id,
  p_prestador: prestador_id,
  p_servico: servico_id,
  p_data: data,
  p_hora: hora,
  p_match_instance_id: match_key
});
if (error) {
  console.error(error);
  alert(error.message || "Erro ao agendar");
  return;
}

    alert("Agendado com sucesso 🚀");
    location.reload();

  }); // 👈 FECHA callback

}; // 👈 FECHA window.criarAgendamento

/* ================================
   CARD PRESTADOR (CLIENTE)
================================ */
function somarMinutos(hora, minutos) {
  const [h, m] = hora.split(":").map(Number);

  const data = new Date();
  data.setHours(h);
  data.setMinutes(m + minutos);

  const hh = String(data.getHours()).padStart(2, "0");
  const mm = String(data.getMinutes()).padStart(2, "0");

  return `${hh}:${mm}`;
}

function criarCardPrestador(p) {

  const img = getImagemServico(p);

  const card = document.createElement("div");
  card.className = "card";

  const linkWhatsApp =
    criarLinkWhatsApp(
      p.telefone,
      `Olá ${p.prestador_nome}, tenho interesse em ${p.servico}`
    );

  const valorSinal =
    p.preco && p.percentual_sinal
      ? (
          p.preco *
          (p.percentual_sinal / 100)
        ).toFixed(2)
      : "--";

  card.innerHTML = `
<button class="btn-deslike">❌</button>
    ${img ? `<img src="${img}">` : ""}

    <div class="card-content">

      

      <h3>${p.prestador_nome}</h3>
      <p>${p.servico}</p>
      <p>${p.telefone}</p>

      ${
        linkWhatsApp
          ? `<a class="btn-whatsapp"
               href="${linkWhatsApp}"
               target="_blank">
               WhatsApp
             </a>`
          : `<p style="color:red">
               Número inválido
             </p>`
      }

      <p>R$ ${p.preco}</p>
      <p>Sinal: R$ ${valorSinal}</p>

      <hr>

      <p>
        <strong>Status:</strong>
        ${statusVisual(p, "cliente")}
      </p>

      ${
        !p.agendamento_id
          ? `<button
               onclick="criarAgendamento(
  '${p.prestador_id}',
  '${p.servico}',
  '${p.match_key}'
               )" class="btn-agendar">
               📅 Agendar
             </button>`
          : `
            ${
              !p.inicio_cliente
                ? `<button
                     onclick="confirmarInicioCliente(
                       '${p.agendamento_id}'
                     )" class="btn-agendar">
                     🚀 Iniciar
                   </button>`
                : ""
            }

            ${
              p.inicio_cliente &&
              p.inicio_prestador &&
              !p.fim_cliente
                ? `<button
                     onclick="confirmarFimCliente(
                       '${p.agendamento_id}'
                     )" class="btn-agendar">
                     ✅ Finalizar
                   </button>`
                : ""
            }
          `
      }

    </div>
  `;

  card.querySelector(".btn-deslike")
    .addEventListener("click", async () => {

      await removerLike(p.match_id);
      card.remove();

    });

  return card;

}

/* ================================
   CARD CLIENTE (PRESTADOR)
================================ */

function criarCardCliente(c) {

  const img = getImagemServico(c);

  const card = document.createElement("div");
  card.className = "card";

  const linkWhatsApp =
    criarLinkWhatsApp(
      c.telefone,
      `Olá ${c.cliente_nome}, vi seu interesse`
    );

  card.innerHTML = `
<button class="btn-deslike">❌</button>
    ${img ? `<img src="${img}">` : ""}

    <div class="card-content">

      

      <h3>${c.cliente_nome}</h3>
      <p>${c.servico}</p>
      <p>${c.telefone}</p>

      ${
        linkWhatsApp
          ? `<a class="btn-whatsapp"
               href="${linkWhatsApp}"
               target="_blank">
               WhatsApp
             </a>`
          : ""
      }

      <hr>

      <p>
        <strong>Status:</strong>
        ${statusVisual(c, "prestador")}
      </p>

      ${
        c.agendamento_id
          ? `
            ${
              !c.inicio_prestador
                ? `<button
                     onclick="confirmarInicioPrestador(
                       '${c.agendamento_id}'
                     )"class="btn-agendar">
                     🚀 Iniciar
                   </button>`
                : ""
            }

            ${
              c.inicio_cliente &&
              c.inicio_prestador &&
              !c.fim_prestador
                ? `<button class="btn-agendar"
                     onclick="confirmarFimPrestador(
                       '${c.agendamento_id}'
                     )">
                     ✅ Finalizar
                   </button>`
                : ""
            }
          `
          : `<p style="color:gray" >
               Sem agendamento
             </p>`
      }

    </div>
  `;

  card.querySelector(".btn-deslike")
    .addEventListener("click", async () => {

      await removerLike(c.match_id);
      card.remove();

    });

  return card;

}

/* ================================
   REMOVER LIKE
================================ */

async function removerLike(matchId) {

  await supabase
    .from("cliente_match")
    .delete()
    .eq("id", matchId);

}

/* ================================
   USER
================================ */

async function getUser() {

  const { data: { user } } =
    await supabase.auth.getUser();

  return user;

}

async function getDados(userId) {

  const { data } =
    await supabase
      .from("usuarios")
      .select("tipo_usuario, nome")
      .eq("user_id", userId)
      .single();

  return data;

}

/* ================================
   LOAD CLIENTE
================================ */

async function carregarCliente(userId) {

  const { data } =
    await supabase
      .from("cliente_prestadores_like")
      .select("*")
      .eq("cliente_id", userId);

  container.appendChild(
    criarTitulo("Prestadores")
  );

  if (!data || data.length === 0)
    return vazio("Nenhum prestador");

  data.forEach(p =>
    container.appendChild(
      criarCardPrestador(p)
    )
  );

}

/* ================================
   LOAD PRESTADOR
================================ */

async function carregarPrestador(userId) {

  const { data } =
    await supabase
      .from("prestador_clientes_like")
      .select("*")
      .eq("prestador_id", userId);

  container.appendChild(
    criarTitulo("Clientes")
  );

  if (!data || data.length === 0)
    return vazio("Nenhum cliente");

  data.forEach(c =>
    container.appendChild(
      criarCardCliente(c)
    )
  );

}

/* ================================
   INIT
================================ */

function limparTela() {

  container.innerHTML = "";

}

function vazio(msg) {

  const el = document.createElement("p");
  el.innerText = msg;

  container.appendChild(el);

}

async function init() {

  const user = await getUser();

  if (!user)
    return location.href = "/login.html";

  const dadosUser =
    await getDados(user.id);

  dados.innerText =
    `Bem-vindo, ${dadosUser.nome}`;

  limparTela();

  if (dadosUser.tipo_usuario === "cliente") {

    await carregarCliente(user.id);

  } else {

    await carregarPrestador(user.id);

  }

}


init();