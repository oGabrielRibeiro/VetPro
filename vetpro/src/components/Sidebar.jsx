import React from "react";
import AppIcon from "./AppIcon";

const Sidebar = ({ currentUser, currentView, setCurrentView, onLogout }) => {
  const navItems = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "patients", icon: "patients", label: "Pacientes" },
    { id: "appointments", icon: "appointments", label: "Agenda" },
    { id: "consultations", icon: "consultations", label: "Prontuarios" },
    { id: "reports", icon: "reports", label: "Relatorios" },
  ];

  const clinicLogo =
    currentUser?.clinic?.logoUrl || currentUser?.clinicLogoPreview;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-screen sticky top-0">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {clinicLogo ? (
            <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 overflow-hidden grid place-items-center">
              <img
                src={clinicLogo}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
              <AppIcon name="patients" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg sm:text-xl text-gray-800">VetPro</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {currentUser?.clinicName || currentUser?.clinic || "Clinica Veterinaria"}
            </p>
          </div>
        </div>
      </div>

      <nav className="p-3 sm:p-4 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all ${
                currentView === item.id
                  ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <AppIcon name={item.icon} />
              <span className="text-sm sm:text-base">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="p-3 sm:p-4 border-t border-gray-100">
        <div
          className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setCurrentView("profile")}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs sm:text-sm overflow-hidden flex-shrink-0">
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
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="font-medium text-xs sm:text-sm truncate">{currentUser?.name || "Usuario"}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">
              {currentUser?.crmvState && currentUser?.crmvNumber
                ? `CRMV-${currentUser.crmvState} ${currentUser.crmvNumber}`
                : "Veterinario"}
            </p>
          </div>
        </div>

        <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-center">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-green-600 text-lg">OK</span>
            <p className="text-[10px] sm:text-xs font-medium text-emerald-800">
              Sessao segura ativa
            </p>
          </div>
        </div>

        <button
          onClick={() => onLogout()}
          className="w-full mt-3 bg-red-50 text-red-700 font-medium py-2 px-3 rounded-lg hover:bg-red-100 transition-colors text-xs sm:text-sm flex items-center justify-center"
        >
          <span className="mr-2">
            <AppIcon name="logout" />
          </span>
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
