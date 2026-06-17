import { useState, useEffect, type FormEvent } from 'react';
import api, { frappeGet } from '../api/axios';

interface Resident {
  name: string;
  full_name: string;
  resident_id: string;
  phone: string;
  email: string;
  building_apartment: string;
  status: string;
}

const Residents = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', resident_id: '', phone: '', email: '', building_apartment: '', status: 'Active'
  });

  const loadResidents = async () => {
    setLoading(true);
    const data = await frappeGet<Resident>('Resident', {
      fields: ['name', 'full_name', 'resident_id', 'phone', 'email', 'building_apartment', 'status'],
    });
    setResidents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadResidents();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/resource/Resident', formData);
      setShowModal(false);
      setFormData({ full_name: '', resident_id: '', phone: '', email: '', building_apartment: '', status: 'Active' });
      loadResidents();
    } catch (err) {
      console.error("Error creating resident", err);
      alert("Failed to create resident");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Residents Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage city residents and their information</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <span>➕</span> Add Resident
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400">
                <th className="p-4">Resident ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Building/Apt</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Loading residents...</td>
                </tr>
              ) : residents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No residents found. Add a resident to get started.</td>
                </tr>
              ) : (
                residents.map((res) => (
                  <tr key={res.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-mono text-sm">{res.resident_id}</td>
                    <td className="p-4 font-medium">{res.full_name}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                      <div>{res.email}</div>
                      <div>{res.phone}</div>
                    </td>
                    <td className="p-4 text-sm">{res.building_apartment}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        res.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Add New Resident</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:bg-slate-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Resident ID</label>
                <input required type="text" value={formData.resident_id} onChange={e => setFormData({...formData, resident_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:bg-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:bg-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:bg-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Building & Apartment</label>
                <input type="text" value={formData.building_apartment} onChange={e => setFormData({...formData, building_apartment: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:bg-slate-700" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors">Save Resident</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Residents;
