import React, { useState } from 'react';
import { ClashItem } from '../types';
import { Download, Filter, Search, Copy, Check } from 'lucide-react';

interface ClashTableProps {
  data: ClashItem[];
}

const ClashTable: React.FC<ClashTableProps> = ({ data }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredData = data.filter(item => {
    const matchesText = 
      item.name.toLowerCase().includes(filter.toLowerCase()) ||
      item.layer1.toLowerCase().includes(filter.toLowerCase()) ||
      item.layer2.toLowerCase().includes(filter.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    
    return matchesText && matchesStatus;
  });

  const exportToCSV = () => {
    // BOM for Excel utf-8 compatibility
    const bom = "\uFEFF";
    const headers = ["ID", "Name", "Status", "Distance", "Grid", "Item 1 Layer", "Item 1 Discipline", "Item 2 Layer", "Item 2 Discipline", "X", "Y", "Z"];
    
    const csvRows = filteredData.map(item => [
      item.id,
      `"${item.name}"`, // Quote strings to handle commas
      item.status,
      item.distance,
      item.gridLocation,
      `"${item.layer1}"`,
      item.discipline1 || "Unknown",
      `"${item.layer2}"`,
      item.discipline2 || "Unknown",
      item.point.x,
      item.point.y,
      item.point.z
    ].join(","));

    const csvString = bom + headers.join(",") + "\n" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "clash_report_simplified.csv");
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
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
          <select 
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="New">New</option>
            <option value="Resolved">Resolved</option>
            <option value="Approved">Approved</option>
          </select>
        </div>

        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Excel (CSV)
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium">Clash Name</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Distance</th>
              <th className="px-6 py-3 font-medium">Item 1 (Discipline)</th>
              <th className="px-6 py-3 font-medium">Item 2 (Discipline)</th>
              <th className="px-6 py-3 font-medium">Grid</th>
              <th className="px-6 py-3 font-medium">Coords (X,Y,Z)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredData.slice(0, 100).map((item) => (
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
                    <span>{item.point.x.toFixed(2)}, {item.point.y.toFixed(2)}, {item.point.z.toFixed(2)}</span>
                    {copiedId === item.id ? (
                        <Check size={14} className="text-green-600" />
                    ) : (
                        <Copy size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length > 100 && (
          <div className="px-6 py-4 text-center text-gray-500 text-xs bg-gray-50 border-t border-gray-100">
            Showing first 100 of {filteredData.length} items. Export to see all.
          </div>
        )}
        {filteredData.length === 0 && (
           <div className="px-6 py-12 text-center text-gray-400">
             No clashes found matching your filters.
           </div>
        )}
      </div>
    </div>
  );
};

export default ClashTable;
