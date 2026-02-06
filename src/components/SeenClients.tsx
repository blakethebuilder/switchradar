import React, { useMemo, useState } from 'react';
import { Download, Eye, Calendar, MessageSquare, Phone, Mail, MapPin, Search, X, FileText, Trash2, ExternalLink, Map, Plus } from 'lucide-react';
import type { Business } from '../types';
import { ProviderBadge } from './ProviderBadge';

interface SeenClientsProps {
  businesses: Business[];
  onDeleteBusiness?: (id: string) => void;
  onViewOnMap?: (business: Business) => void;
}

const NOTE_CATEGORIES = [
  { value: 'call', label: 'Call Notes', icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'visit', label: 'Visit Notes', icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'follow-up', label: 'Follow-up', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'issue', label: 'Issue', icon: X, color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'opportunity', label: 'Opportunity', icon: Eye, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 'general', label: 'General', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' },
] as const;

export const SeenClients: React.FC<SeenClientsProps> = ({ businesses, onDeleteBusiness, onViewOnMap }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'notes'>('recent');
  const [visibleCount, setVisibleCount] = useState(20);

  // Filter businesses that have been "seen" (have rich notes, metadata updates, or specific status)
  const seenBusinesses = useMemo(() => {
    return businesses.filter(business => {
      // Has notes
      const hasNotes = business.richNotes && business.richNotes.length > 0;

      // Has metadata interactions (issues, interest, provider details)
      const hasMetadataInteraction = business.metadata && (
        business.metadata.hasIssues !== undefined ||
        business.metadata.interest !== undefined ||
        business.metadata.lengthWithCurrentProvider ||
        business.metadata.ispProvider ||
        business.metadata.pabxProvider ||
        business.metadata.isActiveOnCurrentProvider !== undefined ||
        business.metadata.canContact !== undefined
      );

      // Has status change (not just 'active')
      const hasStatusInteraction = business.status !== 'active' && business.status !== 'inactive';

      return hasNotes || hasMetadataInteraction || hasStatusInteraction;
    });
  }, [businesses]);

  // Apply filters and sorting
  const filteredSeenBusinesses = useMemo(() => {
    let filtered = [...seenBusinesses];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(business =>
        business.name.toLowerCase().includes(term) ||
        business.town.toLowerCase().includes(term) ||
        business.provider.toLowerCase().includes(term) ||
        business.richNotes?.some(note =>
          note.content.toLowerCase().includes(term)
        )
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(business =>
        business.richNotes?.some(note => note.category === selectedCategory)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          const aLatest = a.richNotes?.reduce((latest, note) =>
            new Date(note.timestamp) > new Date(latest.timestamp) ? note : latest
          );
          const bLatest = b.richNotes?.reduce((latest, note) =>
            new Date(note.timestamp) > new Date(latest.timestamp) ? note : latest
          );
          return new Date(bLatest?.timestamp || 0).getTime() - new Date(aLatest?.timestamp || 0).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'notes':
          return (b.richNotes?.length || 0) - (a.richNotes?.length || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [seenBusinesses, searchTerm, selectedCategory, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSeen = seenBusinesses.length;
    const totalNotes = seenBusinesses.reduce((sum, business) =>
      sum + (business.richNotes?.length || 0), 0
    );

    const categoryStats = NOTE_CATEGORIES.map(category => ({
      ...category,
      count: seenBusinesses.reduce((sum, business) =>
        sum + (business.richNotes?.filter(note => note.category === category.value).length || 0), 0
      )
    }));

    const recentActivity = seenBusinesses
      .flatMap(business =>
        (business.richNotes || []).map(note => ({
          business,
          note,
          timestamp: new Date(note.timestamp)
        }))
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);

    return {
      totalSeen,
      totalNotes,
      categoryStats,
      recentActivity
    };
  }, [seenBusinesses]);

  const handleExportSeen = () => {
    // Create export data with seen clients and their notes
    const exportData = seenBusinesses.map(business => ({
      name: business.name,
      phone: business.phone,
      email: business.email || '',
      address: business.address,
      town: business.town,
      province: business.province,
      provider: business.provider,
      category: business.category,
      totalNotes: business.richNotes?.length || 0,
      lastNoteDate: business.richNotes?.reduce((latest, note) =>
        new Date(note.timestamp) > new Date(latest.timestamp) ? note : latest
      )?.timestamp || '',
      notes: business.richNotes?.map(note =>
        `[${note.category.toUpperCase()}] ${new Date(note.timestamp).toLocaleDateString()} - ${note.content}`
      ).join(' | ') || ''
    }));

    // Use dynamic import for xlsx
    import('xlsx').then(XLSX => {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Seen Clients");
      XLSX.writeFile(workbook, `seen_clients_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client Activity</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Seen Clients
          </h1>
          <p className="text-slate-600">Clients with notes and interaction history</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white px-3 py-3 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col items-center px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seen Clients</span>
            <span className="text-xl font-black text-green-600">{stats.totalSeen.toLocaleString()}</span>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex flex-col items-center px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Notes</span>
            <span className="text-xl font-black text-blue-600">{stats.totalNotes.toLocaleString()}</span>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <button
            onClick={handleExportSeen}
            disabled={stats.totalSeen === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Export Seen
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search seen clients, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex-shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Categories</option>
              {NOTE_CATEGORIES.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label} ({stats.categoryStats.find(s => s.value === category.value)?.count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex-shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'notes')}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name A-Z</option>
              <option value="notes">Most Notes</option>
            </select>
          </div>
        </div>

        {/* Category Stats */}
        <div className="mt-4 flex flex-wrap gap-2">
          {stats.categoryStats.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(selectedCategory === category.value ? '' : category.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === category.value
                ? `${category.bg} ${category.color} border border-current`
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <category.icon className="h-3 w-3" />
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredSeenBusinesses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <Eye className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {seenBusinesses.length === 0 ? 'No Seen Clients Yet' : 'No Results Found'}
          </h3>
          <p className="text-slate-600">
            {seenBusinesses.length === 0
              ? 'Start adding notes to clients to track your interactions and build your seen clients list.'
              : 'Try adjusting your search terms or filters to find the clients you\'re looking for.'
            }
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredSeenBusinesses.slice(0, visibleCount).map(business => {
            const latestNote = business.richNotes?.reduce((latest, note) =>
              new Date(note.timestamp) > new Date(latest.timestamp) ? note : latest
            );
            const categoryCount = NOTE_CATEGORIES.map(cat => ({
              ...cat,
              count: business.richNotes?.filter(note => note.category === cat.value).length || 0
            })).filter(cat => cat.count > 0);

            return (
              <div key={business.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Business Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{business.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <ProviderBadge provider={business.provider} className="scale-90 origin-left" />
                          <span className="text-sm text-slate-500">•</span>
                          <span className="text-sm text-slate-500">{business.town}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">
                          {business.richNotes?.length || 0} notes
                        </div>
                        <div className="text-xs text-slate-500">
                          Last: {latestNote ? new Date(latestNote.timestamp).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-4 mb-3 text-sm text-slate-600">
                      {business.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {business.phone}
                        </div>
                      )}
                      {business.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {business.email}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {business.address}
                      </div>
                    </div>

                    {/* Gathered Information Display */}
                    {(business.metadata?.hasIssues !== undefined || business.metadata?.interest || business.metadata?.ispProvider || business.metadata?.pabxProvider) && (
                      <div className="mb-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                        <h5 className="text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wide">Gathered Info</h5>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                          {business.metadata?.interest && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs">Interest:</span>
                              <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${business.metadata.interest === 'high' ? 'bg-emerald-100 text-emerald-700' :
                                  business.metadata.interest === 'low' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-rose-100 text-rose-700'
                                }`}>
                                {business.metadata.interest.toUpperCase()}
                              </span>
                            </div>
                          )}
                          {business.metadata?.hasIssues !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs">Status:</span>
                              {business.metadata.hasIssues ? (
                                <span className="flex items-center gap-1 text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Issues
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> No Issues
                                </span>
                              )}
                            </div>
                          )}
                          {(business.metadata?.ispProvider || business.metadata?.pabxProvider) && (
                            <div className="col-span-2 flex flex-wrap gap-3 mt-1 pt-1 border-t border-indigo-100">
                              {business.metadata.ispProvider && (
                                <span className="text-xs text-slate-700"><span className="text-slate-500">ISP:</span> {business.metadata.ispProvider}</span>
                              )}
                              {business.metadata.pabxProvider && (
                                <span className="text-xs text-slate-700"><span className="text-slate-500">PABX:</span> {business.metadata.pabxProvider}</span>
                              )}
                              {business.metadata.lengthWithCurrentProvider && (
                                <span className="text-xs text-slate-700"><span className="text-slate-500">Term:</span> {business.metadata.lengthWithCurrentProvider}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Category Breakdown */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {categoryCount.map(category => (
                        <span
                          key={category.value}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${category.bg} ${category.color}`}
                        >
                          <category.icon className="h-3 w-3" />
                          {category.count}
                        </span>
                      ))}
                    </div>

                    {/* Latest Note Preview */}
                    {latestNote && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Latest Note
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(latestNote.timestamp).toLocaleDateString()} {new Date(latestNote.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2">{latestNote.content}</p>
                      </div>
                    )}
                  </div>

                  {/* All Notes */}
                  <div className="lg:w-80">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        All Notes ({business.richNotes?.length || 0})
                      </h4>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {/* Call Button */}
                        {business.phone && (
                          <a
                            href={`tel:${business.phone}`}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            title="Call"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}

                        {/* Email Button */}
                        {business.email && (
                          <a
                            href={`mailto:${business.email}`}
                            className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                            title="Send Email"
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                        )}

                        {/* Google Maps Button */}
                        <a
                          href={business.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address + ', ' + business.town + ', ' + business.province)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Open in Google Maps"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {/* View on Map Button */}
                        {onViewOnMap && (
                          <button
                            onClick={() => onViewOnMap(business)}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="View on Map"
                          >
                            <Map className="w-3 h-3" />
                          </button>
                        )}

                        {/* Delete Button */}
                        {onDeleteBusiness && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete ${business.name}? This will remove the business and all its notes permanently.`)) {
                                onDeleteBusiness(business.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete Business"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {business.richNotes?.map(note => {
                        const category = NOTE_CATEGORIES.find(cat => cat.value === note.category);
                        return (
                          <div key={note.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <div className="flex items-center gap-2 mb-1">
                              {category && <category.icon className={`h-3 w-3 ${category.color}`} />}
                              <span className={`text-xs font-bold uppercase tracking-wider ${category?.color || 'text-slate-600'}`}>
                                {category?.label || 'General'}
                              </span>
                              <span className="text-xs text-slate-400 ml-auto">
                                {new Date(note.timestamp).toLocaleDateString()} {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700">{note.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {visibleCount < filteredSeenBusinesses.length && (
            <button
              onClick={() => setVisibleCount(prev => prev + 20)}
              className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Load More Seen Clients ({filteredSeenBusinesses.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}

      {/* Recent Activity Summary */}
      {stats.recentActivity.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => {
              const category = NOTE_CATEGORIES.find(cat => cat.value === activity.note.category);
              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {category && <category.icon className={`h-4 w-4 ${category.color}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">{activity.business.name}</span>
                      <span className="text-xs text-slate-400">
                        {activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{activity.note.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeenClients;