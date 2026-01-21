import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, startAfter, where, getDocs } from 'firebase/firestore';
import { db, appId } from '../utils/firebase';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children, user }) => {
  const [clients, setClients] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [races, setRaces] = useState([]);
  
  // Estados de Paginação de Clientes
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 1. Listeners em Tempo Real (Apenas para Bookings e Races que são menores)
  useEffect(() => {
    if (!user) return;
    
    // Bookings
    const bookingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
    const unsubBookings = onSnapshot(bookingsRef, (s) => {
        setBookings(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Races
    const racesRef = collection(db, 'artifacts', appId, 'public', 'data', 'races');
    const unsubRaces = onSnapshot(racesRef, (s) => {
        setRaces(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubBookings(); unsubRaces(); };
  }, [user]);

  // 2. Função de Busca e Paginação de Clientes (Sob demanda)
  const fetchClients = async (searchTerm = '', isNextPage = false) => {
    if (!user) return;
    setLoadingClients(true);

    try {
      const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
      let q;

      // Se for uma nova busca (não é próxima página), limpamos o estado anterior
      if (!isNextPage) {
          setLastDoc(null); 
      }

      if (searchTerm) {
        // BUSCA INTELIGENTE (CASE INSENSITIVE)
        // Normalizamos o termo para minúsculo
        const term = searchTerm.toLowerCase();
        
        // Usamos o campo auxiliar 'dogNameLower' para garantir que 'Leo' ache 'leonardo'
        q = query(
          clientsRef,
          where('dogNameLower', '>=', term),
          where('dogNameLower', '<=', term + '\uf8ff'),
          orderBy('dogNameLower'),
          limit(10)
        );
      } else {
        // PAGINAÇÃO PADRÃO (SEM BUSCA)
        // Aqui mantemos 'dogName' original para que clientes antigos (sem o campo Lower) ainda apareçam
        let constraints = [orderBy('dogName'), limit(10)];
        
        if (isNextPage && lastDoc) {
          constraints = [orderBy('dogName'), startAfter(lastDoc), limit(10)];
        }
        
        q = query(clientsRef, ...constraints);
      }

      const snapshot = await getDocs(q);
      const newClients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Atualiza o cursor para a próxima página
      if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      setHasMore(snapshot.docs.length === 10); // Se vier menos que 10, acabou a lista

      if (isNextPage) {
        setClients(prev => [...prev, ...newClients]);
      } else {
        setClients(newClients);
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      // Se der erro de índice, geralmente é porque o índice composto dogNameLower ainda não existe
      if (error.code === 'failed-precondition') {
          alert("A busca requer um novo índice. Verifique o console do navegador para o link de criação.");
      }
    } finally {
      setLoadingClients(false);
    }
  };

  // Carga inicial de clientes ao logar
  useEffect(() => {
    if(user) fetchClients();
  }, [user]);

  return (
    <DataContext.Provider value={{ 
      clients, bookings, races, 
      fetchClients, loadingClients, hasMore 
    }}>
      {children}
    </DataContext.Provider>
  );
};