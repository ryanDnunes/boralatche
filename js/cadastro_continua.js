import { supabase } from "./supabase.js";

const fileInput = document.getElementById("fileInput");
const avatarImg = document.getElementById("avatar");
const uploadBtn = document.getElementById("uploadBtn");

// ================= VALIDAÇÕES =================

// Email válido
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Telefone BR (aceita com ou sem máscara)
function validarTelefone(telefone) {
  const tel = telefone.replace(/\D/g, "");

  // 10 ou 11 dígitos (com DDD)
  return tel.length === 10 || tel.length === 11;
}

// CEP
function validarCEP(cep) {
  const c = cep.replace(/\D/g, "");
  return c.length === 8;
}

// Data de nascimento (mínimo 13 anos)
function validarIdade(data) {
  if (!data) return true;

  const hoje = new Date();
  const nasc = new Date(data);

  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();

  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }

  return idade >= 13;
}

// Nome
function validarNome(nome) {
  return nome && nome.length >= 3;
}

async function mostrarTipoUsuario() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("tipo_usuario")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar tipo_usuario:", error);
    return null;
  }

  return data.tipo_usuario; // ← aqui retorna o valor
}

// Carregar foto de perfil ao abrir a página
(async () => {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  const filePath = `${user.id}/foto_perfil.png`;
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  // Se já existir foto no bucket, mostra
  avatarImg.src = `${data.publicUrl}?t=${new Date().getTime()}`;
})();

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("Selecione uma imagem primeiro!");
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    alert("Você precisa estar autenticado.");
    return;
  }

  const filePath = `${user.id}/foto_perfil.png`;

  // 1. Deletar foto anterior
  await supabase.storage.from("avatars").remove([filePath]);

  // 2. Upload da nova foto
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("Erro no upload:", uploadError.message);
    alert("Falha ao salvar foto.");
    return;
  }

  // 3. Pegar URL pública e atualizar na página
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  avatarImg.src = data.publicUrl;

  alert("Foto de perfil atualizada com sucesso!");
});






const form = document.getElementById("usuarioForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    alert("Você precisa estar autenticado.");
    return;
  }

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const telefoneRaw = document.getElementById("telefone").value.trim();
  const data_nascimento_raw = document.getElementById("data_nascimento").value;
  const tipo_usuario = document.getElementById("tipo_usuario").value;

  const cep = document.getElementById("cep").value.trim();

  // ================= VALIDAÇÕES =================

  if (!validarNome(nome)) {
    alert("Nome deve ter pelo menos 3 caracteres.");
    return;
  }

  if (!validarEmail(email)) {
    alert("Email inválido.");
    return;
  }

  if (telefoneRaw && !validarTelefone(telefoneRaw)) {
    alert("Telefone inválido. Use DDD + número.");
    return;
  }

  if (cep && !validarCEP(cep)) {
    alert("CEP inválido.");
    return;
  }

  if (!validarIdade(data_nascimento_raw)) {
    alert("Você deve ter pelo menos 13 anos.");
    return;
  }

  if (!tipo_usuario) {
    alert("Selecione o tipo de usuário.");
    return;
  }

  // ================= NORMALIZAÇÃO =================

  const telefone = telefoneRaw
    ? telefoneRaw.replace(/\D/g, "")
    : null;

  const data_nascimento = data_nascimento_raw || null;

  const endereco = {
    rua: document.getElementById("rua").value || null,
    numero: document.getElementById("numero").value || null,
    complemento: document.getElementById("complemento").value || null,
    bairro: document.getElementById("bairro").value || null,
    cidade: document.getElementById("cidade").value || null,
    estado: document.getElementById("estado").value || null,
    cep: cep ? cep.replace(/\D/g, "") : null
  };

  // ================= SALVAR =================

  const { error } = await supabase
    .from("usuarios")
    .upsert([
      {
        user_id: user.id,
        nome,
        email,
        telefone,
        data_nascimento,
        tipo_usuario,
        endereco
      }
    ], { onConflict: "email" });

  if (error) {
    alert("Erro ao salvar: " + error.message);
  } else {
    alert("Dados salvos com sucesso!");
  }
});

function controlarAreasUsuario(tipo) {

  document.getElementById("catalogoServicos").style.display = "none";
  document.getElementById("areaCliente").style.display = "none";
  document.getElementById("areaLocador").style.display = "none";

  if (tipo === "prestador") {
    document.getElementById("catalogoServicos").style.display = "block";
  }

  if (tipo === "cliente") {
    document.getElementById("areaCliente").style.display = "block";
  }

  if (tipo === "locador") {
    document.getElementById("areaLocador").style.display = "block";
  }
}

// Função para carregar dados já existentes
async function carregarDados() {
  
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("user_id", user.id)
    .single();
controlarAreasUsuario(data.tipo_usuario);
  if (error) {
    console.error("Erro ao carregar dados:", error.message);
    return;
  }

  if (data) {
    document.getElementById("nome").value = data.nome || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("telefone").value = data.telefone || "";
    document.getElementById("data_nascimento").value = data.data_nascimento || "";
    document.getElementById("tipo_usuario").value = data.tipo_usuario || "";

    if (data.endereco) {
      document.getElementById("rua").value = data.endereco.rua || "";
      document.getElementById("numero").value = data.endereco.numero || "";
      document.getElementById("complemento").value = data.endereco.complemento || "";
      document.getElementById("bairro").value = data.endereco.bairro || "";
      document.getElementById("cidade").value = data.endereco.cidade || "";
      document.getElementById("estado").value = data.endereco.estado || "";
      document.getElementById("cep").value = data.endereco.cep || "";
    }
const tipoUsuarioSelect = document.getElementById("tipo_usuario");

if (tipoUsuarioSelect) {
  tipoUsuarioSelect.addEventListener("change", () => {

    const tipo = tipoUsuarioSelect.value;

    document.getElementById("catalogoServicos").style.display = "none";
    document.getElementById("areaCliente").style.display = "none";
    document.getElementById("areaLocador").style.display = "none";

    if (tipo === "prestador") {
      document.getElementById("catalogoServicos").style.display = "block";
    } else if (tipo === "cliente") {
      document.getElementById("areaCliente").style.display = "block";
    } else if (tipo === "locador") {
      document.getElementById("areaLocador").style.display = "block";
    }

  });
}
  }
}

// Chamar ao carregar a página
carregarDados();

//service_catalogo
let catalogoData = [];
let selecionados = [];

async function carregarCatalogo() {
  const { data, error } = await supabase
    .from("servicos_catalogo")
    .select("*");

  if (error) {
    console.error("Erro ao buscar catálogo:", error.message);
    return;
  }

  catalogoData = data;

  // Preencher categorias únicas
  const categorias = [...new Set(data.map(item => item.categoria))];
  const categoriaSelect = document.getElementById("categoria");
  categorias.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoriaSelect.appendChild(opt);
  });
}

// Atualizar tipos ao escolher categoria
document.getElementById("categoria").addEventListener("change", e => {
  const categoria = e.target.value;
  const tipoSelect = document.getElementById("tipo");
  tipoSelect.innerHTML = "<option value=''>Selecione</option>";

  if (!categoria) return;

  const tipos = [...new Set(catalogoData
    .filter(item => item.categoria === categoria)
    .map(item => item.tipo_servico))];

  tipos.forEach(tipo => {
    const opt = document.createElement("option");
    opt.value = tipo;
    opt.textContent = tipo;
    tipoSelect.appendChild(opt);
  });
});

// Listar produtos com checkboxes
document.getElementById("tipo").addEventListener("change", e => {
  const tipo = e.target.value;
  const categoria = document.getElementById("categoria").value;
  const container = document.getElementById("produtos");
  container.innerHTML = "";

  if (!tipo || !categoria) return;

  const produtos = catalogoData.filter(
    item => item.categoria === categoria && item.tipo_servico === tipo
  );

 produtos.forEach(item => {
  const div = document.createElement("div");
  div.classList.add("produto-card");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = item.id;

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      selecionados.push(item);
    } else {
      selecionados = selecionados.filter(sel => sel.id !== item.id);
    }
    atualizarSelecionados();
  });

  const label = document.createElement("span");
  label.textContent = item.produto;

  div.appendChild(checkbox);
  div.appendChild(label);
  container.appendChild(div);
});
});


function atualizarSelecionados() {
  const lista = document.getElementById("selecionados");
  lista.innerHTML = "";

  selecionados.forEach(item => {
    const chip = document.createElement("div");
    chip.classList.add("chip");
    chip.textContent = item.produto;

    const closeBtn = document.createElement("span");
    closeBtn.classList.add("close");
    closeBtn.textContent = "×";

    closeBtn.addEventListener("click", () => {
      // Remove da lista
      selecionados = selecionados.filter(sel => sel.id !== item.id);
      // Desmarca o checkbox correspondente
      const checkbox = document.querySelector(`input[type="checkbox"][value="${item.id}"]`);
      if (checkbox) checkbox.checked = false;
      atualizarSelecionados();
    });

    chip.appendChild(closeBtn);
    lista.appendChild(chip);
    
  });
}
// Inicializar
carregarCatalogo();










//base de prestador_servico
//base de prestador_servico
const listaPrestador = document.getElementById("listaPrestador");

document.getElementById("confirmarServicos").addEventListener("click", async () => {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    alert("Você precisa estar logado.");
    return;
  }

  if (!selecionados.length) {
    alert("Selecione pelo menos um serviço.");
    return;
  }

  const payload = selecionados.map(item => ({
    prestador_id: user.id,
    servico_id: item.id,
    preco: 0,
    percentual_sinal: 0,
    duracao: null,
    descricao: item.produto,
    ativo: true,
    possui_local: false,
    imagem1: null,
    imagem2: null,
    imagem3: null
  }));

  const { error } = await supabase
    .from("servicos_prestador_v2")
    .upsert(payload, {
      onConflict: "prestador_id,servico_id"
    });

  if (error) {
    alert("Erro ao salvar serviços.");
    return;
  }

  alert("Serviços salvos com sucesso!");
  carregarServicosPrestador();
});

async function removerImagemServico(id, index) {

  if (!confirm("Remover imagem?")) return;

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const filePath = `${user.id}/servicos/${id}/imagem${index}.png`;

  await supabase.storage.from("servicos").remove([filePath]);

  const updateData = {};
  updateData[`imagem${index}`] = null;

  const { error } = await supabase
    .from("servicos_prestador_v2")
    .update(updateData)
    .eq("id", id);

  if (error) {
    alert("Erro ao remover imagem");
    return;
  }

  carregarServicosPrestador();
}

window.removerImagemServico = removerImagemServico;

async function atualizarImagemServico(id) {

  const fileInput = document.getElementById(`file-${id}`);
  const file = fileInput?.files[0];

  if (!file) {
    alert("Selecione uma imagem");
    return;
  }

  // ================= USER =================
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    alert("Usuário não autenticado");
    return;
  }

  // ================= BUSCAR SLOTS =================
  const { data, error: fetchError } = await supabase
    .from("servicos_prestador_v2")
    .select("imagem1,imagem2,imagem3")
    .eq("id", id)
    .single();

  if (fetchError || !data) {
    console.error(fetchError);
    alert("Erro ao buscar serviço");
    return;
  }

  let slot = null;

  if (!data.imagem1) slot = 1;
  else if (!data.imagem2) slot = 2;
  else if (!data.imagem3) slot = 3;
  else {
    alert("Máximo de 3 imagens");
    return;
  }

  // ================= PATH CORRETO =================
  const fileName = `imagem${slot}.png`;
  const filePath = `${user.id}/${id}/${fileName}`;

  console.log("Upload path:", filePath);

  // ================= UPLOAD =================
  const { error: uploadError } = await supabase.storage
    .from("servicos")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    console.error("ERRO UPLOAD:", uploadError);
    alert("Erro no upload: " + uploadError.message);
    return;
  }

  // ================= PEGAR URL =================
  const { data: publicData } = supabase.storage
    .from("servicos")
    .getPublicUrl(filePath);

  if (!publicData?.publicUrl) {
    alert("Erro ao gerar URL da imagem");
    return;
  }

  // ================= SALVAR NO BANCO =================
  const updateData = {};
  updateData[`imagem${slot}`] = publicData.publicUrl;

  const { error: updateError } = await supabase
    .from("servicos_prestador_v2")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    console.error(updateError);
    alert("Erro ao salvar imagem no banco");
    return;
  }

  fileInput.value = "";

  alert("Imagem adicionada com sucesso 🚀");
  carregarServicosPrestador();
}

async function carregarServicosPrestador() {

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  const { data, error } = await supabase
    .from("servicos_prestador_v2")
    .select(`
      id,
      servico_id,
      preco,
      percentual_sinal,
      duracao,
      descricao,
      ativo,
      possui_local,
      imagem1,
      imagem2,
      imagem3,
      servicos_catalogo!fk_servico(produto)
    `)
    .eq("prestador_id", user.id);

  if (error) {
    console.error(error.message);
    return;
  }

  listaPrestador.innerHTML = "";

  data.forEach(item => {

    const card = document.createElement("div");
    card.classList.add("servico-card");

    card.innerHTML = `
      <h4>${item.servicos_catalogo?.produto}</h4>

<div class="preview-container" id="preview-${item.id}">
  ${["imagem1", "imagem2", "imagem3"]
    .map((key, index) => {
      const url = item[key];

      return `
      <div class="preview-item">
        ${url ? `
          <img src="${url}" class="servico-img">
          <button class="preview-remove"
            onclick="removerImagemServico('${item.id}', ${index + 1})">
            ×
          </button>
        ` : ""}
      </div>
      `;
    }).join("")}
</div>

<div class="upload-container">
  <input type="file"
         id="file-${item.id}"
         accept="image/*">

<button class="upload-img-btn"
        onclick="atualizarImagemServico('${item.id}')">
  <span class="icon">＋</span>
  Adicionar imagem
</button>
</div>

      <div class="campo">
        <label>Preço</label>
        <input type="number" value="${item.preco}" id="preco-${item.id}">
      </div>

      <div class="campo">
        <label>% Sinal</label>
        <input type="number" value="${item.percentual_sinal}" id="sinal-${item.id}">
      </div>

      <div class="campo">
        <label>Duração (min)</label>
        <input type="number" value="${item.duracao || ""}" id="duracao-${item.id}">
      </div>

      <div class="campo">
        <label>Descrição</label>
        <input type="text" value="${item.descricao || ""}" id="descricao-${item.id}">
      </div>

      <div class="toggles">
        <label>
          <input type="checkbox" ${item.ativo ? "checked" : ""} id="ativo-${item.id}">
          Ativo
        </label>

        <label>
          <input type="checkbox" ${item.possui_local ? "checked" : ""} id="local-${item.id}">
          Possui Local
        </label>
      </div>

      <div class="acoes">
        <button class="salvar-btn" data-id="${item.id}">Salvar</button>
        <button class="danger excluir-btn" data-id="${item.id}">Excluir</button>
      </div>
    `;

    card.querySelector(".salvar-btn").addEventListener("click", () => {
      salvarAtualizacao(item.id);
    });

    card.querySelector(".excluir-btn").addEventListener("click", () => {
      excluirServico(item.id);
    });

    listaPrestador.appendChild(card);
  });
}

async function excluirServico(id) {
  const { error } = await supabase
    .from("servicos_prestador_v2")
    .delete()
    .eq("id", id);

  if (error) return;

  carregarServicosPrestador();
}

async function salvarAtualizacao(id) {

  const preco = document.getElementById(`preco-${id}`).value;
  const sinal = document.getElementById(`sinal-${id}`).value;
  const duracao = document.getElementById(`duracao-${id}`).value;
  const descricao = document.getElementById(`descricao-${id}`).value;
  const ativo = document.getElementById(`ativo-${id}`).checked;
  const possui_local = document.getElementById(`local-${id}`).checked;

  const { error } = await supabase
    .from("servicos_prestador_v2")
    .update({
      preco: Number(preco),
      percentual_sinal: Number(sinal),
      duracao: duracao ? Number(duracao) : null,
      descricao,
      ativo,
      possui_local
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao atualizar");
    return;
  }

  alert("Atualizado com sucesso!");
}

window.atualizarImagemServico = atualizarImagemServico;
window.removerImagemServico = removerImagemServico;

carregarServicosPrestador();



// ================= CONFIG =================
// ================= CONFIG =================
const dias = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
const containerAgenda = document.getElementById("diasContainer");
const btnSalvar = document.getElementById("salvarHorarios");

// ================= USER =================
async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// ================= CRIAR UI =================
async function criarAgenda() {
  containerAgenda.innerHTML = "";

  const tipo = await mostrarTipoUsuario();

  const isCliente = tipo === "cliente";

  dias.forEach(dia => {
    const card = document.createElement("div");
    card.classList.add("dia-card");

    card.innerHTML = `
      <div class="dia-header">
        <h4>${dia}</h4>
        <label>
          <input type="checkbox" class="toggle-dia" data-dia="${dia}">
          ${isCliente ? "Tenho horário livre" : "Trabalho neste dia"}
        </label>
      </div>

      <div class="inputs-horario">

        <div class="grupo">
          <label>
            ${isCliente ? "🟢 Início da Disponibilidade" : "🟢 Horário de Entrada"}
          </label>
          <input type="time" data-inicio="${dia}">
        </div>

        <div class="grupo">
          <label>
            ${isCliente ? "🔴 Fim da Disponibilidade" : "🔴 Horário de Saída"}
          </label>
          <input type="time" data-fim="${dia}">
        </div>

        ${
          isCliente
          ? `
          <div class="info-cliente">
            💡 Ex: se você sai do trabalho às 16h, coloque 17:00 → 22:00
          </div>
          `
          : `
          <div class="grupo intervalo">
            <label>☕ Início do Intervalo</label>
            <input type="time" data-int-inicio="${dia}">
          </div>

          <div class="grupo intervalo">
            <label>☕ Fim do Intervalo</label>
            <input type="time" data-int-fim="${dia}">
          </div>
          `
        }

      </div>
    `;

    containerAgenda.appendChild(card);

    const toggle = card.querySelector(".toggle-dia");
    const inputs = card.querySelectorAll("input[type='time']");

    inputs.forEach(i => i.disabled = true);

    toggle.addEventListener("change", () => {
      card.classList.toggle("ativo", toggle.checked);
      inputs.forEach(i => i.disabled = !toggle.checked);
    });
  });
}

// ================= CARREGAR =================
async function carregarHorarios() {
  const user = await getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("horarios_cliente")
    .select("*")
    .eq("usuario_id", user.id);

  if (error) {
    console.error(error);
    return;
  }

  data.forEach(h => {
    const toggle = document.querySelector(`[data-dia="${h.dia_semana}"]`);
    if (!toggle) return;

    const card = toggle.closest(".dia-card");

    toggle.checked = true;
    card.classList.add("ativo");

    const inicio = card.querySelector(`[data-inicio="${h.dia_semana}"]`);
    const fim = card.querySelector(`[data-fim="${h.dia_semana}"]`);
    const intInicio = card.querySelector(`[data-int-inicio="${h.dia_semana}"]`);
    const intFim = card.querySelector(`[data-int-fim="${h.dia_semana}"]`);

    [inicio, fim, intInicio, intFim].forEach(i => {
      if (i) i.disabled = false;
    });

    inicio.value = h.horario_inicio || "";
    fim.value = h.horario_fim || "";

    if (intInicio) intInicio.value = h.intervalo_inicio || "";
    if (intFim) intFim.value = h.intervalo_fim || "";
  });
}

// ================= VALIDAÇÃO =================
function validar(inicio, fim, dia, tipo) {
  if (!inicio || !fim) {
    alert(`Preencha início e fim para ${dia}`);
    return false;
  }

  if (inicio >= fim) {
    alert(`Horário inválido em ${dia}`);
    return false;
  }

  return true;
}
// ================= SALVAR =================
btnSalvar?.addEventListener("click", async () => {
  const user = await getUser();
  if (!user) {
    alert("Usuário não logado");
    return;
  }

  const tipo_user = await mostrarTipoUsuario();
  if (!tipo_user) {
    alert("Erro ao obter tipo");
    return;
  }

  const payload = [];

  for (let dia of dias) {
    const toggle = document.querySelector(`[data-dia="${dia}"]`);
    if (!toggle?.checked) continue;

    const card = toggle.closest(".dia-card");

    const inicio = card.querySelector(`[data-inicio="${dia}"]`).value;
    const fim = card.querySelector(`[data-fim="${dia}"]`).value;

    if (!validar(inicio, fim, dia)) return;

    payload.push({
      usuario_id: user.id,
      tipo_usuario: tipo_user,
      dia_semana: dia,
      horario_inicio: inicio,
      horario_fim: fim,
      intervalo_inicio: tipo_user === "prestador"
        ? card.querySelector(`[data-int-inicio="${dia}"]`)?.value || null
        : null,
      intervalo_fim: tipo_user === "prestador"
        ? card.querySelector(`[data-int-fim="${dia}"]`)?.value || null
        : null
    });
  }

  if (!payload.length) {
    alert("Selecione pelo menos um dia");
    return;
  }

  try {
    await supabase
      .from("horarios_cliente")
      .delete()
      .eq("usuario_id", user.id);

    const { error } = await supabase
      .from("horarios_cliente")
      .insert(payload);

    if (error) throw error;

    alert("Horários salvos 🚀");
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar: " + err.message);
  }
});

// ================= INIT =================
criarAgenda();
carregarHorarios();


document.getElementById("telefone").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "");

  if (v.length > 11) v = v.slice(0, 11);

  if (v.length > 6) {
    v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  } else if (v.length > 2) {
    v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  }

  e.target.value = v;
});