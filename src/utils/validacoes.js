// Validações - regras de negócio do PharmaSync
// Centraliza as validações pra reusar em várias rotas

// Valida CPF pelo algoritmo oficial da Receita (RN-001)
function cpfValido(cpf) {
  if (!cpf) return false;
  cpf = cpf.replace(/\D/g, ''); // remove tudo que não for dígito

  // precisa ter 11 dígitos e não pode ser tudo igual (111.111.111-11)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  // valida os dois dígitos verificadores
  for (let i = 9; i < 11; i++) {
    let soma = 0;
    for (let j = 0; j < i; j++) {
      soma += parseInt(cpf[j]) * ((i + 1) - j);
    }
    let digito = ((soma * 10) % 11) % 10;
    if (digito !== parseInt(cpf[i])) return false;
  }
  return true;
}

// Valida formato de e-mail
function emailValido(email) {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Valida senha forte (RN-002)
// Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo
function senhaForte(senha) {
  if (!senha || senha.length < 8) return false;
  const temMaiuscula = /[A-Z]/.test(senha);
  const temMinuscula = /[a-z]/.test(senha);
  const temNumero = /[0-9]/.test(senha);
  const temSimbolo = /[^A-Za-z0-9]/.test(senha);
  return temMaiuscula && temMinuscula && temNumero && temSimbolo;
}

// Valida maioridade: 18 anos ou mais
function maiorDeIdade(dataNascimento) {
  if (!dataNascimento) return false;
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade >= 18;
}

module.exports = { cpfValido, emailValido, senhaForte, maiorDeIdade };