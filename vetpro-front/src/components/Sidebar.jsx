import React from "react";
import AppIcon from "./AppIcon";

const Sidebar = ({
  currentUser,
  currentView,
  setCurrentView,
  onLogout,
  showUiLab = false,
}) => {
  const navItems = [
    { id: "dashboard", icon: "dashboard", label: "Inicio" },
    { id: "patients", icon: "patients", label: "Pacientes" },
    { id: "appointments", icon: "appointments", label: "Agenda" },
    { id: "consultations", icon: "consultations", label: "Prontuarios" },
    { id: "reports", icon: "reports", label: "Relatorios" },
    { id: "system-status", icon: "info", label: "Status do Sistema" },
    { id: "about", icon: "info", label: "Sobre" },
    ...(showUiLab ? [{ id: "ui-playground", icon: "reports", label: "Laboratorio UI" }] : []),
  ];

  const clinicLogo =
    currentUser?.clinic?.logoUrl || currentUser?.clinicLogoPreview;

  return (
    <aside className="w-72 shell-surface border-r border-gray-200/80 dark:border-dark-700/70 flex flex-col flex-shrink-0 h-screen sticky top-0">
      <div className="p-5 sm:p-6 border-b border-gray-200/70 dark:border-dark-700/70">
        <div className="flex items-center space-x-3">
          {clinicLogo ? (
            <div className="h-11 w-11 rounded-2xl bg-white border border-gray-200/80 dark:border-dark-600 overflow-hidden grid place-items-center shadow-sm">
              <img
                src={clinicLogo}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-white grid place-items-center shadow-sm">
              <AppIcon name="patients" />
            </div>
          )}
          <div>
            <h1 className="shell-title font-extrabold text-xl text-gray-900 dark:text-white">
              VetPro
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentUser?.clinicName || currentUser?.clinic || "Clinica Veterinaria"}
            </p>
          </div>
        </div>
      </div>

      <nav aria-label="Menu principal" className="p-4 sm:p-5 flex-1 overflow-y-auto">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
          Central
        </p>
        <div className="space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              aria-current={currentView === item.id ? "page" : undefined}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl border transition-all ${
                currentView === item.id
                  ? "border-teal-200 bg-gradient-to-r from-teal-50 to-blue-50 text-teal-800 dark:border-teal-700/60 dark:from-teal-900/40 dark:to-blue-900/25 dark:text-teal-200 shadow-sm"
                  : "border-transparent text-gray-700 hover:border-gray-200 hover:bg-white/80 dark:text-gray-300 dark:hover:border-dark-600 dark:hover:bg-dark-800/65"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                  currentView === item.id
                    ? "bg-white text-teal-700 dark:bg-dark-800 dark:text-teal-300"
                    : "bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-300"
                }`}
              >
                <AppIcon name={item.icon} />
              </span>
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 sm:p-5 border-t border-gray-200/70 dark:border-dark-700/70">
        <div
          className="flex items-center space-x-3 p-3 rounded-xl border border-gray-200 bg-white/80 dark:border-dark-600 dark:bg-dark-800/70 cursor-pointer hover:border-teal-200 dark:hover:border-teal-800 transition-colors"
          onClick={() => setCurrentView("profile")}
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-sm overflow-hidden flex-shrink-0">
            {currentUser?.profilePhotoPreview ? (
              <img
                src={currentUser.profilePhotoPreview}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{currentUser?.name?.charAt(0) || "U"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate text-gray-800 dark:text-gray-100">
              {currentUser?.name || "Usuario"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {currentUser?.crmvState && currentUser?.crmvNumber
                ? `CRMV-${currentUser.crmvState} ${currentUser.crmvNumber}`
                : "Veterinario"}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50 to-blue-50 px-3 py-2.5 dark:border-teal-800/70 dark:from-teal-900/30 dark:to-blue-900/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">
            Sessao segura
          </p>
          <p className="mt-0.5 text-xs text-teal-900 dark:text-teal-200">
            Ambiente autenticado e sincronizando dados em tempo real.
          </p>
        </div>

        <button
          onClick={() => onLogout()}
          className="btn btn-danger-soft btn-md btn-block mt-3 text-sm"
        >
          <span className="mr-2">
            <AppIcon name="logout" />
          </span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
