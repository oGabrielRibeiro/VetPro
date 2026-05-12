import React from "react";
import AppIcon from "../components/AppIcon";

const About = () => (
  <div className="vp-page-tight subtle-enter">
    <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-6 sm:p-8">
      <p className="vp-overline">VetPro Platform</p>
      <h1 className="vp-h1 mt-2">Da conversa ao prontuario em minutos</h1>
      <p className="vp-subtitle mt-3">
        Audio inteligente, agenda integrada e relatorios em tempo real para
        acelerar atendimentos na clinica e no campo.
      </p>
      <p className="vp-helper mt-3 text-gray-500 dark:text-gray-400">
        Padrao SaaS pronto para operacao comercial: produtividade, rastreabilidade
        e experiencia unica em desktop e mobile.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: "Modo campo", icon: "consultations" },
        { label: "Agenda", icon: "appointments" },
        { label: "Relatorios", icon: "reports" },
      ].map((item) => (
        <div
          key={item.label}
          className="shell-surface rounded-2xl border border-gray-200/80 dark:border-dark-700/70 p-4 text-center"
        >
          <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            <AppIcon name={item.icon} />
          </span>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default About;
