'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

type SupabaseQueryResult<T> = {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
};

export function useSupabaseQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  options?: Omit<UseQueryOptions<T | null>, 'queryKey' | 'queryFn'>
): SupabaseQueryResult<T> {
  const query = useQuery<T | null>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) throw error;
      return data;
    },
    ...options,
  });

  return {
    data: query.data ?? undefined,
    error: query.error as Error | null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
