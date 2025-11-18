import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Resort } from '@/lib/database.types';

export function useResorts() {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResorts();
  }, []);

  async function fetchResorts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resorts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const formattedResorts: Resort[] = (data || []).map((resort: any) => ({
        id: resort.id,
        name: resort.name,
        nameEn: resort.name_en,
        location: resort.location,
        latitude: resort.latitude,
        longitude: resort.longitude,
        description: resort.description,
        ratings: resort.ratings || {
          powder: 0,
          carving: 0,
          family: 0,
          park: 0,
          nightSki: 0,
          overall: 0,
          totalReviews: 0,
        },
        imageUrl: resort.image_url,
        createdAt: resort.created_at,
      }));

      setResorts(formattedResorts);
    } catch (err) {
      console.error('Error fetching resorts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return { resorts, loading, error, refetch: fetchResorts };
}