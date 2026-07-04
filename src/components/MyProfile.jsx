import React, { useState, useEffect } from 'react';
import { User, Save, Loader2, Camera, Upload, X, FilePlus, Syringe, Search, Link2 } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, appId } from '../utils/firebase';
import { compressImage } from '../utils/fileHelpers';
import { isVaccineExpired } from '../utils/calculations';

import PetForm from './booking/PetForm';
import OwnerForm from './booking/OwnerForm';
import ImageLightbox from './shared/ImageLightbox';

const MyProfile = ({ db, appId, user, races }) => {
  const [formData, setFormData] = useState({
    ownerName: '', ownerName2: '', whatsapp: '', whatsapp2: '',
    ownerEmail: user?.email || '', address: '', ownerHistory: '',
    dogName: '', dogBreed: 'Sem Raça Definida (SRD)', dogSize: 'Pequeno', birthYear: '',
    history: '', restrictions: '', medications: [], socialization: [],
    lastAntiRabica: '', lastMultipla: '', photos: [], vaccineDocs: [],
    pastBookings: []
  });
  
  const [clientId, setClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [vaccineLightboxIndex, setVaccineLightboxIndex] = useState(-1);

  // Estados para Vínculo Manual
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkDogName, setLinkDogName] = useState('');
  const [linkPhone, setLinkPhone] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linking, setLinking] = useState(false);

  const applyClientData = (clientData, id) => {
    setClientId(id);
    setFormData(prev => ({
      ...prev,
      ownerName: clientData.ownerName || '',
      ownerName2: clientData.ownerName2 || '',
      whatsapp: clientData.whatsapp || '',
      whatsapp2: clientData.whatsapp2 || '',
      ownerEmail: clientData.ownerEmail || user.email,
      address: clientData.address || '',
      ownerHistory: clientData.ownerHistory || '',
      dogName: clientData.dogName || '',
      dogBreed: clientData.dogBreed || 'Sem Raça Definida (SRD)',
      dogSize: clientData.dogSize || 'Pequeno',
      birthYear: clientData.birthYear || '',
      history: clientData.history || '',
      restrictions: clientData.restrictions || '',
      medications: clientData.medications || [],
      socialization: clientData.socialization || [],
      lastAntiRabica: clientData.lastAntiRabica || '',
      lastMultipla: clientData.lastMultipla || '',
      photos: clientData.photos || [],
      vaccineDocs: clientData.vaccineDocs || [],
      pastBookings: clientData.pastBookings || []
    }));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;
      try {
        const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
        
        // 1. Tenta carregar por Link de Convite
        const vincularId = localStorage.getItem('doghotel_vincular_id');
        if (vincularId) {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', vincularId);
          const snap = await getDocs(query(clientsRef, where('__name__', '==', vincularId)));
          if (!snap.empty) {
            const client = snap.docs[0];
            const data = client.data();
            applyClientData(data, client.id);
            // Atualiza o email no banco imediatamente
            await updateDoc(docRef, { ownerEmail: user.email });
            localStorage.removeItem('doghotel_vincular_id');
            setLoading(false);
            return;
          }
          localStorage.removeItem('doghotel_vincular_id'); // se não achar, limpa
        }

        // 2. Se não tem link de convite, carrega pelo email padrão
        const q = query(clientsRef, where('ownerEmail', '==', user.email));
        const emailSnap = await getDocs(q);
        
        if (!emailSnap.empty) {
          const client = emailSnap.docs[0];
          applyClientData(client.data(), client.id);
        }
      } catch (e) {
        console.error("Erro ao buscar perfil", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [db, appId, user]);

  const handleManualLink = async (e) => {
    e.preventDefault();
    setLinkError('');
    setLinking(true);
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'clients'));
      const snap = await getDocs(q);
      const allClients = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const inputDog = linkDogName.trim().toLowerCase();
      const inputW1 = linkPhone.replace(/\D/g, '').trim();

      const matchedClient = allClients.find(c => {
        const dbDog = (c.dogName || '').trim().toLowerCase();
        if (dbDog !== inputDog) return false;
        const dbW1 = (c.whatsapp || '').replace(/\D/g, '').trim();
        const dbW2 = (c.whatsapp2 || '').replace(/\D/g, '').trim();
        return (inputW1.length > 5 && (inputW1 === dbW1 || inputW1 === dbW2));
      });

      if (matchedClient) {
        applyClientData(matchedClient, matchedClient.id);
        // Atualiza imediatamente
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', matchedClient.id), { ownerEmail: user.email });
        setShowLinkModal(false);
        alert("Ficha vinculada com sucesso!");
      } else {
        setLinkError("Nenhum cadastro encontrado com este nome de cão e número de WhatsApp. Verifique a digitação ou solicite o link de convite ao hotel.");
      }
    } catch (e) {
      setLinkError("Erro ao buscar: " + e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = async (e, type) => {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith('image/');
    if (!isImage && file.size > 3 * 1024 * 1024) return alert("PDFs devem ter no máximo 3MB.");
    if (type === 'photos' && formData.photos.length >= 5) return;
    if (type === 'vaccines' && formData.vaccineDocs.length >= 3) return;

    setIsUploading(true);
    try {
        let uploadFile = file;
        if (isImage) uploadFile = await compressImage(file);
        const uniqueName = `${type}-${Date.now()}-${file.name}`;
        const storageRef = ref(storage, `images/public/${uniqueName}`);
        await uploadBytes(storageRef, uploadFile);
        const url = await getDownloadURL(storageRef);
        const field = type === 'photos' ? 'photos' : 'vaccineDocs';
        setFormData(prev => ({ ...prev, [field]: [...prev[field], url] }));
    } catch (error) {
        if (error.code === 'storage/quota-exceeded') {
            alert("O limite de armazenamento gratuito do Firebase (5GB) foi atingido.");
        } else if (error.code === 'storage/unauthorized') {
            alert("Você não tem permissão para enviar arquivos. (Verifique as regras do Storage no Firebase)");
        } else {
            alert(`Erro upload: ${error.message}`);
        }
    } finally {
        setIsUploading(false);
    }
  };

  const removePhoto = (index, type) => {
    const field = type === 'photos' ? 'photos' : 'vaccineDocs';
    setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
      const dataToSave = {
        ...formData,
        dogNameLower: formData.dogName.toLowerCase()
      };

      if (clientId) {
        await updateDoc(doc(clientsRef, clientId), dataToSave);
        alert("Perfil atualizado com sucesso!");
      } else {
        const newDoc = await addDoc(clientsRef, {
          ...dataToSave,
          dogBehaviorRating: 3,
          ownerRating: 3,
          source: 'App Cliente'
        });
        setClientId(newDoc.id);
        alert("Perfil criado com sucesso!");
      }
    } catch (e) {
      console.error("Erro ao salvar perfil", e);
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-secondary-500">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden relative">
      
      {lightboxIndex >= 0 && <ImageLightbox images={formData.photos} currentIndex={lightboxIndex} setIndex={setLightboxIndex} onClose={() => setLightboxIndex(-1)} />}
      {vaccineLightboxIndex >= 0 && <ImageLightbox images={formData.vaccineDocs} currentIndex={vaccineLightboxIndex} setIndex={setVaccineLightboxIndex} onClose={() => setVaccineLightboxIndex(-1)} />}

      <div className="p-6 border-b border-secondary-200 bg-primary-50 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <User className="text-primary-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-800">Meu Cadastro</h2>
            <p className="text-sm text-primary-600">Atualize os seus dados e os do seu Pet.</p>
          </div>
        </div>
        {!clientId && (
          <button onClick={() => setShowLinkModal(true)} className="bg-primary-600 text-white px-4 py-2 flex items-center gap-2 rounded-lg font-bold text-sm shadow hover:bg-primary-700 transition">
            <Link2 size={16} /> Já sou cliente (Vincular Ficha)
          </button>
        )}
      </div>
      
      {/* Modal de Vínculo Manual */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <button className="absolute top-4 right-4 text-secondary-400 hover:text-secondary-600" onClick={() => setShowLinkModal(false)}><X size={20} /></button>
            <h3 className="text-lg font-bold text-secondary-900 mb-2 flex items-center gap-2"><Search className="text-primary-600"/> Encontrar Minha Ficha</h3>
            <p className="text-sm text-secondary-600 mb-6">Se você já usou o hotel antes, digite os dados abaixo para recuperar seu histórico.</p>
            
            <form onSubmit={handleManualLink} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-secondary-700 mb-1">Nome do Cão</label>
                <input required type="text" value={linkDogName} onChange={e=>setLinkDogName(e.target.value)} placeholder="Ex: Thor" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary-700 mb-1">Seu WhatsApp</label>
                <input required type="text" value={linkPhone} onChange={e=>setLinkPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              
              {linkError && <p className="text-red-600 text-xs font-medium p-2 bg-red-50 rounded border border-red-200">{linkError}</p>}
              
              <button disabled={linking} type="submit" className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg shadow hover:bg-primary-700 disabled:opacity-50">
                {linking ? 'Buscando...' : 'Procurar Ficha'}
              </button>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* COLUNA ESQUERDA: Dados do Pet e Uploads */}
        <div className="space-y-6">
          <PetForm
            formData={formData}
            handleChange={handleChange}
            setFormData={setFormData}
            showReadOnly={false}
            races={races || []}
            isClientView={true}
          />
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Comportamento e Histórico</label>
            <textarea name="history" value={formData.history} onChange={handleChange} rows="3" placeholder="Como ele se comporta? Tem alergias? etc." className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"></textarea>
          </div>

          {/* Fotos do Pet */}
          <div>
              <label className="text-sm font-bold flex items-center gap-2 mb-2"><Camera size={16} /> Fotos do Pet (Max 5)</label>
              <div className="flex flex-wrap gap-2">
                  {formData.photos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 group">
                          <img src={url} alt="Pet" className="w-full h-full object-cover rounded-lg cursor-pointer border hover:border-primary-500" onClick={() => setLightboxIndex(i)} />
                          <button type="button" onClick={() => removePhoto(i, 'photos')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={12} /></button>
                      </div>
                  ))}
                  {formData.photos.length < 5 && (
                      <label className={`w-16 h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-secondary-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Upload size={20} className="text-secondary-400" />
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'photos')} disabled={isUploading} />
                      </label>
                  )}
              </div>
          </div>

          {/* Carteira de Vacinação + Datas */}
          <div className="bg-secondary-50 p-3 rounded-lg border border-secondary-200">
              <label className="text-sm font-bold flex items-center gap-2 mb-2"><FilePlus size={16} /> Carteira de Vacinação</label>

              {/* Uploads */}
              <div className="flex flex-wrap gap-2 mb-4">
                  {formData.vaccineDocs.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 group">
                          <img src={url} alt="Vacina" className="w-full h-full object-cover rounded-lg cursor-pointer border hover:border-primary-500" onClick={() => setVaccineLightboxIndex(i)} />
                          <button type="button" onClick={() => removePhoto(i, 'vaccines')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={12} /></button>
                      </div>
                  ))}
                  {formData.vaccineDocs.length < 3 && (
                      <label className={`w-16 h-16 border-2 border-dashed bg-white rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-secondary-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Upload size={20} className="text-secondary-400" />
                          <span className="text-[10px] text-secondary-400">Add</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'vaccines')} disabled={isUploading} />
                      </label>
                  )}
              </div>

              {/* NOVOS CAMPOS DE DATA */}
              <div className="border-t border-secondary-200 pt-3">
                  <label className="text-xs font-bold text-secondary-500 flex items-center gap-1 mb-2"><Syringe size={14} /> Últimas Doses</label>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="text-[10px] font-bold text-primary-700 uppercase mb-1 block">Anti-Rábica</label>
                          <input
                              type="date"
                              name="lastAntiRabica"
                              value={formData.lastAntiRabica}
                              onChange={handleChange}
                              className={`w-full p-2 border rounded text-sm focus:ring-2 outline-none ${isVaccineExpired(formData.lastAntiRabica) ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500' : 'border-secondary-300 bg-white focus:ring-primary-500'}`}
                          />
                          {isVaccineExpired(formData.lastAntiRabica) && <span className="text-[10px] text-red-600 font-bold mt-1 block">⚠️ Vencida (&gt; 1 ano)</span>}
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-primary-700 uppercase mb-1 block">Multi V8 / V10</label>
                          <input
                              type="date"
                              name="lastMultipla"
                              value={formData.lastMultipla}
                              onChange={handleChange}
                              className={`w-full p-2 border rounded text-sm focus:ring-2 outline-none ${isVaccineExpired(formData.lastMultipla) ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500' : 'border-secondary-300 bg-white focus:ring-primary-500'}`}
                          />
                          {isVaccineExpired(formData.lastMultipla) && <span className="text-[10px] text-red-600 font-bold mt-1 block">⚠️ Vencida (&gt; 1 ano)</span>}
                      </div>
                  </div>
              </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Dados do Tutor */}
        <div className="space-y-6">
          <OwnerForm
            formData={formData}
            handleChange={handleChange}
            showReadOnly={false}
            isClientView={true}
          />
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">E-mail (Login)</label>
            <input type="email" name="ownerEmail" value={formData.ownerEmail} disabled className="w-full px-3 py-2 border rounded bg-secondary-50 text-secondary-500 cursor-not-allowed text-sm" />
          </div>

          <div className="flex justify-end pt-4 mt-auto">
            <button type="submit" disabled={saving || isUploading} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow disabled:opacity-50 mt-8">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Salvando...' : 'Salvar Perfil Completo'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default MyProfile;
