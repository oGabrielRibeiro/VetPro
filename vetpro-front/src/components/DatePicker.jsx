import React, { forwardRef, useState } from "react";

const DatePicker = forwardRef(({
  label,
  error,
  helperText,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className = "",
  inputClassName = "",
  labelClassName = "",
  containerClassName = "",
  required = false,
  allowFutureDates = true,
  allowPastDates = true,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  // Data de hoje formatada
  const today = new Date().toISOString().split("T")[0];

  // Função para validar data
  const validateDate = (dateValue) => {
    const selectedDate = new Date(dateValue);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (!allowFutureDates && selectedDate > currentDate) {
      return false;
    }
    if (!allowPastDates && selectedDate < currentDate) {
      return false;
    }
    return true;
  };

  const baseInputClasses = `
    w-full px-3 py-2 sm:px-4 sm:py-3 
    border rounded-lg text-sm
    transition-all duration-200
    focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `;

  const errorInputClasses = error
    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
    : "border-gray-300 dark:border-dark-600";

  const darkClasses = "dark:bg-dark-800 dark:text-white";

  // Gera anos para o select (5 anos atrás até o ano atual ou próximo)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  // Gera meses
  const months = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  // Gera dias do mês
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const [selectedYear, selectedMonth] = value 
    ? value.split("-") 
    : ["", ""];

  const daysInMonth = selectedYear && selectedMonth 
    ? getDaysInMonth(parseInt(selectedYear), parseInt(selectedMonth)) 
    : 31;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleDateChange = (field, fieldValue) => {
    if (!value) {
      // Data vazia - começar do zero
      if (field === "year") {
        onChange(`${fieldValue}-01-01`);
      } else if (field === "month") {
        onChange(`${selectedYear || currentYear}-${fieldValue}-01`);
      } else if (field === "day") {
        onChange(`${selectedYear || currentYear}-${selectedMonth || "01"}-${String(fieldValue).padStart(2, "0")}`);
      }
    } else {
      const [year, month, day] = value.split("-");
      let newDate = value;

      if (field === "year") {
        newDate = `${fieldValue}-${month}-${day}`;
      } else if (field === "month") {
        newDate = `${year}-${fieldValue}-${day}`;
      } else if (field === "day") {
        newDate = `${year}-${month}-${String(fieldValue).padStart(2, "0")}`;
      }

      if (validateDate(newDate)) {
        onChange(newDate);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${containerClassName}`}>
      {label && (
        <label className={`block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          type="text"
          value={value ? new Date(value).toLocaleDateString("pt-BR") : ""}
          onChange={() => {}}
          onFocus={() => !disabled && setIsOpen(!isOpen)}
          placeholder="Selecione uma data"
          disabled={disabled}
          readOnly
          className={`
            ${baseInputClasses}
            ${errorInputClasses}
            ${darkClasses}
            cursor-pointer
            ${inputClassName}
          `}
          {...props}
        />
        
        {/* Ícone de calendário */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Dropdown do calendário */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full sm:w-72 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg p-3">
            <div className="grid grid-cols-3 gap-2">
              {/* Dia */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dia</label>
                <select
                  value={value ? value.split("-")[2] : ""}
                  onChange={(e) => handleDateChange("day", e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-700"
                >
                  <option value="">Dia</option>
                  {days.map((day) => (
                    <option key={day} value={String(day).padStart(2, "0")}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mês */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mês</label>
                <select
                  value={value ? value.split("-")[1] : ""}
                  onChange={(e) => handleDateChange("month", e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-700"
                >
                  <option value="">Mês</option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label.substring(0, 3)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ano */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ano</label>
                <select
                  value={value ? value.split("-")[0] : ""}
                  onChange={(e) => handleDateChange("year", e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-700"
                >
                  <option value="">Ano</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botões de atalho */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-700 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange(today);
                  setIsOpen(false);
                }}
                className="flex-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="flex-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>

      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

DatePicker.displayName = "DatePicker";

export default DatePicker;
