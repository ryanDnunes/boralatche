import { supabase } from "./supabase.js";

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("senha").value;
  const mensagemErro = document.getElementById("mensagem-erro");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    mensagemErro.textContent = "Favor criar conta";
  } else {
    mensagemErro.textContent = ""; // limpa mensagem de erro
    window.location.href = "perfil-publico.html";
  }
}

window.login = login;