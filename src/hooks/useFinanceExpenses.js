/**
 * Hook: useFinanceExpenses
 * Gère UNIQUEMENT la logique des dépenses
 * 
 * Split de useFinanceData (qui était 1339 lignes)
 * Problème identifié: impossible à tester, cause des re-renders en cascade
 * Solution: Un hook petit, focalisé, et testable
 */

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@chakra-ui/react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const useFinanceExpenses = (currentUser = null) => {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Récupérer tous les dépenses
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/finance/expenses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to load expenses');
      
      const data = await response.json();
      setExpenses(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les dépenses',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Créer une dépense
  const createExpense = useCallback(async (expenseData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/finance/expenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) throw new Error('Failed to create expense');
      
      const newExpense = await response.json();
      setExpenses(prev => [...prev, newExpense]);
      
      toast({
        title: 'Succès',
        description: 'Dépense créée',
        status: 'success',
        duration: 2000
      });
      
      return newExpense;
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err.message,
        status: 'error',
        duration: 3000
      });
      throw err;
    }
  }, [toast]);

  // Mettre à jour une dépense
  const updateExpense = useCallback(async (id, expenseData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/finance/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) throw new Error('Failed to update expense');
      
      const updated = await response.json();
      setExpenses(prev => prev.map(e => e.id === id ? updated : e));
      
      toast({
        title: 'Succès',
        description: 'Dépense mise à jour',
        status: 'success',
        duration: 2000
      });
      
      return updated;
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err.message,
        status: 'error',
        duration: 3000
      });
      throw err;
    }
  }, [toast]);

  // Supprimer une dépense
  const deleteExpense = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/finance/expenses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete expense');
      
      setExpenses(prev => prev.filter(e => e.id !== id));
      
      toast({
        title: 'Succès',
        description: 'Dépense supprimée',
        status: 'success',
        duration: 2000
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err.message,
        status: 'error',
        duration: 3000
      });
      throw err;
    }
  }, [toast]);

  // Charger les dépenses au montage
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  return {
    expenses,
    loading,
    error,
    loadExpenses,
    createExpense,
    updateExpense,
    deleteExpense
  };
};

export default useFinanceExpenses;
