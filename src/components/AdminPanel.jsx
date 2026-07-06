import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, UserCheck, Search, Loader2, Settings, Users, Save, Plus, Trash2, Calendar } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

const AdminPanel = ({ db, appId }) => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' ou 'settings'
  
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const [settings, setSettings] = useState({ maxCapacity: 6, capacityOverrides: [], defaultRateParticular: 80, defaultRateDogHero: 70 });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Form de novo override
  const [newOverride, setNewOverride] = useState({ startDate: '', endDate: '', capacity: 0, reason: '' });

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) fetchUsers();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = collection(db, 'artifacts', appId, 'public', 'data', 'user_roles');
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    } catch (e) {
      console.error("Erro ao buscar usuários", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const data = snap.data();
        setSettings({ 
          maxCapacity: data.maxCapacity || 6,
          capacityOverrides: data.capacityOverrides || [],
          defaultRateParticular: data.defaultRateParticular || 80,
          defaultRateDogHero: data.defaultRateDogHero || 70
        });
      }
    } catch (e) {
      console.error("Erro ao buscar configurações", e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general');
      await setDoc(settingsRef, { 
        maxCapacity: Number(settings.maxCapacity),
        capacityOverrides: settings.capacityOverrides
      }, { merge: true });
      alert("Configurações atualizadas com sucesso!");
    } catch (e) {
      console.error("Erro ao salvar config", e);
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleRole = async (userId, currentRole, email) => {
    if (email === 'lyoni.berbert@gmail.com') {
      alert("Acesso negado: Não é possível remover os privilégios do Super Admin.");
      return;
    }
    
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmMsg = newRole === 'admin' 
      ? `Tem certeza que deseja conceder privilégios de Administrador para ${email}?`
      : `Tem certeza que deseja remover os privilégios de Administrador de ${email}?`;
      
    if (!confirm(confirmMsg)) return;

    setProcessingId(userId);
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_roles', userId);
      await updateDoc(userRef, { role: newRole });
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) {
      console.error("Erro ao atualizar papel", e);
      alert("Erro ao atualizar perfil do usuário.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-secondary-200 bg-secondary-50">
        <h2 className="text-xl font-bold text-secondary-800 flex items-center gap-2">
          <Shield className="text-primary-600" /> Administração
        </h2>
        
        {/* ABAS */}
        <div className="flex gap-4 mt-6 border-b border-secondary-200">
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-secondary-500 hover:text-secondary-800'}`}
          >
            <Users size={16} /> Perfis de Acesso
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'settings' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-secondary-500 hover:text-secondary-800'}`}
          >
            <Settings size={16} /> Configurações do Hotel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
        {/* ABA: USUÁRIOS */}
        {activeTab === 'users' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-secondary-100 flex justify-end">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 text-secondary-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-12 text-secondary-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p>Carregando usuários...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary-50 border-b text-secondary-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Nome</th>
                      <th className="p-4 font-semibold">E-mail</th>
                      <th className="p-4 font-semibold">Perfil Atual</th>
                      <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-secondary-500">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-secondary-50/50 transition">
                          <td className="p-4 font-medium text-secondary-900">
                            {u.name || <span className="text-secondary-400 italic">Sem nome</span>}
                          </td>
                          <td className="p-4 text-secondary-600">
                            {u.email}
                          </td>
                          <td className="p-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-2.5 py-1 rounded-full text-xs font-bold">
                                <ShieldAlert size={12} /> Administrador
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-secondary-100 text-secondary-600 px-2.5 py-1 rounded-full text-xs font-medium">
                                <UserCheck size={12} /> Usuário
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {u.email !== 'lyoni.berbert@gmail.com' && (
                              <button
                                onClick={() => toggleRole(u.id, u.role, u.email)}
                                disabled={processingId === u.id}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                  u.role === 'admin' 
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                } disabled:opacity-50`}
                              >
                                {processingId === u.id ? 'Processando...' : u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ABA: CONFIGURAÇÕES */}
        {activeTab === 'settings' && (
          <div className="p-6 max-w-2xl">
            {loadingSettings ? (
              <div className="flex flex-col items-center justify-center py-12 text-secondary-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p>Carregando configurações...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                <div className="bg-secondary-50 p-6 rounded-lg border border-secondary-200">
                  <h3 className="font-bold text-secondary-800 border-b pb-2 mb-4">Agenda e Lotação</h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-secondary-700 mb-1">
                      Limite de Vagas por Dia (Capacidade Máxima)
                    </label>
                    <p className="text-xs text-secondary-500 mb-2">Define o número padrão de cães que o hotel comporta por dia. Usado para avisos de "Lotação Completa" na Agenda.</p>
                    <input 
                      type="number" 
                      min="1"
                      value={settings.maxCapacity} 
                      onChange={(e) => setSettings(prev => ({ ...prev, maxCapacity: e.target.value }))}
                      required 
                      className="w-32 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold text-center" 
                    />
                  </div>
                </div>

                <div className="bg-secondary-50 p-6 rounded-lg border border-secondary-200">
                  <h3 className="font-bold text-secondary-800 border-b pb-2 mb-4">Valores Padrão de Diárias</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary-700 mb-1">
                        Valor Particular (R$)
                      </label>
                      <p className="text-xs text-secondary-500 mb-2">Usado como base para reservas feitas pelo próprio app ou direto com você.</p>
                      <input 
                        type="number" 
                        min="0"
                        value={settings.defaultRateParticular} 
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultRateParticular: Number(e.target.value) }))}
                        required 
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary-700 mb-1">
                        Valor DogHero (R$)
                      </label>
                      <p className="text-xs text-secondary-500 mb-2">Usado como base para reservas vindas da plataforma DogHero.</p>
                      <input 
                        type="number" 
                        min="0"
                        value={settings.defaultRateDogHero} 
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultRateDogHero: Number(e.target.value) }))}
                        required 
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold" 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-secondary-50 p-6 rounded-lg border border-secondary-200">
                  <h3 className="font-bold text-secondary-800 border-b pb-2 mb-4 flex items-center gap-2">
                    <Calendar size={18} /> Regras de Exceção (Feriados / Bloqueios)
                  </h3>
                  <p className="text-sm text-secondary-600 mb-4">Adicione períodos específicos onde a capacidade máxima será diferente. Use <strong className="text-red-600">0</strong> vagas para bloquear totalmente as reservas num período.</p>
                  
                  <div className="bg-white p-4 border rounded-lg mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-secondary-700 mb-1">Início</label>
                      <input type="date" value={newOverride.startDate} onChange={e=>setNewOverride({...newOverride, startDate: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-primary-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary-700 mb-1">Fim</label>
                      <input type="date" value={newOverride.endDate} min={newOverride.startDate} onChange={e=>setNewOverride({...newOverride, endDate: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-primary-500 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-secondary-700 mb-1">Motivo (Ex: Férias Coletivas)</label>
                      <input type="text" value={newOverride.reason} onChange={e=>setNewOverride({...newOverride, reason: e.target.value})} placeholder="Para seu controle interno" className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-primary-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary-700 mb-1">Vagas</label>
                      <div className="flex gap-2">
                        <input type="number" min="0" value={newOverride.capacity} onChange={e=>setNewOverride({...newOverride, capacity: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-primary-500 text-sm" />
                        <button 
                          type="button" 
                          onClick={() => {
                            if(!newOverride.startDate || !newOverride.endDate || !newOverride.reason) return alert("Preencha as datas e o motivo.");
                            setSettings(prev => ({ ...prev, capacityOverrides: [...prev.capacityOverrides, { ...newOverride, id: Date.now().toString() }] }));
                            setNewOverride({ startDate: '', endDate: '', capacity: 0, reason: '' });
                          }}
                          className="bg-primary-600 text-white p-2 rounded hover:bg-primary-700" title="Adicionar Regra"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {settings.capacityOverrides && settings.capacityOverrides.length > 0 ? (
                    <div className="space-y-3">
                      {settings.capacityOverrides.map((ov, idx) => (
                        <div key={ov.id || idx} className="flex justify-between items-center bg-white border border-secondary-200 p-3 rounded-lg text-sm">
                          <div>
                            <strong className="text-secondary-800">{ov.reason}</strong>
                            <span className="text-secondary-500 block text-xs mt-1">De {new Date(ov.startDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} até {new Date(ov.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {Number(ov.capacity) === 0 ? (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Bloqueado (0 vagas)</span>
                            ) : (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{ov.capacity} Vagas</span>
                            )}
                            <button type="button" onClick={() => setSettings(prev => ({ ...prev, capacityOverrides: prev.capacityOverrides.filter(o => o.id !== ov.id) }))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-secondary-400 italic">Nenhuma regra de exceção cadastrada.</p>
                  )}
                </div>

                <button type="submit" disabled={savingSettings} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow disabled:opacity-50">
                  {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
