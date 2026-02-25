import React from "react";

const Skeleton = ({ 
  className = "", 
  variant = "text",
  width,
  height,
  animate = true 
}) => {
  const baseClasses = `
    bg-gray-200 dark:bg-dark-700 rounded
    ${animate ? "animate-pulse" : ""}
    ${className}
  `;

  const variants = {
    text: "h-4 w-full",
    title: "h-6 w-3/4",
    avatar: "h-12 w-12 rounded-full",
    thumbnail: "h-32 w-full rounded-lg",
    card: "h-40 w-full rounded-xl",
    button: "h-10 w-24 rounded-lg",
    input: "h-10 w-full rounded-lg",
  };

  const style = {
    width: width || (variants[variant] ? undefined : "100%"),
    height: height || (variants[variant] ? undefined : "auto"),
  };

  return (
    <div 
      className={baseClasses} 
      style={variant === "custom" ? style : undefined}
    >
      {variant !== "custom" && (
        <div className={variants[variant]} style={style} />
      )}
    </div>
  );
};

// Skeleton para lista de pacientes
export const PatientListSkeleton = ({ count = 5 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start space-x-3">
            <Skeleton variant="avatar" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="title" />
              <Skeleton variant="text" width="60%" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2">
            <Skeleton variant="button" />
            <Skeleton variant="button" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton para lista de consultas
export const ConsultationListSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3">
              <Skeleton variant="avatar" />
              <div>
                <Skeleton variant="title" width="120px" />
                <Skeleton variant="text" width="80px" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton variant="text" width="60px" />
              <Skeleton variant="text" width="100px" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton variant="text" />
            <Skeleton variant="text" width="80%" />
          </div>
          <div className="mt-4 pt-4 border-t flex gap-2">
            <Skeleton variant="button" width="100px" />
            <Skeleton variant="button" width="100px" />
            <Skeleton variant="button" width="100px" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton para cards de estatísticas
export const StatsCardSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
          <Skeleton variant="text" width="40px" />
          <Skeleton variant="title" className="mt-2" />
          <Skeleton variant="text" width="60px" />
        </div>
      ))}
    </div>
  );
};

// Skeleton genérico para tabela
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} variant="text" height="20px" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {[...Array(cols)].map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
