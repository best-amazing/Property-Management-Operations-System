import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pmosApi } from "../services/pmosApi";

export const QUERY_KEYS = {
  pipelines: ["pipelines"] as const,
  tickets: (pipelineId: string, mine: boolean) => ["tickets", pipelineId, mine] as const,
  users: ["users"] as const,
  activity: ["activity"] as const,
  me: ["me"] as const,
  staffTypes: ["staffTypes"] as const,
  teams: ["teams"] as const,
  ticketCategories: ["ticketCategories"] as const,
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
  });
}

export function useMe() {
  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: pmosApi.getMe,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStaffTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.staffTypes,
    queryFn: pmosApi.getStaffTypes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeams() {
  return useQuery({
    queryKey: QUERY_KEYS.teams,
    queryFn: pmosApi.getTeams,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTicketCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.ticketCategories,
    queryFn: pmosApi.getTicketCategories,
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
