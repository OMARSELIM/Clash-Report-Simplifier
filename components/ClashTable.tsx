import React, { useState, useMemo } from 'react';
import { ClashItem } from '../types';
import { Download, Filter, Search, Copy, Check, FileJson, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ClashTableProps {
  data: ClashItem[];
}

type SortKey = keyof ClashItem | 'point';
type SortDirection = 'asc' | 'desc';

const ClashTable: React.FC<ClashTableProps> = ({ data }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [discipline1Filter, setDiscipline1Filter] = useState('All');
  const [discipline2Filter, setDiscipline2Filter] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  // Extract unique disciplines for dropdowns
  const disciplineOptions1 = useMemo(() => {
    const unique = new Set(data.map(item => item.discipline1 || 'Unclassified'));
    return Array.from(unique).sort();
  }, [data]);

  const disciplineOptions2 = useMemo(() => {
    const unique = new Set(data.map(item => item.discipline2 || 'Unclassified'));
    return Array.from(unique).sort();
  }, [data]);

  const filteredData = data.filter(item => {
    const matchesText = 
      item.name.toLowerCase().includes(filter.toLowerCase()) ||
      item.layer1.toLowerCase().includes(filter.toLowerCase()) ||
      item.layer2.toLowerCase().includes(filter.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    
    const d1 = item.discipline1 || 'Unclassified';
    const matchesDisc1 = discipline1Filter === 'All' || d1 === discipline1Filter;

    const d2 = item.discipline2 || 'Unclassified';
    const matchesDisc2 = discipline2Filter === 'All' || d2 === discipline2Filter;
    
    return matchesText && matchesStatus && matchesDisc1 && matchesDisc2;
  });

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        // Handle Point specially (sort by X)
        if (sortConfig.key === 'point') {
           const valA = a.point.x;
           const valB = b.point.x;
           if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
           if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
           return 0;
        }

        let aValue = a[sortConfig.key as keyof ClashItem];
        let bValue = b[sortConfig.key as keyof ClashItem];
        
        // Handle undefined/null safely
        if (!aValue && aValue !== 0) aValue = '';
        if (!bValue && bValue !== 0) bValue = '';

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const formatField = (field: any) => {
      if (field === null || field === undefined) return '';
      const stringValue = String(field);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const bom = "\uFEFF";
    const headers = ["ID", "Name", "Status", "Distance", "Grid", "Item 1 Layer", "Item 1 Discipline", "Item 2 Layer", "Item 2 Discipline", "X", "Y", "Z"];
    
    const csvRows = sortedData.map(item => [
      item.id,
      item.name,
      item.status,
      item.distance,
      item.gridLocation,
      item.layer1,
      item.discipline1 || "Unknown",
      item.layer2,
      item.discipline2 || "Unknown",
      item.point.x,
      item.point.y,
      item.point.z
    ].map(formatField).join(","));

    const csvString = bom + headers.map(formatField).join(",") + "\n" + csvRows.join("\n");
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "clash_report_simplified.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const jsonString = JSON.stringify(sortedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "clash_report_simplified.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCoords = (id: string, x: number, y: number, z: number) => {
    const text = `${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Active': 'bg-red-100 text-red-800',
      'Resolved': 'bg-green-100 text-green-800',
      'Approved': 'bg-blue-100 text-blue-800',
      'New': 'bg-yellow-100 text-yellow-800',
      'Reviewed': 'bg-purple-100 text-purple-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-blue-600 ml-1" />
      : <ArrowDown size={14} className="text-blue-600 ml-1" />;
  };

  const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: SortKey, className?: string }) => (
    <th 
      className={`px-6 py-3 font-medium cursor-pointer group hover:bg-gray-50 transition-colors select-none ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon columnKey={sortKey} />
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-gray-50/50">
        
        {/* Filters Container */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Text Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search layers or names..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select 
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">Select All</option>
            <option value="New">New</option>
            <option value="Active">Active</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Approved">Approved</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Discipline 1 Filter */}
          <select 
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px]"
            value={discipline1Filter}
            onChange={(e) => setDiscipline1Filter(e.target.value)}
          >
            <option value="All">Select All</option>
            {disciplineOptions1.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Discipline 2 Filter */}
          <select 
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px]"
            value={discipline2Filter}
            onChange={(e) => setDiscipline2Filter(e.target.value)}
          >
            <option value="All">Select All</option>
            {disciplineOptions2.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button 
            onClick={exportToJSON}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
          >
            <FileJson className="w-4 h-4" />
            JSON
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <SortableHeader label="Clash Name" sortKey="name" />
              <SortableHeader label="Status" sortKey="status" />
              <SortableHeader label="Distance" sortKey="distance" />
              <SortableHeader label="Item 1 (Discipline)" sortKey="layer1" />
              <SortableHeader label="Item 2 (Discipline)" sortKey="layer2" />
              <SortableHeader label="Grid" sortKey="gridLocation" />
              <SortableHeader label="Coords (X,Y,Z)" sortKey="point" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.slice(0, 100).map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{item.distance.toFixed(3)}m</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-medium truncate max-w-[150px]" title={item.layer1}>{item.layer1}</span>
                    <span className="text-xs text-blue-600">{item.discipline1}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-medium truncate max-w-[150px]" title={item.layer2}>{item.layer2}</span>
                    <span className="text-xs text-blue-600">{item.discipline2}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{item.gridLocation || '-'}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleCopyCoords(item.id, item.point.x, item.point.y, item.point.z)}
                    className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors group border border-transparent hover:border-blue-100"
                    title="Click to copy X,Y,Z"
                  >
                    <span>{item.point.x.toFixed(3)}, {item.point.y.toFixed(3)}, {item.point.z.toFixed(3)}</span>
                    {copiedId === item.id ? (
                        <Check size={14} className="text-green-600" />
                    ) : (
                        <Copy size={14} className="text-gray-400" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedData.length > 100 && (
          <div className="px-6 py-4 text-center text-gray-500 text-xs bg-gray-50 border-t border-gray-100">
            Showing first 100 of {sortedData.length} items. Export to see all.
          </div>
        )}
        {sortedData.length === 0 && (
           <div className="px-6 py-12 text-center text-gray-400">
             No clashes found matching your filters.
           </div>
        )}
      </div>
    </div>
  );
};

export default ClashTable;