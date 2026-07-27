import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pmosApi } from "../services/pmosApi";

export const QUERY_KEYS = {
  pipelines: ["pipelines"] as const,
  tickets: (pipelineId: string, mine: boolean) => ["tickets", pipelineId, mine] as const,
  users: ["users"] as const,
  activity: ["activity"] as const,
};

export function usePipelines() {
  return useQuery({
    queryKey: QUERY_KEYS.pipelines,
    queryFn: pmosApi.getPipelines,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTickets(pipelineId: string | null, mine: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.tickets(pipelineId ?? "", mine),
    queryFn: () => pmosApi.getTickets(pipelineId!, mine),
    enabled: !!pipelineId,
    staleTime: 30 * 1000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: pmosApi.getUsers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidateTickets() {
  const qc = useQueryClient();
  return (pipelineId: string) => qc.invalidateQueries({ queryKey: ["tickets", pipelineId] });
}

export function useRefreshTickets(pipelineId: string | null) {
  const qc = useQueryClient();
  return () => {
    if (pipelineId) qc.invalidateQueries({ queryKey: ["tickets", pipelineId] });
  };
}
