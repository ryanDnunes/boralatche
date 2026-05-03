import { supabase } from "./supabase.js";

async function cadastrar() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    alert("Preencha o email e a senha.");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha
  });

  if (error) {
    alert("Erro ao cadastrar: " + error.message);
    return;
  }

  alert("Conta criada! Verifique seu email para confirmar.");
  window.location.href = "index.html";
}

window.cadastrar = cadastrar;