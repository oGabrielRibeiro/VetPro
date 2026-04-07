import React from 'react';
import PropTypes from 'prop-types';
import AppIcon from './AppIcon';

const Table = ({
  columns = [],
  data = [],
  caption = "",
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado',
  emptyIcon = 'search',
  loading = false,
  striped = true,
  hoverable = true,
  responsive = true,
  className = '',
}) => {
  const renderCell = (row, column) => {
    if (column.render) {
      return column.render(row[column.key], row);
    }
    return row[column.key] || '-';
  };

  if (loading) {
    return (
      <div className="vp-card vp-card--flat overflow-hidden">
        <div className="animate-pulse p-4">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="vp-card vp-card--dashed p-8 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
          <AppIcon name={emptyIcon} />
        </div>
        <h3 className="text-lg font-bold text-gray-600 mb-2">
          {emptyMessage}
        </h3>
      </div>
    );
  }

  const TableContent = () => (
    <table className="w-full">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          {columns.map((column, index) => (
            <th
              key={column.key || index}
              scope="col"
              className={`
                px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
                ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}
                ${column.className || ''}
              `}
              style={{ width: column.width }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.map((row, rowIndex) => (
          <tr
            key={row.id || rowIndex}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            className={`
              ${striped && rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
              ${hoverable ? 'hover:bg-emerald-50 transition-colors' : ''}
              ${onRowClick ? 'cursor-pointer' : ''}
            `}
            onClick={() => onRowClick && onRowClick(row)}
            onKeyDown={(event) => {
              if (!onRowClick) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onRowClick(row);
              }
            }}
          >
            {columns.map((column, colIndex) => (
              <td
                key={column.key || colIndex}
                className={`
                  px-4 py-3 text-sm text-gray-700
                  ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}
                  ${column.className || ''}
                `}
              >
                {renderCell(row, column)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (responsive) {
    return (
      <div className={`vp-card vp-card--flat overflow-x-auto ${className}`}>
        <TableContent />
      </div>
    );
  }

  return (
    <div className={`vp-card vp-card--flat overflow-hidden ${className}`}>
      <TableContent />
    </div>
  );
};

// Componente para Actions (botões de ação em linhas)
export const TableActions = ({ children }) => (
  <div className="flex items-center gap-1">
    {children}
  </div>
);

// Componente para Badge/Tag em células
export const TableBadge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

Table.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    render: PropTypes.func
  })),
  data: PropTypes.array,
  caption: PropTypes.string,
  onRowClick: PropTypes.func,
  emptyMessage: PropTypes.string,
  emptyIcon: PropTypes.string,
  loading: PropTypes.bool,
  striped: PropTypes.bool,
  hoverable: PropTypes.bool,
  responsive: PropTypes.bool,
  className: PropTypes.string
};

Table.defaultProps = {
  columns: [],
  data: [],
  caption: '',
  onRowClick: undefined,
  emptyMessage: 'Nenhum registro encontrado',
  emptyIcon: 'search',
  loading: false,
  striped: true,
  hoverable: true,
  responsive: true,
  className: ''
};

// PropTypes for nested StatusBadge component
const StatusBadge = ({ variant = "primary", children }) => {
  const variants = {
    primary: "bg-blue-50 text-blue-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-yellow-50 text-yellow-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default Table;
