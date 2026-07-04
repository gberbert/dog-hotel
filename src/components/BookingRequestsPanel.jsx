import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Calendar, Clock, User, CheckCircle, Trash2, Dog } from 'lucide-react';
import { formatDateBR } from '../utils/calculations';

export default function BookingRequestsPanel({ db, appId, onAcceptRequest }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'booking_requests');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtra apenas pendentes para o painel de admin
      data = data.filter(req => req.status === 'pending');
      // Ordena pelas mais recentes
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId]);

  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja recusar esta solicitação?")) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'booking_requests', id), {
        status: 'rejected'
      });
    }
  };

  const parseTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-secondary-500 font-bold">Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200">
        <h2 className="text-xl font-bold text-secondary-800 flex items-center gap-2">
          <Calendar className="text-primary-600" /> Solicitações de Hospedagem
        </h2>
        <p className="text-secondary-500 text-sm mt-1">
          Hospedagens solicitadas por clientes que aguardam aprovação para entrarem na agenda.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-secondary-200">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-secondary-700">Tudo em dia!</h3>
          <p className="text-secondary-500">Não há nenhuma solicitação pendente no momento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between">
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                    <Dog size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-secondary-900 leading-tight">{req.dogName}</h3>
                    <p className="text-sm text-secondary-500 flex items-center gap-1">
                      <User size={12} /> {req.ownerName}
                    </p>
                  </div>
                </div>

                <div className="bg-secondary-50 p-3 rounded-lg flex flex-wrap gap-x-6 gap-y-2 border border-secondary-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-secondary-500 tracking-wider">Entrada</span>
                    <p className="font-medium text-secondary-800 flex items-center gap-1">
                      <Calendar size={14} className="text-primary-600"/> {formatDateBR(new Date(req.checkIn))}
                      <Clock size={14} className="ml-2 text-primary-600"/> {parseTime(req.checkIn)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-secondary-500 tracking-wider">Saída</span>
                    <p className="font-medium text-secondary-800 flex items-center gap-1">
                      <Calendar size={14} className="text-primary-600"/> {formatDateBR(new Date(req.checkOut))}
                      <Clock size={14} className="ml-2 text-primary-600"/> {parseTime(req.checkOut)}
                    </p>
                  </div>
                </div>

                {req.notes && (
                  <div className="text-sm text-secondary-600 bg-yellow-50 p-2 rounded border border-yellow-100">
                    <strong>Obs do Cliente:</strong> {req.notes}
                  </div>
                )}
              </div>

              <div className="flex md:flex-col gap-2 shrink-0">
                <button 
                  onClick={() => onAcceptRequest(req)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <CheckCircle size={18} /> Aprovar
                </button>
                <button 
                  onClick={() => handleDelete(req.id)}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <Trash2 size={18} /> Recusar
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
