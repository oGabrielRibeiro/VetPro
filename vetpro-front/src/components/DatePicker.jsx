import React, { forwardRef, useId, useState } from "react";

const DatePicker = forwardRef(({
  id,
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
  const generatedId = useId();
  const inputId = id || props.name || `date-picker-${generatedId}`;
  const dropdownId = `${inputId}-dialog`;

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
    vp-input-field text-sm sm:px-4 sm:py-3 pr-10
    transition-all duration-200
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `;

  const errorInputClasses = error
    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
    : "border-gray-300 dark:border-dark-600";

  // Gera 100 anos (ano atual até 99 anos atrás)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

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

  // Garantir que o split retorne sempre 3 elementos
  const dateParts = value ? value.split("-") : ["", "", ""];
  const selectedYear = dateParts[0] || "";
  const selectedMonth = dateParts[1] || "";

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
  };

  return (
    <div className={`relative ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className={`block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type="text"
          value={value ? new Date(value).toLocaleDateString("pt-BR") : ""}
          onChange={() => {}}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
            }
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder="Selecione uma data"
          disabled={disabled}
          readOnly
          aria-haspopup="dialog"
          aria-expanded={isOpen ? "true" : "false"}
          aria-controls={dropdownId}
          aria-invalid={error ? "true" : "false"}
          className={`
            ${baseInputClasses}
            ${errorInputClasses}
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
          <div
            id={dropdownId}
            role="dialog"
            aria-modal="false"
            className="absolute z-50 left-0 right-0 mt-1 w-full sm:w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg p-2 sm:p-3"
          >
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {/* Dia */}
              <div>
                <label className="block text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">Dia</label>
                <select
                  value={value ? value.split("-")[2] : ""}
                  onChange={(e) => handleDateChange("day", e.target.value)}
                  className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-700 dark:text-white"
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
                <label className="block text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">Mês</label>
                <select
                  value={value ? value.split("-")[1] : ""}
                  onChange={(e) => handleDateChange("month", e.target.value)}
                  className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-700 dark:text-white"
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
                <label className="block text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">Ano</label>
                <select
                  value={value ? value.split("-")[0] : ""}
                  onChange={(e) => handleDateChange("year", e.target.value)}
                  className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-700 dark:text-white"
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
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-dark-700 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange(today);
                }}
                className="flex-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                }}
                className="flex-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
              >
                Confirmar
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
