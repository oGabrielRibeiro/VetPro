export default function About() {
  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Sobre o VetPro</h1>

      <p>
        O <strong>VetPro</strong> é uma plataforma desenvolvida para otimizar a
        rotina de médicos veterinários, especialmente aqueles que atuam em campo.
        Nosso objetivo é simplificar o registro de atendimentos, melhorar a
        organização dos dados clínicos e aumentar a produtividade no dia a dia.
      </p>

      <h2>🚀 O que o VetPro oferece</h2>
      <ul>
        <li>📋 Prontuário veterinário digital intuitivo</li>
        <li>🎤 Preenchimento por voz (ideal para uso em campo)</li>
        <li>📄 Geração automática de receitas em PDF</li>
        <li>📱 Interface otimizada para dispositivos móveis</li>
        <li>🔄 Sincronização de dados (modo offline em desenvolvimento)</li>
      </ul>

      <h2>🎯 Nossa missão</h2>
      <p>
        Levar tecnologia acessível e eficiente para veterinários, reduzindo o
        tempo gasto com burocracia e permitindo mais foco no cuidado com os
        animais.
      </p>

      <h2>🌱 Visão</h2>
      <p>
        Ser referência em soluções digitais para veterinária de campo no Brasil e
        futuramente expandir para outros mercados.
      </p>

      <h2>💡 Diferencial</h2>
      <p>
        O VetPro é pensado na prática real do veterinário, com foco em rapidez,
        simplicidade e funcionamento mesmo em ambientes com pouca ou nenhuma
        conexão com a internet.
      </p>

      <hr style={{ margin: "2rem 0" }} />

      <p style={{ fontSize: "0.9rem", color: "#666" }}>
        © {new Date().getFullYear()} VetPro. Todos os direitos reservados.
      </p>
    </div>
  );
}