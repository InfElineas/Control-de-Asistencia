import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Department {
  id: string;
  name: string;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .order('name');

        if (error) throw error;
        setDepartments(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  return { departments, loading, error };
}
