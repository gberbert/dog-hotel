import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Calendar, Clock, Inbox, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import { formatDateBR } from '../utils/calculations';

export default function ClientRequestsPanel({ db, appId, user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'booking_requests'),
      where('clientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId, user]);

  const parseTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12}/> Aprovado</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1"><XCircle size={12}/> Recusado</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1"><Clock3 size={12}/> Aguardando Aprovação</span>;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-secondary-500 font-bold">Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200">
        <h2 className="text-xl font-bold text-secondary-800 flex items-center gap-2">
          <Inbox className="text-primary-600" /> Minhas Solicitações
        </h2>
        <p className="text-secondary-500 text-sm mt-1">
          Acompanhe o status dos seus pedidos de hospedagem.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-secondary-200">
          <Inbox size={48} className="mx-auto text-secondary-300 mb-4" />
          <h3 className="text-xl font-bold text-secondary-700">Nenhuma solicitação</h3>
          <p className="text-secondary-500">Você ainda não solicitou nenhuma hospedagem.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between">
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-secondary-900 leading-tight">Hospedagem: {req.dogName}</h3>
                  {getStatusBadge(req.status)}
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
                    <strong>Obs:</strong> {req.notes}
                  </div>
                )}
                {req.status === 'approved' && (
                  <p className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-100">
                    Sua hospedagem foi confirmada na agenda oficial! O hotel entrará em contato se precisar de algo.
                  </p>
                )}
                {req.status === 'rejected' && (
                  <p className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-100">
                    Sua hospedagem não pôde ser confirmada para estas datas. Por favor, entre em contato via WhatsApp para mais detalhes.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
