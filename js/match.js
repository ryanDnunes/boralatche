import { supabase } from "./supabase.js";

let clienteSelecionados = [];
let catalogo = [];

function togglePainelBusca(show){

document.getElementById("painelBusca").style.display =
show ? "flex" : "none";

document.getElementById("matchAcoes").style.display =
show ? "none" : "flex";

}

/* =============================
CARREGAR CATALOGO
============================= */

async function carregarCatalogo() {
  // 1. Buscar todos os servico_id que existem em servicos_prestador_v2
  const { data: servicosPrestador, error: errPrestador } = await supabase
    .from("servicos_prestador_v2")
    .select("servico_id");

  if (errPrestador) {
    console.error("Erro ao buscar servicos_prestador_v2:", errPrestador);
    return;
  }

  const idsValidos = servicosPrestador.map(s => s.servico_id);

  if (!idsValidos.length) {
    console.warn("Nenhum serviço encontrado em servicos_prestador_v2");
    return;
  }

  // 2. Buscar apenas serviços do catálogo que existem nesses ids
  const { data, error } = await supabase
    .from("servicos_catalogo")
    .select("*")
    .in("id", idsValidos);

  if (error) {
    console.error("Erro ao buscar servicos_catalogo:", error);
    return;
  }

  catalogo = data || [];

  console.log("Catálogo filtrado:", catalogo);

  // 3. Montar categorias
  const selectCategoria = document.getElementById("clienteCategoria");
  selectCategoria.innerHTML = "<option value=''>Selecione</option>";

  const categorias = [...new Set(catalogo.map(i => i.categoria))];

  categorias.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    selectCategoria.appendChild(opt);
  });

  // 4. Verificar se já existe procura
  const { data: { user } } = await supabase.auth.getUser();
  const { data: procura } = await supabase
    .from("cliente_procura")
    .select("*")
    .eq("user_id", user.id)
    .limit(1);

  if (procura && procura.length) {
    togglePainelBusca(false);
  }
}
/* =============================
FILTRO CATEGORIA
============================= */

document.getElementById("clienteCategoria")
.addEventListener("change", e=>{

const categoria = e.target.value;

const tipos = [...new Set(
catalogo
.filter(i=>i.categoria===categoria)
.map(i=>i.tipo_servico)
)];

const select = document.getElementById("clienteTipo");

select.innerHTML="<option value=''>Selecione</option>";

tipos.forEach(tipo=>{

const opt=document.createElement("option");
opt.value=tipo;
opt.textContent=tipo;

select.appendChild(opt);

});

});

/* =============================
FILTRO TIPO
============================= */

document.getElementById("clienteTipo")
.addEventListener("change", e=>{

const tipo=e.target.value;
const categoria=document.getElementById("clienteCategoria").value;

const produtos=catalogo.filter(i=>
i.categoria===categoria &&
i.tipo_servico===tipo
);

const container=document.getElementById("clienteProdutos");

container.innerHTML="";

produtos.forEach(item=>{

const div=document.createElement("div");
div.classList.add("produto-card");

const check=document.createElement("input");
check.type="checkbox";
check.value=item.id;

check.addEventListener("change",()=>{

if(check.checked){
clienteSelecionados.push(item);
}else{
clienteSelecionados=
clienteSelecionados.filter(i=>i.id!==item.id);
}

renderSelecionados();

});

const span=document.createElement("span");
span.textContent=item.produto;

div.appendChild(check);
div.appendChild(span);

container.appendChild(div);

});

});

/* =============================
CHIPS
============================= */

function renderSelecionados(){

const container=document.getElementById("clienteSelecionados");

container.innerHTML="";

clienteSelecionados.forEach(item=>{

const chip=document.createElement("div");
chip.classList.add("chip");

chip.textContent=item.produto;

container.appendChild(chip);

});

}

/* =============================
SALVAR BUSCA
============================= */

document.getElementById("salvarBuscaCliente")
.addEventListener("click", salvar);

async function salvar(){

const { data:{user} } = await supabase.auth.getUser();

if(!user) return;

if(!clienteSelecionados.length){
alert("Selecione serviços");
return;
}

const registros=clienteSelecionados.map(item=>({
user_id:user.id,
servico_id:item.id
}));

const { error } = await supabase
.from("cliente_procura")
.insert(registros);

if(error){
alert("Erro ao salvar");
return;
}

togglePainelBusca(false);

alert("Busca salva!");

}

/* =============================
DELETAR PROCURA
============================= */

document.getElementById("deletarBusca")
.addEventListener("click", async()=>{

const { data:{user} } = await supabase.auth.getUser();

const { error } = await supabase
  .from("cliente_procura")
  .delete()
  .eq("user_id", user.id);

if (error) {
  console.error("Erro ao deletar:", error);
  alert("Não foi possível remover sua procura.");
  return;
}

clienteSelecionados=[];

togglePainelBusca(true);

alert("Procura removida");

});

/* =============================
IR MATCH
============================= */

document.getElementById("irMatch")
.addEventListener("click",()=>{

window.location.href="/matches.html";

});

/* =============================
INICIAR
============================= */

carregarCatalogo();
const { data:{user} } = await supabase.auth.getUser();

const { data } = await supabase
.from("cliente_procura")
.select("*")
.eq("user_id", user.id)
.limit(1);

if(data.length){
togglePainelBusca(false);
}else{
togglePainelBusca(true);
}

async function verificarEstadoBusca() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: procura } = await supabase
    .from("cliente_procura")
    .select(`
      id,
      servico_id,
      servicos_catalogo (
        id,
        produto,
        categoria,
        tipo_servico
      )
    `)
    .eq("user_id", user.id);

  if (procura && procura.length > 0) {
    // já existe procura → esconder painel de busca e mostrar ações
    document.getElementById("painelBusca").style.display = "none";
    document.getElementById("matchAcoes").style.display = "flex";

    // renderizar interesses
    const container = document.getElementById("listaInteresses");
    container.innerHTML = "";

    procura.forEach(item => {
      const chip = document.createElement("div");
      chip.classList.add("chip");
      chip.textContent = `${item.servicos_catalogo.produto} (${item.servicos_catalogo.categoria})`;
      container.appendChild(chip);
    });

  } else {
    // não existe procura → mostrar painel de busca
    document.getElementById("painelBusca").style.display = "flex";
    document.getElementById("matchAcoes").style.display = "none";
  }
}

verificarEstadoBusca();