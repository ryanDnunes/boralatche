import { supabase } from "./supabase.js";

let matches = [];
let index = 0;

const stack = document.getElementById("cardStack");
const likeBtn = document.getElementById("btnLike");
const skipBtn = document.getElementById("btnSkip");
// Mostrar tipo de usuário logado
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
 console.log(`mostrarTipoUsuario ${user.id}`);

  return data.tipo_usuario; // ← aqui retorna o valor
}



// AVATAR DO PRESTADOR
function getAvatarUrl(prestador_id){

    const filePath = `${prestador_id}/foto_perfil.png`;

    const { data } = supabase
        .storage
        .from("avatars")
        .getPublicUrl(filePath);

    return `${data.publicUrl}?t=${Date.now()}`;
}



// IMAGEM DO SERVIÇO (usa banco primeiro)
async function getImagensServico(id_prestador) {
  const { data, error } = await supabase
    .from("servicos_prestador_v2")
    .select("imagem1, imagem2, imagem3")
    .eq("prestador_id", id_prestador)
    .limit(1)
    .single();

  if (error || !data) {
    return ["img/sem_imagem.jpg"];
  }

  // Cria um array só com as imagens que não são null
  const imagens = [data.imagem1, data.imagem2, data.imagem3].filter(img => img !== null);
console.log(`getimagemservido  ${id_prestador}`);
  return imagens.length > 0 ? imagens : ["img/sem_imagem.jpg"];
  
}



// CARREGAR MATCHES
async function loadMatches(){

    const { data:{user} } = await supabase.auth.getUser();
    if(!user) return;

    // pegar prestadores já avaliados
    const { data: avaliados } = await supabase
        .from("cliente_match")
        .select("prestador_id, servico_id")
        .eq("cliente_id", user.id);

    const avaliadosSet = new Set(
        (avaliados || []).map(a => `${a.prestador_id}_${a.servico_id}`)
    );
    console.log(`load match  ${user.id}`);
    const { data, error } = await supabase
        .from("match_view")
        .select("*")
        .eq("cliente_id", user.id)
        .neq("prestador_id", user.id)
        .order("score_match",{ascending:false});

    if(error){
        console.error(error);
        return;
    }
    
    // remover quem já teve like ou dislike
    matches = (data || []).filter(m => 
        !avaliadosSet.has(`${m.prestador_id}_${m.servico_id}`)
    );
    
    index = 0;

    renderCards();
}


// RENDER CARDS
async function renderCards(){
    const tipo_user = await mostrarTipoUsuario(); // ← importante usar await
    console.log(`render cards tipo isar  ${tipo_user}`);
    stack.innerHTML="";
    
    if(index >= matches.length){
        console.log(`quantidade de matchs ${matches.length}`);
        stack.innerHTML = `
        <div style="text-align:center;padding:40px;font-size:18px;color:#666">
            Nenhum serviço disponível
        </div>`;
        return;
    }

    if(tipo_user === 'cliente'){  // ← comparação correta
        const cards = matches.slice(index,index+3).reverse();
        
        for(const m of cards){
            const card = document.createElement("div");
            card.className="match-card";
            
            const avatarUrl = getAvatarUrl(m.prestador_id);
            const imagens = await getImagensServico(m.prestador_id);
            const score = m.score_match ? (m.score_match*100).toFixed(0) : 0;

            const dots = imagens.map((_,i)=>`<div class="img-dot ${i==0?'active':''}"></div>`).join("");
            const imagensHtml = `
                <div class="img-dots">${dots}</div>
                <img class="match-img" src="${imagens[0]}" />
            `;

            card.innerHTML = `
                <div class="match-images">${imagensHtml}</div>
                <div class="match-info">
                    <div class="prestador">
                        <img src="${avatarUrl}" onerror="this.src='img/avatar.png'" />
                        <span>${m.nome_prestador || "Prestador"}</span>
                    </div>
                    <div class="match-titulo">${m.descricao || ""}</div>
                    <div class="match-desc">Serviço disponível</div>
                    <div class="match-meta">
                        <div>💰 R$ ${m.preco || 0}</div>
                        <div>⏱ ${m.duracao || "-"} min</div>
                        <div>💳 Sinal ${m.percentual_sinal || 0}%</div>
                        <div>⭐ ${score}%</div>
                    </div>
                </div>
            `;
            stack.appendChild(card);

            ativarGaleria(card, imagens);
            addSwipe(card,m);
        }
    } 
    else {
        // Caso seja prestador
        stack.innerHTML = `
            <div style="text-align:center;padding:40px;font-size:18px;color:#666">
                Somente clientes podem fazer matches
            </div>
        `;
    }
}


// SWIPE
function addSwipe(card,match){

    let startX=0;

    card.addEventListener("touchstart",e=>{
        startX=e.touches[0].clientX;
    });

    card.addEventListener("touchmove",e=>{
        let move = e.touches[0].clientX - startX;
        card.style.transform=`translateX(${move}px) rotate(${move/10}deg)`;
    });

    card.addEventListener("touchend",e=>{

        let move = e.changedTouches[0].clientX - startX;

        if(move > 120){
            like(match);
            next();
        }
        else if(move < -120){
            skip(match);
            next();
        }
        else{
            card.style.transform="";
        }

    });

}



// PROXIMO CARD
function next(){
    index++;
    renderCards();
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

// LIKE
async function like(match){

  const now = new Date().toISOString();

  const match_key = `${match.cliente_id}-${match.prestador_id}-${match.servico_id}-${now}`;

  const match_instance_id = crypto.randomUUID
    ? crypto.randomUUID()
    : gerarUUID();

  const { error } = await supabase
    .from("cliente_match")
    .insert({
      id: crypto.randomUUID ? crypto.randomUUID() : gerarUUID(),
      cliente_id: match.cliente_id,
      prestador_id: match.prestador_id,
      servico_id: match.servico_id,
      match_key,
      match_instance_id,
      liked: true
    });

  if(error){
    console.error("Erro ao salvar like:", error);
  }
}


// SKIP
// SKIP (DISLIKE)
async function skip(match){

    const { error } = await supabase
        .from("cliente_match")
        .insert({
            cliente_id: match.cliente_id,
            prestador_id: match.prestador_id,
            servico_id: match.servico_id,
            liked: false
        });

    if(error){
        console.error("Erro ao salvar dislike:", error);
    }

}

// BOTÕES
likeBtn.onclick=()=>{
    if(index >= matches.length) return;
    like(matches[index]);
    next();
};

skipBtn.onclick=()=>{
    if(index >= matches.length) return;
    skip(matches[index]);
    next();
};



// START



function ativarGaleria(card, imagens){

let imgIndex = 0;

const img = card.querySelector(".match-img");
const dots = card.querySelectorAll(".img-dot");
const container = card.querySelector(".match-images");

if(!img || imagens.length <= 1) return;

container.addEventListener("click",(e)=>{

const width = container.clientWidth;

if(e.offsetX > width/2){
imgIndex++;
}else{
imgIndex--;
}

if(imgIndex < 0) imgIndex = imagens.length-1;
if(imgIndex >= imagens.length) imgIndex = 0;

img.src = imagens[imgIndex];

dots.forEach(d=>d.classList.remove("active"));
dots[imgIndex].classList.add("active");

});

}




loadMatches();