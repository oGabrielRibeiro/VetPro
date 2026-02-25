import React from "react";

const Table = ({
  columns = [],
  data = [],
  emptyMessage = "Nenhum registro encontrado",
  loading = false,
  onRowClick,
  rowClassName = "",
  className = "",
}) => {
  const LoadingRow = () => (
    <tr>
      {columns.map((col, index) => (
        <td key={index} className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </td>
      ))}
    </tr>
  );

  const EmptyRow = () => (
    <tr>
      <td
        colSpan={columns.length}
        className="px-6 py-12 text-center text-gray-500"
      >
        <div className="flex flex-col items-center">
          <svg
            className="w-12 h-12 text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </td>
    </tr>
  );

  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`
                  px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
                  ${column.headerClassName || ""}
                `}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            [...Array(5)].map((_, i) => <LoadingRow key={i} />)
          ) : data.length === 0 ? (
            <EmptyRow />
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                className={`
                  hover:bg-gray-50 transition-colors
                  ${onRowClick ? "cursor-pointer" : ""}
                  ${rowClassName(row, rowIndex)}
                `}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={`
                      px-6 py-4 whitespace-nowrap text-sm text-gray-700
                      ${column.cellClassName || ""}
                    `}
                  >
                    {column.render
                      ? column.render(row[rowIndex === 0 ? "id" : column.accessor], row)
                      : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
